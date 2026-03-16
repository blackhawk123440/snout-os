/**
 * Client Portal App Shell
 * Mobile: bottom nav. Desktop (lg+): left sidebar. Enterprise header + content alignment.
 */

'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-client';
import { useTheme, type Theme } from '@/lib/theme-context';
import { ClientBottomNav } from './ClientBottomNav';
import { ClientSidebarNav } from './ClientSidebarNav';
import { ClientDeployDebugOverlay } from '@/components/client/ClientDeployDebugOverlay';
import { ClientSwUpdateToast } from '@/components/client/ClientSwUpdateToast';

export interface ClientAppShellProps {
  children: React.ReactNode;
}

const THEME_OPTIONS: { value: Theme; label: string; fill: string; ring: string }[] = [
  { value: 'snout', label: 'Snout', fill: '#432f21', ring: '#fce1ef' },
  { value: 'light', label: 'Light', fill: '#ffffff', ring: '#d4d4d4' },
  { value: 'dark', label: 'Dark', fill: '#0f172a', ring: '#3b82f6' },
  { value: 'snout-dark', label: 'Brand Dark', fill: '#1a0802', ring: '#fce1ef' },
];

function ThemePicker() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="px-3 py-2">
      <p className="mb-1.5 text-xs font-medium text-text-tertiary">Theme</p>
      <div className="flex items-center gap-2">
        {THEME_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            aria-label={`Switch to ${opt.label} theme`}
            title={opt.label}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md transition hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-border-focus"
          >
            <span
              className="block h-6 w-6 rounded-full border-2"
              style={{
                backgroundColor: opt.fill,
                borderColor: theme === opt.value ? opt.ring : 'transparent',
                boxShadow: theme === opt.value ? `0 0 0 2px ${opt.ring}` : 'none',
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

const CONTENT_CONTAINER = 'w-full px-4 sm:px-6 lg:mx-auto lg:max-w-6xl lg:px-8';
const CONTENT_INNER = 'flex w-full min-w-0 items-center justify-between gap-3 lg:mx-auto lg:max-w-4xl';

function getClientHeaderInfo(pathname: string, firstName: string): { title: string; subtitle: string } {
  if (pathname === '/client/home' || pathname === '/client') return { title: 'Home', subtitle: 'Your pet care hub' };
  if (pathname.startsWith('/client/bookings')) return { title: 'Bookings', subtitle: 'Your visits' };
  if (pathname.startsWith('/client/pets')) return { title: 'Pets', subtitle: 'Your furry family' };
  if (pathname.startsWith('/client/messages')) return { title: 'Messages', subtitle: 'Chat with your sitter' };
  if (pathname.startsWith('/client/billing')) return { title: 'Billing', subtitle: 'Invoices & loyalty' };
  if (pathname.startsWith('/client/profile')) return { title: 'Profile', subtitle: 'Account settings' };
  if (pathname.startsWith('/client/reports')) return { title: 'Visit reports', subtitle: 'Updates from your sitter' };
  return { title: 'Client portal', subtitle: `Hi, ${firstName}` };
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
      <div className="flex min-h-screen items-center justify-center bg-surface-secondary">
        <p className="text-sm text-text-tertiary">Loading...</p>
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

  const displayName = clientName || user?.name || 'there';
  const firstName = displayName.split(' ')[0] || displayName;
  const { title: pageTitle, subtitle: pageSubtitle } = getClientHeaderInfo(pathname, firstName);
  const showNewBookingCta = pathname === '/client/home' || pathname === '/client' || pathname.startsWith('/client/bookings');

  return (
    <div className="fixed inset-0 flex flex-col bg-surface-secondary" style={{ maxHeight: '100dvh' }}>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row min-[1024px]:flex-row">
        <ClientSidebarNav />

        <div className="flex min-h-0 flex-1 flex-col">
          <header
            className={`sticky top-0 z-10 flex min-h-[44px] items-center justify-between gap-3 border-b border-border-default bg-surface-primary py-2 transition-shadow ${
              headerShadow ? 'shadow-sm' : ''
            }`}
          >
            <div className={`flex min-w-0 flex-1 items-center justify-between gap-3 ${CONTENT_CONTAINER}`}>
              <div className={`flex min-w-0 flex-1 items-center justify-between gap-3 ${CONTENT_INNER}`}>
              <div className="min-w-0 flex-1 flex flex-col leading-tight">
                <p className="truncate text-xl font-semibold text-text-primary lg:text-sm lg:font-semibold">{pageTitle}</p>
                <p className="hidden truncate text-xs text-text-tertiary lg:block">{pageSubtitle}</p>
              </div>
              <div className="relative flex shrink-0 items-center gap-2">
                {showNewBookingCta && (
                  <Link
                    href="/client/bookings/new"
                    className="hidden min-h-[44px] items-center rounded-md border border-border-strong bg-surface-primary px-3 text-sm font-medium text-text-secondary transition hover:bg-surface-secondary hover:border-border-strong focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-1 min-[1024px]:inline-flex"
                  >
                    New booking
                  </Link>
                )}
                <button
                  type="button"
                  aria-label="Notifications"
                  className="hidden min-h-[44px] min-w-[44px] items-center justify-center rounded text-text-tertiary transition hover:bg-surface-tertiary hover:text-text-secondary focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-1 min-[1024px]:flex"
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
                  className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded bg-surface-tertiary text-sm font-medium text-text-secondary transition hover:bg-surface-tertiary/70 focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-1"
                >
                  {(firstName || 'C').charAt(0).toUpperCase()}
                </button>
                {accountMenuOpen && (
                  <div
                    ref={menuRef}
                    role="menu"
                    className="absolute right-0 top-full z-30 mt-1 min-w-[200px] rounded border border-border-default bg-surface-primary py-1 shadow-lg"
                  >
                    <ThemePicker />
                    <div className="my-1 border-t border-border-muted" />
                    <Link
                      href="/client/profile"
                      role="menuitem"
                      onClick={() => setAccountMenuOpen(false)}
                      className="block px-3 py-1.5 text-left text-sm text-text-secondary hover:bg-surface-secondary"
                    >
                      Profile
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void handleLogout()}
                      className="block w-full px-3 py-1.5 text-left text-sm text-text-secondary hover:bg-surface-secondary"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
              </div>
            </div>
          </header>

          <main
            ref={mainRef}
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-[calc(56px+env(safe-area-inset-bottom)+16px)] lg:pb-0"
          >
            <div className="min-h-0 flex-1 pt-3">{children}</div>
          </main>
        </div>
      </div>

      {showNewBookingCta && (
        <Link
          href="/client/bookings/new"
          className="fixed bottom-[calc(56px+env(safe-area-inset-bottom)+12px)] right-4 z-10 flex h-12 items-center gap-2 rounded-full bg-surface-inverse px-4 text-sm font-medium text-text-inverse shadow-lg transition active:scale-95 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-2 lg:hidden min-[1024px]:hidden"
          aria-label="Book a visit"
        >
          <span aria-hidden>+</span>
          <span>Book</span>
        </Link>
      )}

      <ClientBottomNav />
      <ClientDeployDebugOverlay />
      <ClientSwUpdateToast />
    </div>
  );
}
