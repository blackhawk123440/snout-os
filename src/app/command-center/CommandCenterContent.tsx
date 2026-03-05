'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { OwnerAppShell, LayoutWrapper, PageHeader } from '@/components/layout';
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
  type: string;
  entityId: string;
  title: string;
  subtitle: string;
  severity: 'high' | 'medium' | 'low';
  dueAt: string | null;
  createdAt: string;
  primaryActionLabel: 'Fix' | 'Assign' | 'Retry' | 'Open';
  primaryActionHref: string;
}

interface AttentionPayload {
  alerts: AttentionItem[];
  staffing: AttentionItem[];
  lastUpdatedAt: string | null;
}

export function CommandCenterContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [attention, setAttention] = useState<AttentionPayload>({
    alerts: [],
    staffing: [],
    lastUpdatedAt: null,
  });
  const [range, setRange] = useState<'7d' | '30d'>('7d');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [rollbackByItemId, setRollbackByItemId] = useState<Record<string, string | null>>({});
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login?redirect=/command-center');
      } else if ((user as { role?: string }).role === 'client') {
        router.push('/client/home');
      } else if ((user as { sitterId?: string }).sitterId) {
        router.push('/sitter/inbox');
      }
    }
  }, [user, authLoading, router]);

  const load = async (opts?: { preserveScroll?: boolean }) => {
    const preserveScroll = !!opts?.preserveScroll;
    const prevScrollY = preserveScroll && typeof window !== 'undefined' ? window.scrollY : null;
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [statsData, attentionData] = await Promise.all([
        fetch(`/api/ops/stats?range=${range}`).then((r) => r.json()),
        fetch('/api/ops/command-center/attention').then((r) => r.json()),
      ]);
      setStats(statsData ?? null);
      setAttention({
        alerts: Array.isArray(attentionData?.alerts) ? attentionData.alerts : [],
        staffing: Array.isArray(attentionData?.staffing) ? attentionData.staffing : [],
        lastUpdatedAt: typeof attentionData?.lastUpdatedAt === 'string' ? attentionData.lastUpdatedAt : null,
      });
    } catch {
      setStats(null);
      setAttention({ alerts: [], staffing: [], lastUpdatedAt: null });
      setError('Failed to load command center queues');
    } finally {
      setLoading(false);
      if (prevScrollY != null && typeof window !== 'undefined') {
        requestAnimationFrame(() => window.scrollTo(0, prevScrollY));
      }
    }
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await load();
    })();
    return () => { cancelled = true; };
  }, [user, load]);

  const handleAttentionAction = async (
    id: string,
    action: 'mark_handled' | 'snooze_1h' | 'snooze_4h' | 'snooze_tomorrow'
  ) => {
    setActionLoadingId(id);
    try {
      const res = await fetch('/api/ops/command-center/attention/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || 'Failed to update item');
        return;
      }
      await load({ preserveScroll: true });
    } catch {
      setError('Failed to update item');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStaffingResolve = async (
    item: AttentionItem,
    action: 'assign_notify' | 'rollback'
  ) => {
    setActionLoadingId(item.id);
    try {
      const res = await fetch('/api/ops/command-center/staffing/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: item.id,
          action,
          rollbackToken: action === 'rollback' ? rollbackByItemId[item.id] ?? null : undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Failed staffing action');
        return;
      }
      if (action === 'assign_notify') {
        setRollbackByItemId((prev) => ({
          ...prev,
          [item.id]: typeof json?.rollbackToken === 'string' ? json.rollbackToken : null,
        }));
      }
      await load({ preserveScroll: true });
    } catch {
      setError('Failed staffing action');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleQuickFix = async (item: AttentionItem) => {
    const previous = attention;
    setActionLoadingId(item.id);
    setAttention((curr) => ({
      ...curr,
      alerts: curr.alerts.filter((a) => a.id !== item.id),
    }));
    try {
      const res = await fetch('/api/ops/command-center/attention/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setAttention(previous);
        setError(json.error || 'Failed to queue fix');
        return;
      }
      await load({ preserveScroll: true });
    } catch {
      setAttention(previous);
      setError('Failed to queue fix');
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatRelativeUpdated = (iso: string | null) => {
    if (!iso) return 'never';
    const deltaMs = Math.max(0, nowMs - new Date(iso).getTime());
    const mins = Math.floor(deltaMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const severityClass = (severity: AttentionItem['severity']) => {
    if (severity === 'high') return 'bg-red-100 text-red-700';
    if (severity === 'medium') return 'bg-amber-100 text-amber-700';
    return 'bg-neutral-100 text-neutral-700';
  };
  const severityLabel = (severity: AttentionItem['severity']) =>
    severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span style={{ color: tokens.colors.text.secondary }}>Loading...</span>
      </div>
    );
  }
  if (!user) return null;

  return (
    <OwnerAppShell>
      <LayoutWrapper variant="wide">
        <PageHeader
          title="Command Center"
          subtitle={`Real-time overview of your pet care operations · Updated ${formatRelativeUpdated(attention.lastUpdatedAt)}`}
          actions={
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => void load({ preserveScroll: true })} disabled={loading}>
                Refresh
              </Button>
              <Link
                href="/bookings"
                className="inline-flex items-center gap-2 rounded-md border border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white no-underline transition hover:opacity-90"
              >
                View Bookings
              </Link>
            </div>
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
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                        </p>
                        <p className="mt-0.5 text-xs text-neutral-600">{item.subtitle}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${severityClass(item.severity)}`}>
                            {severityLabel(item.severity)}
                          </span>
                          {item.dueAt && (
                            <span className="text-[10px] text-neutral-500">
                              Due {new Date(item.dueAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => router.push(item.primaryActionHref)}>
                          {item.primaryActionLabel}
                        </Button>
                        {(item.type === 'automation_failure' || item.type === 'calendar_repair') && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => void handleQuickFix(item)}
                            disabled={actionLoadingId === item.id}
                          >
                            Fix now
                          </Button>
                        )}
                        <Button variant="secondary" size="sm" onClick={() => void handleAttentionAction(item.id, 'snooze_1h')} disabled={actionLoadingId === item.id}>
                          Snooze 1h
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => void handleAttentionAction(item.id, 'snooze_4h')} disabled={actionLoadingId === item.id}>
                          Snooze 4h
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => void handleAttentionAction(item.id, 'snooze_tomorrow')} disabled={actionLoadingId === item.id}>
                          Snooze tomorrow
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => void handleAttentionAction(item.id, 'mark_handled')} disabled={actionLoadingId === item.id}>
                          Mark handled
                        </Button>
                      </div>
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
                          </p>
                          <p className="mt-0.5 text-xs text-neutral-600">{item.subtitle}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${severityClass(item.severity)}`}>
                              {severityLabel(item.severity)}
                            </span>
                            {item.dueAt && (
                              <span className="text-[10px] text-neutral-500">
                                Due {new Date(item.dueAt).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap justify-end gap-2">
                          <Button variant="secondary" size="sm" onClick={() => router.push(item.primaryActionHref)}>
                            {item.primaryActionLabel}
                          </Button>
                          {(item.type === 'coverage_gap' || item.type === 'unassigned') && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => void handleStaffingResolve(item, 'assign_notify')}
                              disabled={actionLoadingId === item.id}
                            >
                              Assign + notify
                            </Button>
                          )}
                          {(item.type === 'coverage_gap' || item.type === 'unassigned') &&
                            Object.prototype.hasOwnProperty.call(rollbackByItemId, item.id) && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => void handleStaffingResolve(item, 'rollback')}
                                disabled={actionLoadingId === item.id}
                              >
                                Rollback
                              </Button>
                            )}
                          <Button variant="secondary" size="sm" onClick={() => void handleAttentionAction(item.id, 'snooze_1h')} disabled={actionLoadingId === item.id}>
                            Snooze 1h
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => void handleAttentionAction(item.id, 'snooze_4h')} disabled={actionLoadingId === item.id}>
                            Snooze 4h
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => void handleAttentionAction(item.id, 'snooze_tomorrow')} disabled={actionLoadingId === item.id}>
                            Snooze tomorrow
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => void handleAttentionAction(item.id, 'mark_handled')} disabled={actionLoadingId === item.id}>
                            Mark handled
                          </Button>
                        </div>
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
    </OwnerAppShell>
  );
}
