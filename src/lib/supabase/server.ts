import { createServerClient as createSSRServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

/**
 * Supabase client for use in Server Components and Route Handlers.
 * Uses the new getAll/setAll cookie API from @supabase/ssr v0.5+.
 */
export function createServerClient() {
  const cookieStore = cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key';

  return createSSRServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2]);
          });
        } catch {
          // Called from a Server Component - safe to ignore if middleware
          // is refreshing sessions.
        }
      },
    },
  });
}

/**
 * Supabase admin client using the service role key.
 * Bypasses RLS — use only in trusted server-side contexts (webhooks, cron jobs).
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
