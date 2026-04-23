import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { Platform, View, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { ToneSetupModal } from '@/components/ToneSetupModal';

SplashScreen.preventAutoHideAsync();

const isWeb = Platform.OS === 'web';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [showToneModal, setShowToneModal] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized(true);
      SplashScreen.hideAsync();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!initialized) return;
    const inAuthGroup = segments[0] === 'auth';
    const emailConfirmed = session?.user?.email_confirmed_at != null;
    if (!session && !inAuthGroup) {
      router.replace('/auth' as any);
    } else if (session && !emailConfirmed) {
      supabase.auth.signOut();
    } else if (session && emailConfirmed && inAuthGroup) {
      router.replace('/' as any);
    }
  }, [session, initialized, segments]);

  // Détecte la première connexion : score_franchise null = jamais configuré
  useEffect(() => {
    if (!initialized || !session || !session.user.email_confirmed_at) return;
    supabase
      .from('user_context')
      .select('score_franchise')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data || data.score_franchise === null || data.score_franchise === undefined) {
          setShowToneModal(true);
        }
      });
  }, [initialized, session]);

  if (!initialized) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <ToneSetupModal visible={showToneModal} onDone={() => setShowToneModal(false)} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: isWeb ? 'none' : 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="dilemma/index" />
        <Stack.Screen
          name="result/index"
          options={{ animation: isWeb ? 'none' : 'fade' }}
        />
        <Stack.Screen name="auth/index" />
        <Stack.Screen name="history/index" />
        <Stack.Screen name="history/[id]" />
        <Stack.Screen name="profile/index" />
      </Stack>
    </>
  );
}
