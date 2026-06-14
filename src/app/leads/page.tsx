export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LeadsTable from '@/components/leads/LeadsTable';

export default async function LeadsPage() {
  const supabase = createServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/auth/login');
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('user_id', session.user.id)
    .single();

  if (!business) {
    redirect('/settings');
  }

  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-500 mt-1">All leads captured from missed calls</p>
        </div>
        <LeadsTable leads={leads ?? []} />
      </div>
    </DashboardLayout>
  );
}
