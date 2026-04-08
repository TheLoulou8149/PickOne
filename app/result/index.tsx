import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  RotateCcw,
  AlertTriangle,
  Eye,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  Minus,
} from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useDecisionStore } from '@/store/decisionStore';

// ─── Couleurs niveau de reco ───────────────────────────────────────────────────

const NIVEAU_COLOR = {
  serré: '#F59E0B',
  léger: '#3B82F6',
  clair: '#10B981',
} as const;

// ─── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View style={[sectionStyles.wrap, style]}>
      {children}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
});

function SectionTitle({ children, color }: { children: string; color?: string }) {
  return (
    <Text style={[titleStyles.text, color ? { color } : null]}>
      {children}
    </Text>
  );
}

const titleStyles = StyleSheet.create({
  text: {
    fontSize: Typography.fontSizeXS,
    fontWeight: Typography.fontWeightSemiBold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

// ─── 1. Niveau de recommandation ──────────────────────────────────────────────

function NiveauCard({
  niveau,
  label,
  reason,
}: {
  niveau: 'serré' | 'léger' | 'clair';
  label: string;
  reason: string;
}) {
  const color = NIVEAU_COLOR[niveau];
  return (
    <Section style={{ borderColor: color + '50', backgroundColor: color + '0D' }}>
      <View style={niveauStyles.badge}>
        <View style={[niveauStyles.dot, { backgroundColor: color }]} />
        <Text style={[niveauStyles.label, { color }]}>{label}</Text>
      </View>
      <Text style={niveauStyles.reason}>{reason}</Text>
    </Section>
  );
}

const niveauStyles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold },
  reason: { fontSize: Typography.fontSizeSM, color: Colors.textSecondary, lineHeight: Typography.fontSizeSM * 1.6 },
});

// ─── 2. Scores A vs B ─────────────────────────────────────────────────────────

function ScoresCard({
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
    <Section>
      <SectionTitle>Scores pondérés</SectionTitle>
      <View style={scoresStyles.row}>
        <View style={scoresStyles.side}>
          <Text style={[scoresStyles.score, winnerA && scoresStyles.scoreWinner]}>{scoreA}</Text>
          <Text style={scoresStyles.label} numberOfLines={2}>{optionALabel}</Text>
          {winnerA && <Text style={scoresStyles.winnerTag}>Gagnant</Text>}
        </View>
        <View style={scoresStyles.sep}>
          <Text style={scoresStyles.sepText}>/100</Text>
        </View>
        <View style={scoresStyles.side}>
          <Text style={[scoresStyles.score, winnerB && scoresStyles.scoreWinner]}>{scoreB}</Text>
          <Text style={scoresStyles.label} numberOfLines={2}>{optionBLabel}</Text>
          {winnerB && <Text style={scoresStyles.winnerTag}>Gagnant</Text>}
        </View>
      </View>
    </Section>
  );
}

const scoresStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  side: { flex: 1, alignItems: 'center', gap: 4 },
  score: {
    fontSize: 52,
    fontWeight: Typography.fontWeightBlack,
    color: Colors.textMuted,
    lineHeight: 56,
  },
  scoreWinner: { color: Colors.textPrimary },
  label: { fontSize: Typography.fontSizeSM, color: Colors.textMuted, textAlign: 'center' },
  winnerTag: { fontSize: Typography.fontSizeXS, color: Colors.success, fontWeight: Typography.fontWeightSemiBold },
  sep: { paddingHorizontal: Spacing.md },
  sepText: { fontSize: Typography.fontSizeSM, color: Colors.textMuted },
});

// ─── 3. Cohérence instinct / logique ──────────────────────────────────────────

function CoherenceCard({ message }: { message: string }) {
  const isAccord = message.includes('même sens');
  const isNeutre = message.includes("pas de préférence");

  const icon = isAccord ? (
    <CheckCircle size={18} color={Colors.success} />
  ) : isNeutre ? (
    <Minus size={18} color={Colors.warning} />
  ) : (
    <AlertCircle size={18} color={Colors.warning} />
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
    backgroundColor: Colors.surface,
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

// ─── 4. Détail critères ────────────────────────────────────────────────────────

function CriteriaTable({
  criteria,
  weights,
  scoresA,
  scoresB,
  optionALabel,
  optionBLabel,
}: {
  criteria: any[];
  weights: Record<string, number>;
  scoresA: Record<string, number>;
  scoresB: Record<string, number>;
  optionALabel: string;
  optionBLabel: string;
}) {
  return (
    <Section>
      <SectionTitle>Détail par critère</SectionTitle>
      <View style={tableStyles.headerRow}>
        <Text style={[tableStyles.headerCell, { flex: 2 }]}>Critère</Text>
        <Text style={tableStyles.headerCell}>Poids</Text>
        <Text style={[tableStyles.headerCell, { color: Colors.accent }]}>{optionALabel}</Text>
        <Text style={[tableStyles.headerCell, { color: Colors.success }]}>{optionBLabel}</Text>
      </View>
      {criteria.map((c) => {
        const w = weights[c.id] ?? c.default_weight;
        const a = scoresA[c.id] ?? c.score_a;
        const b = scoresB[c.id] ?? c.score_b;
        const winnerA = a > b;
        const winnerB = b > a;
        return (
          <View key={c.id} style={tableStyles.row}>
            <Text style={[tableStyles.cell, { flex: 2 }]} numberOfLines={2}>{c.label}</Text>
            <Text style={[tableStyles.cell, tableStyles.center]}>{w}</Text>
            <Text style={[tableStyles.cell, tableStyles.center, winnerA && { color: Colors.accent, fontWeight: Typography.fontWeightBold }]}>{a}</Text>
            <Text style={[tableStyles.cell, tableStyles.center, winnerB && { color: Colors.success, fontWeight: Typography.fontWeightBold }]}>{b}</Text>
          </View>
        );
      })}
    </Section>
  );
}

const tableStyles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerCell: {
    flex: 1,
    fontSize: Typography.fontSizeXS,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '60',
  },
  cell: {
    flex: 1,
    fontSize: Typography.fontSizeSM,
    color: Colors.textSecondary,
  },
  center: { textAlign: 'center' },
});

// ─── 5. Biais ─────────────────────────────────────────────────────────────────

function BiasCard({ bias, index }: { bias: { name: string; explanation: string }; index: number }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <TouchableOpacity
      style={biasStyles.card}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.8}
    >
      <View style={biasStyles.header}>
        <View style={biasStyles.titleRow}>
          <AlertTriangle size={14} color={Colors.warning} />
          <Text style={biasStyles.name}>{bias.name}</Text>
        </View>
        {expanded ? <ChevronUp size={14} color={Colors.textMuted} /> : <ChevronDown size={14} color={Colors.textMuted} />}
      </View>
      {expanded && (
        <Text style={biasStyles.explanation}>{bias.explanation}</Text>
      )}
    </TouchableOpacity>
  );
}

const biasStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.warning + '40',
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
    gap: Spacing.sm,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  name: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightSemiBold, color: Colors.warning },
  explanation: { fontSize: Typography.fontSizeSM, color: Colors.textSecondary, lineHeight: Typography.fontSizeSM * 1.6 },
});

// ─── 6-7. Regret ──────────────────────────────────────────────────────────────

function RegretCard({
  score,
  reason,
  optionLabel,
  isChosen,
}: {
  score: number;
  reason: string;
  optionLabel: string;
  isChosen: boolean;
}) {
  const color = score >= 60 ? Colors.danger : score >= 40 ? Colors.warning : Colors.success;
  return (
    <View style={[regretStyles.card, { borderColor: color + '40' }]}>
      <View style={regretStyles.header}>
        <Text style={regretStyles.optionLabel}>{optionLabel}</Text>
        {isChosen && <View style={regretStyles.chosenBadge}><Text style={regretStyles.chosenText}>Recommandé</Text></View>}
      </View>
      <View style={regretStyles.scoreRow}>
        <Text style={[regretStyles.score, { color }]}>{score}%</Text>
        <Text style={regretStyles.scoreLabel}>risque de regret</Text>
      </View>
      <Text style={regretStyles.reason}>{reason}</Text>
    </View>
  );
}

const regretStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  optionLabel: { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightBold, color: Colors.textPrimary, flex: 1 },
  chosenBadge: { backgroundColor: Colors.success + '20', borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderWidth: 1, borderColor: Colors.success + '40' },
  chosenText: { fontSize: Typography.fontSizeXS, color: Colors.success, fontWeight: Typography.fontWeightSemiBold },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.xs },
  score: { fontSize: Typography.fontSize3XL, fontWeight: Typography.fontWeightBlack },
  scoreLabel: { fontSize: Typography.fontSizeSM, color: Colors.textMuted },
  reason: { fontSize: Typography.fontSizeSM, color: Colors.textSecondary, lineHeight: Typography.fontSizeSM * 1.6, fontStyle: 'italic' },
});

// ─── 8. Angle mort ────────────────────────────────────────────────────────────

function BlindspotCard({ text }: { text: string }) {
  return (
    <View style={blindStyles.card}>
      <View style={blindStyles.header}>
        <Eye size={16} color={Colors.accent} />
        <Text style={blindStyles.title}>Angle mort</Text>
      </View>
      <Text style={blindStyles.text}>{text}</Text>
    </View>
  );
}

const blindStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.accent + '30',
    gap: Spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightSemiBold, color: Colors.accent, textTransform: 'uppercase', letterSpacing: 0.5 },
  text: { fontSize: Typography.fontSizeMD, color: Colors.textSecondary, lineHeight: Typography.fontSizeMD * 1.6 },
});

// ─── 9. Question finale ───────────────────────────────────────────────────────

function DecidingQuestion({ question }: { question: string }) {
  return (
    <View style={dqStyles.card}>
      <View style={dqStyles.iconRow}>
        <HelpCircle size={18} color={Colors.primaryLight} />
        <Text style={dqStyles.label}>La question qui tranche tout</Text>
      </View>
      <Text style={dqStyles.question}>"{question}"</Text>
    </View>
  );
}

const dqStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.primary + '12',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    gap: Spacing.md,
    alignItems: 'center',
  },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  label: { fontSize: Typography.fontSizeXS, color: Colors.primaryLight, fontWeight: Typography.fontWeightSemiBold, textTransform: 'uppercase', letterSpacing: 0.5 },
  question: {
    fontSize: Typography.fontSizeLG,
    color: Colors.textPrimary,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: Typography.fontSizeLG * 1.5,
    fontWeight: Typography.fontWeightSemiBold,
  },
});

// ─── Écran principal ───────────────────────────────────────────────────────────

export default function ResultScreen() {
  const router = useRouter();
  const store = useDecisionStore();
  const analysis = store.analysis;

  const winnerIsA = store.scoreA >= store.scoreB;
  const chosenLabel = winnerIsA ? store.optionALabel : store.optionBLabel;
  const otherLabel = winnerIsA ? store.optionBLabel : store.optionALabel;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Niveau de recommandation */}
      {store.labelNiveau ? (
        <NiveauCard
          niveau={store.niveauReco}
          label={store.labelNiveau}
          reason={analysis?.recommendation_reason ?? ''}
        />
      ) : null}

      {/* 2. Scores */}
      <ScoresCard
        scoreA={store.scoreA}
        scoreB={store.scoreB}
        optionALabel={store.optionALabel}
        optionBLabel={store.optionBLabel}
      />

      {/* 3. Cohérence instinct / logique */}
      {store.messageCoherence ? (
        <CoherenceCard message={store.messageCoherence} />
      ) : null}

      {/* 4. Détail critères */}
      {store.criteria.length > 0 ? (
        <CriteriaTable
          criteria={store.criteria}
          weights={store.weights}
          scoresA={store.userScoresA}
          scoresB={store.userScoresB}
          optionALabel={store.optionALabel}
          optionBLabel={store.optionBLabel}
        />
      ) : null}

      {/* 5. Biais */}
      {analysis?.biases && analysis.biases.length > 0 ? (
        <Section>
          <SectionTitle color={Colors.warning}>Biais détectés</SectionTitle>
          {analysis.biases.map((b, i) => (
            <BiasCard key={i} bias={b} index={i} />
          ))}
        </Section>
      ) : null}

      {/* 6-7. Regret */}
      {analysis ? (
        <Section style={{ gap: Spacing.sm }}>
          <SectionTitle>Simulation de regret</SectionTitle>
          <RegretCard
            score={analysis.regret_score_chosen}
            reason={analysis.regret_chosen_reason}
            optionLabel={chosenLabel}
            isChosen
          />
          <RegretCard
            score={analysis.regret_score_other}
            reason={analysis.regret_other_reason}
            optionLabel={otherLabel}
            isChosen={false}
          />
        </Section>
      ) : null}

      {/* 8. Angle mort */}
      {analysis?.blindspot ? (
        <BlindspotCard text={analysis.blindspot} />
      ) : null}

      {/* 9. Question finale */}
      {analysis?.deciding_question ? (
        <DecidingQuestion question={analysis.deciding_question} />
      ) : null}

      {/* Restart */}
      <TouchableOpacity
        style={styles.restartBtn}
        onPress={() => {
          store.reset();
          router.replace('/');
        }}
        activeOpacity={0.8}
      >
        <RotateCcw size={15} color={Colors.textMuted} />
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
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.md,
  },
  restartText: {
    fontSize: Typography.fontSizeSM,
    color: Colors.textMuted,
  },
});
