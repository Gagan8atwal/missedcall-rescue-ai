export const dynamic = 'force-dynamic';

import { redirect, notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LeadDetail from '@/components/leads/LeadDetail';

interface Props {
  params: { id: string };
}

export default async function LeadDetailPage({ params }: Props) {
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

  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', params.id)
    .eq('business_id', business.id)
    .single();

  if (!lead) {
    notFound();
  }

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('lead_id', lead.id)
    .order('created_at', { ascending: true });

  return (
    <DashboardLayout>
      <LeadDetail lead={lead} messages={messages ?? []} />
    </DashboardLayout>
  );
}
