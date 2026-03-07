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
  { label: 'Dashboard', href: '/dashboard', icon: 'fas fa-chart-line' },
  { label: 'Bookings', href: '/bookings', icon: 'fas fa-calendar-check' },
  { label: 'Calendar', href: '/calendar', icon: 'fas fa-calendar-alt' },
  { label: 'Messaging', href: '/messaging', icon: 'fas fa-comments' },
  { label: 'Ops', href: '/command-center', icon: 'fas fa-th-large' },
];

const OWNER_SIDEBAR_NAV: OwnerNavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'fas fa-chart-line' },
  { label: 'Command Center', href: '/command-center', icon: 'fas fa-th-large' },
  { label: 'Bookings', href: '/bookings', icon: 'fas fa-calendar-check' },
  { label: 'Calendar', href: '/calendar', icon: 'fas fa-calendar-alt' },
  { label: 'Clients', href: '/clients', icon: 'fas fa-address-book' },
  { label: 'Sitters', href: '/sitters', icon: 'fas fa-user-friends' },
  { label: 'Sitter Profile', href: '/sitters/profile', icon: 'fas fa-id-badge' },
  { label: 'Messaging', href: '/messaging', icon: 'fas fa-comments' },
  { label: 'Messaging · Owner Inbox', href: '/messaging/inbox', icon: 'fas fa-inbox' },
  { label: 'Messaging · Sitters', href: '/messaging/sitters', icon: 'fas fa-user-check' },
  { label: 'Messaging · Numbers', href: '/messaging/numbers', icon: 'fas fa-phone' },
  { label: 'Messaging · Assignments', href: '/messaging/assignments', icon: 'fas fa-link' },
  { label: 'Messaging · Twilio Setup', href: '/messaging/twilio-setup', icon: 'fas fa-satellite-dish' },
  { label: 'Numbers', href: '/numbers', icon: 'fas fa-phone-volume' },
  { label: 'Assignments', href: '/assignments', icon: 'fas fa-random' },
  { label: 'Twilio Setup', href: '/twilio-setup', icon: 'fas fa-satellite-dish' },
  { label: 'Automations', href: '/automations', icon: 'fas fa-robot' },
  { label: 'Growth / Tiers', href: '/growth', icon: 'fas fa-arrow-trend-up' },
  { label: 'Payroll', href: '/payroll', icon: 'fas fa-money-bill-wave' },
  { label: 'Reports', href: '/reports', icon: 'fas fa-chart-pie' },
  { label: 'Payments', href: '/payments', icon: 'fas fa-credit-card' },
  { label: 'Finance', href: '/finance', icon: 'fas fa-building-columns' },
  { label: 'Integrations', href: '/integrations', icon: 'fas fa-plug' },
  { label: 'Settings', href: '/settings', icon: 'fas fa-cog' },
  { label: 'Ops / Diagnostics', href: '/ops/diagnostics', icon: 'fas fa-stethoscope' },
  { label: 'Automation Failures', href: '/ops/automation-failures', icon: 'fas fa-triangle-exclamation' },
  { label: 'Message Failures', href: '/ops/message-failures', icon: 'fas fa-comment-slash' },
  { label: 'Calendar Repair', href: '/ops/calendar-repair', icon: 'fas fa-calendar-check' },
  { label: 'Payout Operations', href: '/ops/payouts', icon: 'fas fa-sack-dollar' },
  { label: 'Reconciliation', href: '/ops/finance/reconciliation', icon: 'fas fa-scale-balanced' },
  { label: 'AI Ops', href: '/ops/ai', icon: 'fas fa-robot' },
];

const HEADER_MAP: Array<{ match: (p: string) => boolean; title: string; subtitle: string }> = [
  {
    match: (p) => p.startsWith('/dashboard'),
    title: 'Dashboard',
    subtitle: 'Business health and operator quick actions',
  },
  {
    match: (p) => p.startsWith('/command-center'),
    title: 'Command Center',
    subtitle: 'Priority queues and operations control',
  },
  {
    match: (p) => p.startsWith('/bookings'),
    title: 'Bookings',
    subtitle: 'Manage visits, assignments, and execution flow',
  },
  {
    match: (p) => p.startsWith('/calendar'),
    title: 'Calendar',
    subtitle: 'Schedules, overlaps, and coverage controls',
  },
  {
    match: (p) => p.startsWith('/clients'),
    title: 'Clients',
    subtitle: 'CRM records, pets, and care instructions',
  },
  {
    match: (p) => p.startsWith('/sitters'),
    title: 'Sitters',
    subtitle: 'Workforce management and assignment readiness',
  },
  {
    match: (p) => p.startsWith('/messaging'),
    title: 'Messaging',
    subtitle: 'Owner inbox, masking routes, and thread controls',
  },
  {
    match: (p) => p.startsWith('/numbers'),
    title: 'Numbers',
    subtitle: 'Twilio number inventory and readiness status',
  },
  {
    match: (p) => p.startsWith('/assignments'),
    title: 'Assignments',
    subtitle: 'Number-to-sitter-to-thread routing assignments',
  },
  {
    match: (p) => p.startsWith('/twilio-setup'),
    title: 'Twilio Setup',
    subtitle: 'Credentials, webhooks, masking, and test messaging',
  },
  {
    match: (p) => p.startsWith('/automations') || p.startsWith('/automation'),
    title: 'Automations',
    subtitle: 'Templates, rules, and failure management',
  },
  {
    match: (p) => p.startsWith('/growth'),
    title: 'Growth / Tiers',
    subtitle: 'Sitter performance and progression controls',
  },
  {
    match: (p) => p.startsWith('/payroll'),
    title: 'Payroll',
    subtitle: 'Payout readiness and commission tracking',
  },
  {
    match: (p) => p.startsWith('/reports'),
    title: 'Reports',
    subtitle: 'Revenue, utilization, and trend analytics',
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
    match: (p) => p.startsWith('/ops/diagnostics'),
    title: 'Ops / Diagnostics',
    subtitle: 'Operational failure surfaces and verification tools',
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
  {
    match: (p) => p.startsWith('/integrations'),
    title: 'Integrations',
    subtitle: 'Third-party services and connectivity status',
  },
  {
    match: (p) => p.startsWith('/settings'),
    title: 'Settings',
    subtitle: 'Pricing, services, areas, and company controls',
  },
];

function matches(pathname: string, href: string): boolean {
  if (href === '/command-center') return pathname === '/command-center' || pathname === '/';
  if (href === '/dashboard') return pathname === '/dashboard';
  if (href === '/messaging') return pathname === '/messaging' || pathname.startsWith('/messaging/');
  return pathname.startsWith(href);
}

export function OwnerAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const mainRef = useRef<HTMLElement>(null);
  const [headerShadow, setHeaderShadow] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
            <div className="flex items-center gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((v) => !v)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Menu
              </button>
              <button
                type="button"
                onClick={() => void signOut({ callbackUrl: '/login' })}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Sign out
              </button>
            </div>
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

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/25 lg:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="absolute right-0 top-0 h-full w-[86%] max-w-sm overflow-y-auto border-l border-slate-200 bg-white p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Owner modules</p>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {OWNER_SIDEBAR_NAV.map((item) => {
                const active = matches(pathname, item.href);
                return (
                  <Link
                    key={`mobile-${item.href}`}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex min-h-11 items-center gap-2 rounded-md px-3 text-sm',
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

