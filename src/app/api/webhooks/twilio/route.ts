import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { createAdminClient } from '@/lib/supabase/server';
import { sendAutoReplySMS } from '@/lib/twilio/sms';
import { startAIConversation } from '@/lib/openai/qualify';

/**
 * POST /api/webhooks/twilio
 *
 * Handles two types of Twilio webhooks:
 *   1. StatusCallback on a missed/no-answer call → create lead, send initial SMS
 *   2. Incoming SMS → continue AI qualification conversation
 */
export async function POST(req: NextRequest) {
  // Validate Twilio signature in production
  const twilioSignature = req.headers.get('x-twilio-signature') ?? '';
  const url = process.env.TWILIO_WEBHOOK_URL!;
  const bodyText = await req.text();
  const params = Object.fromEntries(new URLSearchParams(bodyText));

  const isValid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    twilioSignature,
    url,
    params
  );

  if (!isValid && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Invalid Twilio signature' }, { status: 403 });
  }

  const callStatus = params['CallStatus'];
  const callSid = params['CallSid'];
  const from = params['From'] ?? '';
  const to = params['To'] ?? '';
  const bodyParam = params['Body']; // Present for SMS webhooks

  // --- Handle incoming SMS (AI conversation continuation) ---
  if (bodyParam && !callSid) {
    return handleIncomingSMS({ from, to, body: bodyParam });
  }

  // --- Handle missed call ---
  if (
    callStatus === 'no-answer' ||
    callStatus === 'busy' ||
    callStatus === 'failed'
  ) {
    return handleMissedCall({ callSid: callSid ?? '', from, to });
  }

  // Return empty TwiML for other call statuses
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
  const supabase = createAdminClient();

  // Find the business by Twilio phone number
  const { data: business, error: bizError } = await supabase
    .from('businesses')
    .select('*')
    .eq('twilio_phone_number', to)
    .single();

  if (bizError || !business) {
    console.error(`No business found for Twilio number: ${to}`);
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  // Upsert lead (avoid duplicates for the same phone number)
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .upsert(
      { business_id: business.id, phone_number: from, status: 'new' },
      { onConflict: 'business_id,phone_number', ignoreDuplicates: false }
    )
    .select()
    .single();

  if (leadError || !lead) {
    console.error('Failed to upsert lead:', leadError);
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
  }

  // Log the missed call
  await supabase.from('calls').insert({
    business_id: business.id,
    lead_id: lead.id,
    twilio_call_sid: callSid,
    status: 'missed',
  });

  // Send auto-reply SMS if enabled
  if (business.auto_reply_enabled) {
    await sendAutoReplySMS({
      to: from,
      from: to,
      body: business.auto_reply_message ?? 'Sorry we missed your call! How can we help you today?',
      businessId: business.id,
      leadId: lead.id,
      accountSid: business.twilio_account_sid ?? process.env.TWILIO_ACCOUNT_SID!,
      authToken: business.twilio_auth_token ?? process.env.TWILIO_AUTH_TOKEN!,
    });

    // If AI qualification is enabled, start the conversation
    if (business.ai_qualification_enabled) {
      await startAIConversation({
        business,
        lead,
        userMessage: null,
      });
    }
  }

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
  const supabase = createAdminClient();

  // Find the business by Twilio phone number
  const { data: business, error: bizError } = await supabase
    .from('businesses')
    .select('*')
    .eq('twilio_phone_number', to)
    .single();

  if (bizError || !business) {
    return new NextResponse('<Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    });
  }

  // Find or create the lead
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .upsert(
      { business_id: business.id, phone_number: from, status: 'new' },
      { onConflict: 'business_id,phone_number', ignoreDuplicates: false }
    )
    .select()
    .single();

  if (leadError || !lead) {
    return new NextResponse('<Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    });
  }

  // Store the inbound message
  await supabase.from('messages').insert({
    lead_id: lead.id,
    business_id: business.id,
    direction: 'inbound',
    content: body,
  });

  // Continue AI conversation if enabled
  if (business.ai_qualification_enabled) {
    await startAIConversation({ business, lead, userMessage: body });
  }

  return new NextResponse('<Response></Response>', {
    headers: { 'Content-Type': 'text/xml' },
  });
}
