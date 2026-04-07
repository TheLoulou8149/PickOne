import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────────────────────────

export type BiasType = 'status_quo' | 'loss_aversion' | 'social_pressure' | 'short_term';

export interface Criterion {
  id: string;
  name: string;
  weight: number;   // 0–10 (slider value, normalized internally)
  scoreA: number;   // 0–10
  scoreB: number;   // 0–10
  category: 'career' | 'money' | 'learning' | 'lifestyle' | 'social' | 'other';
}

export interface BiasAlert {
  type: BiasType;
  label: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface AdaptiveQuestion {
  id: string;
  question: string;
  category: 'objective' | 'constraint' | 'emotion';
  answer?: string;
}

export interface DecisionState {
  // Input
  dilemma: string;
  optionA: string;
  optionB: string;

  // Criteria & weights
  criteria: Criterion[];

  // Emotional scoring (0–100)
  emotionalScoreA: number;
  emotionalScoreB: number;

  // Adaptive questions from LLM
  questions: AdaptiveQuestion[];
  currentQuestionIndex: number;

  // Analysis results
  biasAlerts: BiasAlert[];

  // UI state
  isLoading: boolean;
  phase: 'input' | 'questions' | 'weighting' | 'result';

  // ─── Computed (derived, recalculated on demand) ───────────────────────────
  mathematicalScoreA: number;
  mathematicalScoreB: number;
  coherenceScore: number;     // 0–100: how aligned rational & emotional scores are
  regretRiskA: number;        // 0–100: risk of regret if choosing A
  regretRiskB: number;        // 0–100: risk of regret if choosing B

  // ─── Actions ─────────────────────────────────────────────────────────────
  setDilemma: (dilemma: string, optionA: string, optionB: string) => void;
  addCriterion: (criterion: Omit<Criterion, 'id'>) => void;
  updateCriterion: (id: string, updates: Partial<Criterion>) => void;
  removeCriterion: (id: string) => void;
  setEmotionalScores: (a: number, b: number) => void;
  addQuestion: (question: Omit<AdaptiveQuestion, 'id'>) => void;
  answerQuestion: (id: string, answer: string) => void;
  nextQuestion: () => void;
  setBiasAlerts: (alerts: BiasAlert[]) => void;
  setLoading: (loading: boolean) => void;
  setPhase: (phase: DecisionState['phase']) => void;
  computeScores: () => void;
  reset: () => void;
}

// ─── Default criteria (pre-loaded for quick start) ───────────────────────────

const DEFAULT_CRITERIA: Criterion[] = [
  { id: '1', name: 'Apprentissage', weight: 7, scoreA: 5, scoreB: 5, category: 'learning' },
  { id: '2', name: 'Salaire / Finances', weight: 6, scoreA: 5, scoreB: 5, category: 'money' },
  { id: '3', name: 'Évolution de carrière', weight: 8, scoreA: 5, scoreB: 5, category: 'career' },
  { id: '4', name: 'Équilibre vie perso', weight: 5, scoreA: 5, scoreB: 5, category: 'lifestyle' },
];

// ─── Scoring algorithms ───────────────────────────────────────────────────────

function computeMathematicalScore(criteria: Criterion[], side: 'A' | 'B'): number {
  if (criteria.length === 0) return 0;
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return 0;
  const weightedSum = criteria.reduce((sum, c) => {
    return sum + c.weight * (side === 'A' ? c.scoreA : c.scoreB);
  }, 0);
  return Math.round((weightedSum / totalWeight) * 10) / 10; // 0–10
}

function computeCoherence(
  mathA: number,
  mathB: number,
  emotionalA: number,
  emotionalB: number
): number {
  // Coherence = how much the rational winner matches the emotional winner
  const rationalWinner = mathA >= mathB ? 'A' : 'B';
  const emotionalWinner = emotionalA >= emotionalB ? 'A' : 'B';
  if (rationalWinner !== emotionalWinner) return 20; // major conflict
  // If same winner, measure how aligned the margins are
  const rationalMargin = Math.abs(mathA - mathB) / 10; // normalized 0–1
  const emotionalMargin = Math.abs(emotionalA - emotionalB) / 100; // normalized 0–1
  const alignment = 1 - Math.abs(rationalMargin - emotionalMargin);
  return Math.round(alignment * 100);
}

function computeRegretRisk(
  thisMathScore: number,
  otherMathScore: number,
  thisEmotional: number,
  otherEmotional: number,
  biasAlerts: BiasAlert[]
): number {
  // Base risk: how close the scores are (closer = more doubt = more potential regret)
  const mathGap = Math.abs(thisMathScore - otherMathScore) / 10;
  const emotionalGap = Math.abs(thisEmotional - otherEmotional) / 100;

  // Higher gap toward the OTHER option = more regret risk for THIS choice
  const mathRisk = otherMathScore > thisMathScore ? (otherMathScore - thisMathScore) / 10 : 0;
  const emotionalRisk = otherEmotional > thisEmotional ? (otherEmotional - thisEmotional) / 100 : 0;

  // Bias multiplier: more high-severity biases = higher regret risk
  const biasMultiplier =
    1 +
    biasAlerts.reduce((sum, b) => {
      const weight = b.severity === 'high' ? 0.2 : b.severity === 'medium' ? 0.1 : 0.05;
      return sum + weight;
    }, 0);

  const raw = (mathRisk * 0.6 + emotionalRisk * 0.4) * biasMultiplier;
  return Math.min(100, Math.round(raw * 100));
}

// ─── Bias detection (local heuristics — LLM layer adds more) ─────────────────

function detectLocalBiases(
  criteria: Criterion[],
  emotionalA: number,
  emotionalB: number
): BiasAlert[] {
  const alerts: BiasAlert[] = [];

  // Social pressure bias: if social criteria weight is disproportionately high
  const socialWeight = criteria
    .filter((c) => c.category === 'social')
    .reduce((s, c) => s + c.weight, 0);
  const totalWeight = criteria.reduce((s, c) => s + c.weight, 0);
  if (totalWeight > 0 && socialWeight / totalWeight > 0.35) {
    alerts.push({
      type: 'social_pressure',
      label: 'Pression sociale',
      description: 'Le regard des autres semble peser lourd dans cette décision.',
      severity: 'medium',
    });
  }

  // Short-term bias: money heavily weighted vs career/learning
  const moneyWeight = criteria.filter((c) => c.category === 'money').reduce((s, c) => s + c.weight, 0);
  const longTermWeight = criteria
    .filter((c) => c.category === 'career' || c.category === 'learning')
    .reduce((s, c) => s + c.weight, 0);
  if (totalWeight > 0 && moneyWeight > longTermWeight * 1.5) {
    alerts.push({
      type: 'short_term',
      label: 'Biais court terme',
      description: "Les gains immédiats (argent) prennent le dessus sur la croissance à long terme.",
      severity: 'medium',
    });
  }

  // Status quo / loss aversion: very high emotional score for one option despite lower math score
  const mathA = computeMathematicalScore(criteria, 'A');
  const mathB = computeMathematicalScore(criteria, 'B');
  const mathWinner = mathA >= mathB ? 'A' : 'B';
  const emotionalWinner = emotionalA >= emotionalB ? 'A' : 'B';
  if (mathWinner !== emotionalWinner) {
    const emotionalGap = Math.abs(emotionalA - emotionalB);
    const mathGap = Math.abs(mathA - mathB);
    if (emotionalGap > 30 && mathGap < 2) {
      alerts.push({
        type: 'loss_aversion',
        label: 'Aversion à la perte',
        description: "Vos émotions poussent fort vers une option que la raison ne confirme pas clairement.",
        severity: 'high',
      });
    } else {
      alerts.push({
        type: 'status_quo',
        label: 'Biais de statu quo',
        description: "Vous semblez favoriser l'option la plus familière ou la moins risquée.",
        severity: 'low',
      });
    }
  }

  return alerts;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useDecisionStore = create<DecisionState>((set, get) => ({
  dilemma: '',
  optionA: '',
  optionB: '',
  criteria: DEFAULT_CRITERIA,
  emotionalScoreA: 50,
  emotionalScoreB: 50,
  questions: [],
  currentQuestionIndex: 0,
  biasAlerts: [],
  isLoading: false,
  phase: 'input',

  // Computed (will be recalculated by computeScores)
  mathematicalScoreA: 5,
  mathematicalScoreB: 5,
  coherenceScore: 50,
  regretRiskA: 0,
  regretRiskB: 0,

  // ─── Actions ───────────────────────────────────────────────────────────────

  setDilemma: (dilemma, optionA, optionB) => set({ dilemma, optionA, optionB }),

  addCriterion: (criterion) =>
    set((state) => ({
      criteria: [
        ...state.criteria,
        { ...criterion, id: Date.now().toString() },
      ],
    })),

  updateCriterion: (id, updates) =>
    set((state) => ({
      criteria: state.criteria.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),

  removeCriterion: (id) =>
    set((state) => ({
      criteria: state.criteria.filter((c) => c.id !== id),
    })),

  setEmotionalScores: (emotionalScoreA, emotionalScoreB) =>
    set({ emotionalScoreA, emotionalScoreB }),

  addQuestion: (question) =>
    set((state) => ({
      questions: [...state.questions, { ...question, id: Date.now().toString() }],
    })),

  answerQuestion: (id, answer) =>
    set((state) => ({
      questions: state.questions.map((q) => (q.id === id ? { ...q, answer } : q)),
    })),

  nextQuestion: () =>
    set((state) => ({ currentQuestionIndex: state.currentQuestionIndex + 1 })),

  setBiasAlerts: (biasAlerts) => set({ biasAlerts }),

  setLoading: (isLoading) => set({ isLoading }),

  setPhase: (phase) => set({ phase }),

  computeScores: () => {
    const state = get();
    const mathA = computeMathematicalScore(state.criteria, 'A');
    const mathB = computeMathematicalScore(state.criteria, 'B');
    const coherence = computeCoherence(mathA, mathB, state.emotionalScoreA, state.emotionalScoreB);
    const localBiases = detectLocalBiases(state.criteria, state.emotionalScoreA, state.emotionalScoreB);
    const allBiases = [...localBiases, ...state.biasAlerts.filter((b) =>
      !localBiases.find((lb) => lb.type === b.type)
    )];
    const regretA = computeRegretRisk(mathA, mathB, state.emotionalScoreA, state.emotionalScoreB, allBiases);
    const regretB = computeRegretRisk(mathB, mathA, state.emotionalScoreB, state.emotionalScoreA, allBiases);

    set({
      mathematicalScoreA: mathA,
      mathematicalScoreB: mathB,
      coherenceScore: coherence,
      biasAlerts: allBiases,
      regretRiskA: regretA,
      regretRiskB: regretB,
    });
  },

  reset: () =>
    set({
      dilemma: '',
      optionA: '',
      optionB: '',
      criteria: DEFAULT_CRITERIA,
      emotionalScoreA: 50,
      emotionalScoreB: 50,
      questions: [],
      currentQuestionIndex: 0,
      biasAlerts: [],
      isLoading: false,
      phase: 'input',
      mathematicalScoreA: 5,
      mathematicalScoreB: 5,
      coherenceScore: 50,
      regretRiskA: 0,
      regretRiskB: 0,
    }),
}));
