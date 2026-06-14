export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatsCard from '@/components/ui/StatsCard';

export default async function DashboardPage() {
  const supabase = createServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/auth/login');
  }

  // Fetch business for this user
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('user_id', session.user.id)
    .single();

  if (!business) {
    redirect('/settings');
  }

  // Fetch lead stats
  const { count: totalLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', business.id);

  const { count: newLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', business.id)
    .eq('status', 'new');

  const { count: qualifiedLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', business.id)
    .eq('status', 'qualified');

  const { count: totalCalls } = await supabase
    .from('calls')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', business.id);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of your missed call activity</p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard title="Total Leads" value={totalLeads ?? 0} />
          <StatsCard title="New Leads" value={newLeads ?? 0} color="blue" />
          <StatsCard title="Qualified Leads" value={qualifiedLeads ?? 0} color="green" />
          <StatsCard title="Missed Calls" value={totalCalls ?? 0} color="red" />
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Quick Setup</h2>
          <p className="text-gray-600 text-sm">
            Configure your Twilio phone number and AI settings in{' '}
            <a href="/settings" className="text-brand-600 hover:underline">
              Business Settings
            </a>{' '}
            to start capturing missed calls automatically.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
