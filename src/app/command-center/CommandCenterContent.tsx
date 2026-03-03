'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { LayoutWrapper, PageHeader } from '@/components/layout';
import {
  AppErrorState,
  AppCard,
  AppCardHeader,
  AppCardBody,
} from '@/components/app';
import { OnboardingChecklist } from '@/components/app/OnboardingChecklist';
import { PageSkeleton, EmptyState } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';
import { useAuth } from '@/lib/auth-client';
import { useQueryState } from '@/hooks/useQueryState';
import { KpiGrid } from '@/components/app/KpiGrid';
import { motion } from 'framer-motion';

interface Stats {
  bookingsCreated: number;
  visitsCompleted: number;
  revenue: number;
  messagesSent: number;
  trends: {
    bookingsCreated: number;
    visitsCompleted: number;
    revenue: number;
    messagesSent: number;
  };
}

const STUB_NEEDS_ATTENTION = [
  { id: '1', type: 'booking', title: 'Booking #1024 needs sitter assignment', time: '2m ago' },
  { id: '2', type: 'client', title: 'New client inquiry - Jane Doe', time: '15m ago' },
  { id: '3', type: 'visit', title: 'Visit check-in overdue - Max the dog', time: '32m ago' },
];

const STUB_TIMELINE = [
  { id: '1', time: '10:42', text: 'Sitter Sarah checked in at Oak St', type: 'checkin' },
  { id: '2', time: '10:15', text: 'Booking #1023 confirmed', type: 'booking' },
  { id: '3', time: '09:58', text: 'New client registered', type: 'client' },
];

export function CommandCenterContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [range, setRange] = useQueryState<'7d' | '30d'>('range', '7d');

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login?redirect=/command-center');
      } else if ((user as { sitterId?: string }).sitterId) {
        router.push('/sitter/inbox');
      }
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/ops/stats?range=${range}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user, range]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span style={{ color: tokens.colors.text.secondary }}>Loading...</span>
      </div>
    );
  }
  if (!user) return null;

  return (
    <AppShell>
      <LayoutWrapper variant="wide">
        <PageHeader
          title="Command Center"
          subtitle="Real-time overview of your pet care operations"
          actions={
            <Link
              href="/bookings"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white no-underline transition hover:opacity-90"
            >
              View Bookings
            </Link>
          }
        />

        {error && <AppErrorState message={error} onRetry={() => setError(null)} />}

        <div className="mb-6">
          <OnboardingChecklist />
        </div>

        {loading ? (
          <PageSkeleton />
        ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Overview</h2>
              <div className="flex gap-2">
                {(['7d', '30d'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                      range === r
                        ? 'bg-[var(--color-accent-primary)] text-white'
                        : 'bg-[var(--color-surface-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border-default)]'
                    }`}
                  >
                    {r === '7d' ? '7 days' : '30 days'}
                  </button>
                ))}
              </div>
            </div>
            <KpiGrid
              items={[
                {
                  label: `Bookings (${range})`,
                  value: stats?.bookingsCreated ?? '—',
                  delta: stats?.trends?.bookingsCreated,
                  href: '/bookings',
                  icon: <i className="fas fa-calendar-plus" />,
                },
                {
                  label: `Visits completed (${range})`,
                  value: stats?.visitsCompleted ?? '—',
                  delta: stats?.trends?.visitsCompleted,
                  href: '/bookings?status=completed',
                  icon: <i className="fas fa-check-circle" />,
                },
                {
                  label: `Revenue (${range})`,
                  value: stats?.revenue != null ? `$${stats.revenue.toFixed(0)}` : '—',
                  delta: stats?.trends?.revenue,
                  href: '/ops/payments',
                  icon: <i className="fas fa-dollar-sign" />,
                },
                {
                  label: `Messages sent (${range})`,
                  value: stats?.messagesSent ?? '—',
                  delta: stats?.trends?.messagesSent,
                  href: '/messages',
                  icon: <i className="fas fa-comment" />,
                },
              ]}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <AppCard className="lg:col-span-2">
              <AppCardHeader title="Needs Attention" />
              <AppCardBody>
                {STUB_NEEDS_ATTENTION.length === 0 ? (
                  <EmptyState
                    title="All caught up"
                    description="No items need your attention right now."
                    primaryAction={{ label: 'View bookings', onClick: () => router.push('/bookings') }}
                  />
                ) : (
                  <ul className="divide-y divide-neutral-100">
                    {STUB_NEEDS_ATTENTION.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                      >
                        <span className="text-sm text-neutral-700">{item.title}</span>
                        <span className="text-xs text-neutral-500">{item.time}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </AppCardBody>
            </AppCard>

            <AppCard>
              <AppCardHeader title="Activity Timeline" />
              <AppCardBody>
                {STUB_TIMELINE.length === 0 ? (
                  <EmptyState
                    title="No recent activity"
                    description="Activity will appear here as sitters check in and bookings are created."
                    primaryAction={{ label: 'View bookings', onClick: () => router.push('/bookings') }}
                  />
                ) : (
                  <ul className="space-y-3">
                    {STUB_TIMELINE.map((e) => (
                      <li key={e.id} className="flex gap-3 text-sm">
                        <span className="shrink-0 font-mono text-xs text-neutral-500">{e.time}</span>
                        <span className="text-neutral-700">{e.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </AppCardBody>
            </AppCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <AppCard>
              <AppCardHeader title="Live Map" />
              <AppCardBody>
                <div className="flex aspect-video items-center justify-center rounded-lg border-2 border-dashed border-neutral-200 bg-neutral-50 text-neutral-500">
                  Map placeholder
                </div>
              </AppCardBody>
            </AppCard>

            <AppCard>
              <AppCardHeader title="AI Insights" />
              <AppCardBody>
                <div className="flex min-h-[200px] items-center justify-center rounded-lg border-2 border-dashed border-neutral-200 bg-neutral-50 text-neutral-500">
                  AI insights placeholder
                </div>
              </AppCardBody>
            </AppCard>
          </div>
        </motion.div>
        )}
      </LayoutWrapper>
    </AppShell>
  );
}
