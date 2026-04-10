import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

type FeedbackType = 'bug' | 'suggestion' | 'autre';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const TYPES: { key: FeedbackType; label: string }[] = [
  { key: 'bug', label: '🐛 Bug' },
  { key: 'suggestion', label: '💡 Suggestion' },
  { key: 'autre', label: '💬 Autre' },
];

export function FeedbackModal({ visible, onClose }: Props) {
  const [type, setType] = useState<FeedbackType>('suggestion');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  function handleClose() {
    setMessage('');
    setType('suggestion');
    setStatus('idle');
    onClose();
  }

  async function handleSubmit() {
    if (message.trim().length < 5 || status === 'loading') return;
    setStatus('loading');
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';
      const res = await fetch(`${backendUrl}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, message }),
      });
      if (!res.ok) throw new Error('Erreur serveur');
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* En-tête */}
          <View style={styles.header}>
            <Text style={styles.title}>Envoyer un retour</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={12}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {status === 'success' ? (
            <View style={styles.successBlock}>
              <Text style={styles.successEmoji}>✅</Text>
              <Text style={styles.successText}>Merci ! Retour envoyé.</Text>
              <TouchableOpacity style={styles.btn} onPress={handleClose}>
                <Text style={styles.btnText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Sélecteur de type */}
              <View style={styles.typeRow}>
                {TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.typeBtn, type === t.key && styles.typeBtnActive]}
                    onPress={() => setType(t.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.typeBtnText, type === t.key && styles.typeBtnTextActive]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Zone de texte */}
              <TextInput
                style={styles.textarea}
                placeholder="Décris le problème ou ta suggestion…"
                placeholderTextColor={Colors.textMuted}
                value={message}
                onChangeText={setMessage}
                multiline
                textAlignVertical="top"
                editable={status !== 'loading'}
              />

              {status === 'error' && (
                <Text style={styles.errorText}>Échec de l'envoi. Réessaie.</Text>
              )}

              {/* Bouton envoyer */}
              <TouchableOpacity
                style={[styles.btn, (message.trim().length < 5 || status === 'loading') && styles.btnDim]}
                onPress={handleSubmit}
                disabled={message.trim().length < 5 || status === 'loading'}
                activeOpacity={0.85}
              >
                {status === 'loading' ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.btnText}>Envoyer →</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000060',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.lg,
    paddingBottom: 40,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: Typography.fontSizeLG,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  closeBtn: {
    fontSize: 16,
    color: Colors.textMuted,
    paddingHorizontal: 4,
  },
  typeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeBtnActive: {
    backgroundColor: Colors.primaryPale,
    borderColor: Colors.primary + '40',
  },
  typeBtnText: {
    fontSize: Typography.fontSizeSM,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  typeBtnTextActive: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  textarea: {
    backgroundColor: Colors.surfaceGray,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    color: Colors.textPrimary,
    fontSize: Typography.fontSizeMD,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 120,
  },
  errorText: {
    color: Colors.danger,
    fontSize: Typography.fontSizeSM,
    textAlign: 'center',
  },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnDim: { opacity: 0.4 },
  btnText: {
    color: '#fff',
    fontSize: Typography.fontSizeMD,
    fontWeight: '700' as const,
  },
  successBlock: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  successEmoji: { fontSize: 36 },
  successText: {
    fontSize: Typography.fontSizeLG,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
});
