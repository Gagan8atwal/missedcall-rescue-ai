import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

const createBusinessSchema = z.object({
  name: z.string().min(1).max(255),
});

const updateBusinessSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  twilio_phone_number: z.string().optional(),
  twilio_account_sid: z.string().optional(),
  twilio_auth_token: z.string().optional(),
  auto_reply_enabled: z.boolean().optional(),
  auto_reply_message: z.string().optional(),
  ai_qualification_enabled: z.boolean().optional(),
  ai_prompt: z.string().optional(),
});

/**
 * GET /api/businesses
 * Returns the authenticated user's business.
 */
export async function GET() {
  const supabase = createServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: business, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('user_id', session.user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ business });
}

/**
 * POST /api/businesses
 * Creates a new business for the authenticated user.
 */
export async function POST(req: NextRequest) {
  const supabase = createServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createBusinessSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: business, error } = await supabase
    .from('businesses')
    .insert({ name: parsed.data.name, user_id: session.user.id })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ business }, { status: 201 });
}

/**
 * PATCH /api/businesses
 * Updates the authenticated user's business settings.
 */
export async function PATCH(req: NextRequest) {
  const supabase = createServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = updateBusinessSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: business, error } = await supabase
    .from('businesses')
    .update(parsed.data)
    .eq('user_id', session.user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ business });
}
