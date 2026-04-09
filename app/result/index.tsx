import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Minus,
} from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useDecisionStore } from '@/store/decisionStore';
import { AiBadge } from '@/components/AiBadge';

// ─── 1. Verdict ───────────────────────────────────────────────────────────────

function VerdictCard({
  label,
  reason,
}: {
  label: string;
  reason: string;
}) {
  return (
    <View style={verdictStyles.card}>
      <Text style={verdictStyles.micro}>VERDICT</Text>
      <Text style={verdictStyles.title}>{label}</Text>
      <Text style={verdictStyles.reason}>{reason}</Text>
    </View>
  );
}

const verdictStyles = StyleSheet.create({
  card: {
    borderLeftWidth: 2,
    borderLeftColor: Colors.primary,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    backgroundColor: Colors.primaryPale,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    paddingVertical: 16,
    paddingRight: 16,
    paddingLeft: 14,
    gap: 6,
  },
  micro: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.primary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  reason: {
    fontSize: Typography.fontSizeSM,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});

// ─── 2. Scores ────────────────────────────────────────────────────────────────

function ScoresCard({
  options,
  scores,
}: {
  options: { id: string; label: string }[];
  scores: Record<string, number>;
}) {
  const sorted = [...options].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));

  return (
    <View style={scoresStyles.card}>
      <Text style={scoresStyles.micro}>SCORES PONDÉRÉS</Text>
      {sorted.map((opt, rank) => {
        const score = scores[opt.id] ?? 0;
        const isFirst = rank === 0;
        const rankColor = isFirst ? Colors.primary : Colors.textMuted;
        const barColor = isFirst ? Colors.textPrimary : '#D1D1D1';
        return (
          <View key={opt.id} style={scoresStyles.row}>
            <View style={scoresStyles.rowHeader}>
              <Text style={[scoresStyles.rank, { color: rankColor }]}>#{rank + 1}</Text>
              <Text style={scoresStyles.name} numberOfLines={1}>{opt.label}</Text>
              <View style={scoresStyles.scoreWrap}>
                <Text style={scoresStyles.scoreNum}>{score}</Text>
                <Text style={scoresStyles.scoreMax}>/100</Text>
              </View>
            </View>
            <View style={scoresStyles.track}>
              <View style={[scoresStyles.fill, { width: `${score}%` as any, backgroundColor: barColor }]} />
            </View>
          </View>
        );
      })}
      <Text style={scoresStyles.note}>Scores calculés selon tes priorités personnalisées</Text>
    </View>
  );
}

const scoresStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  micro: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  row: { gap: 8 },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rank: {
    fontSize: Typography.fontSizeSM,
    fontWeight: Typography.fontWeightBold,
    width: 24,
  },
  name: {
    flex: 1,
    fontSize: Typography.fontSizeMD,
    fontWeight: Typography.fontWeightMedium,
    color: Colors.textPrimary,
  },
  scoreWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  scoreNum: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  scoreMax: {
    fontSize: Typography.fontSizeSM,
    color: Colors.textMuted,
  },
  track: {
    height: 3,
    backgroundColor: '#EFEFEF',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  note: {
    fontSize: Typography.fontSizeXS,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
});

// ─── 3. Simulation de regret (side by side) ───────────────────────────────────

function RegretSection({
  chosenScore,
  otherScore,
  chosenLabel,
  otherLabel,
  chosenReason,
  otherReason,
}: {
  chosenScore: number;
  otherScore: number;
  chosenLabel: string;
  otherLabel: string;
  chosenReason: string;
  otherReason: string;
}) {
  return (
    <View style={regretStyles.section}>
      <Text style={regretStyles.micro}>SIMULATION DE REGRET</Text>
      <View style={regretStyles.row}>
        {/* Carte recommandée (gauche) */}
        <View style={[regretStyles.card, regretStyles.cardRecommended]}>
          <View style={regretStyles.pill}>
            <Text style={regretStyles.pillText}>Recommandé</Text>
          </View>
          <Text style={regretStyles.optionName} numberOfLines={2}>{chosenLabel}</Text>
          <Text style={regretStyles.scoreBlack}>{chosenScore}%</Text>
          <Text style={regretStyles.scoreLabel}>risque de regret dans 1 an</Text>
          {chosenReason ? (
            <Text style={regretStyles.reason}>{chosenReason}</Text>
          ) : null}
        </View>

        {/* Carte autre option (droite) */}
        <View style={regretStyles.card}>
          <View style={regretStyles.pillPlaceholder} />
          <Text style={regretStyles.optionName} numberOfLines={2}>{otherLabel}</Text>
          <Text style={regretStyles.scoreOrange}>{otherScore}%</Text>
          <Text style={regretStyles.scoreLabel}>risque de regret dans 1 an</Text>
          {otherReason ? (
            <Text style={regretStyles.reason}>{otherReason}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const regretStyles = StyleSheet.create({
  section: {
    gap: 10,
  },
  micro: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  cardRecommended: {
    borderColor: Colors.textPrimary,
  },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryPale,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  pillText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  pillPlaceholder: {
    height: 22,
  },
  optionName: {
    fontSize: Typography.fontSizeXS,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  scoreBlack: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    letterSpacing: -1,
    lineHeight: 30,
  },
  scoreOrange: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.primary,
    letterSpacing: -1,
    lineHeight: 30,
  },
  scoreLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    lineHeight: 14,
  },
  reason: {
    fontSize: Typography.fontSizeXS,
    color: Colors.textSecondary,
    lineHeight: 16,
    fontStyle: 'italic',
    marginTop: 2,
  },
});

// ─── 4. Biais détectés (pills) ────────────────────────────────────────────────

function BiasPills({ biases }: { biases: { name: string; explanation: string }[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <View style={pillsStyles.section}>
      <Text style={pillsStyles.micro}>BIAIS DÉTECTÉS</Text>
      <View style={pillsStyles.row}>
        {biases.map((b, i) => (
          <TouchableOpacity
            key={i}
            style={[pillsStyles.pill, expanded === i && pillsStyles.pillActive]}
            onPress={() => setExpanded(expanded === i ? null : i)}
            activeOpacity={0.7}
          >
            <View style={pillsStyles.dot} />
            <Text style={pillsStyles.pillText}>{b.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {expanded !== null && (
        <Text style={pillsStyles.explanation}>{biases[expanded].explanation}</Text>
      )}
    </View>
  );
}

const pillsStyles = StyleSheet.create({
  section: { gap: 10 },
  micro: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillActive: {
    borderColor: Colors.textSecondary,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.textMuted,
  },
  pillText: {
    fontSize: Typography.fontSizeSM,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeightMedium,
  },
  explanation: {
    fontSize: Typography.fontSizeXS,
    color: Colors.textSecondary,
    lineHeight: 17,
    paddingHorizontal: 4,
  },
});

// ─── 5. Angle mort ────────────────────────────────────────────────────────────

function BlindspotCard({ text }: { text: string }) {
  return (
    <View style={blindStyles.card}>
      <Text style={blindStyles.micro}>ANGLE MORT</Text>
      <Text style={blindStyles.text}>{text}</Text>
    </View>
  );
}

const blindStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  micro: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  text: {
    fontSize: 11,
    color: Colors.textPrimary,
    lineHeight: 17,
  },
});

// ─── 6. Question finale ───────────────────────────────────────────────────────

function DecidingQuestion({ question }: { question: string }) {
  return (
    <View style={dqStyles.card}>
      <Text style={dqStyles.micro}>LA QUESTION QUI TRANCHE</Text>
      <Text style={dqStyles.question}>{question}</Text>
    </View>
  );
}

const dqStyles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A18',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  micro: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#F4A58A',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  question: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: Typography.fontWeightSemiBold,
    lineHeight: 22,
  },
});

// ─── Cohérence instinct / logique ─────────────────────────────────────────────

function CoherenceCard({ message }: { message: string }) {
  const isAccord = message.includes('même sens');
  const isNeutre = message.includes("pas de préférence");

  const icon = isAccord ? (
    <CheckCircle size={16} color={Colors.success} />
  ) : isNeutre ? (
    <Minus size={16} color={Colors.warning} />
  ) : (
    <AlertCircle size={16} color={Colors.warning} />
  );

  return (
    <View style={coherenceStyles.wrap}>
      {icon}
      <Text style={coherenceStyles.text}>{message}</Text>
    </View>
  );
}

const coherenceStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  text: {
    flex: 1,
    fontSize: Typography.fontSizeSM,
    color: Colors.textSecondary,
    lineHeight: Typography.fontSizeSM * 1.6,
  },
});

// ─── Baromètres critères ──────────────────────────────────────────────────────

function CriteriaBarometers({
  criteria,
  weights,
}: {
  criteria: any[];
  weights: Record<string, number>;
}) {
  return (
    <View style={bmStyles.card}>
      <Text style={bmStyles.micro}>CRITÈRES ANALYSÉS</Text>
      {criteria.map((c) => {
        const w = weights[c.id] ?? c.default_weight;
        return (
          <View key={c.id} style={bmStyles.row}>
            <Text style={bmStyles.label}>{c.label}</Text>
            <View style={bmStyles.barWrap}>
              <View style={bmStyles.barTrack}>
                <View style={[bmStyles.barFill, { width: `${w * 10}%` as any }]} />
              </View>
            </View>
            <Text style={bmStyles.value}>{w}</Text>
          </View>
        );
      })}
    </View>
  );
}

const bmStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  micro: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  label: {
    flex: 1.5,
    fontSize: Typography.fontSizeSM,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeightMedium,
  },
  barWrap: { flex: 2 },
  barTrack: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: Colors.textPrimary,
    borderRadius: BorderRadius.full,
  },
  value: {
    width: 20,
    fontSize: Typography.fontSizeSM,
    color: Colors.textMuted,
    textAlign: 'right',
    fontWeight: Typography.fontWeightBold,
  },
});

// ─── Plan B ───────────────────────────────────────────────────────────────────

function PlanBCard({ text }: { text: string }) {
  return (
    <View style={planBStyles.card}>
      <Text style={planBStyles.micro}>ET SI TU FAISAIS TOUT AUTRE CHOSE ?</Text>
      <Text style={planBStyles.text}>{text}</Text>
    </View>
  );
}

const planBStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  micro: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  text: {
    fontSize: Typography.fontSizeSM,
    color: Colors.textSecondary,
    lineHeight: Typography.fontSizeSM * 1.6,
    fontStyle: 'italic',
  },
});

// ─── Écran principal ───────────────────────────────────────────────────────────

export default function ResultScreen() {
  const router = useRouter();
  const store = useDecisionStore();
  const analysis = store.analysis;
  const hasSaved = useRef(false);

  useEffect(() => {
    if (!analysis || hasSaved.current) return;
    hasSaved.current = true;

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        console.warn('[PickOne] Pas d\'utilisateur connecté, sauvegarde ignorée');
        return;
      }
      const { error } = await supabase.from('decisions').insert({
        user_id: user.id,
        dilemma: store.originalText,
        option_a: store.options[0]?.label ?? '',
        option_b: store.options[1]?.label ?? '',
        winner: store.winner,
        score_a: store.scores[store.options[0]?.id ?? ''] ?? 0,
        score_b: store.scores[store.options[1]?.id ?? ''] ?? 0,
        niveau_reco: store.niveauReco,
        label_niveau: store.labelNiveau,
        message_coherence: store.messageCoherence,
        context_summary: store.contextSummary,
        weights: store.weights,
        analysis: store.analysis,
        criteria: store.criteria,
        answers: store.answers,
      });
      if (error) {
        console.error('[PickOne] Erreur sauvegarde décision:', error.message, error.code);
      } else {
        console.log('[PickOne] Décision sauvegardée ✓');
        const { data: stats } = await supabase
          .from('user_stats')
          .select('total_decisions')
          .eq('user_id', user.id)
          .maybeSingle();
        const { error: statsErr } = await supabase.from('user_stats').upsert(
          { user_id: user.id, total_decisions: (stats?.total_decisions ?? 0) + 1 },
          { onConflict: 'user_id' }
        );
        if (statsErr) console.error('[PickOne] Erreur stats:', statsErr.message);
        else console.log('[PickOne] total_decisions:', (stats?.total_decisions ?? 0) + 1);
      }
    });
  }, [analysis]);

  const sortedOptions = [...store.options].sort(
    (a, b) => (store.scores[b.id] ?? 0) - (store.scores[a.id] ?? 0)
  );
  const chosenLabel = sortedOptions[0]?.label ?? store.winner;
  const otherLabel = sortedOptions[1]?.label ?? '';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Verdict */}
      {store.labelNiveau ? (
        <VerdictCard
          label={store.labelNiveau}
          reason={analysis?.recommendation_reason ?? ''}
        />
      ) : null}

      {/* 2. Scores */}
      <ScoresCard
        options={store.options}
        scores={store.scores}
      />

      {/* 3. Simulation de regret */}
      {analysis ? (
        <RegretSection
          chosenScore={analysis.regret_score_chosen}
          otherScore={analysis.regret_score_other}
          chosenLabel={chosenLabel}
          otherLabel={otherLabel}
          chosenReason={analysis.regret_chosen_reason ?? ''}
          otherReason={analysis.regret_other_reason ?? ''}
        />
      ) : null}

      {/* 4. Biais détectés */}
      {analysis?.biases && analysis.biases.length > 0 ? (
        <BiasPills biases={analysis.biases} />
      ) : null}

      {/* 5. Angle mort */}
      {analysis?.blindspot ? (
        <BlindspotCard text={analysis.blindspot} />
      ) : null}

      {/* Cohérence instinct / logique */}
      {store.messageCoherence ? (
        <CoherenceCard message={store.messageCoherence} />
      ) : null}

      {/* Baromètres critères */}
      {store.criteria.length > 0 ? (
        <CriteriaBarometers
          criteria={store.criteria}
          weights={store.weights}
        />
      ) : null}

      {/* Plan B */}
      {analysis?.alternative_strategy ? (
        <PlanBCard text={analysis.alternative_strategy} />
      ) : null}

      {/* 6. Question finale */}
      {analysis?.deciding_question ? (
        <DecidingQuestion question={analysis.deciding_question} />
      ) : null}

      {/* Badge IA */}
      <AiBadge provider={store.aiProviders.appel3} />

      {/* Restart */}
      <TouchableOpacity
        style={styles.restartBtn}
        onPress={() => {
          store.reset();
          router.replace('/');
        }}
        activeOpacity={0.8}
      >
        <RotateCcw size={14} color={Colors.textMuted} />
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
    gap: Spacing.md,
  },
  restartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.sm,
  },
  restartText: {
    fontSize: Typography.fontSizeSM,
    color: Colors.textMuted,
  },
});
