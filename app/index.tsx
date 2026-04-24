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
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { UserCircle, Menu } from 'lucide-react-native';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useDecisionStore } from '@/store/decisionStore';
import { callAppel1 } from '@/services/llmService';
import { MicButton } from '@/components/MicButton';
import { FeedbackModal } from '@/components/FeedbackModal';

export default function HomeScreen() {
  const router = useRouter();
  const { setAppel1Result, reset, setAiProvider } = useDecisionStore();

  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);

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
        options: result.options,
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
        {/* Navbar */}
        <View style={styles.navbar}>
          <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/profile' as any)}>
            <UserCircle size={20} color={Colors.textPrimary} strokeWidth={1.5} />
          </TouchableOpacity>

          <View style={styles.logo}>
            <Text style={styles.logoText}>P1</Text>
          </View>

          <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/history' as any)}>
            <Menu size={20} color={Colors.textPrimary} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>

        {/* Titre */}
        <View style={styles.titleSection}>
          <Text style={styles.appName}>PickOne</Text>
          <Text style={styles.tagline}>Décide mieux. Regrette moins.</Text>
        </View>

        {/* Bloc de saisie */}
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
            <Text style={styles.recordingHint}>Appuie à nouveau pour arrêter</Text>
          )}

          {!isRecording && (
            <Text style={styles.charCount}>
              {text.length} caractères{text.length < 20 ? ' (min. 20)' : ' ✓'}
            </Text>
          )}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* CTA */}
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

        {/* Métadonnées */}
        <View style={styles.metaRow}>
          <Text style={styles.meta}>3 étapes</Text>
          <View style={styles.metaDot} />
          <Text style={styles.meta}>~2 min</Text>
          <View style={styles.metaDot} />
          <Text style={styles.meta}>Analyse IA complète</Text>
        </View>

        {/* Feedback */}
        <TouchableOpacity
          style={styles.feedbackLink}
          onPress={() => setShowFeedback(true)}
        >
          <Text style={styles.feedbackLinkText}>Bug ou suggestion ? Dis-nous →</Text>
        </TouchableOpacity>
      </ScrollView>

      <FeedbackModal visible={showFeedback} onClose={() => setShowFeedback(false)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing['2xl'],
  },

  // Navbar
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },

  // Titre
  titleSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.textPrimary,
    letterSpacing: -1.5,
  },
  tagline: {
    fontSize: Typography.fontSizeSM,
    color: Colors.textMuted,
    marginTop: 6,
  },

  // Bloc de saisie beige
  card: {
    backgroundColor: Colors.surfaceBeige,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderBeige,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  cardTitle: {
    fontSize: Typography.fontSizeSM,
    fontWeight: Typography.fontWeightSemiBold,
    color: Colors.textPrimary,
  },
  cardHint: {
    fontSize: Typography.fontSizeXS,
    color: Colors.textMuted,
    lineHeight: 17,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: 4,
  },
  textarea: {
    flex: 1,
    backgroundColor: Colors.surface,
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
  charCount: {
    fontSize: Typography.fontSizeXS,
    color: Colors.textMuted,
    textAlign: 'right',
  },

  // Erreur
  errorText: {
    color: Colors.danger,
    fontSize: Typography.fontSizeSM,
    textAlign: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },

  // Bouton CTA
  button: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  buttonDim: { opacity: 0.45 },
  buttonText: {
    color: '#fff',
    fontSize: Typography.fontSizeLG,
    fontWeight: Typography.fontWeightBold,
    letterSpacing: 0.2,
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },

  // Métadonnées
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  meta: {
    fontSize: Typography.fontSizeXS,
    color: Colors.textMuted,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.textMuted,
  },
  feedbackLink: {
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  feedbackLinkText: {
    fontSize: Typography.fontSizeXS,
    color: Colors.textMuted,
  },
});

