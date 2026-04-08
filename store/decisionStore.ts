import { create } from 'zustand';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Question {
  id: string;
  question: string;
  hint?: string;
  type: 'choice' | 'slider' | 'open';
  options?: string[];    // for 'choice'
  min_label?: string;   // for 'slider'
  max_label?: string;   // for 'slider'
}

export interface Criterion {
  id: string;
  label: string;
  description: string;
  default_weight: number;  // 1-10
  score_a: number;         // 1-10
  score_b: number;         // 1-10
  score_rationale: string;
}

export interface Analysis {
  recommendation: string;
  recommendation_reason: string;
  biases: { name: string; explanation: string }[];
  regret_score_chosen: number;
  regret_chosen_reason: string;
  regret_score_other: number;
  regret_other_reason: string;
  blindspot: string;
  deciding_question: string;
}

export interface DecisionState {
  // ─── Appel 1 ──────────────────────────────────────────────────────────────
  originalText: string;
  optionALabel: string;
  optionBLabel: string;
  contextSummary: string;
  questions: Question[];
  instinctQuestionId: string;
  answers: Record<string, string>;  // questionId → value

  // ─── Appel 2 ──────────────────────────────────────────────────────────────
  criteria: Criterion[];

  // User-adjusted (initialized from Appel 2 defaults)
  weights: Record<string, number>;    // criterionId → weight 1-10
  userScoresA: Record<string, number>;
  userScoresB: Record<string, number>;

  // ─── Computed locally ─────────────────────────────────────────────────────
  scoreA: number;          // 0-100
  scoreB: number;          // 0-100
  niveauReco: 'serré' | 'léger' | 'clair';
  labelNiveau: string;
  messageCoherence: string;
  winner: string;          // = optionALabel or optionBLabel

  // ─── Appel 3 ──────────────────────────────────────────────────────────────
  analysis: Analysis | null;

  // ─── Providers IA ─────────────────────────────────────────────────────────
  aiProviders: { appel1: string | null; appel2: string | null; appel3: string | null };

  // ─── UI ───────────────────────────────────────────────────────────────────
  isLoading: boolean;
  phase: 'input' | 'questions' | 'weighting' | 'result';

  // ─── Actions ──────────────────────────────────────────────────────────────
  setAppel1Result: (data: {
    originalText: string;
    optionALabel: string;
    optionBLabel: string;
    contextSummary: string;
    questions: Question[];
    instinctQuestionId: string;
  }) => void;
  setAnswer: (questionId: string, value: string) => void;
  setAppel2Result: (criteria: Criterion[]) => void;
  setWeight: (criterionId: string, weight: number) => void;
  setUserScoreA: (criterionId: string, score: number) => void;
  setUserScoreB: (criterionId: string, score: number) => void;
  computeScores: () => void;
  setAnalysis: (analysis: Analysis) => void;
  setAiProvider: (appel: 'appel1' | 'appel2' | 'appel3', provider: string) => void;
  setLoading: (loading: boolean) => void;
  setPhase: (phase: DecisionState['phase']) => void;
  reset: () => void;
}

// ─── Score algorithms (côté app, sans IA) ────────────────────────────────────

function computeWeightedScore(
  criteria: Criterion[],
  weights: Record<string, number>,
  scores: Record<string, number>
): number {
  const totalPoids = criteria.reduce((sum, c) => sum + (weights[c.id] ?? c.default_weight), 0);
  if (totalPoids === 0) return 0;
  const weightedSum = criteria.reduce((sum, c) => {
    const poids = weights[c.id] ?? c.default_weight;
    const note = scores[c.id] ?? 5;
    return sum + note * poids;
  }, 0);
  // Formula from spec: Σ(note × poids) / totalPoids × 10 → résultat sur 100
  return Math.round((weightedSum / totalPoids) * 10);
}

function getNiveauReco(
  ecart: number,
  winnerLabel: string
): { niveau: 'serré' | 'léger' | 'clair'; label: string } {
  if (ecart < 5) {
    return { niveau: 'serré', label: 'Décision serrée — les deux options se valent' };
  } else if (ecart < 15) {
    return { niveau: 'léger', label: `Légère préférence pour ${winnerLabel}` };
  } else {
    return { niveau: 'clair', label: `Recommandation claire : ${winnerLabel}` };
  }
}

function getCoherenceMessage(
  instinct: string,
  winner: string
): string {
  if (!instinct || instinct === 'Les deux pareil') {
    return "Ton instinct n'a pas de préférence claire — les scores servent de boussole.";
  }
  if (instinct === winner) {
    return 'Ta logique et ton instinct pointent dans le même sens — bon signe.';
  }
  return `Attention : ton instinct penche vers ${instinct} mais tes scores favorisent ${winner}. C'est souvent là que se cache la vraie réponse.`;
}

// ─── Initial state ────────────────────────────────────────────────────────────

const INIT: Omit<DecisionState,
  | 'setAppel1Result' | 'setAnswer' | 'setAppel2Result' | 'setWeight'
  | 'setUserScoreA' | 'setUserScoreB' | 'computeScores' | 'setAnalysis'
  | 'setAiProvider' | 'setLoading' | 'setPhase' | 'reset'
> = {
  originalText: '',
  optionALabel: '',
  optionBLabel: '',
  contextSummary: '',
  questions: [],
  instinctQuestionId: '',
  answers: {},
  criteria: [],
  weights: {},
  userScoresA: {},
  userScoresB: {},
  scoreA: 0,
  scoreB: 0,
  niveauReco: 'serré',
  labelNiveau: '',
  messageCoherence: '',
  winner: '',
  analysis: null,
  aiProviders: { appel1: null, appel2: null, appel3: null },
  isLoading: false,
  phase: 'input',
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useDecisionStore = create<DecisionState>((set, get) => ({
  ...INIT,

  setAppel1Result: ({ originalText, optionALabel, optionBLabel, contextSummary, questions, instinctQuestionId }) =>
    set({ originalText, optionALabel, optionBLabel, contextSummary, questions, instinctQuestionId, answers: {} }),

  setAnswer: (questionId, value) =>
    set((s) => ({ answers: { ...s.answers, [questionId]: value } })),

  setAppel2Result: (criteria) => {
    const weights: Record<string, number> = {};
    const userScoresA: Record<string, number> = {};
    const userScoresB: Record<string, number> = {};
    for (const c of criteria) {
      weights[c.id] = c.default_weight;
      userScoresA[c.id] = c.score_a;
      userScoresB[c.id] = c.score_b;
    }
    set({ criteria, weights, userScoresA, userScoresB });
  },

  setWeight: (criterionId, weight) =>
    set((s) => ({ weights: { ...s.weights, [criterionId]: weight } })),

  setUserScoreA: (criterionId, score) =>
    set((s) => ({ userScoresA: { ...s.userScoresA, [criterionId]: score } })),

  setUserScoreB: (criterionId, score) =>
    set((s) => ({ userScoresB: { ...s.userScoresB, [criterionId]: score } })),

  computeScores: () => {
    const s = get();
    const scoreA = computeWeightedScore(s.criteria, s.weights, s.userScoresA);
    const scoreB = computeWeightedScore(s.criteria, s.weights, s.userScoresB);
    const winner = scoreA >= scoreB ? s.optionALabel : s.optionBLabel;
    const { niveau, label } = getNiveauReco(Math.abs(scoreA - scoreB), winner);
    const instinct = s.answers[s.instinctQuestionId] ?? '';
    const messageCoherence = getCoherenceMessage(instinct, winner);
    set({ scoreA, scoreB, winner, niveauReco: niveau, labelNiveau: label, messageCoherence });
  },

  setAnalysis: (analysis) => set({ analysis }),
  setAiProvider: (appel, provider) =>
    set((s) => ({ aiProviders: { ...s.aiProviders, [appel]: provider } })),
  setLoading: (isLoading) => set({ isLoading }),
  setPhase: (phase) => set({ phase }),
  reset: () => set({ ...INIT }),
}));
