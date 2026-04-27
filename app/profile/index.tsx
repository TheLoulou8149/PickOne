import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { ArrowLeft, User, Lock, Brain, Check, MessageSquare, TrendingUp, Sparkles, Eye, EyeOff } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { FeedbackModal } from '@/components/FeedbackModal';
import { callProfilCognitif, type ProfilCognitifResponse } from '@/services/llmService';

type Tab = 'compte' | 'password' | 'contexte' | 'cognitif';

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'compte', label: 'Compte', icon: User },
  { key: 'password', label: 'Sécurité', icon: Lock },
  { key: 'contexte', label: 'Contexte', icon: Brain },
  { key: 'cognitif', label: 'Cognitif', icon: TrendingUp },
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

      <TouchableOpacity onPress={() => Linking.openURL('https://pickone-aamp.onrender.com/privacy')}>
        <Text style={tabStyles.privacyLink}>Politique de confidentialité</Text>
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
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
        <View style={tabStyles.passwordRow}>
          <TextInput
            style={[tabStyles.input, tabStyles.passwordInput]}
            secureTextEntry={!showCurrent}
            value={current}
            onChangeText={setCurrent}
            placeholder="••••••••"
            placeholderTextColor={Colors.textMuted}
          />
          <TouchableOpacity style={tabStyles.eyeBtn} onPress={() => setShowCurrent(v => !v)}>
            {showCurrent ? <EyeOff size={16} color={Colors.textMuted} /> : <Eye size={16} color={Colors.textMuted} />}
          </TouchableOpacity>
        </View>
        <Text style={[tabStyles.fieldLabel, { marginTop: Spacing.md }]}>Nouveau mot de passe</Text>
        <View style={tabStyles.passwordRow}>
          <TextInput
            style={[tabStyles.input, tabStyles.passwordInput]}
            secureTextEntry={!showNext}
            value={next}
            onChangeText={setNext}
            placeholder="••••••••"
            placeholderTextColor={Colors.textMuted}
          />
          <TouchableOpacity style={tabStyles.eyeBtn} onPress={() => setShowNext(v => !v)}>
            {showNext ? <EyeOff size={16} color={Colors.textMuted} /> : <Eye size={16} color={Colors.textMuted} />}
          </TouchableOpacity>
        </View>
        <Text style={[tabStyles.fieldLabel, { marginTop: Spacing.md }]}>Confirmer</Text>
        <View style={tabStyles.passwordRow}>
          <TextInput
            style={[tabStyles.input, tabStyles.passwordInput]}
            secureTextEntry={!showConfirm}
            value={confirm}
            onChangeText={setConfirm}
            placeholder="••••••••"
            placeholderTextColor={Colors.textMuted}
          />
          <TouchableOpacity style={tabStyles.eyeBtn} onPress={() => setShowConfirm(v => !v)}>
            {showConfirm ? <EyeOff size={16} color={Colors.textMuted} /> : <Eye size={16} color={Colors.textMuted} />}
          </TouchableOpacity>
        </View>
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

const FRANCHISE_LEVELS = [
  { score: 1, label: 'Doux' },
  { score: 2, label: 'Nuancé' },
  { score: 3, label: 'Direct' },
  { score: 4, label: 'Cash' },
  { score: 5, label: 'Brutal' },
];

const FAMILIARITE_LEVELS = [
  { score: 1, label: 'Formel' },
  { score: 2, label: 'Poli' },
  { score: 3, label: 'Naturel' },
  { score: 4, label: 'Familier' },
  { score: 5, label: 'Pote' },
];

function ToneSelector({
  label,
  hint,
  levels,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  levels: { score: number; label: string }[];
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={toneStyles.wrap}>
      <Text style={tabStyles.fieldLabel}>{label}</Text>
      <Text style={tabStyles.fieldHint}>{hint}</Text>
      <View style={toneStyles.row}>
        {levels.map((l) => {
          const active = value === l.score;
          return (
            <TouchableOpacity
              key={l.score}
              style={[toneStyles.tile, active && toneStyles.tileActive]}
              onPress={() => onChange(l.score)}
              activeOpacity={0.7}
            >
              <Text style={[toneStyles.tileLabel, active && toneStyles.tileLabelActive]}>
                {l.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const toneStyles = StyleSheet.create({
  wrap: { gap: 4 },
  row: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.xs },
  tile: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceGray,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  tileActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tileLabel: {
    fontSize: Typography.fontSizeXS,
    fontWeight: Typography.fontWeightSemiBold,
    color: Colors.textMuted,
  },
  tileLabelActive: { color: '#fff' },
});

function TabContexte() {
  const [fields, setFields] = useState<Record<string, string>>({});
  const [scoreFranchise, setScoreFranchise] = useState(3);
  const [scoreFamiliarite, setScoreFamiliarite] = useState(3);
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
      if (data) {
        setFields(data);
        if (data.score_franchise != null) setScoreFranchise(data.score_franchise);
        if (data.score_familiarite != null) setScoreFamiliarite(data.score_familiarite);
      }
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
      score_franchise: scoreFranchise,
      score_familiarite: scoreFamiliarite,
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

      {/* Ton de l'IA */}
      <View style={tabStyles.infoCard}>
        <Text style={toneCardStyles.cardTitle}>Ton de l'IA</Text>
        <Text style={toneCardStyles.cardSubtitle}>
          Personnalise comment l'IA s'adresse à toi.
        </Text>
        <ToneSelector
          label="Franchise"
          hint="Jusqu'où tu veux que l'IA soit directe ?"
          levels={FRANCHISE_LEVELS}
          value={scoreFranchise}
          onChange={setScoreFranchise}
        />
        <View style={{ height: Spacing.md }} />
        <ToneSelector
          label="Familiarité"
          hint="Quel registre de langage tu préfères ?"
          levels={FAMILIARITE_LEVELS}
          value={scoreFamiliarite}
          onChange={setScoreFamiliarite}
        />
      </View>

      {/* Contexte profil */}
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

const toneCardStyles = StyleSheet.create({
  cardTitle: {
    fontSize: Typography.fontSizeSM,
    fontWeight: Typography.fontWeightBold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: Typography.fontSizeXS,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
});

// ─── Onglet Profil Cognitif ───────────────────────────────────────────────────

type CogStatus = 'idle' | 'loading' | 'done' | 'error';

interface LocalStats {
  totalDecisions: number;
  instinctAlignedPct: number;
  instinctDecisionsCount: number;
  topBiases: { name: string; count: number }[];
}

function computeLocalStats(decisions: any[]): LocalStats {
  const withCoherence = decisions.filter(
    (d) => d.message_coherence && !d.message_coherence.includes("n'a pas"),
  );
  const instinctAligned = withCoherence.filter((d) =>
    d.message_coherence.startsWith('Ta logique'),
  );
  const instinctAlignedPct =
    withCoherence.length > 0
      ? Math.round((instinctAligned.length / withCoherence.length) * 100)
      : 0;

  const biasesCounts: Record<string, number> = {};
  for (const d of decisions) {
    if (d.analysis?.biases && Array.isArray(d.analysis.biases)) {
      for (const bias of d.analysis.biases) {
        if (bias.name) biasesCounts[bias.name] = (biasesCounts[bias.name] ?? 0) + 1;
      }
    }
  }
  const topBiases = Object.entries(biasesCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return { totalDecisions: decisions.length, instinctAlignedPct, instinctDecisionsCount: withCoherence.length, topBiases };
}

function TabProfilCognitif() {
  const [status, setStatus] = useState<CogStatus>('idle');
  const [localStats, setLocalStats] = useState<LocalStats | null>(null);
  const [aiProfile, setAiProfile] = useState<ProfilCognitifResponse | null>(null);

  async function handleGenerate() {
    setStatus('loading');
    try {
      const { data, error } = await supabase
        .from('decisions')
        .select('dilemma, context_summary, option_a, option_b, winner, message_coherence, analysis');
      if (error || !data) throw new Error('Erreur de chargement');
      if (data.length === 0) {
        setStatus('idle');
        return;
      }
      const stats = computeLocalStats(data);
      setLocalStats(stats);
      const { data: aiData } = await callProfilCognitif(data);
      setAiProfile(aiData);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }

  // ── État initial ──
  if (status === 'idle') {
    return (
      <View style={cogStyles.idleWrap}>
        <View style={cogStyles.idleIcon}>
          <TrendingUp size={32} color={Colors.primary} />
        </View>
        <Text style={cogStyles.idleTitle}>Ton profil de décideur</Text>
        <Text style={cogStyles.idleHint}>
          L'IA analyse l'ensemble de tes décisions passées pour révéler tes patterns, tes biais et ton style de pensée.
        </Text>
        <TouchableOpacity style={cogStyles.generateBtn} onPress={handleGenerate}>
          <Sparkles size={16} color="#fff" />
          <Text style={cogStyles.generateBtnText}>Obtenir mon profil cognitif</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Chargement ──
  if (status === 'loading') {
    return (
      <View style={cogStyles.idleWrap}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={cogStyles.loadingText}>Analyse en cours…</Text>
        <Text style={cogStyles.loadingHint}>L'IA lit tes décisions passées</Text>
      </View>
    );
  }

  // ── Erreur ──
  if (status === 'error') {
    return (
      <View style={cogStyles.idleWrap}>
        <Text style={cogStyles.idleTitle}>Une erreur s'est produite</Text>
        <TouchableOpacity style={cogStyles.generateBtn} onPress={handleGenerate}>
          <Text style={cogStyles.generateBtnText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Résultats ──
  return (
    <View style={tabStyles.container}>

      {/* Sujets récurrents */}
      {aiProfile?.sujets && aiProfile.sujets.length > 0 && (
        <View style={cogStyles.card}>
          <Text style={cogStyles.cardLabel}>SUJETS RÉCURRENTS</Text>
          <View style={cogStyles.chipsWrap}>
            {aiProfile.sujets.map((s) => (
              <View key={s.label} style={cogStyles.chip}>
                <Text style={cogStyles.chipLabel}>{s.label}</Text>
                <Text style={cogStyles.chipCount}>{s.occurrences}×</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Observations IA */}
      {aiProfile?.observations && aiProfile.observations.length > 0 && (
        <View style={cogStyles.card}>
          <Text style={cogStyles.cardLabel}>CE QU'ON REMARQUE</Text>
          <View style={{ gap: Spacing.md }}>
            {aiProfile.observations.map((obs, i) => (
              <View key={i} style={cogStyles.obsRow}>
                <View style={cogStyles.obsAccent} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={cogStyles.obsTitle}>{obs.titre}</Text>
                  <Text style={cogStyles.obsDetail}>{obs.detail}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Profil synthèse */}
      {aiProfile?.profil_synthese && (
        <View style={cogStyles.profilCard}>
          <Text style={cogStyles.cardLabel}>TON PROFIL DE DÉCIDEUR</Text>
          <Text style={cogStyles.profilText}>{aiProfile.profil_synthese}</Text>
        </View>
      )}

      {/* Question miroir */}
      {aiProfile?.question_miroir && (
        <View style={cogStyles.mirrorCard}>
          <Text style={cogStyles.mirrorLabel}>LA QUESTION QUE TU ÉVITES</Text>
          <Text style={cogStyles.mirrorText}>{aiProfile.question_miroir}</Text>
        </View>
      )}

      {/* Instinct vs Logique */}
      {localStats && localStats.instinctDecisionsCount > 0 && (
        <View style={cogStyles.card}>
          <Text style={cogStyles.cardLabel}>INSTINCT VS LOGIQUE</Text>
          <Text style={cogStyles.instinctStat}>
            Ton instinct et ta logique s'accordent dans{' '}
            <Text style={{ color: Colors.primary, fontWeight: Typography.fontWeightBold }}>
              {localStats.instinctAlignedPct}% des cas
            </Text>
          </Text>
          <View style={cogStyles.splitBar}>
            <View style={[cogStyles.splitLeft, { flex: localStats.instinctAlignedPct || 1 }]} />
            <View style={[cogStyles.splitRight, { flex: (100 - localStats.instinctAlignedPct) || 1 }]} />
          </View>
          <View style={cogStyles.splitLegend}>
            <View style={cogStyles.legendItem}>
              <View style={[cogStyles.dot, { backgroundColor: Colors.primary }]} />
              <Text style={cogStyles.legendText}>Alignés ({localStats.instinctAlignedPct}%)</Text>
            </View>
            <View style={cogStyles.legendItem}>
              <View style={[cogStyles.dot, { backgroundColor: Colors.border }]} />
              <Text style={cogStyles.legendText}>Divergents ({100 - localStats.instinctAlignedPct}%)</Text>
            </View>
          </View>
        </View>
      )}

      {/* Mur des biais */}
      {localStats && localStats.topBiases.length > 0 && (
        <View style={cogStyles.card}>
          <Text style={cogStyles.cardLabel}>MUR DES BIAIS</Text>
          <Text style={cogStyles.cardHint}>Tes biais cognitifs les plus fréquents</Text>
          <View style={{ gap: Spacing.sm, marginTop: Spacing.xs }}>
            {localStats.topBiases.map((bias, i) => (
              <View key={bias.name} style={cogStyles.biasRow}>
                <View style={cogStyles.biasRank}>
                  <Text style={cogStyles.biasRankText}>{i + 1}</Text>
                </View>
                <Text style={cogStyles.biasName} numberOfLines={2}>{bias.name}</Text>
                <View style={cogStyles.biasCount}>
                  <Text style={cogStyles.biasCountText}>{bias.count}×</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      <Text style={cogStyles.basedOn}>
        Basé sur {localStats?.totalDecisions ?? 0} décision{(localStats?.totalDecisions ?? 0) > 1 ? 's' : ''} analysées
      </Text>

      {/* Regénérer */}
      <TouchableOpacity style={cogStyles.regenBtn} onPress={handleGenerate}>
        <Text style={cogStyles.regenText}>Regénérer l'analyse</Text>
      </TouchableOpacity>
    </View>
  );
}

const cogStyles = StyleSheet.create({
  // ── Idle / Loading ──
  idleWrap: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  idleIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.primaryPale,
    alignItems: 'center', justifyContent: 'center',
  },
  idleTitle: {
    fontSize: Typography.fontSizeLG,
    fontWeight: Typography.fontWeightBold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  idleHint: {
    fontSize: Typography.fontSizeSM,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
  },
  generateBtnText: {
    color: '#fff', fontSize: Typography.fontSizeMD,
    fontWeight: Typography.fontWeightBold,
  },
  loadingText: {
    fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightSemiBold,
    color: Colors.textPrimary, marginTop: Spacing.sm,
  },
  loadingHint: { fontSize: Typography.fontSizeSM, color: Colors.textMuted },

  // ── Cards communes ──
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border,
    gap: Spacing.sm,
  },
  cardLabel: {
    fontSize: 10, fontWeight: Typography.fontWeightBold,
    color: Colors.textMuted, letterSpacing: 1.1, textTransform: 'uppercase',
  },
  cardHint: { fontSize: Typography.fontSizeSM, color: Colors.textMuted },

  // ── Sujets chips ──
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.primaryPale, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.primary + '30',
  },
  chipLabel: {
    fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightSemiBold,
    color: Colors.primary,
  },
  chipCount: { fontSize: Typography.fontSizeXS, color: Colors.primaryLight },

  // ── Observations ──
  obsRow: { flexDirection: 'row', gap: Spacing.sm },
  obsAccent: {
    width: 3, borderRadius: 2, backgroundColor: Colors.primary,
    alignSelf: 'stretch',
  },
  obsTitle: {
    fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightBold,
    color: Colors.textPrimary,
  },
  obsDetail: {
    fontSize: Typography.fontSizeSM, color: Colors.textSecondary, lineHeight: 19,
  },

  // ── Profil synthèse ──
  profilCard: {
    backgroundColor: Colors.surfaceBeige, borderRadius: BorderRadius.md,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.borderBeige, gap: Spacing.sm,
  },
  profilText: {
    fontSize: Typography.fontSizeSM, color: Colors.textSecondary,
    lineHeight: 21, fontStyle: 'italic',
  },

  // ── Question miroir ──
  mirrorCard: {
    backgroundColor: Colors.textPrimary, borderRadius: BorderRadius.md,
    padding: Spacing.lg, gap: Spacing.sm,
  },
  mirrorLabel: {
    fontSize: 10, fontWeight: Typography.fontWeightBold,
    color: Colors.primary, letterSpacing: 1.1, textTransform: 'uppercase',
  },
  mirrorText: {
    fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightSemiBold,
    color: '#FFFFFF', lineHeight: 22,
  },

  // ── Instinct ──
  instinctStat: { fontSize: Typography.fontSizeSM, color: Colors.textSecondary, lineHeight: 20 },
  splitBar: {
    height: 8, borderRadius: BorderRadius.full, flexDirection: 'row',
    overflow: 'hidden', marginTop: Spacing.xs,
  },
  splitLeft: { backgroundColor: Colors.primary },
  splitRight: { backgroundColor: Colors.surfaceGray },
  splitLegend: { flexDirection: 'row', justifyContent: 'space-between' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: Typography.fontSizeXS, color: Colors.textMuted },

  // ── Biais ──
  biasRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  biasRank: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.primaryPale, alignItems: 'center', justifyContent: 'center',
  },
  biasRankText: { fontSize: Typography.fontSizeXS, fontWeight: Typography.fontWeightBold, color: Colors.primary },
  biasName: { flex: 1, fontSize: Typography.fontSizeSM, color: Colors.textPrimary },
  biasCount: {
    backgroundColor: Colors.surfaceGray, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 2,
    borderWidth: 1, borderColor: Colors.border,
  },
  biasCountText: { fontSize: Typography.fontSizeXS, fontWeight: Typography.fontWeightBold, color: Colors.textSecondary },

  // ── Footer ──
  basedOn: { fontSize: Typography.fontSizeXS, color: Colors.textMuted, textAlign: 'center' },
  regenBtn: {
    alignItems: 'center', paddingVertical: Spacing.sm,
  },
  regenText: {
    fontSize: Typography.fontSizeSM, color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
});

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
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  passwordInput: { flex: 1, paddingRight: 40 },
  eyeBtn: { position: 'absolute', right: 0, paddingHorizontal: 12, paddingVertical: Spacing.sm },
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
  privacyLink: { textAlign: 'center', color: Colors.textMuted, fontSize: Typography.fontSizeXS, textDecorationLine: 'underline', marginTop: Spacing.xs },
});

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('compte');
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

      <FeedbackModal visible={showFeedback} onClose={() => setShowFeedback(false)} />

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
        {activeTab === 'cognitif' && <TabProfilCognitif />}

        {/* Feedback */}
        <TouchableOpacity
          style={styles.feedbackBtn}
          onPress={() => setShowFeedback(true)}
          activeOpacity={0.75}
        >
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

