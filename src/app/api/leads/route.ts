import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * GET /api/leads
 * Returns all leads for the authenticated user's business.
 */
export async function GET() {
  const supabase = createServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('user_id', session.user.id)
    .single();

  if (!business) {
    return NextResponse.json({ leads: [] });
  }

  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ leads });
}
