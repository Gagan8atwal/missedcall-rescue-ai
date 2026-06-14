import OpenAI from 'openai';
import { createAdminClient } from '@/lib/supabase/server';
import { sendAIReplySMS } from '@/lib/twilio/sms';
import type { Database } from '@/types/supabase';

type Business = Database['public']['Tables']['businesses']['Row'];
type Lead = Database['public']['Tables']['leads']['Row'];

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI assistant for a business. Your job is to qualify leads who missed a call.
Ask for:
1. Their name
2. What service or product they are interested in
3. Their availability for a callback

Keep responses concise (under 160 characters when possible for SMS).
When you have gathered all three pieces of information, end your response with [QUALIFIED].
If the user seems uninterested or says they don't need help, end with [DISQUALIFIED].`;

interface StartConversationOptions {
  business: Business;
  lead: Lead;
  userMessage: string | null;
}

/**
 * Continues or starts an AI qualification conversation for a lead.
 * Fetches conversation history, calls OpenAI, sends the reply via SMS.
 */
export async function startAIConversation({
  business,
  lead,
  userMessage,
}: StartConversationOptions): Promise<void> {
  const supabase = createAdminClient();

  // Fetch conversation history
  const { data: history } = await supabase
    .from('messages')
    .select('direction, content')
    .eq('lead_id', lead.id)
    .order('created_at', { ascending: true });

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: business.ai_prompt ?? DEFAULT_SYSTEM_PROMPT,
    },
    ...((history ?? []).map((msg) => ({
      role: msg.direction === 'inbound' ? ('user' as const) : ('assistant' as const),
      content: msg.content,
    }))),
  ];

  // Add the new user message if present
  if (userMessage) {
    messages.push({ role: 'user', content: userMessage });
  }

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    messages,
    max_tokens: 200,
    temperature: 0.7,
  });

  const aiReply = completion.choices[0]?.message?.content ?? '';

  // Check for qualification signals
  const isQualified = aiReply.includes('[QUALIFIED]');
  const isDisqualified = aiReply.includes('[DISQUALIFIED]');
  const cleanReply = aiReply
    .replace('[QUALIFIED]', '')
    .replace('[DISQUALIFIED]', '')
    .trim();

  // Update lead status if qualification is determined
  if (isQualified || isDisqualified) {
    const newStatus = isQualified ? 'qualified' : 'disqualified';
    await supabase
      .from('leads')
      .update({ status: newStatus, summary: cleanReply })
      .eq('id', lead.id);
  }

  // Send the AI reply via SMS
  if (cleanReply && business.twilio_phone_number) {
    await sendAIReplySMS({
      to: lead.phone_number,
      from: business.twilio_phone_number,
      body: cleanReply,
      businessId: business.id,
      leadId: lead.id,
      accountSid: business.twilio_account_sid ?? process.env.TWILIO_ACCOUNT_SID!,
      authToken: business.twilio_auth_token ?? process.env.TWILIO_AUTH_TOKEN!,
    });
  }
}
