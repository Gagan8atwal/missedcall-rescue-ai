import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

const updateLeadSchema = z.object({
  name: z.string().optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'disqualified']).optional(),
  summary: z.string().optional(),
});

interface Params {
  params: { id: string };
}

/**
 * GET /api/leads/[id]
 * Returns a single lead with its messages.
 */
export async function GET(_req: NextRequest, { params }: Params) {
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
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  const { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', params.id)
    .eq('business_id', business.id)
    .single();

  if (error || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('lead_id', lead.id)
    .order('created_at', { ascending: true });

  return NextResponse.json({ lead, messages: messages ?? [] });
}

/**
 * PATCH /api/leads/[id]
 * Updates a lead's status or name.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
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
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateLeadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: lead, error } = await supabase
    .from('leads')
    .update(parsed.data)
    .eq('id', params.id)
    .eq('business_id', business.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lead });
}

/**
 * DELETE /api/leads/[id]
 * Deletes a lead and its associated messages.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
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
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', params.id)
    .eq('business_id', business.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
