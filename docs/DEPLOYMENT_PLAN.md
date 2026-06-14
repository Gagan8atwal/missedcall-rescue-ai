# MissedCall Rescue AI: Deployment Plan

This document outlines the step-by-step process for deploying the MissedCall Rescue AI MVP to production using Vercel, Supabase, Twilio, and OpenAI.

## Prerequisites
- A GitHub account.
- A Vercel account.
- A Supabase account.
- A Twilio account.
- An OpenAI account.

## Step 1: Database Setup (Supabase)
1. Log in to [Supabase](https://supabase.com/) and create a new project.
2. Navigate to the **SQL Editor** in your Supabase dashboard.
3. Copy the contents of `supabase/migrations/001_initial_schema.sql` and run it to create the tables and RLS policies.
4. Navigate to **Authentication -> Providers** and ensure **Email** provider is enabled. Disable "Confirm email" for the MVP if you want frictionless signups.
5. Go to **Project Settings -> API** and note down the `Project URL`, `anon public key`, and `service_role secret`.

## Step 2: Environment Variables
Prepare your production environment variables. You will need these for Vercel.

```env
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number
TWILIO_WEBHOOK_URL=https://your-production-domain.com/api/webhooks/twilio
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
```

## Step 3: Deployment (Vercel)
1. Push your local `missedcall-rescue-ai` repository to GitHub.
2. Log in to [Vercel](https://vercel.com/) and click **Add New -> Project**.
3. Import your GitHub repository.
4. In the **Environment Variables** section, paste all the variables prepared in Step 2.
5. Click **Deploy**.
6. Once deployed, note the production URL (e.g., `https://missedcall-rescue-ai.vercel.app`).
7. Update `NEXT_PUBLIC_APP_URL` and `TWILIO_WEBHOOK_URL` in your Vercel Environment Variables to match the actual production domain, and redeploy.

## Step 4: Twilio Webhook Configuration
1. Log in to [Twilio](https://console.twilio.com/).
2. Navigate to **Phone Numbers -> Manage -> Active Numbers**.
3. Select the phone number you want to use for the platform (or have your first business user do this for their number).
4. Scroll down to the **Voice & Fax** section.
5. Under "A call comes in", set it to **Webhook**, paste your `TWILIO_WEBHOOK_URL` (e.g., `https://your-domain.com/api/webhooks/twilio`), and set the method to **POST**.
6. Scroll down to the **Messaging** section.
7. Under "A message comes in", set it to **Webhook**, paste the same `TWILIO_WEBHOOK_URL`, and set the method to **POST**.
8. Save the configuration.

## Step 5: Testing the Production Build
1. Go to your production URL and sign up for a new account.
2. Navigate to the **Settings** page and configure your business name, Twilio credentials (if different from platform defaults), and AI prompt.
3. Call the Twilio phone number from a personal phone and let it ring until it disconnects (missed call).
4. Verify that you receive an automatic SMS reply on your personal phone.
5. Reply to the SMS to trigger the AI qualification flow.
6. Check the **Dashboard** and **Leads** pages in the web app to ensure the lead was captured, the conversation was logged, and the status was updated to "qualified" or "disqualified".

## Future Considerations (Post-MVP)
- **Stripe Integration**: Add billing and subscription plans.
- **Custom Domains**: Allow businesses to use custom domains for their dashboards.
- **Advanced Analytics**: Provide deeper insights into call volumes and lead conversion rates.
- **Voice AI**: Replace the standard Twilio voicemail with an interactive Voice AI agent using Twilio Media Streams and OpenAI Realtime API.
