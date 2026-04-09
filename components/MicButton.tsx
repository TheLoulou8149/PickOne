import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Colors } from '@/constants/theme';

// Mic icon drawn as SVG path via react-native-svg would require extra dep.
// We use a simple composed View-based mic shape instead.
function MicIcon({ color }: { color: string }) {
  return (
    <View style={micIconStyles.wrap}>
      {/* Body */}
      <View style={[micIconStyles.body, { borderColor: color }]} />
      {/* Stand */}
      <View style={[micIconStyles.stand, { borderColor: color }]} />
      {/* Base */}
      <View style={[micIconStyles.base, { backgroundColor: color }]} />
    </View>
  );
}

const micIconStyles = StyleSheet.create({
  wrap: {
    width: 18,
    height: 22,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  body: {
    width: 10,
    height: 13,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#000',
    marginTop: 0,
  },
  stand: {
    width: 14,
    height: 7,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#000',
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7,
    marginTop: -1,
  },
  base: {
    width: 2,
    height: 3,
    borderRadius: 1,
    marginTop: 0,
  },
});

export function MicButton({
  isRecording,
  onPress,
}: {
  isRecording: boolean;
  onPress: () => void;
}) {
  const iconColor = isRecording ? '#fff' : Colors.textPrimary;

  return (
    <TouchableOpacity
      style={[styles.btn, isRecording && styles.btnActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <MicIcon color={iconColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
});
