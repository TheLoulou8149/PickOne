import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Zap } from 'lucide-react-native';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useDecisionStore } from '@/store/decisionStore';
import { callAppel1 } from '@/services/llmService';
import { AiBadge } from '@/components/AiBadge';
import { MicButton } from '@/components/MicButton';

export default function HomeScreen() {
  const router = useRouter();
  const { setAppel1Result, reset, setAiProvider, aiProviders } = useDecisionStore();

  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState('');

  const canStart = text.trim().length > 20;

  // ─── Événements speech recognition ───────────────────────────────────────

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results?.[0]?.transcript ?? '';
    if (event.isFinal) {
      setText((prev) => (prev ? prev + ' ' + transcript : transcript).trim());
      setInterimText('');
    } else {
      setInterimText(transcript);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    setIsRecording(false);
    setInterimText('');
  });

  useSpeechRecognitionEvent('error', (event) => {
    setIsRecording(false);
    setInterimText('');
    if (event.error !== 'aborted') {
      setError('Reconnaissance vocale échouée. Réessaie ou saisis ton texte.');
    }
  });

  // ─── Démarrer / arrêter l'enregistrement ──────────────────────────────────

  async function toggleRecording() {
    if (isRecording) {
      ExpoSpeechRecognitionModule.stop();
      setIsRecording(false);
      return;
    }
    setError('');
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      setError('Permission microphone refusée.');
      return;
    }
    setIsRecording(true);
    ExpoSpeechRecognitionModule.start({
      lang: 'fr-FR',
      interimResults: true,
      continuous: true,
      androidIntentOptions: {
        EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 15000,
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 5000,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 5000,
      },
    });
  }

  // ─── Soumettre le dilemme ─────────────────────────────────────────────────

  async function handleAnalyse() {
    if (!canStart || isLoading) return;
    setError('');
    reset();
    setIsLoading(true);
    try {
      const { data: result, provider } = await callAppel1(text.trim());
      setAppel1Result({
        originalText: text.trim(),
        optionALabel: result.option_a_label,
        optionBLabel: result.option_b_label,
        contextSummary: result.context_summary,
        questions: result.questions,
        instinctQuestionId: result.instinct_question_id,
      });
      setAiProvider('appel1', provider);
      router.push('/dilemma');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? err?.message ?? 'Erreur inconnue';
      setError(`Erreur : ${msg}`);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Zap size={26} color={Colors.primary} strokeWidth={2.5} />
          </View>
          <Text style={styles.appName}>PickOne</Text>
          <Text style={styles.tagline}>Décide mieux. Regrette moins.</Text>
        </View>

        {/* Card principale */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Décris ta situation</Text>
          <Text style={styles.cardHint}>
            Plus tu es précis (chiffres, noms, dates), plus l'analyse sera juste.
          </Text>

          <View style={styles.inputRow}>
            <TextInput
              style={[styles.textarea, isRecording && styles.textareaRecording]}
              placeholder={
                isRecording
                  ? 'Parle maintenant…'
                  : `Ex : J'hésite entre rester dans mon CDI à 42k€ ou rejoindre la startup de mon ami — ils proposent 38k€ mais avec des parts. Ma copine préfère que je reste stable, mais moi j'ai envie de tenter le coup avant 30 ans...`
              }
              placeholderTextColor={isRecording ? Colors.primary + '80' : Colors.textMuted}
              value={isRecording && interimText ? interimText : text}
              onChangeText={!isRecording ? setText : undefined}
              multiline
              textAlignVertical="top"
              editable={!isRecording}
            />
            <MicButton isRecording={isRecording} onPress={toggleRecording} />
          </View>

          {isRecording && (
            <Text style={styles.recordingHint}>
              Appuie à nouveau pour arrêter
            </Text>
          )}

          {!isRecording && (
            <View style={styles.charRow}>
              <Text style={[styles.charCount, text.length < 20 && styles.charCountWarn]}>
                {text.length} caractères {text.length < 20 ? '(min. 20)' : '✓'}
              </Text>
            </View>
          )}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            (!canStart || isLoading || pressed || isRecording) && styles.buttonDim,
          ]}
          onPress={handleAnalyse}
          disabled={!canStart || isLoading || isRecording}
        >
          {isLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.buttonText}>Analyse en cours…</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Analyser ma situation →</Text>
          )}
        </Pressable>

        <View style={styles.footerRow}>
          <Text style={styles.footer}>3 étapes · ~2 min · Analyse IA complète</Text>
          <AiBadge provider={aiProviders.appel1} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: 72,
    paddingBottom: Spacing['2xl'],
  },
  header: { alignItems: 'center', marginBottom: Spacing['2xl'] },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary + '1A',
    borderWidth: 1,
    borderColor: Colors.primary + '50',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  appName: {
    fontSize: Typography.fontSize3XL,
    fontWeight: Typography.fontWeightBlack,
    color: Colors.textPrimary,
    letterSpacing: -1.5,
  },
  tagline: {
    fontSize: Typography.fontSizeSM,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  cardTitle: {
    fontSize: Typography.fontSizeLG,
    fontWeight: Typography.fontWeightBold,
    color: Colors.textPrimary,
  },
  cardHint: {
    fontSize: Typography.fontSizeSM,
    color: Colors.textMuted,
    lineHeight: Typography.fontSizeSM * 1.6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  textarea: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    color: Colors.textPrimary,
    fontSize: Typography.fontSizeMD,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 160,
  },
  textareaRecording: {
    borderColor: Colors.primary + '60',
    backgroundColor: Colors.primary + '06',
  },
  recordingHint: {
    fontSize: Typography.fontSizeXS,
    color: Colors.primary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  charRow: { alignItems: 'flex-end' },
  charCount: { fontSize: Typography.fontSizeXS, color: Colors.success },
  charCountWarn: { color: Colors.textMuted },
  errorText: {
    color: Colors.danger,
    fontSize: Typography.fontSizeSM,
    textAlign: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  buttonDim: { opacity: 0.45 },
  buttonText: {
    color: '#fff',
    fontSize: Typography.fontSizeLG,
    fontWeight: Typography.fontWeightBold,
    letterSpacing: 0.2,
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  footerRow: { alignItems: 'center', gap: Spacing.sm },
  footer: {
    textAlign: 'center',
    fontSize: Typography.fontSizeXS,
    color: Colors.textMuted,
    letterSpacing: 0.3,
  },
});
