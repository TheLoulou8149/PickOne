import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { MotiView } from 'moti';
import { GitFork } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useDecisionStore } from '@/store/decisionStore';

export default function HomeScreen() {
  const router = useRouter();
  const { setDilemma, reset } = useDecisionStore();

  const [dilemma, setDilemmaText] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');

  const canContinue = dilemma.trim().length > 5 && optionA.trim().length > 0 && optionB.trim().length > 0;

  function handleStart() {
    if (!canContinue) return;
    reset();
    setDilemma(dilemma.trim(), optionA.trim(), optionB.trim());
    router.push('/dilemma');
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
        {/* Logo / Header */}
        <MotiView
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600 }}
          style={styles.header}
        >
          <View style={styles.iconContainer}>
            <GitFork size={28} color={Colors.primary} strokeWidth={2.5} />
          </View>
          <Text style={styles.title}>PickOne</Text>
          <Text style={styles.subtitle}>
            Décide mieux. Regrette moins.
          </Text>
        </MotiView>

        {/* Form */}
        <MotiView
          from={{ opacity: 0, translateY: 30 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600, delay: 200 }}
          style={styles.form}
        >
          <Text style={styles.label}>Ton dilemme</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex : Stage A chez une startup vs. Stage B en grand groupe"
            placeholderTextColor={Colors.textMuted}
            value={dilemma}
            onChangeText={setDilemmaText}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <View style={styles.optionsRow}>
            <View style={styles.optionField}>
              <Text style={styles.label}>Option A</Text>
              <TextInput
                style={[styles.input, styles.optionInput]}
                placeholder="Startup"
                placeholderTextColor={Colors.textMuted}
                value={optionA}
                onChangeText={setOptionA}
              />
            </View>
            <View style={styles.optionField}>
              <Text style={styles.label}>Option B</Text>
              <TextInput
                style={[styles.input, styles.optionInput]}
                placeholder="Grand groupe"
                placeholderTextColor={Colors.textMuted}
                value={optionB}
                onChangeText={setOptionB}
              />
            </View>
          </View>
        </MotiView>

        {/* CTA */}
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 400, delay: 400 }}
        >
          <TouchableOpacity
            style={[styles.button, !canContinue && styles.buttonDisabled]}
            onPress={handleStart}
            activeOpacity={0.8}
            disabled={!canContinue}
          >
            <Text style={styles.buttonText}>Analyser mon choix →</Text>
          </TouchableOpacity>
        </MotiView>

        <Text style={styles.hint}>
          Powered par l'IA · Analyse en 2 min
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing['3xl'],
    paddingBottom: Spacing['2xl'],
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  title: {
    fontSize: Typography.fontSize3XL,
    fontWeight: Typography.fontWeightBlack,
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: Typography.fontSizeMD,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  form: {
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  label: {
    fontSize: Typography.fontSizeSM,
    fontWeight: Typography.fontWeightSemiBold,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    color: Colors.textPrimary,
    fontSize: Typography.fontSizeMD,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    minHeight: 48,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  optionField: {
    flex: 1,
  },
  optionInput: {
    minHeight: 48,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizeLG,
    fontWeight: Typography.fontWeightBold,
  },
  hint: {
    textAlign: 'center',
    fontSize: Typography.fontSizeXS,
    color: Colors.textMuted,
  },
});
