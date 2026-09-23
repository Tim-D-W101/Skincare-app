import { createClient, type SupportedStorage } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';

import type { Database } from '@/types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Supabase is not configured. Copy .env.example to .env, set EXPO_PUBLIC_SUPABASE_URL and ' +
      'EXPO_PUBLIC_SUPABASE_ANON_KEY (Supabase dashboard > Project Settings > API), then ' +
      'restart with `npx expo start --clear`.',
  );
}

/**
 * Session storage backed by the device keychain/keystore, so auth tokens are
 * encrypted at rest.
 *
 * SecureStore has historically limited a single value to about 2 KB, and a
 * signed-in session can exceed that. Values are therefore split into chunks
 * stored under `{key}.0`, `{key}.1`, ..., with the chunk count under `{key}`.
 * The chunk size assumes worst-case 4-byte UTF-8 characters.
 */
const CHUNK_LENGTH = 512;

const chunkKey = (key: string, index: number) => `${key}.${index}`;

async function readChunkCount(key: string): Promise<number> {
  const stored = await SecureStore.getItemAsync(key);
  const count = stored === null ? 0 : Number.parseInt(stored, 10);
  return Number.isFinite(count) ? count : 0;
}

async function removeChunks(key: string, from: number, to: number): Promise<void> {
  for (let index = from; index < to; index += 1) {
    await SecureStore.deleteItemAsync(chunkKey(key, index));
  }
}

const secureChunkedStorage: SupportedStorage = {
  async getItem(key) {
    const count = await readChunkCount(key);
    if (count === 0) return null;

    const chunks: string[] = [];
    for (let index = 0; index < count; index += 1) {
      const chunk = await SecureStore.getItemAsync(chunkKey(key, index));
      // A missing chunk means a write was interrupted; treat the session as absent.
      if (chunk === null) return null;
      chunks.push(chunk);
    }
    return chunks.join('');
  },

  async setItem(key, value) {
    const previousCount = await readChunkCount(key);
    const count = Math.max(1, Math.ceil(value.length / CHUNK_LENGTH));

    for (let index = 0; index < count; index += 1) {
      const chunk = value.slice(index * CHUNK_LENGTH, (index + 1) * CHUNK_LENGTH);
      await SecureStore.setItemAsync(chunkKey(key, index), chunk);
    }
    await SecureStore.setItemAsync(key, String(count));
    await removeChunks(key, count, previousCount);
  },

  async removeItem(key) {
    const count = await readChunkCount(key);
    await removeChunks(key, 0, count);
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    storage: secureChunkedStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresh tokens only while the app is in the foreground. Refreshing from the
// background wastes battery and can race with the OS suspending the app.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
