import { View, Text, StyleSheet } from 'react-native';
import { Typography, Colors } from '@/constants/theme';

const PROVIDER_NAMES: Record<string, string> = {
  gemini: 'Gemini 3.1 Flash Lite',
  anthropic: 'Claude 3.5 Haiku',
};

export function AiBadge({ provider }: { provider: string | null | undefined }) {
  if (!provider) return null;
  const name = PROVIDER_NAMES[provider];
  if (!name) return null;

  return (
    <View style={styles.badge}>
      <View style={styles.dot} />
      <Text style={styles.text}>{name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.textMuted,
  },
  text: {
    fontSize: Typography.fontSizeXS,
    color: Colors.textMuted,
    letterSpacing: 0.1,
  },
});
