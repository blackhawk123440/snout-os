/**
 * Client Portal App Shell
 * Mobile-first app shell with bottom navigation for client portal.
 * Enterprise: account menu (avatar → Profile, Sign out), restrained nav.
 */

'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-client';
import { CLIENT_TABS } from '@/lib/client-nav';

export interface ClientAppShellProps {
  children: React.ReactNode;
}

export function ClientAppShell({ children }: ClientAppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const mainRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { user, isClient, loading: authLoading } = useAuth();
  const [clientName, setClientName] = useState<string | null>(null);
  const [headerShadow, setHeaderShadow] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !isClient) {
      router.replace('/login');
    }
  }, [authLoading, isClient, router]);

  useEffect(() => {
    if (!isClient) return;
    fetch('/api/client/me')
      .then((r) => r.json().catch(() => ({})))
      .then((me) => {
        const name = me?.name ?? (me?.firstName && me?.lastName ? `${me.firstName} ${me.lastName}`.trim() : null);
        setClientName(name);
      });
  }, [isClient]);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onScroll = () => setHeaderShadow(el.scrollTop > 4);
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!accountMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current?.contains(e.target as Node) ||
        triggerRef.current?.contains(e.target as Node)
      ) return;
      setAccountMenuOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAccountMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [accountMenuOpen]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <p className="text-sm text-neutral-500">Loading...</p>
      </div>
    );
  }

  if (!isClient) {
    return null;
  }

  const handleLogout = async () => {
    setAccountMenuOpen(false);
    await signOut({ redirect: false });
    router.push('/login');
  };

  const isActive = (href: string) => {
    if (href === '/client/home') return pathname === '/client/home' || pathname === '/client';
    return pathname.startsWith(href);
  };

  const displayName = clientName || user?.name || 'there';
  const firstName = displayName.split(' ')[0] || displayName;

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-50" style={{ maxHeight: '100dvh' }}>
      <main ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden pb-20">
        <header
          className={`sticky top-0 z-10 flex h-12 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 transition-shadow ${
            headerShadow ? 'shadow-sm' : ''
          }`}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{firstName}</p>
          </div>
          <div className="relative flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label="Notifications"
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
            >
              <i className="fas fa-bell text-sm" />
            </button>
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setAccountMenuOpen((o) => !o)}
              aria-label="Account menu"
              aria-expanded={accountMenuOpen}
              aria-haspopup="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-sm font-medium text-slate-700 transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
            >
              {(firstName || 'C').charAt(0).toUpperCase()}
            </button>
            {accountMenuOpen && (
              <div
                ref={menuRef}
                role="menu"
                className="absolute right-0 top-full z-30 mt-1 min-w-[160px] rounded-md border border-slate-200 bg-white py-1 shadow-lg"
              >
                <Link
                  href="/client/profile"
                  role="menuitem"
                  onClick={() => setAccountMenuOpen(false)}
                  className="block px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  Profile
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void handleLogout()}
                  className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="min-h-0 flex-1 px-4 pt-4">{children}</div>
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-20 flex items-center justify-around border-t border-slate-200 bg-white"
        style={{ paddingTop: '0.375rem', paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}
      >
        {CLIENT_TABS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-[36px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 border-b-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 ${
                active
                  ? 'border-slate-900 text-slate-900 font-medium'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <i className={`${item.icon} text-sm`} />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
