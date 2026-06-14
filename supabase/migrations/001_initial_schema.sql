-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Tables
-- ============================================================================

-- Businesses (Multi-tenant core)
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    twilio_phone_number TEXT,
    twilio_account_sid TEXT,
    twilio_auth_token TEXT,
    openai_api_key TEXT,
    auto_reply_enabled BOOLEAN DEFAULT true,
    auto_reply_message TEXT DEFAULT 'Sorry we missed your call! How can we help you today?',
    ai_qualification_enabled BOOLEAN DEFAULT true,
    ai_prompt TEXT DEFAULT 'You are a helpful assistant for a business. Ask the user for their name, what service they need, and their availability for a callback. Keep responses under 160 characters. When you have all three, end with [QUALIFIED]. If they are not interested, end with [DISQUALIFIED].',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads (People who called)
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    name TEXT,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'disqualified')),
    summary TEXT,
    last_contacted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, phone_number)
);

-- Messages (Conversation history)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    content TEXT NOT NULL,
    twilio_message_sid TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calls (Log of missed calls)
CREATE TABLE calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    twilio_call_sid TEXT,
    duration INTEGER,
    recording_url TEXT,
    status TEXT DEFAULT 'missed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- Business Policies
CREATE POLICY "Users can view their own business" 
ON businesses FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own business" 
ON businesses FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own business" 
ON businesses FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Leads Policies
CREATE POLICY "Users can view leads for their business" 
ON leads FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can update leads for their business" 
ON leads FOR UPDATE USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert leads for their business" 
ON leads FOR INSERT WITH CHECK (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete leads for their business" 
ON leads FOR DELETE USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

-- Messages Policies
CREATE POLICY "Users can view messages for their business" 
ON messages FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert messages for their business" 
ON messages FOR INSERT WITH CHECK (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

-- Calls Policies
CREATE POLICY "Users can view calls for their business" 
ON calls FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert calls for their business" 
ON calls FOR INSERT WITH CHECK (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

-- ============================================================================
-- Triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_businesses_updated_at
    BEFORE UPDATE ON businesses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
