'use client';

import Link from 'next/link';
import type { Database } from '@/types/supabase';

type Lead = Database['public']['Tables']['leads']['Row'];

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  qualified: 'bg-green-100 text-green-800',
  disqualified: 'bg-red-100 text-red-800',
};

interface LeadsTableProps {
  leads: Lead[];
}

export default function LeadsTable({ leads }: LeadsTableProps) {
  if (leads.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <p className="text-gray-500">No leads yet. Leads will appear here after missed calls.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Phone Number
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {leads.map((lead) => (
            <tr key={lead.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {lead.phone_number}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {lead.name ?? '—'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                    statusColors[lead.status ?? 'new']
                  }`}
                >
                  {lead.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(lead.created_at!).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <Link
                  href={`/leads/${lead.id}`}
                  className="text-brand-600 hover:underline"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
