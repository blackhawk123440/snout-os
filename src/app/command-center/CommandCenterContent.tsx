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
import { Button, PageSkeleton, EmptyState } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';
import { useAuth } from '@/lib/auth-client';
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

interface AttentionItem {
  id: string;
  title: string;
  subtitle: string;
  count?: number;
  actionLabel: 'Fix' | 'Assign' | 'Retry' | 'Open';
  href: string;
}

interface AttentionPayload {
  alerts: AttentionItem[];
  staffing: AttentionItem[];
}

export function CommandCenterContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [attention, setAttention] = useState<AttentionPayload>({ alerts: [], staffing: [] });
  const [range, setRange] = useState<'7d' | '30d'>('7d');

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
    setError(null);
    Promise.all([
      fetch(`/api/ops/stats?range=${range}`).then((r) => r.json()),
      fetch('/api/ops/command-center/attention').then((r) => r.json()),
    ])
      .then(([statsData, attentionData]) => {
        if (cancelled) return;
        setStats(statsData ?? null);
        setAttention({
          alerts: Array.isArray(attentionData?.alerts) ? attentionData.alerts : [],
          staffing: Array.isArray(attentionData?.staffing) ? attentionData.staffing : [],
        });
      })
      .catch(() => {
        if (cancelled) return;
        setStats(null);
        setAttention({ alerts: [], staffing: [] });
        setError('Failed to load command center queues');
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

          <AppCard>
            <AppCardHeader title="Alerts" />
            <AppCardBody>
              {attention.alerts.length === 0 ? (
                <EmptyState
                  title="No active alerts"
                  description="Automation, payout, and calendar systems are healthy."
                />
              ) : (
                <ul className="divide-y divide-neutral-100">
                  {attention.alerts.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-900">
                          {item.title}
                          {typeof item.count === 'number' ? ` · ${item.count}` : ''}
                        </p>
                        <p className="mt-0.5 text-xs text-neutral-600">{item.subtitle}</p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => router.push(item.href)}
                      >
                        {item.actionLabel}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </AppCardBody>
          </AppCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <AppCard>
              <AppCardHeader title="Staffing conflicts queue" />
              <AppCardBody>
                {attention.staffing.length === 0 ? (
                  <EmptyState
                    title="No staffing conflicts"
                    description="No unassigned, overlapping, or coverage-risk visits."
                  />
                ) : (
                  <ul className="divide-y divide-neutral-100">
                    {attention.staffing.map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-900">
                            {item.title}
                            {typeof item.count === 'number' ? ` · ${item.count}` : ''}
                          </p>
                          <p className="mt-0.5 text-xs text-neutral-600">{item.subtitle}</p>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => router.push(item.href)}
                        >
                          {item.actionLabel}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </AppCardBody>
            </AppCard>

            <AppCard>
              <AppCardHeader title="Operations shortcuts" />
              <AppCardBody>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => router.push('/ops/automation-failures')}>
                    Open failures
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => router.push('/ops/calendar-repair')}>
                    Open calendar repair
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => router.push('/ops/payouts')}>
                    Open payouts
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => router.push('/finance')}>
                    Open finance
                  </Button>
                </div>
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
