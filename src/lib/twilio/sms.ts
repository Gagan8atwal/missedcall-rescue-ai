import twilio from 'twilio';
import { createAdminClient } from '@/lib/supabase/server';

interface SendSMSOptions {
  to: string;
  from: string;
  body: string;
  businessId: string;
  leadId: string;
  accountSid: string;
  authToken: string;
}

/**
 * Sends an SMS via Twilio and logs the outbound message to the database.
 */
export async function sendAutoReplySMS(options: SendSMSOptions): Promise<void> {
  const { to, from, body, businessId, leadId, accountSid, authToken } = options;

  const client = twilio(accountSid, authToken);

  const message = await client.messages.create({
    body,
    from,
    to,
  });

  // Log the outbound message
  const supabase = createAdminClient();
  await supabase.from('messages').insert({
    lead_id: leadId,
    business_id: businessId,
    direction: 'outbound',
    content: body,
    twilio_message_sid: message.sid,
  });
}

/**
 * Sends an AI-generated reply SMS and logs it.
 */
export async function sendAIReplySMS(options: SendSMSOptions): Promise<void> {
  return sendAutoReplySMS(options);
}
