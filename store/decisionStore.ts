import { create } from 'zustand';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Option {
  id: string;    // 'opt1', 'opt2', ... 'opt5'
  label: string; // label court extrait par l'IA
}

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
  default_weight: number;           // 1-10
  option_scores: Record<string, number>; // optionId → score 1-10
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
  options: Option[];           // 2-5 options (remplace optionALabel/optionBLabel)
  contextSummary: string;
  questions: Question[];
  instinctQuestionId: string;
  answers: Record<string, string>;  // questionId → value

  // ─── Appel 2 ──────────────────────────────────────────────────────────────
  criteria: Criterion[];

  // User-adjusted (initialized from Appel 2 defaults)
  weights: Record<string, number>;                          // criterionId → weight 1-10
  userScores: Record<string, Record<string, number>>;       // optionId → criterionId → score

  // ─── Computed locally ─────────────────────────────────────────────────────
  scores: Record<string, number>;   // optionId → 0-100
  niveauReco: 'serré' | 'léger' | 'clair';
  labelNiveau: string;
  messageCoherence: string;
  winner: string;                   // label de l'option gagnante

  // ─── Appel 3 ──────────────────────────────────────────────────────────────
  analysis: Analysis | null;

  // ─── Providers IA ─────────────────────────────────────────────────────────
  aiProviders: { appel1: string | null; appel2: string | null; appel3: string | null };

  // ─── UI ───────────────────────────────────────────────────────────────────
  isLoading: boolean;
  phase: 'input' | 'questions' | 'result';

  // ─── Actions ──────────────────────────────────────────────────────────────
  setAppel1Result: (data: {
    originalText: string;
    options: Option[];
    contextSummary: string;
    questions: Question[];
    instinctQuestionId: string;
  }) => void;
  setAnswer: (questionId: string, value: string) => void;
  setAppel2Result: (criteria: Criterion[]) => void;
  setWeight: (criterionId: string, weight: number) => void;
  setUserScore: (optionId: string, criterionId: string, score: number) => void;
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
  // Formula: Σ(note × poids) / totalPoids × 10 → résultat sur 100
  return Math.round((weightedSum / totalPoids) * 10);
}

function getNiveauReco(
  ecart: number,
  winnerLabel: string
): { niveau: 'serré' | 'léger' | 'clair'; label: string } {
  if (ecart < 5) {
    return { niveau: 'serré', label: 'Décision serrée — les options se valent' };
  } else if (ecart < 15) {
    return { niveau: 'léger', label: `Légère préférence pour ${winnerLabel}` };
  } else {
    return { niveau: 'clair', label: `Recommandation claire : ${winnerLabel}` };
  }
}

function getCoherenceMessage(instinct: string, winner: string): string {
  if (!instinct || instinct === 'Les deux pareil' || instinct === 'Les options se valent') {
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
  | 'setUserScore' | 'computeScores' | 'setAnalysis'
  | 'setAiProvider' | 'setLoading' | 'setPhase' | 'reset'
> = {
  originalText: '',
  options: [],
  contextSummary: '',
  questions: [],
  instinctQuestionId: '',
  answers: {},
  criteria: [],
  weights: {},
  userScores: {},
  scores: {},
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

  setAppel1Result: ({ originalText, options, contextSummary, questions, instinctQuestionId }) =>
    set({ originalText, options, contextSummary, questions, instinctQuestionId, answers: {} }),

  setAnswer: (questionId, value) =>
    set((s) => ({ answers: { ...s.answers, [questionId]: value } })),

  setAppel2Result: (criteria) => {
    const weights: Record<string, number> = {};
    const userScores: Record<string, Record<string, number>> = {};
    for (const c of criteria) {
      weights[c.id] = c.default_weight;
      for (const [optId, score] of Object.entries(c.option_scores)) {
        if (!userScores[optId]) userScores[optId] = {};
        userScores[optId][c.id] = score;
      }
    }
    set({ criteria, weights, userScores });
  },

  setWeight: (criterionId, weight) =>
    set((s) => ({ weights: { ...s.weights, [criterionId]: weight } })),

  setUserScore: (optionId, criterionId, score) =>
    set((s) => ({
      userScores: {
        ...s.userScores,
        [optionId]: { ...(s.userScores[optionId] ?? {}), [criterionId]: score },
      },
    })),

  computeScores: () => {
    const s = get();
    const scores: Record<string, number> = {};
    for (const opt of s.options) {
      scores[opt.id] = computeWeightedScore(s.criteria, s.weights, s.userScores[opt.id] ?? {});
    }
    // Trier pour trouver le gagnant et le niveau
    const sorted = [...s.options].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));
    const winner = sorted[0]?.label ?? '';
    const ecart = sorted.length >= 2
      ? (scores[sorted[0].id] ?? 0) - (scores[sorted[1].id] ?? 0)
      : 100;
    const { niveau, label } = getNiveauReco(ecart, winner);
    const instinct = s.answers[s.instinctQuestionId] ?? '';
    const messageCoherence = getCoherenceMessage(instinct, winner);
    set({ scores, winner, niveauReco: niveau, labelNiveau: label, messageCoherence });
  },

  setAnalysis: (analysis) => set({ analysis }),
  setAiProvider: (appel, provider) =>
    set((s) => ({ aiProviders: { ...s.aiProviders, [appel]: provider } })),
  setLoading: (isLoading) => set({ isLoading }),
  setPhase: (phase) => set({ phase }),
  reset: () => set({ ...INIT }),
}));
