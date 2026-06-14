'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Database } from '@/types/supabase';

type Business = Database['public']['Tables']['businesses']['Row'];

interface Props {
  business: Business | null;
  userId: string;
}

export default function BusinessSettingsForm({ business, userId }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: business?.name ?? '',
    twilio_phone_number: business?.twilio_phone_number ?? '',
    twilio_account_sid: business?.twilio_account_sid ?? '',
    twilio_auth_token: business?.twilio_auth_token ?? '',
    auto_reply_enabled: business?.auto_reply_enabled ?? true,
    auto_reply_message:
      business?.auto_reply_message ??
      'Sorry we missed your call! How can we help you today?',
    ai_qualification_enabled: business?.ai_qualification_enabled ?? true,
    ai_prompt: business?.ai_prompt ?? '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const method = business ? 'PATCH' : 'POST';
    const res = await fetch('/api/businesses', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? 'Failed to save settings.');
      setSaving(false);
      return;
    }

    setSuccess(true);
    setSaving(false);
    router.refresh();
  };

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://your-domain.com'}/api/webhooks/twilio`;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
          Settings saved successfully.
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Business Info */}
      <section className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Business Information</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700">Business Name</label>
          <input
            name="name"
            type="text"
            required
            value={form.name}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
          />
        </div>
      </section>

      {/* Twilio Configuration */}
      <section className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Twilio Configuration</h2>
        <p className="text-sm text-gray-500">
          Configure your Twilio webhook URL in the Twilio console to:{' '}
          <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{webhookUrl}</code>
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700">Twilio Phone Number</label>
          <input
            name="twilio_phone_number"
            type="text"
            placeholder="+1XXXXXXXXXX"
            value={form.twilio_phone_number}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Account SID</label>
          <input
            name="twilio_account_sid"
            type="text"
            placeholder="AC..."
            value={form.twilio_account_sid}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Auth Token</label>
          <input
            name="twilio_auth_token"
            type="password"
            value={form.twilio_auth_token}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
          />
        </div>
      </section>

      {/* Auto-Reply */}
      <section className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Auto-Reply SMS</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              name="auto_reply_enabled"
              type="checkbox"
              checked={form.auto_reply_enabled}
              onChange={handleChange}
              className="h-4 w-4 text-brand-600 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Enabled</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Initial Reply Message
          </label>
          <textarea
            name="auto_reply_message"
            rows={3}
            value={form.auto_reply_message}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
          />
        </div>
      </section>

      {/* AI Qualification */}
      <section className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">AI Lead Qualification</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              name="ai_qualification_enabled"
              type="checkbox"
              checked={form.ai_qualification_enabled}
              onChange={handleChange}
              className="h-4 w-4 text-brand-600 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Enabled</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            AI System Prompt (optional override)
          </label>
          <textarea
            name="ai_prompt"
            rows={5}
            placeholder="Leave blank to use the default qualification prompt."
            value={form.ai_prompt}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
          />
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-brand-600 text-white text-sm font-medium rounded-md hover:bg-brand-700 focus:outline-none disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </form>
  );
}
