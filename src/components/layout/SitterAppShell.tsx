/**
 * Sitter App Shell
 * Mobile-first app shell with bottom navigation for sitter dashboard.
 */

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-client';
import { SITTER_TABS } from '@/lib/sitter-nav';

const NAV_ITEMS = SITTER_TABS;

export interface SitterAppShellProps {
  children: React.ReactNode;
}

export function SitterAppShell({ children }: SitterAppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isSitter, loading: authLoading } = useAuth();
  const [sitterName, setSitterName] = useState<string | null>(null);
  const [availabilityEnabled, setAvailabilityEnabled] = useState<boolean>(true);

  useEffect(() => {
    if (!authLoading && !isSitter) {
      router.replace('/login');
    }
  }, [authLoading, isSitter, router]);

  useEffect(() => {
    if (!isSitter) return;
    void Promise.all([
      fetch('/api/sitter/me').then((r) => r.json().catch(() => ({}))),
      fetch('/api/sitter/availability').then((r) => r.json().catch(() => ({}))),
    ]).then(([me, avail]) => {
      setSitterName(me?.name ?? me?.firstName ? `${me.firstName} ${me.lastName}`.trim() : null);
      setAvailabilityEnabled(avail?.availabilityEnabled ?? me?.availabilityEnabled ?? true);
    });
  }, [isSitter]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <p className="text-sm text-neutral-500">Loading...</p>
      </div>
    );
  }

  if (!isSitter) {
    return null;
  }

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  const isActive = (href: string) => {
    if (href === '/sitter/today') return pathname === '/sitter/today';
    return pathname.startsWith(href);
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-neutral-50" style={{ maxHeight: '100dvh' }}>
      {/* Main content - scrollable */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20">
        {/* Sticky header: sitter name + status chip + notification bell */}
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="text-base font-semibold text-neutral-900 truncate">
              {sitterName || user?.name || 'Snout'}
            </span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                availabilityEnabled ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {availabilityEnabled ? 'Available' : 'Off'}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label="Notifications"
              className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
            >
              <i className="fas fa-bell text-lg" />
            </button>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="rounded-lg px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
            >
              Logout
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1">{children}</div>
      </main>

      {/* Bottom nav - mobile-first */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-20 flex items-center justify-around border-t border-neutral-200 bg-white py-2 safe-area-pb"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                active ? 'text-blue-600' : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <i className={`${item.icon} text-lg`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
