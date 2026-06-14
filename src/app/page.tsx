export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

/**
 * Root page: redirect authenticated users to the dashboard,
 * unauthenticated users to the login page.
 */
export default async function RootPage() {
  const supabase = createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect('/dashboard');
  } else {
    redirect('/auth/login');
  }
}
