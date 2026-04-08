import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ChevronRight, Scale } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useDecisionStore } from '@/store/decisionStore';
import { callAppel3 } from '@/services/llmService';
import { AiBadge } from '@/components/AiBadge';
import type { Criterion } from '@/store/decisionStore';

// ─── Slider segmenté ──────────────────────────────────────────────────────────

function SegSlider({
  value,
  onChange,
  color,
}: {
  value: number;
  onChange: (v: number) => void;
  color: string;
}) {
  return (
    <View style={ss.row}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((i) => (
        <TouchableOpacity
          key={i}
          onPress={() => onChange(i)}
          style={[
            ss.seg,
            { backgroundColor: i <= value ? color : Colors.border },
            i === 1 && ss.segFirst,
            i === 10 && ss.segLast,
          ]}
          activeOpacity={0.7}
        />
      ))}
      <Text style={[ss.val, { color }]}>{value}</Text>
    </View>
  );
}

const ss = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  seg: { flex: 1, height: 22, borderRadius: 3 },
  segFirst: { borderTopLeftRadius: 6, borderBottomLeftRadius: 6 },
  segLast: { borderTopRightRadius: 6, borderBottomRightRadius: 6 },
  val: { width: 22, fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightBold, textAlign: 'right' },
});

// ─── Carte critère ─────────────────────────────────────────────────────────────

function CriterionCard({
  criterion,
  weight,
  scoreA,
  scoreB,
  optionALabel,
  optionBLabel,
  onWeightChange,
  onScoreAChange,
  onScoreBChange,
}: {
  criterion: Criterion;
  weight: number;
  scoreA: number;
  scoreB: number;
  optionALabel: string;
  optionBLabel: string;
  onWeightChange: (v: number) => void;
  onScoreAChange: (v: number) => void;
  onScoreBChange: (v: number) => void;
}) {
  const winnerA = scoreA > scoreB;
  const winnerB = scoreB > scoreA;

  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.header}>
        <Text style={cardStyles.label}>{criterion.label}</Text>
        <View style={[cardStyles.importanceBadge, { backgroundColor: Colors.primary + '20' }]}>
          <Text style={cardStyles.importanceText}>Importance</Text>
        </View>
      </View>

      <Text style={cardStyles.description}>{criterion.description}</Text>
      <Text style={cardStyles.rationale}>{criterion.score_rationale}</Text>

      <View style={cardStyles.sliderSection}>
        <Text style={cardStyles.sliderLabel}>Importance</Text>
        <SegSlider value={weight} onChange={onWeightChange} color={Colors.primary} />
      </View>

      <View style={cardStyles.scoresRow}>
        <View style={cardStyles.scoreCol}>
          <View style={cardStyles.scoreLabelRow}>
            <Text style={[cardStyles.optionLabel, winnerA && cardStyles.optionWinner]}>
              {optionALabel}
            </Text>
            {winnerA && <Text style={cardStyles.winnerBadge}>↑</Text>}
          </View>
          <SegSlider value={scoreA} onChange={onScoreAChange} color={Colors.accent} />
        </View>
        <View style={cardStyles.scoreCol}>
          <View style={cardStyles.scoreLabelRow}>
            <Text style={[cardStyles.optionLabel, winnerB && cardStyles.optionWinner]}>
              {optionBLabel}
            </Text>
            {winnerB && <Text style={cardStyles.winnerBadge}>↑</Text>}
          </View>
          <SegSlider value={scoreB} onChange={onScoreBChange} color={Colors.success} />
        </View>
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: Typography.fontSizeMD,
    fontWeight: Typography.fontWeightBold,
    color: Colors.textPrimary,
    flex: 1,
  },
  importanceBadge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  importanceText: {
    fontSize: Typography.fontSizeXS,
    color: Colors.primaryLight,
    fontWeight: Typography.fontWeightSemiBold,
  },
  description: {
    fontSize: Typography.fontSizeSM,
    color: Colors.textSecondary,
    lineHeight: Typography.fontSizeSM * 1.5,
  },
  rationale: {
    fontSize: Typography.fontSizeXS,
    color: Colors.textMuted,
    fontStyle: 'italic',
    lineHeight: Typography.fontSizeXS * 1.5,
  },
  sliderSection: {
    gap: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.xs,
  },
  sliderLabel: {
    fontSize: Typography.fontSizeXS,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoresRow: {
    gap: Spacing.sm,
  },
  scoreCol: {
    gap: Spacing.xs,
  },
  scoreLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  optionLabel: {
    fontSize: Typography.fontSizeSM,
    color: Colors.textMuted,
  },
  optionWinner: {
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeightSemiBold,
  },
  winnerBadge: {
    fontSize: Typography.fontSizeSM,
    color: Colors.success,
    fontWeight: Typography.fontWeightBold,
  },
});

// ─── Score preview flottant ────────────────────────────────────────────────────

function ScorePreview({
  scoreA,
  scoreB,
  optionALabel,
  optionBLabel,
}: {
  scoreA: number;
  scoreB: number;
  optionALabel: string;
  optionBLabel: string;
}) {
  const winnerA = scoreA > scoreB;
  const winnerB = scoreB > scoreA;

  return (
    <View style={previewStyles.wrap}>
      <View style={previewStyles.side}>
        <Text style={[previewStyles.score, winnerA && previewStyles.scoreWinner]}>{scoreA}</Text>
        <Text style={previewStyles.name} numberOfLines={1}>{optionALabel}</Text>
      </View>
      <View style={previewStyles.divider}>
        <Scale size={16} color={Colors.textMuted} />
      </View>
      <View style={previewStyles.side}>
        <Text style={[previewStyles.score, winnerB && previewStyles.scoreWinner]}>{scoreB}</Text>
        <Text style={previewStyles.name} numberOfLines={1}>{optionBLabel}</Text>
      </View>
    </View>
  );
}

const previewStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  side: { flex: 1, alignItems: 'center', gap: 4 },
  score: {
    fontSize: Typography.fontSize3XL,
    fontWeight: Typography.fontWeightBlack,
    color: Colors.textMuted,
  },
  scoreWinner: { color: Colors.primaryLight },
  name: {
    fontSize: Typography.fontSizeXS,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  divider: { paddingHorizontal: Spacing.md },
});

// ─── Écran principal ───────────────────────────────────────────────────────────

export default function WeightingScreen() {
  const router = useRouter();
  const store = useDecisionStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Compute live scores for preview
  function getLiveScores() {
    const criteria = store.criteria;
    if (criteria.length === 0) return { a: 0, b: 0 };
    const totalPoids = criteria.reduce((sum, c) => sum + (store.weights[c.id] ?? c.default_weight), 0);
    if (totalPoids === 0) return { a: 0, b: 0 };
    const sumA = criteria.reduce((sum, c) => sum + (store.userScoresA[c.id] ?? c.score_a) * (store.weights[c.id] ?? c.default_weight), 0);
    const sumB = criteria.reduce((sum, c) => sum + (store.userScoresB[c.id] ?? c.score_b) * (store.weights[c.id] ?? c.default_weight), 0);
    return {
      a: Math.round((sumA / totalPoids) * 10),
      b: Math.round((sumB / totalPoids) * 10),
    };
  }

  const { a: liveA, b: liveB } = getLiveScores();

  async function handleAnalyse() {
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      store.computeScores();
      const s = store;
      const { data: result, provider } = await callAppel3({
        originalText: s.originalText,
        optionALabel: s.optionALabel,
        optionBLabel: s.optionBLabel,
        scoreA: liveA,
        scoreB: liveB,
        labelNiveau: s.labelNiveau || (liveA >= liveB ? `Préférence pour ${s.optionALabel}` : `Préférence pour ${s.optionBLabel}`),
        questions: s.questions,
        answers: s.answers,
        criteria: s.criteria,
        weights: s.weights,
        userScoresA: s.userScoresA,
        userScoresB: s.userScoresB,
      });
      store.setAnalysis(result);
      store.setAiProvider('appel3', provider);
      router.push('/result');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? err?.message ?? 'Erreur inconnue';
      setError(`Erreur : ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.title}>Ajuste les critères</Text>
        <Text style={styles.subtitle}>
          L'IA a nommé ces critères depuis ton texte. Tu peux affiner les poids et les notes.
        </Text>
        <AiBadge provider={store.aiProviders.appel2} />
      </View>

      {/* Résumé contexte */}
      {store.contextSummary ? (
        <View style={styles.contextCard}>
          <Text style={styles.contextText}>{store.contextSummary}</Text>
        </View>
      ) : null}

      {/* Score live */}
      <ScorePreview
        scoreA={liveA}
        scoreB={liveB}
        optionALabel={store.optionALabel}
        optionBLabel={store.optionBLabel}
      />

      {/* Critères */}
      <View style={styles.criteriaList}>
        {store.criteria.map((c) => (
          <CriterionCard
            key={c.id}
            criterion={c}
            weight={store.weights[c.id] ?? c.default_weight}
            scoreA={store.userScoresA[c.id] ?? c.score_a}
            scoreB={store.userScoresB[c.id] ?? c.score_b}
            optionALabel={store.optionALabel}
            optionBLabel={store.optionBLabel}
            onWeightChange={(v) => store.setWeight(c.id, v)}
            onScoreAChange={(v) => store.setUserScoreA(c.id, v)}
            onScoreBChange={(v) => store.setUserScoreB(c.id, v)}
          />
        ))}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* CTA */}
      <TouchableOpacity
        style={[styles.analyseBtn, isSubmitting && styles.analyseBtnDim]}
        onPress={handleAnalyse}
        disabled={isSubmitting}
        activeOpacity={0.85}
      >
        {isSubmitting ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.analyseBtnText}>Analyse finale en cours…</Text>
          </View>
        ) : (
          <View style={styles.loadingRow}>
            <Text style={styles.analyseBtnText}>Voir l'analyse complète</Text>
            <ChevronRight size={18} color="#fff" />
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.footerNote}>
        Les scores sont calculés localement · Aucun chiffre sorti de nulle part
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing['3xl'],
    gap: Spacing.lg,
  },
  header: {
    gap: Spacing.xs,
  },
  title: {
    fontSize: Typography.fontSize2XL,
    fontWeight: Typography.fontWeightBlack,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Typography.fontSizeSM,
    color: Colors.textMuted,
    lineHeight: Typography.fontSizeSM * 1.6,
  },
  contextCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contextText: {
    fontSize: Typography.fontSizeSM,
    color: Colors.textSecondary,
    lineHeight: Typography.fontSizeSM * 1.6,
  },
  criteriaList: {
    gap: Spacing.md,
  },
  errorText: {
    color: Colors.danger,
    fontSize: Typography.fontSizeSM,
    textAlign: 'center',
  },
  analyseBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  analyseBtnDim: {
    opacity: 0.5,
  },
  analyseBtnText: {
    color: '#fff',
    fontSize: Typography.fontSizeLG,
    fontWeight: Typography.fontWeightBold,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  footerNote: {
    textAlign: 'center',
    fontSize: Typography.fontSizeXS,
    color: Colors.textMuted,
    letterSpacing: 0.2,
  },
});
