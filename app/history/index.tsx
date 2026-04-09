import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, LogOut, Trophy, Clock } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

interface Decision {
  id: string;
  created_at: string;
  dilemma: string;
  option_a: string;
  option_b: string;
  winner: string | null;
  score_a: number | null;
  score_b: number | null;
  niveau_reco: string | null;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function NiveauBadge({ niveau }: { niveau: string | null }) {
  if (!niveau) return null;
  const color = niveau === 'serré' ? '#F59E0B' : niveau === 'léger' ? '#3B82F6' : '#10B981';
  return (
    <View style={[badgeStyles.wrap, { backgroundColor: color + '20', borderColor: color + '50' }]}>
      <Text style={[badgeStyles.text, { color }]}>{niveau}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  wrap: { borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderWidth: 1 },
  text: { fontSize: Typography.fontSizeXS, fontWeight: Typography.fontWeightSemiBold },
});

function DecisionCard({ item }: { item: Decision }) {
  const dilemmaSnippet = item.dilemma.length > 80 ? item.dilemma.slice(0, 80) + '…' : item.dilemma;

  return (
    <View style={cardStyles.wrap}>
      <View style={cardStyles.header}>
        <View style={cardStyles.dateRow}>
          <Clock size={12} color={Colors.textMuted} />
          <Text style={cardStyles.date}>{formatDate(item.created_at)}</Text>
        </View>
        <NiveauBadge niveau={item.niveau_reco} />
      </View>

      <Text style={cardStyles.dilemma}>{dilemmaSnippet}</Text>

      <View style={cardStyles.optionsRow}>
        <View style={[cardStyles.option, item.winner === item.option_a && cardStyles.optionWinner]}>
          <Text style={[cardStyles.optionLabel, item.winner === item.option_a && cardStyles.optionLabelWinner]}>
            {item.option_a}
          </Text>
          {item.score_a != null && (
            <Text style={[cardStyles.optionScore, item.winner === item.option_a && { color: Colors.primary }]}>
              {item.score_a}/100
            </Text>
          )}
          {item.winner === item.option_a && <Trophy size={12} color={Colors.primary} />}
        </View>

        <Text style={cardStyles.vs}>vs</Text>

        <View style={[cardStyles.option, item.winner === item.option_b && cardStyles.optionWinner]}>
          <Text style={[cardStyles.optionLabel, item.winner === item.option_b && cardStyles.optionLabelWinner]}>
            {item.option_b}
          </Text>
          {item.score_b != null && (
            <Text style={[cardStyles.optionScore, item.winner === item.option_b && { color: Colors.primary }]}>
              {item.score_b}/100
            </Text>
          )}
          {item.winner === item.option_b && <Trophy size={12} color={Colors.primary} />}
        </View>
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  date: { fontSize: Typography.fontSizeXS, color: Colors.textMuted },
  dilemma: { fontSize: Typography.fontSizeSM, color: Colors.textSecondary, lineHeight: Typography.fontSizeSM * 1.5 },
  optionsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs },
  option: {
    flex: 1, backgroundColor: Colors.background, borderRadius: BorderRadius.sm,
    padding: Spacing.sm, borderWidth: 1, borderColor: Colors.border, gap: 2,
  },
  optionWinner: { borderColor: Colors.primary + '50', backgroundColor: Colors.primary + '08' },
  optionLabel: { fontSize: Typography.fontSizeXS, fontWeight: Typography.fontWeightSemiBold, color: Colors.textSecondary },
  optionLabelWinner: { color: Colors.primary },
  optionScore: { fontSize: Typography.fontSizeXS, color: Colors.textMuted, fontWeight: Typography.fontWeightBold },
  vs: { fontSize: Typography.fontSizeXS, color: Colors.textMuted, fontWeight: Typography.fontWeightBold },
});

export default function HistoryScreen() {
  const router = useRouter();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [email, setEmail] = useState('');

  async function fetchDecisions() {
    const { data, error } = await supabase
      .from('decisions')
      .select('id, created_at, dilemma, option_a, option_b, winner, score_a, score_b, niveau_reco')
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

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Historique</Text>
          {email ? <Text style={styles.userEmail}>{email}</Text> : null}
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Content */}
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
          <Text style={styles.count}>{decisions.length} décision{decisions.length > 1 ? 's' : ''}</Text>
          {decisions.map((d) => <DecisionCard key={d.id} item={d} />)}
        </ScrollView>
      )}
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
  backBtn: { padding: Spacing.xs },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: Colors.textPrimary },
  userEmail: { fontSize: Typography.fontSizeXS, color: Colors.textMuted, marginTop: 2 },
  logoutBtn: { padding: Spacing.xs },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing['2xl'] },
  emptyTitle: { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  emptyHint: { fontSize: Typography.fontSizeSM, color: Colors.textMuted, textAlign: 'center' },
  list: { padding: Spacing.lg, gap: Spacing.md },
  count: { fontSize: Typography.fontSizeXS, color: Colors.textMuted, marginBottom: Spacing.xs },
});
