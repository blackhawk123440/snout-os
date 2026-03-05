'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useAuth } from '@/lib/auth-client';
import { cn } from '@/components/ui/utils';

type OwnerNavItem = {
  label: string;
  href: string;
  icon: string;
};

const OWNER_PRIMARY_NAV: OwnerNavItem[] = [
  { label: 'Command', href: '/command-center', icon: 'fas fa-th-large' },
  { label: 'Ops', href: '/ops/automation-failures', icon: 'fas fa-triangle-exclamation' },
  { label: 'Payouts', href: '/ops/payouts', icon: 'fas fa-money-bill-wave' },
  { label: 'Finance', href: '/finance', icon: 'fas fa-building-columns' },
  { label: 'Payments', href: '/payments', icon: 'fas fa-credit-card' },
];

const OWNER_SIDEBAR_NAV: OwnerNavItem[] = [
  ...OWNER_PRIMARY_NAV,
  { label: 'Message Failures', href: '/ops/message-failures', icon: 'fas fa-comment-slash' },
  { label: 'Calendar Repair', href: '/ops/calendar-repair', icon: 'fas fa-calendar-check' },
  { label: 'AI Ops', href: '/ops/ai', icon: 'fas fa-robot' },
  { label: 'Reconciliation', href: '/ops/finance/reconciliation', icon: 'fas fa-scale-balanced' },
];

const HEADER_MAP: Array<{ match: (p: string) => boolean; title: string; subtitle: string }> = [
  {
    match: (p) => p.startsWith('/command-center'),
    title: 'Command Center',
    subtitle: 'Priority queues and operations control',
  },
  {
    match: (p) => p.startsWith('/ops/automation-failures'),
    title: 'Automation Failures',
    subtitle: 'Failures and retries',
  },
  {
    match: (p) => p.startsWith('/ops/payouts'),
    title: 'Payouts',
    subtitle: 'Transfer state and exceptions',
  },
  {
    match: (p) => p.startsWith('/ops/message-failures'),
    title: 'Message Failures',
    subtitle: 'Delivery exceptions and retries',
  },
  {
    match: (p) => p.startsWith('/ops/calendar-repair'),
    title: 'Calendar Repair',
    subtitle: 'Calendar sync remediation',
  },
  {
    match: (p) => p.startsWith('/ops/finance/reconciliation'),
    title: 'Reconciliation',
    subtitle: 'Ledger and Stripe comparison',
  },
  {
    match: (p) => p.startsWith('/ops/ai'),
    title: 'AI Operations',
    subtitle: 'Governance and controls',
  },
  {
    match: (p) => p.startsWith('/payments'),
    title: 'Payments',
    subtitle: 'Payment operations and revenue flow',
  },
  {
    match: (p) => p.startsWith('/finance'),
    title: 'Finance',
    subtitle: 'Revenue, payouts, and reconciliation',
  },
];

function matches(pathname: string, href: string): boolean {
  if (href === '/command-center') return pathname === '/command-center' || pathname === '/';
  return pathname.startsWith(href);
}

export function OwnerAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const mainRef = useRef<HTMLElement>(null);
  const [headerShadow, setHeaderShadow] = useState(false);
  const [deployInfo, setDeployInfo] = useState<{
    envName: string;
    commitSha: string;
    buildTime: string | null;
  } | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onScroll = () => setHeaderShadow(el.scrollTop > 4);
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json().catch(() => ({})))
      .then((data) => {
        const envName = String(data?.envName ?? 'unknown');
        const sha = String(data?.commitSha ?? data?.version ?? '').slice(0, 7);
        const buildTime = data?.buildTime ? String(data.buildTime) : null;
        setDeployInfo({ envName, commitSha: sha, buildTime });
      })
      .catch(() => {});
  }, []);

  const header = useMemo(() => {
    const found = HEADER_MAP.find((entry) => entry.match(pathname));
    return found ?? { title: 'Owner Workspace', subtitle: 'Operations' };
  }, [pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  const showDeployInfo = deployInfo && deployInfo.envName !== 'prod' && deployInfo.envName !== 'production';

  return (
    <div className="fixed inset-0 flex bg-slate-50">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="h-14 border-b border-slate-200 px-4">
          <div className="flex h-full items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Owner</p>
            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: '/login' })}
              className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
            >
              Sign out
            </button>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {OWNER_SIDEBAR_NAV.map((item) => {
            const active = matches(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'mb-1 flex h-11 items-center gap-2 rounded-md px-3 text-sm',
                  active
                    ? 'bg-slate-100 font-medium text-slate-900'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <i className={cn(item.icon, 'w-4 text-center')} aria-hidden />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        {showDeployInfo && (
          <div className="border-t border-slate-200 px-4 py-3 text-[11px] text-slate-500">
            {deployInfo.envName} · {deployInfo.commitSha}
          </div>
        )}
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header
          className={cn(
            'sticky top-0 z-20 h-14 border-b border-slate-200 bg-white px-4',
            headerShadow && 'shadow-sm'
          )}
        >
          <div className="flex h-full items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-slate-900">{header.title}</p>
              <p className="truncate text-xs text-slate-500">{header.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: '/login' })}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 lg:hidden"
            >
              Sign out
            </button>
          </div>
        </header>

        <main
          ref={mainRef}
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-[calc(56px+env(safe-area-inset-bottom)+16px)] lg:pb-0"
        >
          {children}
          {showDeployInfo && (
            <div className="px-4 pb-2 text-right text-[11px] text-slate-500 lg:hidden">
              {deployInfo.envName} · {deployInfo.commitSha}
            </div>
          )}
        </main>
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-30 flex h-14 border-t border-slate-200 bg-white lg:hidden"
        style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}
        aria-label="Owner primary navigation"
      >
        {OWNER_PRIMARY_NAV.map((item) => {
          const active = matches(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 border-t-2 text-xs',
                active ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500'
              )}
            >
              <i className={cn(item.icon, 'text-base')} aria-hidden />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

