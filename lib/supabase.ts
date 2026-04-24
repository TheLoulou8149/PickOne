import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// SecureStore a une limite de 2048 octets par valeur.
// Les sessions Supabase peuvent dépasser cette limite → on découpe en morceaux.
const CHUNK_SIZE = 1900;

const NativeSecureStore = {
  async getItem(key: string): Promise<string | null> {
    const chunkCount = await SecureStore.getItemAsync(`${key}_chunks`);
    if (!chunkCount) return SecureStore.getItemAsync(key);
    const chunks = await Promise.all(
      Array.from({ length: parseInt(chunkCount) }, (_, i) =>
        SecureStore.getItemAsync(`${key}_${i}`)
      )
    );
    if (chunks.some((c) => c === null)) return null;
    return chunks.join('');
  },
  async setItem(key: string, value: string): Promise<void> {
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE));
    }
    await Promise.all([
      ...chunks.map((chunk, i) => SecureStore.setItemAsync(`${key}_${i}`, chunk)),
      SecureStore.setItemAsync(`${key}_chunks`, String(chunks.length)),
    ]);
  },
  async removeItem(key: string): Promise<void> {
    const chunkCount = await SecureStore.getItemAsync(`${key}_chunks`);
    if (chunkCount) {
      await Promise.all([
        ...Array.from({ length: parseInt(chunkCount) }, (_, i) =>
          SecureStore.deleteItemAsync(`${key}_${i}`)
        ),
        SecureStore.deleteItemAsync(`${key}_chunks`),
      ]);
    }
    await SecureStore.deleteItemAsync(key);
  },
};

// Sur web, SecureStore n'existe pas → on utilise localStorage directement.
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
    storage: Platform.OS === 'web' ? webStorage : NativeSecureStore,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
