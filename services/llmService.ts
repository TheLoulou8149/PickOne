import axios from 'axios';
import { Platform } from 'react-native';
import type { Option, Question, Criterion, Analysis } from '@/store/decisionStore';
import { supabase } from '@/lib/supabase';

const IS_WEB = Platform.OS === 'web';

const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

const TIMEOUT = 30000;

// ─── JSON parsing robuste (depuis la spec PDF) ────────────────────────────────

function parseResponse<T>(raw: string): T {
  // Strip BOM and leading/trailing whitespace
  let s = raw.replace(/^\uFEFF/, '').trim();

  // Extract from markdown code block (case-insensitive language tag: ```json, ```JSON, ```, etc.)
  const codeBlock = s.match(/```(?:[a-zA-Z]*)?\s*([\s\S]*?)```/);
  if (codeBlock) s = codeBlock[1].trim();

  // Find start of JSON object
  const start = s.indexOf('{');
  if (start === -1) return JSON.parse(s) as T;

  // Walk forward with bracket matching to find the correct closing }
  // (avoids lastIndexOf picking up a } in trailing text like "for {Option B}")
  let depth = 0;
  let inString = false;
  let escaped = false;
  let end = -1;

  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\' && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }

  if (end !== -1) s = s.slice(start, end + 1);

  return JSON.parse(s) as T;
}

// ─── Appels API par provider ──────────────────────────────────────────────────

async function callAnthropic(systemPrompt: string, userMessage: string): Promise<string> {
  if (IS_WEB) {
    const response = await axios.post(
      '/api/llm',
      { target: 'anthropic', systemPrompt, userMessage },
      { timeout: TIMEOUT }
    );
    return response.data.text;
  }
  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    },
    {
      timeout: TIMEOUT,
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
    }
  );
  return response.data.content[0].text;
}

async function callGemini(systemPrompt: string, userMessage: string): Promise<string> {
  if (IS_WEB) {
    const response = await axios.post(
      '/api/llm',
      { target: 'gemini', systemPrompt, userMessage },
      { timeout: TIMEOUT }
    );
    return response.data.text;
  }
  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${GEMINI_API_KEY}`,
    {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userMessage }] }],
      generationConfig: { maxOutputTokens: 2000 },
    },
    { timeout: TIMEOUT, headers: { 'content-type': 'application/json' } }
  );
  return response.data.candidates[0].content.parts[0].text;
}

// ─── Appel LLM : Gemini en premier, fallback Anthropic ───────────────────────

async function callLLM(
  systemPrompt: string,
  userMessage: string,
  attempt = 0
): Promise<{ text: string; provider: 'gemini' | 'anthropic' }> {
  try {
    const text = await callGemini(systemPrompt, userMessage);
    return { text, provider: 'gemini' };
  } catch (err: any) {
    const status = err?.response?.status;
    // Retry Gemini sur rate limit
    if (status === 429 && attempt < 2) {
      const raw: string = err?.response?.data?.error?.message ?? '';
      const match = raw.match(/retry in ([\d.]+)s/);
      const delay = match ? Math.ceil(parseFloat(match[1])) * 1000 : 5000;
      await new Promise((res) => setTimeout(res, delay));
      return callLLM(systemPrompt, userMessage, attempt + 1);
    }
    // Fallback Anthropic sur toute autre erreur
    const text = await callAnthropic(systemPrompt, userMessage);
    return { text, provider: 'anthropic' };
  }
}

// ─── Contexte utilisateur ─────────────────────────────────────────────────────

export async function getUserContextBlock(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return '';
  const { data } = await supabase
    .from('user_context')
    .select('age, situation_pro, situation_perso, valeurs, style_risque, contexte_libre')
    .eq('user_id', user.id)
    .single();
  if (!data) return '';

  const lines: string[] = [];
  if (data.age) lines.push(`- Âge : ${data.age}`);
  if (data.situation_pro) lines.push(`- Situation pro : ${data.situation_pro}`);
  if (data.situation_perso) lines.push(`- Situation perso : ${data.situation_perso}`);
  if (data.valeurs) lines.push(`- Valeurs : ${data.valeurs}`);
  if (data.style_risque) lines.push(`- Rapport au risque : ${data.style_risque}`);
  if (data.contexte_libre) lines.push(`- Contexte libre : ${data.contexte_libre}`);

  if (lines.length === 0) return '';
  return `\n\nPROFIL DE L'UTILISATEUR (à prendre en compte discrètement, sans le citer explicitement) :\n${lines.join('\n')}`;
}

// ─── APPEL 1 — Questions personnalisées ───────────────────────────────────────

const SYSTEM_APPEL_1 = `Tu es un coach de décision expert. Tu analyses une situation décisionnelle et génères des questions de clarification.

EXTRACTION DES OPTIONS :
Identifie toutes les options présentes dans le texte (2 minimum, 5 maximum). Chaque option reçoit un id séquentiel (opt1, opt2, opt3…) et un label court (3 mots max).
Exemples :
- "CDI vs startup" → [{"id":"opt1","label":"CDI stable"}, {"id":"opt2","label":"Startup risquée"}]
- "Lyon, Nantes ou Bordeaux" → [{"id":"opt1","label":"Lyon"}, {"id":"opt2","label":"Nantes"}, {"id":"opt3","label":"Bordeaux"}]

ÉTAPE 1 — GÉNÈRE MENTALEMENT TOUTES LES QUESTIONS CANDIDATES :
Liste toutes les questions qui pourraient éclairer ce choix. Ne te censure pas encore.

ÉTAPE 2 — FILTRE DE PERTINENCE (applique dans cet ordre) :
Pour chaque question candidate, élimine-la si :
→ La réponse est déjà dans le texte fourni (RÈGLE N°0)
→ C'est une question générique interdite (RÈGLE N°1)
→ Sa réponse ne changerait pas réellement l'analyse du choix

RÈGLE N°0 — FILTRE CONTENU :
Avant de formuler chaque question, demande-toi : "Est-ce que la réponse est déjà dans le texte ?"
Si oui → ne pose PAS cette question.

RÈGLE N°1 — QUESTIONS INTERDITES (trop génériques) :
'Qu'est-ce qui compte le plus pour toi ?'
'Quels sont tes objectifs ?'
'Comment tu te sens par rapport à ce choix ?'
'Quelles sont tes contraintes ?'
'Qu'est-ce qui t'attire dans chaque option ?'

ÉTAPE 3 — SÉLECTION DU NOMBRE OPTIMAL (entre 2 et 10) :
Garde uniquement les questions indispensables — celles dont la réponse change réellement l'analyse.
Le nombre final dépend exclusivement de la pertinence :
- Contexte simple et univoque → 2 à 3 questions
- Contexte standard → 4 à 6 questions
- Contexte complexe, multi-enjeux ou chargé émotionnellement → 7 à 10 questions
Critère absolu : chaque question conservée doit être indispensable. Filtre sans pitié.

RÈGLE N°2 — QUESTION INSTINCT OBLIGATOIRE :
L'une des questions DOIT être de type 'choice' avec comme options : les labels de chaque option extraite + 'Les options se valent'. Cette question sert à détecter l'instinct.
Ex : 'Quand tu imagines ta journée dans 6 mois, laquelle des options te vient naturellement en premier ?'

RÈGLE N°3 — ORDRE DE LA SÉRIE :
- 1ère position : question factuelle (fait ou chiffre clé absent du texte)
- Milieu : questions factuelles et émotionnelles selon le contexte
- Avant-dernière position : question instinct (type 'choice', voir règle N°2)
- Dernière position : question inconfortable (celle que la personne préfère éviter)
Exception si N=2 : Q1=instinct, Q2=inconfortable.

N'utilise PAS de guillemets autour des mots dans les questions.

TYPES : 'choice' (2-6 options, max 6 mots chacune), 'slider' (extrêmes 3 mots max), 'open' (texte libre)

FORMAT — JSON pur, sans markdown, sans backticks :
{
  "context_summary": "1-2 phrases résumant la situation",
  "options": [
    {"id": "opt1", "label": "3 mots max"},
    {"id": "opt2", "label": "3 mots max"}
  ],
  "instinct_question_id": "q[N-1]",
  "questions": [
    { "id": "q1", "question": "...", "type": "choice", "options": ["...", "..."] },
    { "id": "q2", "question": "...", "type": "slider", "min_label": "...", "max_label": "..." },
    ...entre 2 et 10 questions selon pertinence...
    { "id": "q[N-1]", "question": "Quand tu imagines...", "type": "choice", "options": ["[opt1.label]", "[opt2.label]", "Les options se valent"] },
    { "id": "q[N]", "question": "...", "type": "open" }
  ]
}`;

export interface Appel1Response {
  context_summary: string;
  options: Option[];
  instinct_question_id: string;
  questions: Question[];
}

export async function callAppel1(originalText: string): Promise<{ data: Appel1Response; provider: string }> {
  const ctxBlock = await getUserContextBlock();
  const userMessage = `Situation à analyser :

---
${originalText}
---
${ctxBlock}
Analyse la richesse du contexte et génère entre 2 et 10 questions pertinentes sur cette situation. Choisis le nombre optimal selon la pertinence — ni plus, ni moins.`;

  const { text, provider } = await callLLM(SYSTEM_APPEL_1, userMessage);
  return { data: parseResponse<Appel1Response>(text), provider };
}

// ─── APPEL 2 — Critères de pondération ───────────────────────────────────────

const SYSTEM_APPEL_2 = `Tu es expert en analyse décisionnelle comportementale. Génère 5 critères d'évaluation nommés depuis les éléments SPÉCIFIQUES du texte de l'utilisateur.

LABELS INTERDITS (trop génériques) :
'Épanouissement personnel', 'Sécurité financière', 'Qualité de vie', 'Évolution de carrière', 'Équilibre vie pro/perso', 'Satisfaction', 'Bien-être'

LABELS OBLIGATOIRES — construits depuis le texte :
Si texte cite '42k€ vs 55k€' → label = 'Delta salarial 13k€'
Si texte cite 'père malade' → label = 'Proximité père malade'
Si texte cite 'copine ne peut pas partir' → 'Couple vs projet'
Si texte cite '3k€ de MRR' → 'MRR validé vs CDI stable'
Si texte cite 'crédit 900€' → 'Charges fixes 900€/mois'

SCORES : Chaque option doit avoir un score différencié (1-10). Interdit d'attribuer le même score à toutes les options sur un critère. Justifie chaque score par les infos données.

FORMAT — JSON pur sans markdown :
{
  "criteria": [
    {
      "id": "c1",
      "label": "label depuis texte (4 mots max)",
      "description": "pourquoi crucial ici (1 ligne)",
      "default_weight": 7,
      "option_scores": {
        "opt1": 4,
        "opt2": 8
      },
      "score_rationale": "justification des scores (1 ligne)"
    }
  ]
}`;

export interface Appel2Response {
  criteria: Criterion[];
}

export async function callAppel2(ctx: {
  originalText: string;
  options: Option[];
  questions: Question[];
  answers: Record<string, string>;
}): Promise<{ data: Appel2Response; provider: string }> {
  const qaPairs = ctx.questions
    .map((q) => `Q: ${q.question}  R: ${ctx.answers[q.id] ?? '(pas de réponse)'}`)
    .join('\n');

  const optionLines = ctx.options
    .map((o) => `- ${o.id} : ${o.label}`)
    .join('\n');

  const ctxBlock = await getUserContextBlock();
  const userMessage = `Situation : '${ctx.originalText}'

Options à évaluer :
${optionLines}
${ctxBlock}
Réponses aux questions :
${qaPairs}

Génère 5 critères nommés depuis des éléments précis du texte. Pour chaque critère, score chaque option (en utilisant les IDs fournis comme clés dans option_scores).`;

  const { text, provider } = await callLLM(SYSTEM_APPEL_2, userMessage);
  return { data: parseResponse<Appel2Response>(text), provider };
}

// ─── APPEL 3 — Analyse finale ─────────────────────────────────────────────────

const SYSTEM_APPEL_3 = `Tu es psychologue spécialisé en prise de décision. Produis une analyse directe, honnête, non complaisante.

RÈGLES :
1. Cite des éléments SPÉCIFIQUES du texte dans chaque section (chiffres, formulations exactes, personnes nommées)
2. Les biais : nomme comment ils se manifestent PRÉCISÉMENT ici
3. Le blindspot : quelque chose que la personne n'a PAS dit mais devrait regarder en face
4. La deciding_question : la plus inconfortable, basée sur l'élément le plus sensible du texte
5. Sois direct. Pas de bienveillance excessive.
6. recommendation : reprend exactement le label de l'option recommandée
7. recommendation_reason : 2-3 phrases, cite des éléments précis. Ne répète pas les scores — l'app les affiche déjà.
8. N'utilise JAMAIS de guillemets autour des mots ou expressions de l'utilisateur. Intègre-les directement dans tes phrases sans les encadrer.
9. alternative_strategy (OPTIONNEL) : Si le score pondéré maximum parmi toutes les options est inférieur à 40/100, OU si les deux scores de regret dépasseraient 65%, génère ce champ. C'est une 3ème voie créative et concrète que la personne n'a pas envisagée, ancrée dans sa situation spécifique. 2-3 phrases directes. Commence par "Et si..." ou "Une piste non explorée :". Si les options semblent satisfaisantes, n'inclus PAS ce champ dans le JSON.

CONTRAINTES POUR LES % DE REGRET :
- regret_score_chosen : risque de regret si on choisit l'option recommandée
- regret_score_other : risque de regret si on choisit la 2ème option du classement (meilleure alternative)
- Valeur entre 15 et 85 UNIQUEMENT (jamais 0 ni 100)
- Chaque % est obligatoirement suivi d'un scénario précis qui cite des éléments du texte ou des réponses
- Le scénario doit être plausible et personnalisé
- Format : 'Dans 1 an, si [scénario précis]...'

FORMAT — JSON pur sans markdown :
{
  "recommendation": "label exact de l'option recommandée",
  "recommendation_reason": "2-3 phrases avec citations",
  "biases": [
    { "name": "Nom du biais", "explanation": "Manifestation précise ici — cite le texte. 2 phrases." }
  ],
  "regret_score_chosen": 35,
  "regret_chosen_reason": "Dans 1 an, si [scénario précis]...",
  "regret_score_other": 68,
  "regret_other_reason": "Dans 1 an, si [scénario précis]...",
  "blindspot": "Ce qu'elle évite de voir. Direct. 2 phrases.",
  "deciding_question": "La question radicale qui tranche tout.",
  "alternative_strategy": "optionnel — seulement si options insatisfaisantes (score max < 40 ou regret > 65%). Une 3ème voie concrète ancrée dans la situation. 2-3 phrases."
}`;

export interface Appel3Response extends Analysis {}

export async function callAppel3(ctx: {
  originalText: string;
  options: Option[];
  scores: Record<string, number>;
  labelNiveau: string;
  questions: Question[];
  answers: Record<string, string>;
  criteria: { label: string; id: string }[];
  weights: Record<string, number>;
  userScores: Record<string, Record<string, number>>;
}): Promise<{ data: Appel3Response; provider: string }> {
  const qaPairs = ctx.questions
    .map((q) => `Q: ${q.question}  R: ${ctx.answers[q.id] ?? '(pas de réponse)'}`)
    .join('\n');

  // Trier les options par score décroissant
  const sortedOptions = [...ctx.options].sort(
    (a, b) => (ctx.scores[b.id] ?? 0) - (ctx.scores[a.id] ?? 0)
  );

  const optionScoreLines = sortedOptions
    .map((o, i) => `${i + 1}. ${o.label} (${o.id}) — score pondéré : ${ctx.scores[o.id] ?? 0}/100`)
    .join('\n');

  const criteriaLines = ctx.criteria
    .map((c) => {
      const optScores = ctx.options
        .map((o) => `${o.label}=${ctx.userScores[o.id]?.[c.id] ?? 5}`)
        .join(', ');
      return `${c.label} : poids=${ctx.weights[c.id] ?? 5}, ${optScores}`;
    })
    .join('\n');

  const secondOption = sortedOptions[1];
  const ctxBlock = await getUserContextBlock();
  const userMessage = `Situation : '${ctx.originalText}'

Classement des options (du meilleur au moins bon score) :
${optionScoreLines}
Niveau de recommandation calculé : ${ctx.labelNiveau}
${ctxBlock}
Réponses aux questions :
${qaPairs}

Critères et scores finaux :
${criteriaLines}

Note : pour le regret, regret_score_chosen = option #1 du classement, regret_score_other = option #2 (${secondOption?.label ?? 'meilleure alternative'}).

Produis l'analyse finale complète.`;

  const { text, provider } = await callLLM(SYSTEM_APPEL_3, userMessage);
  return { data: parseResponse<Appel3Response>(text), provider };
}
