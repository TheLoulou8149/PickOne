import { View, Text, StyleSheet } from 'react-native';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';

const PROVIDER_CONFIG: Record<string, { name: string; color: string }> = {
  gemini: { name: 'Gemini 3.1 Flash Lite', color: '#8B5CF6' },
  anthropic: { name: 'Claude 3.5 Haiku', color: '#F97316' },
};

export function AiBadge({ provider }: { provider: string | null | undefined }) {
  if (!provider) return null;
  const config = PROVIDER_CONFIG[provider];
  if (!config) return null;

  return (
    <View style={[styles.badge, { borderColor: config.color + '50' }]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.text, { color: config.color }]}>{config.name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: Typography.fontSizeXS,
    fontWeight: Typography.fontWeightSemiBold,
    letterSpacing: 0.2,
  },
});
