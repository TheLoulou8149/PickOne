import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useState } from 'react';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const FRANCHISE_LEVELS = [
  { score: 1, label: 'Doux', hint: 'Bienveillant, encourageant' },
  { score: 2, label: 'Nuancé', hint: 'Direct mais ménagé' },
  { score: 3, label: 'Direct', hint: 'Honnête, équilibré' },
  { score: 4, label: 'Cash', hint: 'Sans filtre, brut' },
  { score: 5, label: 'Brutal', hint: 'Aucun ménagement' },
];

const FAMILIARITE_LEVELS = [
  { score: 1, label: 'Formel', hint: 'Vouvoiement, registre pro' },
  { score: 2, label: 'Poli', hint: 'Courtois, tutoiement léger' },
  { score: 3, label: 'Naturel', hint: 'Tutoiement, ton neutre' },
  { score: 4, label: 'Familier', hint: 'Décontracté, courant' },
  { score: 5, label: 'Pote', hint: 'Très familier, argot ok' },
];

function ScoreRow({
  levels,
  value,
  onChange,
}: {
  levels: { score: number; label: string; hint: string }[];
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View>
      <View style={srStyles.row}>
        {levels.map((l) => {
          const active = value === l.score;
          return (
            <TouchableOpacity
              key={l.score}
              style={[srStyles.tile, active && srStyles.tileActive]}
              onPress={() => onChange(l.score)}
              activeOpacity={0.7}
            >
              <Text style={[srStyles.label, active && srStyles.labelActive]}>{l.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={srStyles.hint}>
        {levels.find((l) => l.score === value)?.hint ?? ''}
      </Text>
    </View>
  );
}

interface Props {
  visible: boolean;
  onDone: () => void;
}

export function ToneSetupModal({ visible, onDone }: Props) {
  const [franchise, setFranchise] = useState(3);
  const [familiarite, setFamiliarite] = useState(3);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('user_context').upsert(
        { user_id: user.id, score_franchise: franchise, score_familiarite: familiarite },
        { onConflict: 'user_id' }
      );
    }
    setSaving(false);
    onDone();
  }

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Comment tu veux qu'on te parle ?</Text>
          <Text style={styles.subtitle}>
            Choisis le ton de l'IA. Tu pourras le modifier à tout moment dans ton profil.
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>FRANCHISE</Text>
            <Text style={styles.sectionHint}>Combien tu veux que l'IA soit directe avec toi ?</Text>
            <ScoreRow levels={FRANCHISE_LEVELS} value={franchise} onChange={setFranchise} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>FAMILIARITÉ</Text>
            <Text style={styles.sectionHint}>Quel registre de langage tu préfères ?</Text>
            <ScoreRow levels={FAMILIARITE_LEVELS} value={familiarite} onChange={setFamiliarite} />
          </View>

          <TouchableOpacity
            style={[styles.btn, saving && styles.btnDim]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Text style={styles.btnText}>{saving ? 'Enregistrement…' : "C'est parti"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const srStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  tile: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceGray,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  label: {
    fontSize: Typography.fontSizeXS,
    fontWeight: Typography.fontWeightSemiBold,
    color: Colors.textMuted,
  },
  labelActive: {
    color: '#fff',
  },
  hint: {
    fontSize: Typography.fontSizeXS,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xs,
    minHeight: 16,
  },
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 440,
    gap: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSizeLG,
    fontWeight: Typography.fontWeightBold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.fontSizeSM,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
  section: {
    gap: 4,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: Typography.fontWeightBold,
    color: Colors.textMuted,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  sectionHint: {
    fontSize: Typography.fontSizeXS,
    color: Colors.textSecondary,
  },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  btnDim: { opacity: 0.45 },
  btnText: {
    color: '#fff',
    fontSize: Typography.fontSizeMD,
    fontWeight: Typography.fontWeightBold,
  },
});
