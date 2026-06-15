import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';
import type { Database } from '@/types/supabase';

/**
 * POST /api/webhooks/twilio
 *
 * On every webhook:
 *   1. Parse params
 *   2. Find business (exact match or sole-business fallback)
 *   3. Insert call row
 *   4. Upsert lead
 *   5. Send auto-reply SMS (always, if auto_reply_enabled)
 *   6. Attempt AI qualification (optional, failure does not block SMS)
 *   7. Return TwiML
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
  type BusinessRow = Database['public']['Tables']['businesses']['Row'];
  let business: BusinessRow | null = null;

  const { data: exactBiz, error: exactBizErr } = await admin
    .from('businesses')
    .select('*')
    .eq('twilio_phone_number', to)
    .single();

  if (exactBizErr || !exactBiz) {
    console.warn('[webhook] No exact business match for To:', to, exactBizErr?.message);
    // Fallback: if exactly one business exists, use it
    const { data: allBiz, error: allBizErr } = await admin
      .from('businesses')
      .select('*');
    if (allBizErr) {
      console.error('[webhook] Error fetching businesses:', allBizErr.message);
    }
    if (allBiz && allBiz.length === 1) {
      business = allBiz[0];
      console.log('[webhook] Fallback: using sole business id:', business.id);
    } else {
      console.error('[webhook] Cannot resolve business — total:', allBiz?.length ?? 0);
    }
  } else {
    business = exactBiz;
    console.log('[webhook] Business matched by number, id:', business.id);
  }

  if (!business) {
    console.error('[webhook] No business found — returning 200 TwiML (no insert)');
    return new NextResponse('<Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    });
  }

  // ── INSERT CALL ROW ───────────────────────────────────────────────────────
  const { data: callData, error: callError } = await admin
    .from('calls')
    .insert({
      business_id: business.id,
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

  // ── UPSERT LEAD ───────────────────────────────────────────────────────────
  let leadId: string | null = null;

  if (from) {
    const { data: lead, error: leadError } = await admin
      .from('leads')
      .upsert(
        { business_id: business.id, phone_number: from, status: 'new' },
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

  // ── SEND AUTO-REPLY SMS ───────────────────────────────────────────────────
  // This runs unconditionally if auto_reply_enabled is true.
  // AI failure or missing OpenAI key does NOT block this.
  if (business.auto_reply_enabled && from) {
    const accountSid =
      business.twilio_account_sid || process.env.TWILIO_ACCOUNT_SID || '';
    const authToken =
      business.twilio_auth_token || process.env.TWILIO_AUTH_TOKEN || '';
    const fromNumber = business.twilio_phone_number || to;
    const messageBody =
      business.auto_reply_message ||
      'Sorry we missed your call! How can we help you today?';

    console.log('[sms] Attempting to send auto-reply to:', from, 'from:', fromNumber);

    try {
      const twilioClient = twilio(accountSid, authToken);
      const msg = await twilioClient.messages.create({
        to: from,
        from: fromNumber,
        body: messageBody,
      });

      console.log('[sms sent] SID:', msg.sid);

      // Record the outbound message in the messages table
      if (leadId) {
        const { error: msgInsertErr } = await admin.from('messages').insert({
          lead_id: leadId,
          business_id: business.id,
          direction: 'outbound',
          content: messageBody,
          twilio_message_sid: msg.sid,
        });

        if (msgInsertErr) {
          console.error('[message insert error]', msgInsertErr);
        } else {
          console.log('[message inserted] outbound for lead:', leadId);
        }
      }
    } catch (twilioErr: unknown) {
      console.error('[sms send error]', twilioErr);
    }

    // ── AI QUALIFICATION (optional, never blocks SMS) ─────────────────────
    if (business.ai_qualification_enabled) {
      // Determine if we have a usable OpenAI key
      const openaiKey =
        (business as Record<string, unknown>)['openai_api_key'] as string | null ||
        process.env.OPENAI_API_KEY ||
        null;

      if (!openaiKey) {
        console.warn('[ai] No usable OpenAI key — skipping AI qualification');
      } else {
        try {
          // Dynamic import to avoid crashing if the module has issues
          const { startAIConversation } = await import('@/lib/openai/qualify');
          await startAIConversation({ business, lead: { id: leadId } as never, userMessage: null });
          console.log('[ai] AI conversation started');
        } catch (aiErr: unknown) {
          console.error('[ai error]', aiErr);
          // AI failure is non-fatal — SMS already sent above
        }
      }
    }
  } else {
    console.log('[sms] Skipped — auto_reply_enabled:', business.auto_reply_enabled, 'from:', from || '(empty)');
  }

  // ── Handle inbound SMS body (store message) ───────────────────────────────
  if (smsBody && leadId) {
    const { error: inboundMsgErr } = await admin.from('messages').insert({
      lead_id: leadId,
      business_id: business.id,
      direction: 'inbound',
      content: smsBody,
    });

    if (inboundMsgErr) {
      console.error('[inbound message insert error]', inboundMsgErr);
    } else {
      console.log('[inbound message inserted] for lead:', leadId);
    }
  }

  // ── Return valid TwiML ────────────────────────────────────────────────────
  console.log('[webhook] done — returning 200 TwiML');
  return new NextResponse('<Response></Response>', {
    headers: { 'Content-Type': 'text/xml' },
  });
}
