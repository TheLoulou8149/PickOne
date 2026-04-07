import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView, AnimatePresence } from 'moti';
import { AlertTriangle, TrendingUp, Heart, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useDecisionStore } from '@/store/decisionStore';
import { getFullAnalysis } from '@/services/llmService';

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreBar({
  label,
  value,
  max = 10,
  color,
  delay = 0,
}: {
  label: string;
  value: number;
  max?: number;
  color: string;
  delay?: number;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <View style={scoreBarStyles.container}>
      <Text style={scoreBarStyles.label}>{label}</Text>
      <View style={scoreBarStyles.track}>
        <MotiView
          from={{ width: '0%' }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'timing', duration: 800, delay }}
          style={[scoreBarStyles.fill, { backgroundColor: color }]}
        />
      </View>
      <Text style={[scoreBarStyles.value, { color }]}>{value.toFixed(1)}</Text>
    </View>
  );
}

const scoreBarStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  label: {
    width: 90,
    fontSize: Typography.fontSizeSM,
    color: Colors.textSecondary,
  },
  track: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  value: {
    width: 36,
    textAlign: 'right',
    fontSize: Typography.fontSizeSM,
    fontWeight: Typography.fontWeightBold,
  },
});

function BiasCard({ alert, index }: { alert: any; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const color =
    alert.severity === 'high'
      ? Colors.danger
      : alert.severity === 'medium'
      ? Colors.warning
      : Colors.textMuted;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 400, delay: index * 100 }}
    >
      <TouchableOpacity
        style={[biasStyles.card, { borderLeftColor: color }]}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.8}
      >
        <View style={biasStyles.header}>
          <View style={biasStyles.titleRow}>
            <AlertTriangle size={14} color={color} />
            <Text style={[biasStyles.title, { color }]}>{alert.label}</Text>
          </View>
          {expanded ? (
            <ChevronUp size={16} color={Colors.textMuted} />
          ) : (
            <ChevronDown size={16} color={Colors.textMuted} />
          )}
        </View>
        {expanded && alert.description ? (
          <Text style={biasStyles.description}>{alert.description}</Text>
        ) : null}
      </TouchableOpacity>
    </MotiView>
  );
}

const biasStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderLeftWidth: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    fontSize: Typography.fontSizeSM,
    fontWeight: Typography.fontWeightSemiBold,
  },
  description: {
    marginTop: Spacing.sm,
    fontSize: Typography.fontSizeSM,
    color: Colors.textSecondary,
    lineHeight: Typography.fontSizeSM * Typography.lineHeightRelaxed,
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ResultScreen() {
  const router = useRouter();
  const store = useDecisionStore();
  const [llmReasoning, setLlmReasoning] = useState('');
  const [llmRecommendation, setLlmRecommendation] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(true);

  useEffect(() => {
    runAnalysis();
  }, []);

  async function runAnalysis() {
    store.computeScores();
    setIsAnalyzing(true);

    try {
      const previousQA = store.questions
        .filter((q) => q.answer)
        .map((q) => ({ question: q.question, answer: q.answer! }));

      const result = await getFullAnalysis(
        { dilemma: store.dilemma, optionA: store.optionA, optionB: store.optionB, previousQA },
        store.mathematicalScoreA,
        store.mathematicalScoreB,
        store.emotionalScoreA,
        store.emotionalScoreB
      );

      if (result.biasAlerts?.length) {
        store.setBiasAlerts(result.biasAlerts as any);
      }
      store.computeScores(); // recompute with LLM biases added

      setLlmRecommendation(result.recommendation);
      setLlmReasoning(result.reasoning);
    } catch {
      const winner =
        store.mathematicalScoreA >= store.mathematicalScoreB ? store.optionA : store.optionB;
      setLlmRecommendation(winner);
      setLlmReasoning("Basé sur ton analyse multi-critères, cette option score mieux globalement.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  const winnerIsA =
    llmRecommendation.toLowerCase().includes('option a') ||
    llmRecommendation === store.optionA;

  const winnerName = winnerIsA ? store.optionA : store.optionB;

  const mathScoreColor = (score: number) =>
    score >= 7 ? Colors.scoreHigh : score >= 5 ? Colors.scoreMid : Colors.scoreLow;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Recommendation card */}
      <AnimatePresence>
        {isAnalyzing ? (
          <MotiView
            key="loading"
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.loadingCard}
          >
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Calcul en cours…</Text>
          </MotiView>
        ) : (
          <MotiView
            key="result"
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 18 }}
            style={styles.winnerCard}
          >
            <Text style={styles.winnerLabel}>Recommandation PickOne</Text>
            <Text style={styles.winnerName}>{winnerName}</Text>
            {llmReasoning ? (
              <Text style={styles.winnerReasoning}>{llmReasoning}</Text>
            ) : null}
          </MotiView>
        )}
      </AnimatePresence>

      {/* Scores section */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 600, delay: 300 }}
        style={styles.section}
      >
        <View style={styles.sectionHeader}>
          <TrendingUp size={16} color={Colors.accent} />
          <Text style={styles.sectionTitle}>Scores rationnel</Text>
        </View>
        <ScoreBar
          label={store.optionA}
          value={store.mathematicalScoreA}
          color={mathScoreColor(store.mathematicalScoreA)}
          delay={400}
        />
        <ScoreBar
          label={store.optionB}
          value={store.mathematicalScoreB}
          color={mathScoreColor(store.mathematicalScoreB)}
          delay={500}
        />
      </MotiView>

      {/* Emotional scores */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 600, delay: 500 }}
        style={styles.section}
      >
        <View style={styles.sectionHeader}>
          <Heart size={16} color={Colors.danger} />
          <Text style={styles.sectionTitle}>Score émotionnel</Text>
        </View>
        <ScoreBar
          label={store.optionA}
          value={store.emotionalScoreA}
          max={100}
          color={Colors.danger}
          delay={600}
        />
        <ScoreBar
          label={store.optionB}
          value={store.emotionalScoreB}
          max={100}
          color={Colors.danger}
          delay={700}
        />
      </MotiView>

      {/* Coherence score */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 600, delay: 700 }}
        style={styles.coherenceRow}
      >
        <Text style={styles.coherenceLabel}>Cohérence raison / émotion</Text>
        <Text
          style={[
            styles.coherenceValue,
            {
              color:
                store.coherenceScore >= 70
                  ? Colors.success
                  : store.coherenceScore >= 40
                  ? Colors.warning
                  : Colors.danger,
            },
          ]}
        >
          {store.coherenceScore}%
        </Text>
      </MotiView>

      {/* Regret Simulator */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 600, delay: 800 }}
        style={[styles.section, styles.regretSection]}
      >
        <Text style={styles.regretTitle}>Regret Simulator</Text>
        <Text style={styles.regretSubtitle}>
          Si tu choisis cette option, quel est le risque de regretter ?
        </Text>
        <View style={styles.regretRow}>
          <View style={styles.regretItem}>
            <Text style={styles.regretOptionName}>{store.optionA}</Text>
            <Text
              style={[
                styles.regretRisk,
                { color: store.regretRiskA > 50 ? Colors.danger : Colors.success },
              ]}
            >
              {store.regretRiskA}%
            </Text>
            <Text style={styles.regretRiskLabel}>de regret</Text>
          </View>
          <View style={styles.regretDivider} />
          <View style={styles.regretItem}>
            <Text style={styles.regretOptionName}>{store.optionB}</Text>
            <Text
              style={[
                styles.regretRisk,
                { color: store.regretRiskB > 50 ? Colors.danger : Colors.success },
              ]}
            >
              {store.regretRiskB}%
            </Text>
            <Text style={styles.regretRiskLabel}>de regret</Text>
          </View>
        </View>
      </MotiView>

      {/* Bias alerts */}
      {store.biasAlerts.length > 0 && (
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600, delay: 900 }}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <AlertTriangle size={16} color={Colors.warning} />
            <Text style={styles.sectionTitle}>Biais détectés</Text>
          </View>
          {store.biasAlerts.map((alert, i) => (
            <BiasCard key={alert.type + i} alert={alert} index={i} />
          ))}
        </MotiView>
      )}

      {/* Restart button */}
      <TouchableOpacity
        style={styles.restartButton}
        onPress={() => {
          store.reset();
          router.replace('/');
        }}
        activeOpacity={0.8}
      >
        <RotateCcw size={16} color={Colors.textSecondary} />
        <Text style={styles.restartText}>Nouveau dilemme</Text>
      </TouchableOpacity>
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
  loadingCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing['2xl'],
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 140,
    justifyContent: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizeMD,
  },
  winnerCard: {
    backgroundColor: Colors.primary + '15',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    gap: Spacing.sm,
  },
  winnerLabel: {
    fontSize: Typography.fontSizeXS,
    fontWeight: Typography.fontWeightSemiBold,
    color: Colors.primaryLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  winnerName: {
    fontSize: Typography.fontSize2XL,
    fontWeight: Typography.fontWeightBlack,
    color: Colors.textPrimary,
  },
  winnerReasoning: {
    fontSize: Typography.fontSizeMD,
    color: Colors.textSecondary,
    lineHeight: Typography.fontSizeMD * Typography.lineHeightRelaxed,
    marginTop: Spacing.xs,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSizeSM,
    fontWeight: Typography.fontWeightSemiBold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  coherenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  coherenceLabel: {
    fontSize: Typography.fontSizeSM,
    color: Colors.textSecondary,
  },
  coherenceValue: {
    fontSize: Typography.fontSizeLG,
    fontWeight: Typography.fontWeightBold,
  },
  regretSection: {
    backgroundColor: '#1A0A0A',
    borderColor: Colors.danger + '30',
  },
  regretTitle: {
    fontSize: Typography.fontSizeLG,
    fontWeight: Typography.fontWeightBold,
    color: Colors.danger,
    marginBottom: Spacing.xs,
  },
  regretSubtitle: {
    fontSize: Typography.fontSizeSM,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
  },
  regretRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  regretItem: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  regretDivider: {
    width: 1,
    height: 60,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  regretOptionName: {
    fontSize: Typography.fontSizeSM,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  regretRisk: {
    fontSize: Typography.fontSize3XL,
    fontWeight: Typography.fontWeightBlack,
  },
  regretRiskLabel: {
    fontSize: Typography.fontSizeXS,
    color: Colors.textMuted,
  },
  restartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  restartText: {
    fontSize: Typography.fontSizeMD,
    color: Colors.textSecondary,
  },
});
