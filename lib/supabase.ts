import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Sur web, AsyncStorage tente d'accéder à `window` côté serveur (SSR Expo) → crash.
// On utilise localStorage directement sur web, AsyncStorage sur natif.
const webStorage = {
  getItem: (key: string) =>
    Promise.resolve(typeof window !== 'undefined' ? window.localStorage.getItem(key) : null),
  setItem: (key: string, value: string) =>
    Promise.resolve(typeof window !== 'undefined' ? window.localStorage.setItem(key, value) : undefined),
  removeItem: (key: string) =>
    Promise.resolve(typeof window !== 'undefined' ? window.localStorage.removeItem(key) : undefined),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? webStorage : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
