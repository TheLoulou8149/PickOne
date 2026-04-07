import { useState } from 'react';
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
import { MotiView, AnimatePresence } from 'moti';
import { ChevronRight, Brain } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useDecisionStore } from '@/store/decisionStore';
import { getAdaptiveQuestion } from '@/services/llmService';

const MAX_QUESTIONS = 5;

export default function DilemmaScreen() {
  const router = useRouter();
  const {
    dilemma,
    optionA,
    optionB,
    questions,
    currentQuestionIndex,
    isLoading,
    addQuestion,
    answerQuestion,
    nextQuestion,
    setBiasAlerts,
    setLoading,
    setPhase,
  } = useDecisionStore();

  const [currentAnswer, setCurrentAnswer] = useState('');
  const [hasStarted, setHasStarted] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const isAnswered = !!currentQuestion?.answer;
  const progress = (currentQuestionIndex + (isAnswered ? 1 : 0)) / MAX_QUESTIONS;

  async function loadNextQuestion() {
    setLoading(true);
    try {
      const previousQA = questions
        .filter((q) => q.answer)
        .map((q) => ({ question: q.question, answer: q.answer! }));

      const result = await getAdaptiveQuestion({
        dilemma,
        optionA,
        optionB,
        previousQA,
      });

      addQuestion({
        question: result.nextQuestion,
        category: result.questionCategory,
      });

      // Save detected biases from LLM
      if (result.detectedBiases.length > 0) {
        const alerts = result.detectedBiases.map((b) => ({
          type: 'status_quo' as const,
          label: b,
          description: '',
          severity: 'medium' as const,
        }));
        setBiasAlerts(alerts);
      }
    } catch {
      // Fallback question if API fails
      addQuestion({
        question: "Quelle est la principale raison qui vous attire vers l'une des deux options ?",
        category: 'emotion',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleStart() {
    setHasStarted(true);
    await loadNextQuestion();
  }

  async function handleAnswerSubmit() {
    if (!currentAnswer.trim() || !currentQuestion) return;
    answerQuestion(currentQuestion.id, currentAnswer.trim());
    setCurrentAnswer('');

    if (currentQuestionIndex + 1 >= MAX_QUESTIONS) {
      // Go to weighting / result
      setPhase('weighting');
      router.push('/result');
    } else {
      nextQuestion();
      await loadNextQuestion();
    }
  }

  function handleSkip() {
    if (currentQuestionIndex + 1 >= MAX_QUESTIONS) {
      setPhase('weighting');
      router.push('/result');
    } else {
      nextQuestion();
      loadNextQuestion();
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <MotiView
            animate={{ width: `${progress * 100}%` }}
            transition={{ type: 'timing', duration: 400 }}
            style={styles.progressBar}
          />
        </View>
        <Text style={styles.progressText}>
          {currentQuestionIndex + (isAnswered ? 1 : 0)} / {MAX_QUESTIONS}
        </Text>
      </View>

      {/* Context pill */}
      <View style={styles.contextPill}>
        <Text style={styles.contextText} numberOfLines={1}>
          {optionA} <Text style={styles.contextVs}>vs</Text> {optionB}
        </Text>
      </View>

      {/* Question area */}
      <AnimatePresence>
        {!hasStarted ? (
          <MotiView
            key="start"
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0 }}
            style={styles.startContainer}
          >
            <Brain size={40} color={Colors.primary} />
            <Text style={styles.startTitle}>Prêt à analyser ?</Text>
            <Text style={styles.startDescription}>
              Je vais te poser {MAX_QUESTIONS} questions adaptées à ton dilemme pour mieux cerner tes
              priorités et détecter tes biais cognitifs.
            </Text>
            <TouchableOpacity style={styles.startButton} onPress={handleStart} activeOpacity={0.8}>
              <Text style={styles.startButtonText}>C'est parti</Text>
            </TouchableOpacity>
          </MotiView>
        ) : isLoading ? (
          <MotiView
            key="loading"
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.loadingContainer}
          >
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Analyse en cours…</Text>
          </MotiView>
        ) : currentQuestion ? (
          <MotiView
            key={currentQuestion.id}
            from={{ opacity: 0, translateX: 40 }}
            animate={{ opacity: 1, translateX: 0 }}
            exit={{ opacity: 0, translateX: -40 }}
            transition={{ type: 'spring', damping: 20 }}
            style={styles.questionContainer}
          >
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {currentQuestion.category === 'objective'
                  ? 'Objectifs'
                  : currentQuestion.category === 'constraint'
                  ? 'Contraintes'
                  : 'Ressenti'}
              </Text>
            </View>

            <Text style={styles.questionText}>{currentQuestion.question}</Text>

            <TextInput
              style={styles.answerInput}
              placeholder="Ta réponse…"
              placeholderTextColor={Colors.textMuted}
              value={currentAnswer}
              onChangeText={setCurrentAnswer}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              autoFocus
            />

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleSkip}
                activeOpacity={0.7}
              >
                <Text style={styles.skipText}>Passer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.nextButton, !currentAnswer.trim() && styles.nextButtonDisabled]}
                onPress={handleAnswerSubmit}
                activeOpacity={0.8}
                disabled={!currentAnswer.trim()}
              >
                <Text style={styles.nextButtonText}>Suivant</Text>
                <ChevronRight size={18} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </MotiView>
        ) : null}
      </AnimatePresence>
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
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  progressText: {
    fontSize: Typography.fontSizeXS,
    color: Colors.textMuted,
    width: 32,
    textAlign: 'right',
  },
  contextPill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing['2xl'],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contextText: {
    fontSize: Typography.fontSizeSM,
    color: Colors.textSecondary,
    maxWidth: 240,
  },
  contextVs: {
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  startContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
    gap: Spacing.lg,
  },
  startTitle: {
    fontSize: Typography.fontSize2XL,
    fontWeight: Typography.fontWeightBold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  startDescription: {
    fontSize: Typography.fontSizeMD,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.fontSizeMD * Typography.lineHeightRelaxed,
    maxWidth: 300,
  },
  startButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.md,
  },
  startButtonText: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizeLG,
    fontWeight: Typography.fontWeightBold,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing['3xl'],
  },
  loadingText: {
    fontSize: Typography.fontSizeMD,
    color: Colors.textSecondary,
  },
  questionContainer: {
    flex: 1,
    gap: Spacing.lg,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary + '20',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  categoryText: {
    fontSize: Typography.fontSizeXS,
    color: Colors.primaryLight,
    fontWeight: Typography.fontWeightSemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  questionText: {
    fontSize: Typography.fontSize2XL,
    fontWeight: Typography.fontWeightBold,
    color: Colors.textPrimary,
    lineHeight: Typography.fontSize2XL * Typography.lineHeightNormal,
  },
  answerInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    color: Colors.textPrimary,
    fontSize: Typography.fontSizeMD,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 100,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  skipButton: {
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
  nextButton: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  nextButtonDisabled: {
    opacity: 0.4,
  },
  nextButtonText: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizeMD,
    fontWeight: Typography.fontWeightBold,
  },
});
