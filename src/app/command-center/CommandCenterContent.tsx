'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { OwnerAppShell, LayoutWrapper, PageHeader } from '@/components/layout';
import {
  AppErrorState,
  AppCard,
  AppCardHeader,
  AppCardBody,
} from '@/components/app';
import { OnboardingChecklist } from '@/components/app/OnboardingChecklist';
import { Button, PageSkeleton, EmptyState, useToast } from '@/components/ui';
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
  actionEntityId?: string | null;
  actionMeta?: Record<string, unknown> | null;
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
  view?: string;
}

export function CommandCenterContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const [scheduleConflictCount, setScheduleConflictCount] = useState(0);
  const [range, setRange] = useState<'7d' | '30d'>('7d');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [rollbackByItemId, setRollbackByItemId] = useState<Record<string, string | null>>({});
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [view, setView] = useState<'active' | 'snoozed' | 'handled'>('active');
  const { showToast } = useToast();

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

  const { data: ccData, isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['owner', 'command-center', range, view],
    queryFn: async () => {
      const [statsRes, attentionRes] = await Promise.all([
        fetch(`/api/ops/stats?range=${range}`),
        fetch(`/api/ops/command-center/attention?view=${view}`),
      ]);
      const stats = await statsRes.json().catch(() => ({}));
      const attention = await attentionRes.json().catch(() => ({}));
      if (!statsRes.ok) throw new Error(stats.error || 'Failed');
      return { stats, attention };
    },
    refetchInterval: 30000,
    enabled: !!user,
  });

  const stats: Stats | null = ccData?.stats ?? null;
  const attention: AttentionPayload = {
    alerts: Array.isArray(ccData?.attention?.alerts) ? ccData.attention.alerts : [],
    staffing: Array.isArray(ccData?.attention?.staffing) ? ccData.attention.staffing : [],
    lastUpdatedAt: typeof ccData?.attention?.lastUpdatedAt === 'string' ? ccData.attention.lastUpdatedAt : null,
    view: typeof ccData?.attention?.view === 'string' ? ccData.attention.view : 'active',
  };
  const error = queryError ? queryError.message : null;

  const attentionActionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'mark_handled' | 'snooze_1h' | 'snooze_4h' | 'snooze_tomorrow'; category: 'alerts' | 'staffing' }) => {
      const res = await fetch('/api/ops/command-center/attention/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to update item');
      }
      return { action };
    },
    onMutate: ({ id }) => {
      setActionLoadingId(id);
    },
    onSuccess: ({ action }) => {
      showToast({ variant: 'success', message: action === 'mark_handled' ? 'Marked handled' : 'Snoozed' });
      void queryClient.invalidateQueries({ queryKey: ['owner', 'command-center'] });
    },
    onError: (err: Error) => {
      showToast({ variant: 'error', message: err.message });
    },
    onSettled: () => {
      setActionLoadingId(null);
    },
  });

  const handleAttentionAction = (
    id: string,
    action: 'mark_handled' | 'snooze_1h' | 'snooze_4h' | 'snooze_tomorrow',
    category: 'alerts' | 'staffing'
  ) => {
    attentionActionMutation.mutate({ id, action, category });
  };

  const staffingResolveMutation = useMutation({
    mutationFn: async ({ item, action }: { item: AttentionItem; action: 'assign_notify' | 'rollback' }) => {
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
      if (!res.ok) throw new Error(json.error || 'Failed staffing action');
      return { action, itemId: item.id, json };
    },
    onMutate: ({ item }) => {
      setActionLoadingId(item.id);
    },
    onSuccess: ({ action, itemId, json }) => {
      if (action === 'assign_notify') {
        showToast({ variant: 'success', message: 'Assignment sent' });
        setRollbackByItemId((prev) => ({
          ...prev,
          [itemId]: typeof json?.rollbackToken === 'string' ? json.rollbackToken : null,
        }));
      } else {
        showToast({ variant: 'success', message: 'Rollback complete' });
      }
      void queryClient.invalidateQueries({ queryKey: ['owner', 'command-center'] });
    },
    onError: (err: Error) => {
      showToast({ variant: 'error', message: err.message });
    },
    onSettled: () => {
      setActionLoadingId(null);
    },
  });

  const handleStaffingResolve = (
    item: AttentionItem,
    action: 'assign_notify' | 'rollback'
  ) => {
    staffingResolveMutation.mutate({ item, action });
  };

  const quickFixMutation = useMutation({
    mutationFn: async (item: AttentionItem) => {
      let res: Response;
      if (item.type === 'automation_failure' && item.actionEntityId) {
        res = await fetch(`/api/ops/automation-failures/${encodeURIComponent(item.actionEntityId)}/retry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        res = await fetch('/api/ops/command-center/attention/fix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId: item.id }),
        });
      }
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to queue fix');
      }
      await res.json().catch(() => ({}));
      if (item.type === 'automation_failure') {
        await fetch('/api/ops/command-center/attention/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: item.id, action: 'mark_handled' }),
        });
      }
      return item;
    },
    onMutate: (item) => {
      setActionLoadingId(item.id);
    },
    onSuccess: (item) => {
      if (item.type === 'automation_failure') {
        showToast({ variant: 'success', message: 'Retry queued' });
      } else if (item.type === 'calendar_repair') {
        showToast({ variant: 'success', message: 'Calendar repair requested' });
      } else if (item.type === 'payout_failure') {
        showToast({ variant: 'success', message: 'Payout retry requested' });
      }
      void queryClient.invalidateQueries({ queryKey: ['owner', 'command-center'] });
    },
    onError: (err: Error) => {
      showToast({ variant: 'error', message: err.message });
    },
    onSettled: () => {
      setActionLoadingId(null);
    },
  });

  const handleQuickFix = (item: AttentionItem) => {
    quickFixMutation.mutate(item);
  };

  const handlePrimaryAction = (item: AttentionItem) => {
    if (item.type === 'automation_failure' || item.type === 'calendar_repair') {
      handleQuickFix(item);
      return;
    }
    if (item.type === 'payout_failure') {
      router.push(item.primaryActionHref);
      return;
    }
    if (item.type === 'coverage_gap' || item.type === 'unassigned' || item.type === 'overlap') {
      handleStaffingResolve(item, 'assign_notify');
      return;
    }
    router.push(item.primaryActionHref);
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
    if (severity === 'high') return 'bg-status-danger-bg text-status-danger-text';
    if (severity === 'medium') return 'bg-status-warning-bg text-status-warning-text';
    return 'bg-surface-tertiary text-text-secondary';
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
              <div className="flex gap-1 rounded-md border border-border-default bg-surface-primary p-1">
                {([
                  ['active', 'Active'],
                  ['snoozed', 'Snoozed'],
                  ['handled', 'Handled 24h'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`rounded px-2 py-1 text-xs font-medium ${
                      view === value ? 'bg-surface-inverse text-text-inverse' : 'text-text-secondary hover:bg-surface-tertiary'
                    }`}
                    onClick={() => setView(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Button variant="secondary" size="sm" onClick={() => void refetch()} disabled={loading}>
                Refresh
              </Button>
              <Link
                href="/bookings"
                className="inline-flex items-center gap-2 rounded-md border border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-text-inverse no-underline transition hover:opacity-90"
              >
                View Bookings
              </Link>
            </div>
          }
        />

        {error && <AppErrorState message={error} onRetry={() => void refetch()} />}

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
                        ? 'bg-surface-inverse text-text-inverse'
                        : 'bg-surface-tertiary text-text-secondary hover:bg-surface-secondary'
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
                <ul className="divide-y divide-border-default">
                  {attention.alerts.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary">
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-xs text-text-secondary">{item.subtitle}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${severityClass(item.severity)}`}>
                            {severityLabel(item.severity)}
                          </span>
                          {item.dueAt && (
                            <span className="text-[10px] text-text-tertiary">
                              Due {new Date(item.dueAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => handlePrimaryAction(item)} disabled={actionLoadingId === item.id}>
                          {item.primaryActionLabel}
                        </Button>
                        {(item.type === 'automation_failure' || item.type === 'calendar_repair' || item.type === 'payout_failure') && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              item.type === 'payout_failure' && item.actionMeta?.safeToRetry !== true
                                ? router.push(item.primaryActionHref)
                                : handleQuickFix(item)
                            }
                            disabled={actionLoadingId === item.id}
                          >
                            {item.type === 'payout_failure' && item.actionMeta?.safeToRetry !== true ? 'View failure' : 'Fix now'}
                          </Button>
                        )}
                        <Button variant="secondary" size="sm" onClick={() => handleAttentionAction(item.id, 'snooze_1h', 'alerts')} disabled={actionLoadingId === item.id}>
                          Snooze 1h
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => handleAttentionAction(item.id, 'snooze_4h', 'alerts')} disabled={actionLoadingId === item.id}>
                          Snooze 4h
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => handleAttentionAction(item.id, 'snooze_tomorrow', 'alerts')} disabled={actionLoadingId === item.id}>
                          Snooze tomorrow
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => handleAttentionAction(item.id, 'mark_handled', 'alerts')} disabled={actionLoadingId === item.id}>
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
                {scheduleConflictCount > 0 && (
                  <p className="mb-3 text-sm text-text-secondary">
                    <Link href="/calendar?conflicts=show_only" className="font-medium text-[var(--color-primary)] hover:underline">
                      {scheduleConflictCount} schedule conflict{scheduleConflictCount !== 1 ? 's' : ''} on Calendar
                    </Link>
                  </p>
                )}
                {attention.staffing.length === 0 ? (
                  <EmptyState
                    title="No staffing conflicts"
                    description="No unassigned, overlapping, or coverage-risk visits."
                  />
                ) : (
                  <ul className="divide-y divide-border-default">
                    {attention.staffing.map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-primary">
                            {item.title}
                          </p>
                          <p className="mt-0.5 text-xs text-text-secondary">{item.subtitle}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${severityClass(item.severity)}`}>
                              {severityLabel(item.severity)}
                            </span>
                            {item.dueAt && (
                              <span className="text-[10px] text-text-tertiary">
                                Due {new Date(item.dueAt).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap justify-end gap-2">
                          <Button variant="secondary" size="sm" onClick={() => handlePrimaryAction(item)} disabled={actionLoadingId === item.id}>
                            {item.primaryActionLabel}
                          </Button>
                          {(item.type === 'coverage_gap' || item.type === 'unassigned' || item.type === 'overlap') && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleStaffingResolve(item, 'assign_notify')}
                              disabled={actionLoadingId === item.id}
                            >
                              Assign + notify
                            </Button>
                          )}
                          {(item.type === 'coverage_gap' || item.type === 'unassigned' || item.type === 'overlap') &&
                            Object.prototype.hasOwnProperty.call(rollbackByItemId, item.id) && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleStaffingResolve(item, 'rollback')}
                                disabled={actionLoadingId === item.id}
                              >
                                Rollback
                              </Button>
                            )}
                          <Button variant="secondary" size="sm" onClick={() => handleAttentionAction(item.id, 'snooze_1h', 'staffing')} disabled={actionLoadingId === item.id}>
                            Snooze 1h
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => handleAttentionAction(item.id, 'snooze_4h', 'staffing')} disabled={actionLoadingId === item.id}>
                            Snooze 4h
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => handleAttentionAction(item.id, 'snooze_tomorrow', 'staffing')} disabled={actionLoadingId === item.id}>
                            Snooze tomorrow
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => handleAttentionAction(item.id, 'mark_handled', 'staffing')} disabled={actionLoadingId === item.id}>
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
                <div className="flex aspect-video items-center justify-center rounded-lg border-2 border-dashed border-border-default bg-surface-secondary text-text-tertiary">
                  Map placeholder
                </div>
              </AppCardBody>
            </AppCard>

            <AppCard>
              <AppCardHeader title="AI Insights" />
              <AppCardBody>
                <div className="flex min-h-[200px] items-center justify-center rounded-lg border-2 border-dashed border-border-default bg-surface-secondary text-text-tertiary">
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
