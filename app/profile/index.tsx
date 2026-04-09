import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { ArrowLeft, User, Lock, Brain, Check, MessageSquare } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

type Tab = 'compte' | 'password' | 'contexte';

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'compte', label: 'Compte', icon: User },
  { key: 'password', label: 'Mot de passe', icon: Lock },
  { key: 'contexte', label: 'Contexte IA', icon: Brain },
];

// ─── Onglet Compte ────────────────────────────────────────────────────────────

function TabCompte() {
  const [email, setEmail] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [decisionCount, setDecisionCount] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setEmail(user.email ?? '');
      setCreatedAt(
        new Date(user.created_at).toLocaleDateString('fr-FR', {
          day: 'numeric', month: 'long', year: 'numeric',
        })
      );
      setLoading(false);
      // Lire le compteur all-time depuis user_stats
      supabase.from('user_stats')
        .select('total_decisions')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => setDecisionCount(data?.total_decisions ?? 0));
    });
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  if (loading) return <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />;

  return (
    <View style={tabStyles.container}>
      <View style={tabStyles.infoCard}>
        <Row label="Email" value={email} />
        <Divider />
        <Row label="Membre depuis" value={createdAt} />
        <Divider />
        <Row label="Décisions analysées" value={decisionCount !== null ? `${decisionCount}` : '—'} />
      </View>

      <TouchableOpacity style={tabStyles.dangerBtn} onPress={handleLogout}>
        <Text style={tabStyles.dangerBtnText}>Se déconnecter</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Onglet Mot de passe ──────────────────────────────────────────────────────

function TabPassword() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleChange() {
    setError('');
    setSuccess(false);
    if (next.length < 6) { setError('Le mot de passe doit faire au moins 6 caractères.'); return; }
    if (next !== confirm) { setError('Les deux mots de passe ne correspondent pas.'); return; }

    setLoading(true);
    // Ré-authentifier avec le mot de passe actuel
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) { setError('Utilisateur introuvable.'); setLoading(false); return; }

    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
    if (signInErr) { setError('Mot de passe actuel incorrect.'); setLoading(false); return; }

    const { error: updateErr } = await supabase.auth.updateUser({ password: next });
    if (updateErr) setError(updateErr.message);
    else { setSuccess(true); setCurrent(''); setNext(''); setConfirm(''); }
    setLoading(false);
  }

  return (
    <View style={tabStyles.container}>
      <View style={tabStyles.infoCard}>
        <Text style={tabStyles.fieldLabel}>Mot de passe actuel</Text>
        <TextInput
          style={tabStyles.input}
          secureTextEntry
          value={current}
          onChangeText={setCurrent}
          placeholder="••••••••"
          placeholderTextColor={Colors.textMuted}
        />
        <Text style={[tabStyles.fieldLabel, { marginTop: Spacing.md }]}>Nouveau mot de passe</Text>
        <TextInput
          style={tabStyles.input}
          secureTextEntry
          value={next}
          onChangeText={setNext}
          placeholder="••••••••"
          placeholderTextColor={Colors.textMuted}
        />
        <Text style={[tabStyles.fieldLabel, { marginTop: Spacing.md }]}>Confirmer</Text>
        <TextInput
          style={tabStyles.input}
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
          placeholder="••••••••"
          placeholderTextColor={Colors.textMuted}
        />
      </View>

      {error ? <Text style={tabStyles.error}>{error}</Text> : null}
      {success ? (
        <View style={tabStyles.successRow}>
          <Check size={16} color={Colors.success} />
          <Text style={tabStyles.successText}>Mot de passe mis à jour !</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[tabStyles.primaryBtn, (loading || !current || !next || !confirm) && tabStyles.btnDim]}
        onPress={handleChange}
        disabled={loading || !current || !next || !confirm}
      >
        {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={tabStyles.primaryBtnText}>Changer le mot de passe</Text>}
      </TouchableOpacity>
    </View>
  );
}

// ─── Onglet Contexte IA ───────────────────────────────────────────────────────

const CONTEXT_FIELDS = [
  { key: 'age', label: 'Âge', placeholder: 'Ex : 28 ans', hint: 'Aide à calibrer les horizons temporels.' },
  { key: 'situation_pro', label: 'Situation professionnelle', placeholder: 'Ex : Dev senior en CDI, Paris', hint: 'Permet des comparaisons de marché pertinentes.' },
  { key: 'situation_perso', label: 'Situation personnelle', placeholder: 'Ex : En couple, pas d\'enfants', hint: 'Affine les critères relationnels et de stabilité.' },
  { key: 'valeurs', label: 'Tes valeurs clés', placeholder: 'Ex : Liberté, sécurité financière, impact', hint: 'L\'IA pondère les critères selon tes priorités.' },
  { key: 'style_risque', label: 'Rapport au risque', placeholder: 'Ex : Prudent, j\'ai besoin de filets de sécurité', hint: 'Calibre l\'analyse des scénarios de regret.' },
  { key: 'contexte_libre', label: 'Infos complémentaires', placeholder: 'Tout ce qui peut être utile à l\'IA…', hint: 'Contraintes, projets, situations particulières.', multiline: true },
];

function TabContexte() {
  const [fields, setFields] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from('user_context')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (data) setFields(data);
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('user_context').upsert({
      user_id: user.id,
      ...fields,
    }, { onConflict: 'user_id' });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />;

  return (
    <View style={tabStyles.container}>
      <Text style={tabStyles.contextIntro}>
        Ces informations sont injectées discrètement dans chaque analyse pour la rendre plus précise et personnalisée. Tu peux les modifier à tout moment.
      </Text>
      <View style={tabStyles.infoCard}>
        {CONTEXT_FIELDS.map((f, i) => (
          <View key={f.key} style={i > 0 ? { marginTop: Spacing.md } : undefined}>
            <Text style={tabStyles.fieldLabel}>{f.label}</Text>
            <Text style={tabStyles.fieldHint}>{f.hint}</Text>
            <TextInput
              style={[tabStyles.input, f.multiline && { minHeight: 80, textAlignVertical: 'top' }]}
              value={fields[f.key] ?? ''}
              onChangeText={(v) => setFields((prev) => ({ ...prev, [f.key]: v }))}
              placeholder={f.placeholder}
              placeholderTextColor={Colors.textMuted}
              multiline={f.multiline}
            />
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[tabStyles.primaryBtn, saving && tabStyles.btnDim]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : saved ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <Check size={16} color="#fff" />
            <Text style={tabStyles.primaryBtnText}>Sauvegardé !</Text>
          </View>
        ) : (
          <Text style={tabStyles.primaryBtnText}>Sauvegarder</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={tabStyles.row}>
      <Text style={tabStyles.rowLabel}>{label}</Text>
      <Text style={tabStyles.rowValue}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={tabStyles.divider} />;
}

// ─── Styles partagés onglets ──────────────────────────────────────────────────

const tabStyles = StyleSheet.create({
  container: { gap: Spacing.md },
  infoCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.xs },
  rowLabel: { fontSize: Typography.fontSizeSM, color: Colors.textMuted },
  rowValue: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightSemiBold, color: Colors.textPrimary, flex: 1, textAlign: 'right' },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs },
  fieldLabel: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightSemiBold, color: Colors.textPrimary, marginBottom: 2 },
  fieldHint: { fontSize: Typography.fontSizeXS, color: Colors.textMuted, marginBottom: Spacing.xs },
  input: {
    backgroundColor: Colors.surfaceGray, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.sm, color: Colors.textPrimary,
    fontSize: Typography.fontSizeSM, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  contextIntro: {
    fontSize: Typography.fontSizeSM, color: Colors.textMuted,
    lineHeight: Typography.fontSizeSM * 1.6,
  },
  primaryBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md, alignItems: 'center',
  },
  btnDim: { opacity: 0.45 },
  primaryBtnText: { color: '#fff', fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightBold },
  dangerBtn: {
    borderWidth: 1, borderColor: Colors.danger + '50', borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md, alignItems: 'center', backgroundColor: Colors.danger + '08',
  },
  dangerBtnText: { color: Colors.danger, fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightSemiBold },
  error: { color: Colors.danger, fontSize: Typography.fontSizeSM },
  successRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  successText: { color: Colors.success, fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightSemiBold },
});

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('compte');
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

      {/* Modal feedback bientôt disponible */}
      <Modal visible={showFeedback} transparent animationType="fade" onRequestClose={() => setShowFeedback(false)}>
        <Pressable style={feedbackStyles.overlay} onPress={() => setShowFeedback(false)}>
          <View style={feedbackStyles.sheet}>
            <View style={feedbackStyles.iconWrap}>
              <MessageSquare size={28} color={Colors.primary} strokeWidth={1.5} />
            </View>
            <Text style={feedbackStyles.title}>Bientôt disponible</Text>
            <Text style={feedbackStyles.body}>
              Le formulaire de signalement de bugs et de suggestions arrive prochainement.{'\n\n'}En attendant, merci pour ta patience — chaque retour compte !
            </Text>
            <TouchableOpacity style={feedbackStyles.btn} onPress={() => setShowFeedback(false)} activeOpacity={0.85}>
              <Text style={feedbackStyles.btnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Profil</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setActiveTab(t.key)}
            >
              <Icon size={14} color={active ? Colors.primary : Colors.textMuted} />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {activeTab === 'compte' && <TabCompte />}
        {activeTab === 'password' && <TabPassword />}
        {activeTab === 'contexte' && <TabContexte />}

        {/* Feedback */}
        <TouchableOpacity style={styles.feedbackBtn} onPress={() => setShowFeedback(true)} activeOpacity={0.75}>
          <MessageSquare size={15} color={Colors.textMuted} strokeWidth={1.5} />
          <Text style={styles.feedbackText}>Signaler un bug ou faire une suggestion</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, backgroundColor: Colors.surfaceElevated,
  },
  title: { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: Colors.textPrimary },
  tabBar: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.md,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: Colors.primary },
  tabLabel: { fontSize: Typography.fontSizeXS, color: Colors.textMuted, fontWeight: Typography.fontWeightSemiBold },
  tabLabelActive: { color: Colors.primary },
  content: { padding: Spacing.lg, paddingBottom: Spacing['3xl'], gap: Spacing.md },
  feedbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.sm,
  },
  feedbackText: {
    fontSize: Typography.fontSizeSM,
    color: Colors.textMuted,
  },
});

const feedbackStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000060',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.lg,
    gap: Spacing.md,
    alignItems: 'center',
    width: '100%',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: Typography.fontSizeLG,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  body: {
    fontSize: Typography.fontSizeSM,
    color: Colors.textSecondary,
    lineHeight: 21,
    textAlign: 'center',
  },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 13,
    paddingHorizontal: 40,
    marginTop: 4,
  },
  btnText: {
    color: '#fff',
    fontSize: Typography.fontSizeMD,
    fontWeight: '700' as const,
  },
});
