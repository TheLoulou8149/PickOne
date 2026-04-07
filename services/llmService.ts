import axios from 'axios';

const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
const LLM_PROVIDER = (process.env.EXPO_PUBLIC_LLM_PROVIDER ?? 'anthropic') as 'anthropic' | 'openai';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LLMQuestionResponse {
  nextQuestion: string;
  detectedBiases: string[];
  questionCategory: 'objective' | 'constraint' | 'emotion';
}

export interface LLMAnalysisResponse {
  biasAlerts: {
    type: string;
    label: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }[];
  recommendation: string;
  reasoning: string;
}

interface ConversationContext {
  dilemma: string;
  optionA: string;
  optionB: string;
  previousQA: { question: string; answer: string }[];
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildQuestionPrompt(ctx: ConversationContext): string {
  const qa = ctx.previousQA
    .map((item) => `Q: ${item.question}\nR: ${item.answer}`)
    .join('\n\n');

  return `Tu es un expert en prise de décision et psychologie cognitive. L'utilisateur fait face au dilemme suivant :

DILEMME : "${ctx.dilemma}"
OPTION A : "${ctx.optionA}"
OPTION B : "${ctx.optionB}"

${ctx.previousQA.length > 0 ? `Questions et réponses précédentes :\n${qa}\n\n` : ''}

Génère la PROCHAINE question la plus pertinente pour mieux comprendre les priorités, contraintes ou ressentis de l'utilisateur.

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans explication :
{
  "nextQuestion": "Ta question ici (max 2 phrases, naturelle et empathique)",
  "detectedBiases": ["liste des biais détectés jusqu'ici, ou tableau vide"],
  "questionCategory": "objective | constraint | emotion"
}`;
}

function buildAnalysisPrompt(
  ctx: ConversationContext,
  mathematicalScoreA: number,
  mathematicalScoreB: number,
  emotionalScoreA: number,
  emotionalScoreB: number
): string {
  const qa = ctx.previousQA
    .map((item) => `Q: ${item.question}\nR: ${item.answer}`)
    .join('\n\n');

  return `Tu es un expert en décision rationnelle et émotionnelle. Analyse ce dilemme :

DILEMME : "${ctx.dilemma}"
OPTION A : "${ctx.optionA}" — Score rationnel : ${mathematicalScoreA}/10, Score émotionnel : ${emotionalScoreA}/100
OPTION B : "${ctx.optionB}" — Score rationnel : ${mathematicalScoreB}/10, Score émotionnel : ${emotionalScoreB}/100

Réponses de l'utilisateur :
${qa}

Génère une analyse finale. Réponds UNIQUEMENT avec un objet JSON valide :
{
  "biasAlerts": [
    {
      "type": "status_quo | loss_aversion | social_pressure | short_term",
      "label": "Nom court du biais",
      "description": "Explication personnalisée basée sur les réponses (1-2 phrases)",
      "severity": "low | medium | high"
    }
  ],
  "recommendation": "Option A | Option B",
  "reasoning": "Explication de la recommandation en 2-3 phrases, empathique et argumentée"
}`;
}

// ─── API calls ────────────────────────────────────────────────────────────────

async function callAnthropic(prompt: string): Promise<string> {
  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-3-haiku-20240307',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    },
    {
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
    }
  );
  return response.data.content[0].text;
}

async function callOpenAI(prompt: string): Promise<string> {
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o-mini',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'content-type': 'application/json',
      },
    }
  );
  return response.data.choices[0].message.content;
}

async function callLLM(prompt: string): Promise<string> {
  if (LLM_PROVIDER === 'openai') {
    return callOpenAI(prompt);
  }
  return callAnthropic(prompt);
}

function parseJSON<T>(raw: string): T {
  // Strip markdown code fences if present
  const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned) as T;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getAdaptiveQuestion(
  ctx: ConversationContext
): Promise<LLMQuestionResponse> {
  const prompt = buildQuestionPrompt(ctx);
  const raw = await callLLM(prompt);
  return parseJSON<LLMQuestionResponse>(raw);
}

export async function getFullAnalysis(
  ctx: ConversationContext,
  mathematicalScoreA: number,
  mathematicalScoreB: number,
  emotionalScoreA: number,
  emotionalScoreB: number
): Promise<LLMAnalysisResponse> {
  const prompt = buildAnalysisPrompt(
    ctx,
    mathematicalScoreA,
    mathematicalScoreB,
    emotionalScoreA,
    emotionalScoreB
  );
  const raw = await callLLM(prompt);
  return parseJSON<LLMAnalysisResponse>(raw);
}
