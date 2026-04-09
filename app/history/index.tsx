import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import {
  ArrowLeft, LogOut, Trophy, ChevronRight,
  Trash2, ArrowUpDown, CheckSquare, Square, X,
} from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export interface Decision {
  id: string;
  created_at: string;
  context_summary: string | null;
  option_a: string;
  option_b: string;
  winner: string | null;
  score_a: number | null;
  score_b: number | null;
  niveau_reco: string | null;
  label_niveau: string | null;
  message_coherence: string | null;
  weights: Record<string, number> | null;
  analysis: any;
  criteria: any[];
  answers: Record<string, string> | null;
}

type SortMode = 'recent' | 'oldest' | 'score_desc' | 'score_asc';

const SORT_LABELS: Record<SortMode, string> = {
  recent: 'Plus récent',
  oldest: 'Plus ancien',
  score_desc: 'Meilleur score',
  score_asc: 'Score le plus bas',
};

const NIVEAU_COLOR: Record<string, string> = {
  serré: '#F59E0B',
  léger: '#3B82F6',
  clair: '#10B981',
};

function confirmAlert(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n${message}`)) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: onConfirm },
    ]);
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function sortDecisions(list: Decision[], mode: SortMode): Decision[] {
  return [...list].sort((a, b) => {
    if (mode === 'recent') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (mode === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    const scoreA = Math.max(a.score_a ?? 0, a.score_b ?? 0);
    const scoreB = Math.max(b.score_a ?? 0, b.score_b ?? 0);
    return mode === 'score_desc' ? scoreB - scoreA : scoreA - scoreB;
  });
}

function SortModal({ visible, current, onSelect, onClose }: {
  visible: boolean;
  current: SortMode;
  onSelect: (m: SortMode) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={sortStyles.overlay} onPress={onClose}>
        <View style={sortStyles.sheet}>
          <View style={sortStyles.sheetHeader}>
            <Text style={sortStyles.sheetTitle}>Trier par</Text>
            <TouchableOpacity onPress={onClose}><X size={18} color={Colors.textMuted} /></TouchableOpacity>
          </View>
          {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[sortStyles.option, current === mode && sortStyles.optionActive]}
              onPress={() => { onSelect(mode); onClose(); }}
            >
              <Text style={[sortStyles.optionText, current === mode && { color: Colors.primary }]}>
                {SORT_LABELS[mode]}
              </Text>
              {current === mode && <View style={sortStyles.dot} />}
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

const sortStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000050', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg, gap: Spacing.xs,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sheetTitle: { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightBold, color: Colors.textPrimary },
  option: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  optionActive: { backgroundColor: Colors.primary + '10' },
  optionText: { fontSize: Typography.fontSizeMD, color: Colors.textSecondary },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
});

function DecisionCard({
  item, onPress, selected, selecting, onLongPress, onToggle,
}: {
  item: Decision;
  onPress: () => void;
  selected: boolean;
  selecting: boolean;
  onLongPress: () => void;
  onToggle: () => void;
}) {
  const niveauColor = item.niveau_reco ? (NIVEAU_COLOR[item.niveau_reco] ?? Colors.textMuted) : Colors.textMuted;
  const winnerIsA = item.winner === item.option_a;
  const winnerScore = winnerIsA ? item.score_a : item.score_b;
  const loserScore = winnerIsA ? item.score_b : item.score_a;
  const loserLabel = winnerIsA ? item.option_b : item.option_a;
  const summary = item.context_summary
    ? (item.context_summary.length > 90 ? item.context_summary.slice(0, 90) + '…' : item.context_summary)
    : null;

  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={selecting ? onToggle : onPress}
      onLongPress={onLongPress}
      activeOpacity={0.75}
    >
      <View style={styles.cardInner}>
        {selecting && (
          <TouchableOpacity onPress={onToggle} style={styles.checkbox}>
            {selected
              ? <CheckSquare size={20} color={Colors.primary} />
              : <Square size={20} color={Colors.textMuted} />}
          </TouchableOpacity>
        )}
        <View style={{ flex: 1, gap: Spacing.sm }}>
          {summary ? <Text style={styles.summary}>{summary}</Text> : null}

          <View style={styles.optionsRow}>
            <View style={[styles.optionChip, item.winner === item.option_a && styles.optionChipWinner]}>
              {item.winner === item.option_a && <Trophy size={10} color={Colors.primary} />}
              <Text style={[styles.optionText, item.winner === item.option_a && { color: Colors.primary }]} numberOfLines={1}>
                {item.option_a}
              </Text>
            </View>
            <Text style={styles.vs}>vs</Text>
            <View style={[styles.optionChip, item.winner === item.option_b && styles.optionChipWinner]}>
              {item.winner === item.option_b && <Trophy size={10} color={Colors.primary} />}
              <Text style={[styles.optionText, item.winner === item.option_b && { color: Colors.primary }]} numberOfLines={1}>
                {item.option_b}
              </Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.resultRow}>
              {item.winner ? (
                <>
                  <Text style={styles.winnerScore}>{winnerScore}/100</Text>
                  <Text style={styles.vs}>·</Text>
                  <Text style={styles.loserScore} numberOfLines={1}>{loserLabel} {loserScore}/100</Text>
                </>
              ) : null}
              {item.niveau_reco ? (
                <View style={[styles.niveauBadge, { backgroundColor: niveauColor + '20', borderColor: niveauColor + '50' }]}>
                  <Text style={[styles.niveauText, { color: niveauColor }]}>{item.niveau_reco}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.footerRight}>
              <Text style={styles.date}>{formatDate(item.created_at)}</Text>
              {!selecting && <ChevronRight size={14} color={Colors.textMuted} />}
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [email, setEmail] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [showSort, setShowSort] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selecting, setSelecting] = useState(false);

  async function fetchDecisions() {
    const { data, error } = await supabase
      .from('decisions')
      .select('id, created_at, context_summary, option_a, option_b, winner, score_a, score_b, niveau_reco, label_niveau, message_coherence, weights, analysis, criteria, answers')
      .order('created_at', { ascending: false });

    if (!error && data) setDecisions(data as Decision[]);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    fetchDecisions();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email);
    });
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDecisions();
  }, []);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function startSelecting(id: string) {
    setSelecting(true);
    setSelected(new Set([id]));
  }

  function cancelSelecting() {
    setSelecting(false);
    setSelected(new Set());
  }

  function selectAll() {
    setSelected(new Set(decisions.map((d) => d.id)));
  }

  function deleteSelected() {
    const ids = [...selected];
    confirmAlert(
      'Supprimer',
      `Supprimer ${ids.length} décision${ids.length > 1 ? 's' : ''} ?`,
      async () => {
        await supabase.from('decisions').delete().in('id', ids);
        setDecisions((prev) => prev.filter((d) => !selected.has(d.id)));
        cancelSelecting();
      }
    );
  }

  function deleteAll() {
    confirmAlert(
      'Tout supprimer',
      "Supprimer tout l'historique ? Cette action est irréversible.",
      async () => {
        const ids = decisions.map((d) => d.id);
        await supabase.from('decisions').delete().in('id', ids);
        setDecisions([]);
        cancelSelecting();
      }
    );
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  const sorted = sortDecisions(decisions, sortMode);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {selecting ? (
          <>
            <TouchableOpacity style={styles.backBtn} onPress={cancelSelecting}>
              <X size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.title, { flex: 1 }]}>{selected.size} sélectionné{selected.size > 1 ? 's' : ''}</Text>
            <TouchableOpacity style={styles.headerAction} onPress={selectAll}>
              <Text style={styles.headerActionText}>Tout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerAction} onPress={deleteSelected} disabled={selected.size === 0}>
              <Trash2 size={18} color={selected.size > 0 ? Colors.danger : Colors.textMuted} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <ArrowLeft size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.title}>Historique</Text>
              {email ? <Text style={styles.userEmail}>{email}</Text> : null}
            </View>
            <TouchableOpacity style={styles.headerAction} onPress={() => setShowSort(true)}>
              <ArrowUpDown size={18} color={Colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerAction} onPress={handleLogout}>
              <LogOut size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : decisions.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Pas encore de décisions</Text>
          <Text style={styles.emptyHint}>Tes analyses apparaîtront ici automatiquement.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          {/* Barre infos + actions */}
          <View style={styles.toolbar}>
            <Text style={styles.count}>{decisions.length} décision{decisions.length > 1 ? 's' : ''}</Text>
            {!selecting && (
              <TouchableOpacity onPress={deleteAll}>
                <Text style={styles.deleteAllText}>Tout supprimer</Text>
              </TouchableOpacity>
            )}
          </View>

          {sorted.map((d) => (
            <DecisionCard
              key={d.id}
              item={d}
              selected={selected.has(d.id)}
              selecting={selecting}
              onPress={() => router.push({ pathname: '/history/[id]', params: { id: d.id, data: JSON.stringify(d) } } as any)}
              onLongPress={() => startSelecting(d.id)}
              onToggle={() => toggleSelect(d.id)}
            />
          ))}
        </ScrollView>
      )}

      <SortModal
        visible={showSort}
        current={sortMode}
        onSelect={setSortMode}
        onClose={() => setShowSort(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.lg,
    borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.xs,
  },
  backBtn: { padding: Spacing.xs, marginRight: Spacing.xs },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: Colors.textPrimary },
  userEmail: { fontSize: Typography.fontSizeXS, color: Colors.textMuted, marginTop: 2 },
  headerAction: { padding: Spacing.xs },
  headerActionText: { fontSize: Typography.fontSizeSM, color: Colors.primary, fontWeight: Typography.fontWeightSemiBold },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing['2xl'] },
  emptyTitle: { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  emptyHint: { fontSize: Typography.fontSizeSM, color: Colors.textMuted, textAlign: 'center' },
  list: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing['3xl'] },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  count: { fontSize: Typography.fontSizeXS, color: Colors.textMuted },
  deleteAllText: { fontSize: Typography.fontSizeXS, color: Colors.danger, fontWeight: Typography.fontWeightSemiBold },

  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  cardSelected: { borderColor: Colors.primary + '60', backgroundColor: Colors.primary + '05' },
  cardInner: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  checkbox: { paddingTop: 2 },
  summary: { fontSize: Typography.fontSizeSM, color: Colors.textSecondary, lineHeight: Typography.fontSizeSM * 1.5 },
  optionsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  optionChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.background, borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.border,
  },
  optionChipWinner: { borderColor: Colors.primary + '60', backgroundColor: Colors.primary + '0D' },
  optionText: { flex: 1, fontSize: Typography.fontSizeXS, fontWeight: Typography.fontWeightSemiBold, color: Colors.textSecondary },
  vs: { fontSize: Typography.fontSizeXS, color: Colors.textMuted, fontWeight: Typography.fontWeightBold },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flex: 1 },
  winnerScore: { fontSize: Typography.fontSizeXS, fontWeight: Typography.fontWeightBold, color: Colors.primary },
  loserScore: { fontSize: Typography.fontSizeXS, color: Colors.textMuted, flexShrink: 1 },
  niveauBadge: { borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderWidth: 1 },
  niveauText: { fontSize: Typography.fontSizeXS, fontWeight: Typography.fontWeightSemiBold },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  date: { fontSize: Typography.fontSizeXS, color: Colors.textMuted },
});
