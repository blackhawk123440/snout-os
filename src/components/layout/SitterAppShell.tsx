/**
 * Sitter App Shell
 * Mobile-first app shell with bottom navigation for sitter dashboard.
 */

'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-client';
import { SITTER_TABS } from '@/lib/sitter-nav';
import { SitterOfflineBanner } from '@/components/sitter/SitterOfflineBanner';

const NAV_ITEMS = SITTER_TABS;

export interface SitterAppShellProps {
  children: React.ReactNode;
}

export function SitterAppShell({ children }: SitterAppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const mainRef = useRef<HTMLElement>(null);
  const { user, isSitter, loading: authLoading } = useAuth();
  const [sitterName, setSitterName] = useState<string | null>(null);
  const [availabilityEnabled, setAvailabilityEnabled] = useState<boolean>(true);
  const [headerShadow, setHeaderShadow] = useState(false);

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

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onScroll = () => setHeaderShadow(el.scrollTop > 4);
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

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

  const displayName = sitterName || user?.name || 'there';
  const firstName = displayName.split(' ')[0] || displayName;

  return (
    <div className="fixed inset-0 flex flex-col bg-neutral-50" style={{ maxHeight: '100dvh' }}>
      <SitterOfflineBanner />
      <main ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden pb-24">
        {/* Sticky header: avatar + Hey name + status chip + bell */}
        <header
          className={`sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b bg-white px-4 transition-shadow ${
            headerShadow ? 'border-neutral-200 shadow-sm' : 'border-neutral-200'
          }`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
              {(firstName || 'S').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-neutral-900">
                Hey, {firstName}
              </p>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  availabilityEnabled ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {availabilityEnabled ? 'Available' : 'Off'}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label="Notifications"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <i className="fas fa-bell text-lg" />
            </button>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="flex min-h-[44px] items-center rounded-xl px-3 text-sm text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Logout
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 px-4 pt-4">{children}</div>
      </main>

      {/* Bottom nav - 44px hit targets */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-20 flex items-center justify-around border-t border-neutral-200 bg-white safe-area-pb"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))', paddingTop: '0.5rem' }}
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
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
