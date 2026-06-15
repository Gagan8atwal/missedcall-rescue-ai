import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

/**
 * POST /api/webhooks/twilio
 *
 * Persists a call row on EVERY webhook invocation — no conditions, no early returns.
 * Lead and message creation happen after the call row is safely inserted.
 */
export async function POST(req: NextRequest) {
  console.log('[webhook] POST received at', new Date().toISOString());

  // ── Parse Twilio POST form params ─────────────────────────────────────────
  const bodyText = await req.text();
  const params = Object.fromEntries(new URLSearchParams(bodyText));

  const to = params['To'] ?? '';
  const from = params['From'] ?? '';
  const callSid = params['CallSid'] ?? null;
  const callStatus = params['CallStatus'] ?? 'unknown';
  const smsBody = params['Body'] ?? null;

  console.log('[webhook] params:', { to, from, callSid, callStatus, hasBody: !!smsBody });

  // ── Supabase admin client (service-role, bypasses RLS) ────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient<Database>(supabaseUrl, serviceRoleKey);

  // ── Find business ─────────────────────────────────────────────────────────
  let businessId: string | null = null;

  // Primary: match by twilio_phone_number = To
  const { data: exactBiz, error: exactBizErr } = await admin
    .from('businesses')
    .select('*')
    .eq('twilio_phone_number', to)
    .single();

  if (exactBizErr) {
    console.warn('[webhook] No exact business match for To:', to, '— error:', exactBizErr.message);
  }

  if (exactBiz) {
    businessId = exactBiz.id;
    console.log('[webhook] Business matched by number, id:', businessId);
  } else {
    // Fallback: if exactly one business exists, use it
    const { data: allBiz, error: allBizErr } = await admin
      .from('businesses')
      .select('id');

    if (allBizErr) {
      console.error('[webhook] Error fetching businesses:', allBizErr.message);
    }

    if (allBiz && allBiz.length === 1) {
      businessId = allBiz[0].id;
      console.log('[webhook] Fallback: using sole business id:', businessId);
    } else {
      console.error('[webhook] Cannot resolve business — matched 0, total:', allBiz?.length ?? 0);
    }
  }

  // ── INSERT CALL ROW — runs unconditionally if we have a business ──────────
  if (businessId) {
    const { data: callData, error: callError } = await admin
      .from('calls')
      .insert({
        business_id: businessId,
        twilio_call_sid: callSid,
        status: 'missed',
      })
      .select()
      .single();

    if (callError) {
      console.error('[calls insert error]', callError);
    } else {
      console.log('[calls inserted]', callData.id);
    }
  } else {
    console.error('[webhook] Skipping call insert — no business resolved');
  }

  // ── Lead upsert (after call insert, non-blocking for call persistence) ────
  let leadId: string | null = null;

  if (businessId && from) {
    const { data: lead, error: leadError } = await admin
      .from('leads')
      .upsert(
        { business_id: businessId, phone_number: from, status: 'new' },
        { onConflict: 'business_id,phone_number', ignoreDuplicates: false }
      )
      .select()
      .single();

    if (leadError) {
      console.error('[lead upsert error]', leadError);
    } else {
      leadId = lead.id;
      console.log('[lead upserted]', leadId);
    }
  }

  // ── Message insert (for inbound SMS) ──────────────────────────────────────
  if (smsBody && businessId && leadId) {
    const { error: msgError } = await admin.from('messages').insert({
      lead_id: leadId,
      business_id: businessId,
      direction: 'inbound',
      content: smsBody,
    });

    if (msgError) {
      console.error('[message insert error]', msgError);
    } else {
      console.log('[message inserted] for lead:', leadId);
    }
  }

  // ── Return valid TwiML ────────────────────────────────────────────────────
  console.log('[webhook] done — returning 200 TwiML');
  return new NextResponse('<Response></Response>', {
    headers: { 'Content-Type': 'text/xml' },
  });
}
