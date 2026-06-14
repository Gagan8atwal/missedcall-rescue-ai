'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Database } from '@/types/supabase';

type Lead = Database['public']['Tables']['leads']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];

interface LeadDetailProps {
  lead: Lead;
  messages: Message[];
}

const statusOptions = ['new', 'contacted', 'qualified', 'disqualified'] as const;

export default function LeadDetail({ lead, messages }: LeadDetailProps) {
  const router = useRouter();
  const [status, setStatus] = useState(lead.status ?? 'new');
  const [saving, setSaving] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    setSaving(true);
    await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    setStatus(newStatus);
    setSaving(false);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' });
    router.push('/leads');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {lead.name ?? lead.phone_number}
          </h1>
          <p className="text-gray-500 mt-1">{lead.phone_number}</p>
        </div>
        <button
          onClick={handleDelete}
          className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50"
        >
          Delete Lead
        </button>
      </div>

      {/* Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Lead Status</h2>
        <div className="flex gap-2 flex-wrap">
          {statusOptions.map((s) => (
            <button
              key={s}
              disabled={saving}
              onClick={() => handleStatusChange(s)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                status === s
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* AI Summary */}
      {lead.summary && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm font-medium text-gray-700 mb-2">AI Summary</h2>
          <p className="text-gray-600 text-sm">{lead.summary}</p>
        </div>
      )}

      {/* Conversation */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-sm font-medium text-gray-700 mb-4">Conversation</h2>
        {messages.length === 0 ? (
          <p className="text-gray-400 text-sm">No messages yet.</p>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-sm px-4 py-2 rounded-lg text-sm ${
                    msg.direction === 'outbound'
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p>{msg.content}</p>
                  <p className={`text-xs mt-1 ${msg.direction === 'outbound' ? 'text-blue-100' : 'text-gray-400'}`}>
                    {new Date(msg.created_at!).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
