'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const navigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Leads', href: '/leads' },
  { name: 'Settings', href: '/settings' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="flex items-center h-16 px-6 border-b border-gray-200">
          <span className="text-lg font-bold text-brand-700">MissedCall Rescue AI</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-gray-200">
          <button
            onClick={handleSignOut}
            className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
