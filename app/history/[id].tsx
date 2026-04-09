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
import type { Decision } from './index';

const NIVEAU_COLOR: Record<string, string> = {
  serré: '#F59E0B',
  léger: '#3B82F6',
  clair: '#10B981',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function Section({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[sectionStyles.wrap, style]}>{children}</View>;
}
const sectionStyles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, gap: Spacing.md,
  },
});

function SectionTitle({ children, color }: { children: string; color?: string }) {
  return <Text style={[titleStyles.text, color ? { color } : null]}>{children}</Text>;
}
const titleStyles = StyleSheet.create({
  text: {
    fontSize: Typography.fontSizeXS, fontWeight: Typography.fontWeightSemiBold,
    color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1,
  },
});

function NiveauCard({ niveau, label, reason }: { niveau: string; label: string; reason: string }) {
  const color = NIVEAU_COLOR[niveau] ?? Colors.textMuted;
  return (
    <Section style={{ borderColor: color + '50', backgroundColor: color + '0D' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
        <Text style={{ fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color }}>{label}</Text>
      </View>
      <Text style={{ fontSize: Typography.fontSizeSM, color: Colors.textSecondary, lineHeight: Typography.fontSizeSM * 1.6 }}>{reason}</Text>
    </Section>
  );
}

function ScoresCard({ scoreA, scoreB, optionA, optionB }: { scoreA: number; scoreB: number; optionA: string; optionB: string }) {
  const winnerA = scoreA > scoreB;
  const winnerB = scoreB > scoreA;
  const colorA = winnerA ? Colors.primary : Colors.textMuted;
  const colorB = winnerB ? Colors.primary : Colors.textMuted;

  return (
    <Section>
      <SectionTitle>Scores pondérés</SectionTitle>
      {[{ label: optionA, score: scoreA, color: colorA, winner: winnerA }, { label: optionB, score: scoreB, color: colorB, winner: winnerB }].map((o) => (
        <View key={o.label} style={{ gap: Spacing.xs }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <Text style={{ fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightBold, color: o.color, flex: 1 }}>{o.label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
              <Text style={{ fontSize: Typography.fontSize3XL, fontWeight: Typography.fontWeightBlack, color: o.color, lineHeight: Typography.fontSize3XL * 1.1 }}>{o.score}</Text>
              <Text style={{ fontSize: Typography.fontSizeSM, color: Colors.textMuted }}>/100</Text>
            </View>
          </View>
          <View style={{ height: 10, backgroundColor: Colors.border, borderRadius: BorderRadius.full, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${o.score}%` as any, backgroundColor: o.color, borderRadius: BorderRadius.full }} />
          </View>
          {o.winner && <Text style={{ fontSize: Typography.fontSizeXS, color: Colors.primary, fontWeight: Typography.fontWeightSemiBold }}>Meilleur score</Text>}
        </View>
      ))}
    </Section>
  );
}

function CoherenceCard({ message }: { message: string }) {
  const isAccord = message.includes('même sens');
  const isNeutre = message.includes("pas de préférence");
  const icon = isAccord
    ? <CheckCircle size={18} color={Colors.success} />
    : isNeutre
      ? <Minus size={18} color={Colors.warning} />
      : <AlertCircle size={18} color={Colors.warning} />;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border }}>
      {icon}
      <Text style={{ flex: 1, fontSize: Typography.fontSizeSM, color: Colors.textSecondary, lineHeight: Typography.fontSizeSM * 1.6 }}>{message}</Text>
    </View>
  );
}

function CriteriaBarometers({ criteria, weights }: { criteria: any[]; weights: Record<string, number> }) {
  return (
    <Section>
      <SectionTitle>Critères analysés</SectionTitle>
      {criteria.map((c: any) => {
        const w = weights?.[c.id] ?? c.default_weight;
        return (
          <View key={c.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm }}>
            <Text style={{ flex: 1.5, fontSize: Typography.fontSizeSM, color: Colors.textSecondary, fontWeight: Typography.fontWeightSemiBold }}>{c.label}</Text>
            <View style={{ flex: 2 }}>
              <View style={{ height: 6, backgroundColor: Colors.border, borderRadius: BorderRadius.full, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${w * 10}%` as any, backgroundColor: Colors.primary, borderRadius: BorderRadius.full }} />
              </View>
            </View>
            <Text style={{ width: 20, fontSize: Typography.fontSizeSM, color: Colors.textMuted, textAlign: 'right', fontWeight: Typography.fontWeightBold }}>{w}</Text>
          </View>
        );
      })}
    </Section>
  );
}

function BiasCard({ bias }: { bias: { name: string; explanation: string } }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <TouchableOpacity
      style={{ backgroundColor: Colors.background, borderRadius: BorderRadius.sm, padding: Spacing.md, borderWidth: 1, borderColor: Colors.warning + '40', borderLeftWidth: 3, borderLeftColor: Colors.warning, gap: Spacing.sm }}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.8}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
          <AlertTriangle size={14} color={Colors.warning} />
          <Text style={{ fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightSemiBold, color: Colors.warning }}>{bias.name}</Text>
        </View>
        {expanded ? <ChevronUp size={14} color={Colors.textMuted} /> : <ChevronDown size={14} color={Colors.textMuted} />}
      </View>
      {expanded && <Text style={{ fontSize: Typography.fontSizeSM, color: Colors.textSecondary, lineHeight: Typography.fontSizeSM * 1.6 }}>{bias.explanation}</Text>}
    </TouchableOpacity>
  );
}

function RegretCard({ score, reason, optionLabel, isChosen }: { score: number; reason: string; optionLabel: string; isChosen: boolean }) {
  const color = score >= 60 ? Colors.danger : score >= 40 ? Colors.warning : Colors.success;
  return (
    <View style={{ backgroundColor: Colors.background, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: color + '40', gap: Spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
        <Text style={{ fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightBold, color: Colors.textPrimary, flex: 1 }}>{optionLabel}</Text>
        {isChosen && (
          <View style={{ backgroundColor: Colors.success + '20', borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderWidth: 1, borderColor: Colors.success + '40' }}>
            <Text style={{ fontSize: Typography.fontSizeXS, color: Colors.success, fontWeight: Typography.fontWeightSemiBold }}>Recommandé</Text>
          </View>
        )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: Spacing.xs }}>
        <Text style={{ fontSize: Typography.fontSize3XL, fontWeight: Typography.fontWeightBlack, color }}>{score}%</Text>
        <Text style={{ fontSize: Typography.fontSizeSM, color: Colors.textMuted }}>risque de regret</Text>
      </View>
      <Text style={{ fontSize: Typography.fontSizeSM, color: Colors.textSecondary, lineHeight: Typography.fontSizeSM * 1.6, fontStyle: 'italic' }}>{reason}</Text>
    </View>
  );
}

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
          <Text style={styles.title}>{d.option_a} vs {d.option_b}</Text>
          <Text style={styles.date}>{formatDate(d.created_at)}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Niveau */}
        {d.niveau_reco && d.label_niveau ? (
          <NiveauCard
            niveau={d.niveau_reco}
            label={d.label_niveau}
            reason={analysis?.recommendation_reason ?? ''}
          />
        ) : null}

        {/* Scores */}
        <ScoresCard
          scoreA={d.score_a ?? 0}
          scoreB={d.score_b ?? 0}
          optionA={d.option_a}
          optionB={d.option_b}
        />

        {/* Cohérence instinct */}
        {d.message_coherence ? <CoherenceCard message={d.message_coherence} /> : null}

        {/* Critères */}
        {d.criteria?.length > 0 ? (
          <CriteriaBarometers criteria={d.criteria} weights={d.weights ?? {}} />
        ) : null}

        {/* Biais */}
        {analysis?.biases?.length > 0 ? (
          <Section>
            <SectionTitle color={Colors.warning}>Biais détectés</SectionTitle>
            {analysis.biases.map((b: any, i: number) => <BiasCard key={i} bias={b} />)}
          </Section>
        ) : null}

        {/* Regret */}
        {analysis ? (
          <Section style={{ gap: Spacing.sm }}>
            <SectionTitle>Simulation de regret</SectionTitle>
            <RegretCard score={analysis.regret_score_chosen} reason={analysis.regret_chosen_reason} optionLabel={chosenLabel} isChosen />
            <RegretCard score={analysis.regret_score_other} reason={analysis.regret_other_reason} optionLabel={otherLabel} isChosen={false} />
          </Section>
        ) : null}

        {/* Angle mort */}
        {analysis?.blindspot ? (
          <View style={{ backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.accent + '30', gap: Spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <Eye size={16} color={Colors.accent} />
              <Text style={{ fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightSemiBold, color: Colors.accent, textTransform: 'uppercase', letterSpacing: 0.5 }}>Angle mort</Text>
            </View>
            <Text style={{ fontSize: Typography.fontSizeMD, color: Colors.textSecondary, lineHeight: Typography.fontSizeMD * 1.6 }}>{analysis.blindspot}</Text>
          </View>
        ) : null}

        {/* Question finale */}
        {analysis?.deciding_question ? (
          <View style={{ backgroundColor: Colors.primary + '12', borderRadius: BorderRadius.lg, padding: Spacing.xl, borderWidth: 1, borderColor: Colors.primary + '40', gap: Spacing.md, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <HelpCircle size={18} color={Colors.primaryLight} />
              <Text style={{ fontSize: Typography.fontSizeXS, color: Colors.primaryLight, fontWeight: Typography.fontWeightSemiBold, textTransform: 'uppercase', letterSpacing: 0.5 }}>La question qui tranche tout</Text>
            </View>
            <Text style={{ fontSize: Typography.fontSizeLG, color: Colors.textPrimary, fontStyle: 'italic', textAlign: 'center', lineHeight: Typography.fontSizeLG * 1.5, fontWeight: Typography.fontWeightSemiBold }}>{analysis.deciding_question}</Text>
          </View>
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
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: Spacing.xs, marginRight: Spacing.sm },
  headerCenter: { flex: 1 },
  title: { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightBold, color: Colors.textPrimary },
  date: { fontSize: Typography.fontSizeXS, color: Colors.textMuted, marginTop: 2 },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing['3xl'] },
});
