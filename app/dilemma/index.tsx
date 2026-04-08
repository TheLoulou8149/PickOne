import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useDecisionStore } from '@/store/decisionStore';
import { callAppel2, callAppel3 } from '@/services/llmService';
import { AiBadge } from '@/components/AiBadge';
import type { Question } from '@/store/decisionStore';

// ─── Composant slider segmenté (1-10) ─────────────────────────────────────────

function SegmentSlider({
  value,
  onChange,
  minLabel,
  maxLabel,
  color = Colors.primary,
}: {
  value: number;
  onChange: (v: number) => void;
  minLabel?: string;
  maxLabel?: string;
  color?: string;
}) {
  return (
    <View style={sliderStyles.wrap}>
      {minLabel || maxLabel ? (
        <View style={sliderStyles.labels}>
          <Text style={sliderStyles.labelText}>{minLabel}</Text>
          <Text style={sliderStyles.labelText}>{maxLabel}</Text>
        </View>
      ) : null}
      <View style={sliderStyles.track}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((i) => (
          <TouchableOpacity
            key={i}
            onPress={() => onChange(i)}
            style={[
              sliderStyles.segment,
              { backgroundColor: i <= value ? color : Colors.border },
              i === 1 && sliderStyles.segmentFirst,
              i === 10 && sliderStyles.segmentLast,
            ]}
            activeOpacity={0.7}
          />
        ))}
      </View>
      <Text style={[sliderStyles.valueText, { color }]}>{value}/10</Text>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  wrap: { gap: Spacing.xs },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  labelText: { fontSize: Typography.fontSizeXS, color: Colors.textMuted },
  track: { flexDirection: 'row', gap: 3 },
  segment: { flex: 1, height: 28, borderRadius: 4 },
  segmentFirst: { borderTopLeftRadius: 8, borderBottomLeftRadius: 8 },
  segmentLast: { borderTopRightRadius: 8, borderBottomRightRadius: 8 },
  valueText: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightBold, alignSelf: 'flex-end' },
});

// ─── Renderer par type de question ────────────────────────────────────────────

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: string;
  onChange: (v: string) => void;
}) {
  if (question.type === 'choice' && question.options) {
    return (
      <View style={inputStyles.choiceWrap}>
        {question.options.map((opt) => (
          <TouchableOpacity
            key={opt}
            onPress={() => onChange(opt)}
            style={[inputStyles.choiceBtn, value === opt && inputStyles.choiceBtnActive]}
            activeOpacity={0.8}
          >
            <Text style={[inputStyles.choiceBtnText, value === opt && inputStyles.choiceBtnTextActive]}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  if (question.type === 'slider') {
    const numVal = value ? parseInt(value, 10) : 5;
    return (
      <SegmentSlider
        value={numVal}
        onChange={(v) => onChange(String(v))}
        minLabel={question.min_label}
        maxLabel={question.max_label}
      />
    );
  }

  return (
    <TextInput
      style={inputStyles.openInput}
      placeholder="Ta réponse…"
      placeholderTextColor={Colors.textMuted}
      value={value}
      onChangeText={onChange}
      multiline
      textAlignVertical="top"
    />
  );
}

const inputStyles = StyleSheet.create({
  choiceWrap: { gap: Spacing.sm },
  choiceBtn: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  choiceBtnActive: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  choiceBtnText: {
    fontSize: Typography.fontSizeMD,
    color: Colors.textSecondary,
  },
  choiceBtnTextActive: {
    color: Colors.primaryLight,
    fontWeight: Typography.fontWeightSemiBold,
  },
  openInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    color: Colors.textPrimary,
    fontSize: Typography.fontSizeMD,
    padding: Spacing.md,
    minHeight: 100,
  },
});

// ─── Écran principal ───────────────────────────────────────────────────────────

export default function QuestionsScreen() {
  const router = useRouter();
  const store = useDecisionStore();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [localAnswers, setLocalAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const questions = store.questions;
  const total = questions.length;
  const current = questions[currentIdx];
  const progress = total > 0 ? (currentIdx + 1) / total : 0;
  const currentAnswer = localAnswers[current?.id ?? ''] ?? '';
  const isLast = currentIdx === total - 1;
  const hasAnswer = currentAnswer.trim().length > 0 || current?.type === 'slider';

  function setAnswer(val: string) {
    if (!current) return;
    setLocalAnswers((prev) => ({ ...prev, [current.id]: val }));
  }

  function goBack() {
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
  }

  async function goNext() {
    if (!current) return;
    // Save answer to store
    if (currentAnswer) {
      store.setAnswer(current.id, currentAnswer);
    }

    if (!isLast) {
      setCurrentIdx(currentIdx + 1);
      return;
    }

    // Last question answered → Appel 2 → Appel 3 → Result
    setError('');
    setIsSubmitting(true);
    try {
      // Save all local answers to store first
      for (const [qId, val] of Object.entries(localAnswers)) {
        store.setAnswer(qId, val);
      }
      const allAnswers = { ...store.answers, ...localAnswers };

      // Appel 2 — critères
      const { data: result2, provider: p2 } = await callAppel2({
        originalText: store.originalText,
        optionALabel: store.optionALabel,
        optionBLabel: store.optionBLabel,
        questions: store.questions,
        answers: allAnswers,
      });
      store.setAppel2Result(result2.criteria);
      store.setAiProvider('appel2', p2);

      // Compute scores from Appel 2 defaults
      const criteria = result2.criteria;
      const weights: Record<string, number> = {};
      const scoresA: Record<string, number> = {};
      const scoresB: Record<string, number> = {};
      for (const c of criteria) {
        weights[c.id] = c.default_weight;
        scoresA[c.id] = c.score_a;
        scoresB[c.id] = c.score_b;
      }
      const totalPoids = criteria.reduce((sum, c) => sum + c.default_weight, 0);
      const scoreA = totalPoids > 0
        ? Math.round(criteria.reduce((sum, c) => sum + c.score_a * c.default_weight, 0) / totalPoids * 10)
        : 0;
      const scoreB = totalPoids > 0
        ? Math.round(criteria.reduce((sum, c) => sum + c.score_b * c.default_weight, 0) / totalPoids * 10)
        : 0;
      const winner = scoreA >= scoreB ? store.optionALabel : store.optionBLabel;
      const ecart = Math.abs(scoreA - scoreB);
      const labelNiveau = ecart < 5
        ? 'Décision serrée — les deux options se valent'
        : ecart < 15
          ? `Légère préférence pour ${winner}`
          : `Recommandation claire : ${winner}`;

      store.computeScores();

      // Appel 3 — analyse finale
      const { data: result3, provider: p3 } = await callAppel3({
        originalText: store.originalText,
        optionALabel: store.optionALabel,
        optionBLabel: store.optionBLabel,
        scoreA,
        scoreB,
        labelNiveau,
        questions: store.questions,
        answers: allAnswers,
        criteria,
        weights,
        userScoresA: scoresA,
        userScoresB: scoresB,
      });
      store.setAnalysis(result3);
      store.setAiProvider('appel3', p3);

      router.push('/result');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? err?.message ?? 'Erreur inconnue';
      setError(`Erreur : ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  function skip() {
    if (!isLast) {
      setCurrentIdx(currentIdx + 1);
    } else {
      goNext();
    }
  }

  if (!current || total === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Barre de progression */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={goBack}
          disabled={currentIdx === 0}
          style={[styles.backBtn, currentIdx === 0 && styles.backBtnHidden]}
        >
          <ChevronLeft size={20} color={Colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{currentIdx + 1} / {total}</Text>
        </View>
      </View>

      {/* Contexte */}
      <View style={styles.contextRow}>
        <View style={styles.contextPill}>
          <Text style={styles.contextText} numberOfLines={1}>
            <Text style={styles.contextOpt}>{store.optionALabel}</Text>
            <Text style={styles.contextVs}> vs </Text>
            <Text style={styles.contextOpt}>{store.optionBLabel}</Text>
          </Text>
        </View>
        <AiBadge provider={store.aiProviders.appel1} />
      </View>

      {/* Carte question */}
      <View style={styles.questionCard}>
        <Text style={styles.stepBadge}>Question {currentIdx + 1}</Text>
        <Text style={styles.questionText}>{current.question}</Text>

        <View style={styles.inputWrap}>
          <QuestionInput
            question={current}
            value={current.type === 'slider' && !localAnswers[current.id] ? '5' : currentAnswer}
            onChange={setAnswer}
          />
        </View>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.skipBtn} onPress={skip} activeOpacity={0.7}>
          <Text style={styles.skipText}>Passer</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.nextBtn, (!hasAnswer && !isSubmitting) && styles.nextBtnDim]}
          onPress={goNext}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.nextText}>{isLast ? 'Analyser' : 'Suivant'}</Text>
              <ChevronRight size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing['2xl'],
    gap: Spacing.lg,
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backBtnHidden: {
    opacity: 0,
  },
  progressWrap: {
    flex: 1,
    gap: 6,
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  progressLabel: {
    fontSize: Typography.fontSizeXS,
    color: Colors.textMuted,
    alignSelf: 'flex-end',
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  contextPill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contextText: {
    fontSize: Typography.fontSizeSM,
  },
  contextOpt: {
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeightSemiBold,
  },
  contextVs: {
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  questionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
    flex: 1,
  },
  stepBadge: {
    fontSize: Typography.fontSizeXS,
    fontWeight: Typography.fontWeightSemiBold,
    color: Colors.primaryLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  questionText: {
    fontSize: Typography.fontSizeXL,
    fontWeight: Typography.fontWeightBold,
    color: Colors.textPrimary,
    lineHeight: Typography.fontSizeXL * 1.35,
  },
  inputWrap: {
    marginTop: Spacing.xs,
  },
  errorText: {
    color: Colors.danger,
    fontSize: Typography.fontSizeSM,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  skipBtn: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  skipText: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizeMD,
  },
  nextBtn: {
    flex: 2.5,
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  nextBtnDim: {
    opacity: 0.5,
  },
  nextText: {
    color: '#fff',
    fontSize: Typography.fontSizeMD,
    fontWeight: Typography.fontWeightBold,
  },
});
