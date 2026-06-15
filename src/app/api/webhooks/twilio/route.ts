import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { createAdminClient } from '@/lib/supabase/server';
import { sendAutoReplySMS } from '@/lib/twilio/sms';
import { startAIConversation } from '@/lib/openai/qualify';

/**
 * Reconstructs the exact URL Twilio signed, using the forwarded headers that
 * Vercel's edge proxy sets on every inbound request.
 *
 * Headers used (in priority order):
 *   1. x-forwarded-proto  – the original scheme ("https")
 *   2. x-forwarded-host   – the original public hostname
 *   3. host               – fallback hostname if x-forwarded-host is absent
 */
function reconstructTwilioUrl(req: NextRequest): string {
  const proto =
    req.headers.get('x-forwarded-proto')?.split(',')[0].trim() ?? 'https';
  const host =
    req.headers.get('x-forwarded-host')?.split(',')[0].trim() ??
    req.headers.get('host') ??
    'missedcall-rescue-ai.vercel.app';
  const { pathname, search } = req.nextUrl;
  return `${proto}://${host}${pathname}${search}`;
}

/**
 * POST /api/webhooks/twilio
 *
 * Handles two types of Twilio webhooks:
 *   1. StatusCallback on a missed/no-answer call → create lead, send initial SMS
 *   2. Incoming SMS → continue AI qualification conversation
 */
export async function POST(req: NextRequest) {
  console.log('[Twilio webhook] POST received');

  const bodyText = await req.text();
  const params = Object.fromEntries(new URLSearchParams(bodyText));

  // ── Signature validation ──────────────────────────────────────────────────
  const skipValidation = process.env.TWILIO_VALIDATE_SIGNATURE === 'false';

  if (!skipValidation) {
    const twilioSignature = req.headers.get('x-twilio-signature') ?? '';
    const authToken = process.env.TWILIO_AUTH_TOKEN ?? '';
    const validationUrl = reconstructTwilioUrl(req);

    const isValid = twilio.validateRequest(
      authToken,
      twilioSignature,
      validationUrl,
      params
    );

    if (!isValid) {
      console.error('[Twilio] Signature validation failed', {
        reconstructedUrl: validationUrl,
        receivedSignature: twilioSignature,
      });
      return NextResponse.json({ error: 'Invalid Twilio signature' }, { status: 403 });
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  const callStatus = params['CallStatus'];
  const callSid = params['CallSid'];
  const from = params['From'] ?? '';
  const to = params['To'] ?? '';
  const bodyParam = params['Body'];

  console.log('[Twilio webhook] params', {
    callStatus,
    callSid: callSid ?? '(none)',
    from,
    to,
    hasBody: !!bodyParam,
  });

  // --- Handle incoming SMS (AI conversation continuation) ---
  if (bodyParam && !callSid) {
    console.log('[Twilio webhook] routing to handleIncomingSMS');
    return handleIncomingSMS({ from, to, body: bodyParam });
  }

  // --- Handle missed call ---
  if (
    callStatus === 'no-answer' ||
    callStatus === 'busy' ||
    callStatus === 'failed'
  ) {
    console.log('[Twilio webhook] routing to handleMissedCall, status:', callStatus);
    return handleMissedCall({ callSid: callSid ?? '', from, to });
  }

  // Any other call status (ringing, completed, etc.) — acknowledge and exit.
  console.log('[Twilio webhook] unhandled callStatus, returning empty TwiML:', callStatus);
  return new NextResponse('<Response></Response>', {
    headers: { 'Content-Type': 'text/xml' },
  });
}

async function handleMissedCall({
  callSid,
  from,
  to,
}: {
  callSid: string;
  from: string;
  to: string;
}) {
  console.log('[handleMissedCall] start — from:', from, 'to:', to);
  const supabase = createAdminClient();

  // ── Business lookup ───────────────────────────────────────────────────────
  // Primary: match by the Twilio number that received the call (the To field).
  let { data: business, error: bizError } = await supabase
    .from('businesses')
    .select('*')
    .eq('twilio_phone_number', to)
    .single();

  if (bizError || !business) {
    console.warn(
      `[handleMissedCall] No business matched twilio_phone_number="${to}" — attempting single-business fallback`
    );

    // Fallback: if there is exactly one business in the account, use it.
    const { data: allBusinesses, error: allBizError } = await supabase
      .from('businesses')
      .select('*');

    if (allBizError) {
      console.error('[handleMissedCall] Error fetching all businesses:', allBizError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (allBusinesses && allBusinesses.length === 1) {
      business = allBusinesses[0];
      console.log(
        '[handleMissedCall] Fallback: using sole business id:', business.id
      );
    } else {
      console.error(
        `[handleMissedCall] Cannot resolve business — ${allBusinesses?.length ?? 0} businesses found, none match "${to}"`
      );
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }
  } else {
    console.log('[handleMissedCall] Business matched by number, id:', business.id);
  }
  // ─────────────────────────────────────────────────────────────────────────

  // ── Upsert lead ───────────────────────────────────────────────────────────
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .upsert(
      { business_id: business.id, phone_number: from, status: 'new' },
      { onConflict: 'business_id,phone_number', ignoreDuplicates: false }
    )
    .select()
    .single();

  if (leadError || !lead) {
    console.error('[handleMissedCall] Failed to upsert lead:', leadError);
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
  }
  console.log('[handleMissedCall] Lead upserted, id:', lead.id);
  // ─────────────────────────────────────────────────────────────────────────

  // ── Insert call log ───────────────────────────────────────────────────────
  const { error: callInsertError } = await supabase.from('calls').insert({
    business_id: business.id,
    lead_id: lead.id,
    twilio_call_sid: callSid,
    status: 'missed',
  });

  if (callInsertError) {
    console.error('[handleMissedCall] Failed to insert call row:', callInsertError);
    // Non-fatal — continue so the lead still gets the SMS.
  } else {
    console.log('[handleMissedCall] Call row inserted');
  }
  // ─────────────────────────────────────────────────────────────────────────

  // ── Auto-reply SMS ────────────────────────────────────────────────────────
  if (business.auto_reply_enabled) {
    console.log('[handleMissedCall] Sending auto-reply SMS to:', from);
    await sendAutoReplySMS({
      to: from,
      from: to,
      body:
        business.auto_reply_message ??
        'Sorry we missed your call! How can we help you today?',
      businessId: business.id,
      leadId: lead.id,
      accountSid:
        business.twilio_account_sid ?? process.env.TWILIO_ACCOUNT_SID ?? '',
      authToken:
        business.twilio_auth_token ?? process.env.TWILIO_AUTH_TOKEN ?? '',
    });

    if (business.ai_qualification_enabled) {
      console.log('[handleMissedCall] Starting AI qualification');
      await startAIConversation({ business, lead, userMessage: null });
    }
  } else {
    console.log('[handleMissedCall] auto_reply_enabled=false, skipping SMS');
  }
  // ─────────────────────────────────────────────────────────────────────────

  console.log('[handleMissedCall] done — returning 200 TwiML');
  return new NextResponse('<Response></Response>', {
    headers: { 'Content-Type': 'text/xml' },
  });
}

async function handleIncomingSMS({
  from,
  to,
  body,
}: {
  from: string;
  to: string;
  body: string;
}) {
  console.log('[handleIncomingSMS] start — from:', from, 'to:', to);
  const supabase = createAdminClient();

  // ── Business lookup ───────────────────────────────────────────────────────
  let { data: business, error: bizError } = await supabase
    .from('businesses')
    .select('*')
    .eq('twilio_phone_number', to)
    .single();

  if (bizError || !business) {
    console.warn(
      `[handleIncomingSMS] No business matched "${to}" — attempting single-business fallback`
    );
    const { data: allBusinesses } = await supabase.from('businesses').select('*');
    if (allBusinesses && allBusinesses.length === 1) {
      business = allBusinesses[0];
    } else {
      console.error('[handleIncomingSMS] Cannot resolve business, dropping SMS');
      return new NextResponse('<Response></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      });
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  // ── Upsert lead ───────────────────────────────────────────────────────────
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .upsert(
      { business_id: business.id, phone_number: from, status: 'new' },
      { onConflict: 'business_id,phone_number', ignoreDuplicates: false }
    )
    .select()
    .single();

  if (leadError || !lead) {
    console.error('[handleIncomingSMS] Failed to upsert lead:', leadError);
    return new NextResponse('<Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
  console.log('[handleIncomingSMS] Lead upserted, id:', lead.id);
  // ─────────────────────────────────────────────────────────────────────────

  // ── Store inbound message ─────────────────────────────────────────────────
  const { error: msgError } = await supabase.from('messages').insert({
    lead_id: lead.id,
    business_id: business.id,
    direction: 'inbound',
    content: body,
  });

  if (msgError) {
    console.error('[handleIncomingSMS] Failed to insert message:', msgError);
  } else {
    console.log('[handleIncomingSMS] Inbound message stored');
  }
  // ─────────────────────────────────────────────────────────────────────────

  if (business.ai_qualification_enabled) {
    console.log('[handleIncomingSMS] Continuing AI conversation');
    await startAIConversation({ business, lead, userMessage: body });
  }

  console.log('[handleIncomingSMS] done — returning 200 TwiML');
  return new NextResponse('<Response></Response>', {
    headers: { 'Content-Type': 'text/xml' },
  });
}
