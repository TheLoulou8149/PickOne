import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useState } from 'react';
import { Zap } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) return;
    setError('');
    setSuccess('');
    setNeedsConfirmation(false);
    setLoading(true);

    if (mode === 'login') {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) {
          setError('Tu dois d\'abord confirmer ton email. Vérifie ta boîte mail (et les spams).');
          setNeedsConfirmation(true);
        } else {
          setError(error.message);
        }
      } else if (data.user && !data.user.email_confirmed_at) {
        await supabase.auth.signOut();
        setError('Tu dois d\'abord confirmer ton email. Vérifie ta boîte mail (et les spams).');
        setNeedsConfirmation(true);
      }
    } else {
      const { error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) setError(error.message);
      else {
        setSuccess('Compte créé ! Vérifie ton email pour confirmer, puis connecte-toi.');
        setNeedsConfirmation(true);
      }
    }

    setLoading(false);
  }

  async function handleResend() {
    if (!email.trim()) { setError('Entre ton email d\'abord.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
    if (error) setError(error.message);
    else setSuccess('Email de confirmation renvoyé !');
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Zap size={26} color={Colors.primary} strokeWidth={2.5} />
          </View>
          <Text style={styles.appName}>PickOne</Text>
          <Text style={styles.tagline}>
            {mode === 'login' ? 'Connecte-toi pour accéder à ton historique' : 'Crée ton compte gratuitement'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {mode === 'login' ? 'Connexion' : 'Inscription'}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={Colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            placeholderTextColor={Colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? <Text style={styles.successText}>{success}</Text> : null}

          {needsConfirmation && (
            <Pressable onPress={handleResend} disabled={loading}>
              <Text style={styles.resendText}>Renvoyer l'email de confirmation</Text>
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [styles.button, (loading || pressed) && styles.buttonDim]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>
                {mode === 'login' ? 'Se connecter →' : 'Créer mon compte →'}
              </Text>
            )}
          </Pressable>
        </View>

        <Pressable onPress={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess(''); }}>
          <Text style={styles.toggle}>
            {mode === 'login' ? "Pas encore de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
          </Text>
        </Pressable>

        {mode === 'signup' && (
          <Pressable onPress={() => Linking.openURL('https://pickone-aamp.onrender.com/privacy')}>
            <Text style={styles.privacyLink}>
              En créant un compte, tu acceptes notre{' '}
              <Text style={styles.privacyLinkUnderline}>politique de confidentialité</Text>
            </Text>
          </Pressable>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingTop: 80, paddingBottom: Spacing['2xl'] },
  header: { alignItems: 'center', marginBottom: Spacing['2xl'] },
  iconWrap: {
    width: 52, height: 52, borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary + '1A', borderWidth: 1,
    borderColor: Colors.primary + '50', alignItems: 'center',
    justifyContent: 'center', marginBottom: Spacing.md,
  },
  appName: { fontSize: Typography.fontSize3XL, fontWeight: Typography.fontWeightBlack, color: Colors.textPrimary, letterSpacing: -1.5 },
  tagline: { fontSize: Typography.fontSizeSM, color: Colors.textMuted, marginTop: Spacing.xs, textAlign: 'center' },
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border,
    marginBottom: Spacing.lg, gap: Spacing.md,
  },
  cardTitle: { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: Colors.textPrimary },
  input: {
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, color: Colors.textPrimary,
    fontSize: Typography.fontSizeMD, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
  },
  error: { color: Colors.danger, fontSize: Typography.fontSizeSM },
  successText: { color: Colors.success, fontSize: Typography.fontSizeSM, lineHeight: Typography.fontSizeSM * 1.6 },
  button: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md + 2, alignItems: 'center',
  },
  buttonDim: { opacity: 0.45 },
  buttonText: { color: '#fff', fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold },
  toggle: { textAlign: 'center', color: Colors.primary, fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightSemiBold },
  resendText: { textAlign: 'center', color: Colors.primary, fontSize: Typography.fontSizeSM, textDecorationLine: 'underline' },
  privacyLink: { textAlign: 'center', color: Colors.textMuted, fontSize: Typography.fontSizeXS, marginTop: Spacing.md },
  privacyLinkUnderline: { textDecorationLine: 'underline', color: Colors.textMuted },
});
