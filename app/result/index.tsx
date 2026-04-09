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
  AlertTriangle,
  Eye,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  Minus,
  Lightbulb,
} from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useDecisionStore } from '@/store/decisionStore';
import { AiBadge } from '@/components/AiBadge';

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

// ─── 2. Scores (multi-options) ────────────────────────────────────────────────

function ScoresCard({
  options,
  scores,
  winner,
}: {
  options: { id: string; label: string }[];
  scores: Record<string, number>;
  winner: string;
}) {
  // Trier par score décroissant
  const sorted = [...options].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));

  return (
    <Section>
      <SectionTitle>Scores pondérés</SectionTitle>
      {sorted.map((opt, rank) => {
        const score = scores[opt.id] ?? 0;
        const isWinner = opt.label === winner;
        const color = isWinner ? Colors.primary : Colors.textMuted;
        return (
          <View key={opt.id} style={scoresStyles.gaugeBlock}>
            <View style={scoresStyles.gaugeHeader}>
              <View style={scoresStyles.nameRow}>
                {rank === 0 && <Text style={scoresStyles.rankBadge}>#1</Text>}
                <Text style={[scoresStyles.gaugeName, { color }]}>{opt.label}</Text>
              </View>
              <View style={scoresStyles.gaugeScoreWrap}>
                <Text style={[scoresStyles.gaugeScore, { color }]}>{score}</Text>
                <Text style={scoresStyles.gaugeMax}>/100</Text>
              </View>
            </View>
            <View style={scoresStyles.track}>
              <View style={[scoresStyles.fill, { width: `${score}%`, backgroundColor: color }]} />
            </View>
            {isWinner && <Text style={scoresStyles.winnerTag}>Meilleur score</Text>}
          </View>
        );
      })}
    </Section>
  );
}

const scoresStyles = StyleSheet.create({
  gaugeBlock: {
    gap: Spacing.xs,
  },
  gaugeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
    flexWrap: 'wrap',
  },
  rankBadge: {
    fontSize: Typography.fontSizeXS,
    fontWeight: Typography.fontWeightBold,
    color: Colors.primary,
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  gaugeName: {
    fontSize: Typography.fontSizeMD,
    fontWeight: Typography.fontWeightBold,
  },
  gaugeScoreWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    marginLeft: Spacing.sm,
  },
  gaugeScore: {
    fontSize: Typography.fontSize3XL,
    fontWeight: Typography.fontWeightBlack,
    lineHeight: Typography.fontSize3XL * 1.1,
  },
  gaugeMax: {
    fontSize: Typography.fontSizeSM,
    color: Colors.textMuted,
  },
  track: {
    height: 10,
    backgroundColor: Colors.border,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  winnerTag: {
    fontSize: Typography.fontSizeXS,
    color: Colors.primary,
    fontWeight: Typography.fontWeightSemiBold,
  },
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

// ─── 4. Baromètres critères ───────────────────────────────────────────────────

function CriteriaBarometers({
  criteria,
  weights,
}: {
  criteria: any[];
  weights: Record<string, number>;
}) {
  return (
    <Section>
      <SectionTitle>Critères analysés</SectionTitle>
      {criteria.map((c) => {
        const w = weights[c.id] ?? c.default_weight;
        return (
          <View key={c.id} style={bmStyles.row}>
            <Text style={bmStyles.label}>{c.label}</Text>
            <View style={bmStyles.barWrap}>
              <View style={bmStyles.barTrack}>
                <View style={[bmStyles.barFill, { width: `${w * 10}%` }]} />
              </View>
            </View>
            <Text style={bmStyles.value}>{w}</Text>
          </View>
        );
      })}
    </Section>
  );
}

const bmStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  label: {
    flex: 1.5,
    fontSize: Typography.fontSizeSM,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeightSemiBold,
  },
  barWrap: {
    flex: 2,
  },
  barTrack: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: Colors.primary,
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

// ─── 5. Biais ─────────────────────────────────────────────────────────────────

function BiasCard({ bias }: { bias: { name: string; explanation: string } }) {
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

// ─── Plan B ───────────────────────────────────────────────────────────────────

function PlanBCard({ text }: { text: string }) {
  return (
    <View style={planBStyles.card}>
      <View style={planBStyles.header}>
        <Lightbulb size={18} color="#A855F7" />
        <Text style={planBStyles.title}>Et si tu faisais tout autre chose ?</Text>
      </View>
      <Text style={planBStyles.text}>{text}</Text>
    </View>
  );
}

const planBStyles = StyleSheet.create({
  card: {
    backgroundColor: '#A855F714',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#A855F740',
    gap: Spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: {
    fontSize: Typography.fontSizeSM,
    fontWeight: Typography.fontWeightSemiBold,
    color: '#A855F7',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  text: {
    fontSize: Typography.fontSizeMD,
    color: Colors.textSecondary,
    lineHeight: Typography.fontSizeMD * 1.6,
    fontStyle: 'italic',
  },
});

// ─── 9. Question finale ───────────────────────────────────────────────────────

function DecidingQuestion({ question }: { question: string }) {
  return (
    <View style={dqStyles.card}>
      <View style={dqStyles.iconRow}>
        <HelpCircle size={18} color={Colors.primaryLight} />
        <Text style={dqStyles.label}>La question qui tranche tout</Text>
      </View>
      <Text style={dqStyles.question}>{question}</Text>
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
      if (error) console.error('[PickOne] Erreur sauvegarde décision:', error.message, error.code);
      else console.log('[PickOne] Décision sauvegardée ✓');
    });
  }, [analysis]);

  // Options triées par score décroissant
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
        options={store.options}
        scores={store.scores}
        winner={store.winner}
      />

      {/* 3. Cohérence instinct / logique */}
      {store.messageCoherence ? (
        <CoherenceCard message={store.messageCoherence} />
      ) : null}

      {/* 4. Baromètres critères */}
      {store.criteria.length > 0 ? (
        <CriteriaBarometers
          criteria={store.criteria}
          weights={store.weights}
        />
      ) : null}

      {/* 5. Biais */}
      {analysis?.biases && analysis.biases.length > 0 ? (
        <Section>
          <SectionTitle color={Colors.warning}>Biais détectés</SectionTitle>
          {analysis.biases.map((b, i) => (
            <BiasCard key={i} bias={b} />
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

      {/* Plan B */}
      {analysis?.alternative_strategy ? (
        <PlanBCard text={analysis.alternative_strategy} />
      ) : null}

      {/* 9. Question finale */}
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
