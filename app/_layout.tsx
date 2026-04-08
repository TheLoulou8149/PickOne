import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { Platform } from 'react-native';
import { Colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

const isWeb = Platform.OS === 'web';

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: isWeb ? 'none' : 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="dilemma/index" />
        <Stack.Screen name="weighting/index" />
        <Stack.Screen
          name="result/index"
          options={{ animation: isWeb ? 'none' : 'fade' }}
        />
      </Stack>
    </>
  );
}
