import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

/**
 * Supabase client for use in Client Components.
 * Uses the anon key and respects RLS policies.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key';

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
