import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseConfig } from './config';

export function createBrowserSupabase() {
  const { url, anonKey } = getSupabaseConfig();
  return createBrowserClient(
    url,
    anonKey,
  );
}