import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Minus,
} from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import type { Decision } from './index';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ─── 1. Verdict ───────────────────────────────────────────────────────────────

function VerdictCard({ label, reason }: { label: string; reason: string }) {
  return (
    <View style={verdictStyles.card}>
      <Text style={verdictStyles.micro}>VERDICT</Text>
      <Text style={verdictStyles.title}>{label}</Text>
      {reason ? <Text style={verdictStyles.reason}>{reason}</Text> : null}
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

function ScoresCard({ scoreA, scoreB, optionA, optionB }: {
  scoreA: number; scoreB: number; optionA: string; optionB: string;
}) {
  const winnerA = scoreA >= scoreB;
  const items = [
    { label: optionA, score: scoreA, isFirst: winnerA },
    { label: optionB, score: scoreB, isFirst: !winnerA },
  ].sort((a, b) => b.score - a.score);

  return (
    <View style={scoresStyles.card}>
      <Text style={scoresStyles.micro}>SCORES PONDÉRÉS</Text>
      {items.map((item, rank) => {
        const rankColor = rank === 0 ? Colors.primary : Colors.textMuted;
        const barColor = rank === 0 ? Colors.textPrimary : '#D1D1D1';
        return (
          <View key={item.label} style={scoresStyles.row}>
            <View style={scoresStyles.rowHeader}>
              <Text style={[scoresStyles.rank, { color: rankColor }]}>#{rank + 1}</Text>
              <Text style={scoresStyles.name} numberOfLines={1}>{item.label}</Text>
              <View style={scoresStyles.scoreWrap}>
                <Text style={scoresStyles.scoreNum}>{item.score}</Text>
                <Text style={scoresStyles.scoreMax}>/100</Text>
              </View>
            </View>
            <View style={scoresStyles.track}>
              <View style={[scoresStyles.fill, { width: `${item.score}%` as any, backgroundColor: barColor }]} />
            </View>
          </View>
        );
      })}
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
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rank: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightBold, width: 24 },
  name: { flex: 1, fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightMedium, color: Colors.textPrimary },
  scoreWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  scoreNum: { fontSize: 20, fontWeight: '700' as const, color: Colors.textPrimary, letterSpacing: -0.5 },
  scoreMax: { fontSize: Typography.fontSizeSM, color: Colors.textMuted },
  track: { height: 3, backgroundColor: '#EFEFEF', borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
});

// ─── 3. Simulation de regret (side by side) ───────────────────────────────────

function RegretSection({ chosenScore, otherScore, chosenLabel, otherLabel, chosenReason, otherReason }: {
  chosenScore: number; otherScore: number;
  chosenLabel: string; otherLabel: string;
  chosenReason: string; otherReason: string;
}) {
  return (
    <View style={regretStyles.section}>
      <Text style={regretStyles.micro}>SIMULATION DE REGRET</Text>
      <View style={regretStyles.row}>
        <View style={[regretStyles.card, regretStyles.cardRecommended]}>
          <View style={regretStyles.pill}>
            <Text style={regretStyles.pillText}>Recommandé</Text>
          </View>
          <Text style={regretStyles.optionName} numberOfLines={2}>{chosenLabel}</Text>
          <Text style={regretStyles.scoreBlack}>{chosenScore}%</Text>
          <Text style={regretStyles.scoreLabel}>risque de regret dans 1 an</Text>
          {chosenReason ? <Text style={regretStyles.reason}>{chosenReason}</Text> : null}
        </View>
        <View style={regretStyles.card}>
          <View style={regretStyles.pillPlaceholder} />
          <Text style={regretStyles.optionName} numberOfLines={2}>{otherLabel}</Text>
          <Text style={regretStyles.scoreOrange}>{otherScore}%</Text>
          <Text style={regretStyles.scoreLabel}>risque de regret dans 1 an</Text>
          {otherReason ? <Text style={regretStyles.reason}>{otherReason}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const regretStyles = StyleSheet.create({
  section: { gap: 10 },
  micro: {
    fontSize: 10, fontWeight: '600' as const, color: Colors.textMuted,
    letterSpacing: 1.2, textTransform: 'uppercase',
  },
  row: { flexDirection: 'row', gap: 10 },
  card: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 6,
  },
  cardRecommended: { borderColor: Colors.textPrimary },
  pill: {
    alignSelf: 'flex-start', backgroundColor: Colors.primaryPale,
    borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: Colors.primary + '40',
  },
  pillText: { fontSize: 10, fontWeight: '600' as const, color: Colors.primary },
  pillPlaceholder: { height: 22 },
  optionName: { fontSize: Typography.fontSizeXS, color: Colors.textMuted, lineHeight: 16 },
  scoreBlack: { fontSize: 26, fontWeight: '700' as const, color: Colors.textPrimary, letterSpacing: -1, lineHeight: 30 },
  scoreOrange: { fontSize: 26, fontWeight: '700' as const, color: Colors.primary, letterSpacing: -1, lineHeight: 30 },
  scoreLabel: { fontSize: 10, color: Colors.textMuted, lineHeight: 14 },
  reason: {
    fontSize: Typography.fontSizeXS, color: Colors.textSecondary,
    lineHeight: 16, fontStyle: 'italic', marginTop: 2,
  },
});

// ─── 4. Biais (pills) ────────────────────────────────────────────────────────

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
    fontSize: 10, fontWeight: '600' as const, color: Colors.textMuted,
    letterSpacing: 1.2, textTransform: 'uppercase',
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surface, borderRadius: 100,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: Colors.border,
  },
  pillActive: { borderColor: Colors.textSecondary },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.textMuted },
  pillText: { fontSize: Typography.fontSizeSM, color: Colors.textSecondary, fontWeight: Typography.fontWeightMedium },
  explanation: { fontSize: Typography.fontSizeXS, color: Colors.textSecondary, lineHeight: 17, paddingHorizontal: 4 },
});

// ─── 5. Cohérence ─────────────────────────────────────────────────────────────

function CoherenceCard({ message }: { message: string }) {
  const isAccord = message.includes('même sens');
  const isNeutre = message.includes("pas de préférence");
  const icon = isAccord
    ? <CheckCircle size={16} color={Colors.success} />
    : isNeutre
      ? <Minus size={16} color={Colors.warning} />
      : <AlertCircle size={16} color={Colors.warning} />;
  return (
    <View style={coherenceStyles.wrap}>
      {icon}
      <Text style={coherenceStyles.text}>{message}</Text>
    </View>
  );
}

const coherenceStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    backgroundColor: Colors.surfaceGray, borderRadius: BorderRadius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  text: { flex: 1, fontSize: Typography.fontSizeSM, color: Colors.textSecondary, lineHeight: Typography.fontSizeSM * 1.6 },
});

// ─── 6. Critères ──────────────────────────────────────────────────────────────

function CriteriaBarometers({ criteria, weights }: { criteria: any[]; weights: Record<string, number> }) {
  return (
    <View style={bmStyles.card}>
      <Text style={bmStyles.micro}>CRITÈRES ANALYSÉS</Text>
      {criteria.map((c: any) => {
        const w = weights?.[c.id] ?? c.default_weight;
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
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, gap: 10,
  },
  micro: {
    fontSize: 10, fontWeight: '600' as const, color: Colors.textMuted,
    letterSpacing: 1.2, textTransform: 'uppercase',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  label: { flex: 1.5, fontSize: Typography.fontSizeSM, color: Colors.textSecondary, fontWeight: Typography.fontWeightMedium },
  barWrap: { flex: 2 },
  barTrack: { height: 4, backgroundColor: Colors.border, borderRadius: BorderRadius.full, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: Colors.textPrimary, borderRadius: BorderRadius.full },
  value: { width: 20, fontSize: Typography.fontSizeSM, color: Colors.textMuted, textAlign: 'right', fontWeight: Typography.fontWeightBold },
});

// ─── 7. Angle mort ────────────────────────────────────────────────────────────

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
    backgroundColor: Colors.surfaceGray, borderRadius: BorderRadius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, gap: 8,
  },
  micro: {
    fontSize: 10, fontWeight: '600' as const, color: Colors.textSecondary,
    letterSpacing: 1.2, textTransform: 'uppercase',
  },
  text: { fontSize: 11, color: Colors.textPrimary, lineHeight: 17 },
});

// ─── 8. Question finale ───────────────────────────────────────────────────────

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
    backgroundColor: '#1A1A18', borderRadius: BorderRadius.md,
    padding: Spacing.lg, gap: Spacing.sm,
  },
  micro: {
    fontSize: 10, fontWeight: '600' as const, color: '#F4A58A',
    letterSpacing: 1.2, textTransform: 'uppercase',
  },
  question: {
    fontSize: 14, color: '#FFFFFF',
    fontWeight: Typography.fontWeightSemiBold, lineHeight: 22,
  },
});

// ─── Écran principal ───────────────────────────────────────────────────────────

export default function DecisionDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; data: string }>();
  const d: Decision = JSON.parse(params.data);

  const analysis = d.analysis;
  const winnerIsA = d.winner === d.option_a;
  const chosenLabel = winnerIsA ? d.option_a : d.option_b;
  const otherLabel = winnerIsA ? d.option_b : d.option_a;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title} numberOfLines={1}>{d.option_a} vs {d.option_b}</Text>
          <Text style={styles.date}>{formatDate(d.created_at)}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* 1. Verdict */}
        {d.niveau_reco && d.label_niveau ? (
          <VerdictCard
            label={d.label_niveau}
            reason={analysis?.recommendation_reason ?? ''}
          />
        ) : null}

        {/* 2. Scores */}
        <ScoresCard
          scoreA={d.score_a ?? 0}
          scoreB={d.score_b ?? 0}
          optionA={d.option_a}
          optionB={d.option_b}
        />

        {/* 3. Regret */}
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

        {/* 4. Biais */}
        {analysis?.biases?.length > 0 ? (
          <BiasPills biases={analysis.biases} />
        ) : null}

        {/* 5. Angle mort */}
        {analysis?.blindspot ? (
          <BlindspotCard text={analysis.blindspot} />
        ) : null}

        {/* Cohérence instinct */}
        {d.message_coherence ? <CoherenceCard message={d.message_coherence} /> : null}

        {/* Critères */}
        {d.criteria?.length > 0 ? (
          <CriteriaBarometers criteria={d.criteria} weights={d.weights ?? {}} />
        ) : null}

        {/* 6. Question finale */}
        {analysis?.deciding_question ? (
          <DecidingQuestion question={analysis.deciding_question} />
        ) : null}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.lg,
    borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.sm,
  },
  backBtn: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, backgroundColor: Colors.surfaceElevated,
  },
  headerCenter: { flex: 1 },
  title: { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightBold, color: Colors.textPrimary },
  date: { fontSize: Typography.fontSizeXS, color: Colors.textMuted, marginTop: 2 },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing['3xl'] },
});
