# MissedCall Rescue AI

A production-ready multi-tenant SaaS that automatically rescues missed calls by sending an AI-powered SMS to the caller, qualifying them as a lead, and surfacing everything in a clean business dashboard.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend & Backend | Next.js 14 (App Router) + TypeScript |
| Database & Auth | Supabase (PostgreSQL + Row Level Security) |
| SMS & Telephony | Twilio |
| AI Qualification | OpenAI (gpt-4o-mini) |
| Deployment | Vercel |
| Styling | Tailwind CSS |
| Validation | Zod |

## Project Structure

```
missedcall-rescue-ai/
├── src/
│   ├── app/
│   │   ├── auth/
│   │   │   ├── login/page.tsx          # Login page
│   │   │   └── signup/page.tsx         # Signup page
│   │   ├── dashboard/page.tsx          # Dashboard with stats
│   │   ├── leads/
│   │   │   ├── page.tsx                # Leads list
│   │   │   └── [id]/page.tsx           # Lead detail + conversation
│   │   ├── settings/page.tsx           # Business settings
│   │   ├── api/
│   │   │   ├── webhooks/twilio/route.ts  # Twilio webhook handler
│   │   │   ├── businesses/route.ts       # Business CRUD
│   │   │   └── leads/
│   │   │       ├── route.ts              # Leads list
│   │   │       └── [id]/route.ts         # Lead CRUD
│   │   ├── layout.tsx                  # Root layout
│   │   ├── page.tsx                    # Root redirect
│   │   └── globals.css
│   ├── components/
│   │   ├── layout/DashboardLayout.tsx  # Sidebar navigation
│   │   ├── leads/
│   │   │   ├── LeadsTable.tsx          # Leads list table
│   │   │   └── LeadDetail.tsx          # Lead detail + conversation view
│   │   ├── settings/
│   │   │   └── BusinessSettingsForm.tsx # Settings form
│   │   └── ui/
│   │       └── StatsCard.tsx           # Dashboard stat card
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts               # Client-side Supabase client
│   │   │   └── server.ts               # Server-side + admin clients
│   │   ├── twilio/
│   │   │   └── sms.ts                  # SMS sending helpers
│   │   └── openai/
│   │       └── qualify.ts              # AI lead qualification logic
│   ├── types/
│   │   └── supabase.ts                 # Database type definitions
│   └── middleware.ts                   # Auth session middleware
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql      # Full schema + RLS policies
│   └── seed/
│       └── seed.sql                    # Development seed data
├── docs/
│   └── DEPLOYMENT_PLAN.md              # Step-by-step deployment guide
├── .env.local.example                  # Environment variable template
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
└── README.md
```

## Database Schema

### `businesses`
Multi-tenant core table. One row per business owner.

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK to `auth.users` |
| `name` | TEXT | Business name |
| `twilio_phone_number` | TEXT | Twilio number for this business |
| `twilio_account_sid` | TEXT | Twilio Account SID |
| `twilio_auth_token` | TEXT | Twilio Auth Token |
| `auto_reply_enabled` | BOOLEAN | Toggle auto-reply |
| `auto_reply_message` | TEXT | Initial SMS message |
| `ai_qualification_enabled` | BOOLEAN | Toggle AI qualification |
| `ai_prompt` | TEXT | Custom AI system prompt |

### `leads`
One row per unique caller per business.

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `business_id` | UUID | FK to `businesses` |
| `phone_number` | TEXT | Caller's phone number |
| `name` | TEXT | Extracted by AI |
| `status` | TEXT | `new`, `contacted`, `qualified`, `disqualified` |
| `summary` | TEXT | AI-generated conversation summary |

### `messages`
Full conversation history between the business and each lead.

### `calls`
Log of all missed call events from Twilio.

## Core Webhook Flow

```
Missed Call
    │
    ▼
POST /api/webhooks/twilio
    │
    ├── Find business by Twilio phone number
    ├── Upsert lead record
    ├── Log call to `calls` table
    ├── Send auto-reply SMS via Twilio
    └── Start AI qualification conversation (OpenAI → SMS)

Inbound SMS Reply
    │
    ▼
POST /api/webhooks/twilio
    │
    ├── Find business by Twilio phone number
    ├── Find/create lead
    ├── Store inbound message
    └── Continue AI conversation → Send reply SMS → Update lead status
```

## Local Development

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
```bash
cp .env.local.example .env.local
# Fill in your Supabase, Twilio, and OpenAI credentials
```

### 3. Run Supabase locally (optional)
```bash
npx supabase start
npx supabase db push
```

### 4. Start the development server
```bash
npm run dev
```

### 5. Expose local webhook for Twilio testing
```bash
npx ngrok http 3000
# Copy the HTTPS URL and set it as your Twilio webhook
```

## Deployment

See `docs/DEPLOYMENT_PLAN.md` for the complete step-by-step deployment guide.

## Security Notes

- **Row Level Security (RLS)** is enabled on all tables. Users can only access their own business's data.
- The Twilio webhook validates the `X-Twilio-Signature` header in production to prevent spoofed requests.
- The `SUPABASE_SERVICE_ROLE_KEY` is only used server-side (webhook handler) and is never exposed to the client.
- Twilio credentials stored per-business in the database are used to send SMS on behalf of each tenant.
