import axios from 'axios';
import { Platform } from 'react-native';
import type { Question, Criterion, Analysis } from '@/store/decisionStore';
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

RÈGLE N°0 — FILTRE AVANT DE POSER UNE QUESTION :
Avant de formuler chaque question, demande-toi : "Est-ce que la réponse est déjà dans le texte ?"
Si oui → ne pose PAS cette question, remplace-la par quelque chose que le texte ne dit pas.
Exemple : si le texte mentionne déjà le salaire, ne demande pas le salaire. Si le texte dit "ma copine préfère que je reste", ne demande pas l'avis du conjoint.
Seules les informations MANQUANTES méritent d'être demandées.

RÈGLE N°1 — QUESTIONS INTERDITES (trop génériques) :
'Qu'est-ce qui compte le plus pour toi ?'
'Quels sont tes objectifs ?'
'Comment tu te sens par rapport à ce choix ?'
'Quelles sont tes contraintes ?'
'Qu'est-ce qui t'attire dans chaque option ?'

RÈGLE N°2 — QUESTION OBLIGATOIRE :
L'une des 5 questions DOIT être de type 'choice' avec exactement ces 3 options : [label_option_A], [label_option_B], 'Les deux pareil'. Cette question sert à détecter l'instinct.
Ex : 'Quand tu imagines ta journée dans 6 mois, lequel des deux te vient naturellement en premier ?'

RÈGLE N°3 — PROGRESSION ÉMOTIONNELLE :
Q1 : factuelle — un fait ou chiffre clé de la situation
Q2 : factuelle — une contrainte ou enjeu concret
Q3 : émotionnelle — ressenti, peur ou désir autour du choix
Q4 : OBLIGATOIRE — question instinct (voir règle N°2)
Q5 : inconfortable — la question que la personne préfère ne pas se poser

N'utilise PAS de guillemets autour des mots dans les questions.

TYPES : 'choice' (2-4 options, max 6 mots chacune), 'slider' (extrêmes 3 mots max), 'open' (texte libre)

FORMAT — JSON pur, sans markdown, sans backticks :
{
  "context_summary": "1-2 phrases résumant la situation",
  "option_a_label": "3 mots max",
  "option_b_label": "3 mots max",
  "instinct_question_id": "q4",
  "questions": [
    { "id": "q1", "question": "...", "type": "choice", "options": ["...", "...", "..."] },
    { "id": "q2", "question": "...", "type": "slider", "min_label": "...", "max_label": "..." },
    { "id": "q3", "question": "...", "type": "open" },
    { "id": "q4", "question": "...", "type": "choice", "options": ["[optA]", "[optB]", "Les deux pareil"] },
    { "id": "q5", "question": "...", "type": "open" }
  ]
}`;

export interface Appel1Response {
  context_summary: string;
  option_a_label: string;
  option_b_label: string;
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
Génère 5 questions pertinentes et progressives sur cette situation.`;

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

SCORES : A et B doivent être vraiment différenciés. Interdit : 5 vs 5, 6 vs 6, 7 vs 7. Justifie chaque score par les infos données.

FORMAT — JSON pur sans markdown :
{
  "criteria": [
    {
      "id": "c1",
      "label": "label depuis texte (4 mots max)",
      "description": "pourquoi crucial ici (1 ligne)",
      "default_weight": 7,
      "score_a": 4,
      "score_b": 8,
      "score_rationale": "justification des scores (1 ligne)"
    }
  ]
}`;

export interface Appel2Response {
  criteria: Criterion[];
}

export async function callAppel2(ctx: {
  originalText: string;
  optionALabel: string;
  optionBLabel: string;
  questions: Question[];
  answers: Record<string, string>;
}): Promise<{ data: Appel2Response; provider: string }> {
  const qaPairs = ctx.questions
    .map((q) => `Q: ${q.question}  R: ${ctx.answers[q.id] ?? '(pas de réponse)'}`)
    .join('\n');

  const ctxBlock = await getUserContextBlock();
  const userMessage = `Situation : '${ctx.originalText}'
Option A : ${ctx.optionALabel}
Option B : ${ctx.optionBLabel}
${ctxBlock}
Réponses aux questions :
${qaPairs}

Génère 5 critères nommés depuis des éléments précis du texte.`;

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
6. recommendation : reprend exactement le label de l'option
7. recommendation_reason : 2-3 phrases, cite des éléments précis. Ne répète pas les scores — l'app les affiche déjà.
8. N'utilise JAMAIS de guillemets autour des mots ou expressions de l'utilisateur. Intègre-les directement dans tes phrases sans les encadrer.

CONTRAINTES POUR LES % DE REGRET :
- Valeur entre 15 et 85 UNIQUEMENT (jamais 0 ni 100)
- Chaque % est obligatoirement suivi d'un scénario précis qui cite des éléments du texte ou des réponses
- Le scénario doit être plausible et personnalisé
- Format : 'Dans 1 an, si [scénario précis]...'

FORMAT — JSON pur sans markdown :
{
  "recommendation": "label exact de l'option",
  "recommendation_reason": "2-3 phrases avec citations",
  "biases": [
    { "name": "Nom du biais", "explanation": "Manifestation précise ici — cite le texte. 2 phrases." }
  ],
  "regret_score_chosen": 35,
  "regret_chosen_reason": "Dans 1 an, si [scénario précis]...",
  "regret_score_other": 68,
  "regret_other_reason": "Dans 1 an, si [scénario précis]...",
  "blindspot": "Ce qu'elle évite de voir. Direct. 2 phrases.",
  "deciding_question": "La question radicale qui tranche tout."
}`;

export interface Appel3Response extends Analysis {}

export async function callAppel3(ctx: {
  originalText: string;
  optionALabel: string;
  optionBLabel: string;
  scoreA: number;
  scoreB: number;
  labelNiveau: string;
  questions: Question[];
  answers: Record<string, string>;
  criteria: { label: string; id: string }[];
  weights: Record<string, number>;
  userScoresA: Record<string, number>;
  userScoresB: Record<string, number>;
}): Promise<{ data: Appel3Response; provider: string }> {
  const qaPairs = ctx.questions
    .map((q) => `Q: ${q.question}  R: ${ctx.answers[q.id] ?? '(pas de réponse)'}`)
    .join('\n');

  const criteriaLines = ctx.criteria
    .map(
      (c) =>
        `${c.label} : poids=${ctx.weights[c.id] ?? 5}, ${ctx.optionALabel}=${ctx.userScoresA[c.id] ?? 5}, ${ctx.optionBLabel}=${ctx.userScoresB[c.id] ?? 5}`
    )
    .join('\n');

  const ctxBlock = await getUserContextBlock();
  const userMessage = `Situation : '${ctx.originalText}'
Option A : ${ctx.optionALabel} — score pondéré : ${ctx.scoreA}/100
Option B : ${ctx.optionBLabel} — score pondéré : ${ctx.scoreB}/100
Niveau de recommandation calculé : ${ctx.labelNiveau}
${ctxBlock}
Réponses aux questions :
${qaPairs}

Critères et scores finaux :
${criteriaLines}

Produis l'analyse finale complète.`;

  const { text, provider } = await callLLM(SYSTEM_APPEL_3, userMessage);
  return { data: parseResponse<Appel3Response>(text), provider };
}
