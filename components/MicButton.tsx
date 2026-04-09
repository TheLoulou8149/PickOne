import { useEffect } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Mic, MicOff } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { Colors, BorderRadius } from '@/constants/theme';

function RecordingWaves({ active }: { active: boolean }) {
  const scale1 = useSharedValue(1);
  const scale2 = useSharedValue(1);
  const scale3 = useSharedValue(1);
  const opacity1 = useSharedValue(0);
  const opacity2 = useSharedValue(0);
  const opacity3 = useSharedValue(0);

  useEffect(() => {
    const cfg = { duration: 1400, easing: Easing.out(Easing.ease) };
    if (active) {
      opacity1.value = 0.5;
      opacity2.value = 0.5;
      opacity3.value = 0.5;
      scale1.value = withRepeat(withTiming(2.2, cfg), -1, false);
      opacity1.value = withRepeat(withTiming(0, cfg), -1, false);
      scale2.value = withDelay(320, withRepeat(withTiming(2.2, cfg), -1, false));
      opacity2.value = withDelay(320, withRepeat(withTiming(0, cfg), -1, false));
      scale3.value = withDelay(640, withRepeat(withTiming(2.2, cfg), -1, false));
      opacity3.value = withDelay(640, withRepeat(withTiming(0, cfg), -1, false));
    } else {
      cancelAnimation(scale1); scale1.value = withTiming(1, { duration: 200 });
      cancelAnimation(scale2); scale2.value = withTiming(1, { duration: 200 });
      cancelAnimation(scale3); scale3.value = withTiming(1, { duration: 200 });
      cancelAnimation(opacity1); opacity1.value = withTiming(0, { duration: 200 });
      cancelAnimation(opacity2); opacity2.value = withTiming(0, { duration: 200 });
      cancelAnimation(opacity3); opacity3.value = withTiming(0, { duration: 200 });
    }
  }, [active]);

  const r1 = useAnimatedStyle(() => ({ transform: [{ scale: scale1.value }], opacity: opacity1.value }));
  const r2 = useAnimatedStyle(() => ({ transform: [{ scale: scale2.value }], opacity: opacity2.value }));
  const r3 = useAnimatedStyle(() => ({ transform: [{ scale: scale3.value }], opacity: opacity3.value }));

  return (
    <>
      <Animated.View style={[styles.ring, r1]} pointerEvents="none" />
      <Animated.View style={[styles.ring, r2]} pointerEvents="none" />
      <Animated.View style={[styles.ring, r3]} pointerEvents="none" />
    </>
  );
}

export function MicButton({
  isRecording,
  onPress,
}: {
  isRecording: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.btn, isRecording && styles.btnActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <RecordingWaves active={isRecording} />
      {isRecording
        ? <MicOff size={22} color="#fff" strokeWidth={2} />
        : <Mic size={22} color={Colors.primary} strokeWidth={2} />
      }
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: Colors.primary + '60',
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  btnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  ring: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
});
