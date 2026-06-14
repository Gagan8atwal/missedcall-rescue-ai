export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import DashboardLayout from '@/components/layout/DashboardLayout';
import BusinessSettingsForm from '@/components/settings/BusinessSettingsForm';

export default async function SettingsPage() {
  const supabase = createServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/auth/login');
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('user_id', session.user.id)
    .single();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Settings</h1>
          <p className="text-gray-500 mt-1">
            Configure your Twilio integration, auto-reply message, and AI qualification settings.
          </p>
        </div>
        <BusinessSettingsForm business={business} userId={session.user.id} />
      </div>
    </DashboardLayout>
  );
}
