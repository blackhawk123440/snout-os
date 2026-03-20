'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { OwnerAppShell, LayoutWrapper, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui';
import { useQuickAssign } from '@/lib/api/owner-hooks';
import { toastSuccess, toastError } from '@/lib/toast';
import { statusDotClass } from '@/lib/status-colors';

/* ─── Types ─────────────────────────────────────────────────────────── */

interface BoardStats {
  totalVisits: number;
  completedVisits: number;
  inProgressVisits: number;
  upcomingVisits: number;
  unassignedCount: number;
  activeSittersCount: number;
  todayRevenue: number;
  onTimeRate: number;
}

interface Visit {
  bookingId: string;
  service: string;
  clientName: string;
  address: string | null;
  startAt: string;
  endAt: string;
  status: string;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  pets: Array<{ name: string; species: string }>;
  paymentStatus: string;
  hasReport: boolean;
  threadId: string | null;
}

interface SitterSchedule {
  sitter: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    isAvailable: boolean;
  };
  visits: Visit[];
}

interface UnassignedVisit {
  bookingId: string;
  service: string;
  clientName: string;
  address: string | null;
  startAt: string;
  endAt: string;
  pets: Array<{ name: string; species: string }>;
}

interface AttentionItem {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  severity: 'high' | 'medium' | 'low';
  primaryActionLabel: string;
  primaryActionHref: string;
}

interface BoardData {
  date: string;
  stats: BoardStats;
  sitterSchedules: SitterSchedule[];
  unassigned: UnassignedVisit[];
  attention: {
    alerts: AttentionItem[];
    staffing: AttentionItem[];
  };
}

interface SitterOption {
  id: string;
  firstName: string;
  lastName: string;
}

/* ─── Helpers ───────────────────────────────────────────────────────── */

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const formatDateLabel = (dateStr: string) => {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
};

const isToday = (dateStr: string) => {
  const today = new Date();
  return dateStr === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

const statusIndicator = (status: string, checkedInAt: string | null) => {
  switch (status) {
    case 'completed':
      return { dot: 'bg-status-success-fill', label: 'Complete' };
    case 'in_progress':
      return { dot: checkedInAt ? 'bg-status-success-fill animate-pulse' : 'bg-status-success-fill', label: 'In progress' };
    case 'confirmed':
      return { dot: 'bg-status-info-fill', label: 'Upcoming' };
    case 'pending':
      return { dot: 'bg-status-warning-fill', label: 'Pending' };
    default:
      return { dot: 'bg-surface-tertiary', label: status };
  }
};

const severityColor = (severity: string) => {
  switch (severity) {
    case 'high':
      return 'border-l-status-danger-fill';
    case 'medium':
      return 'border-l-status-warning-fill';
    default:
      return 'border-l-status-info-fill';
  }
};

const severityBadge = (severity: string) => {
  switch (severity) {
    case 'high':
      return 'bg-status-danger-bg text-status-danger-text';
    case 'medium':
      return 'bg-status-warning-bg text-status-warning-text';
    default:
      return 'bg-status-info-bg text-status-info-text';
  }
};

/* ─── Main Page ─────────────────────────────────────────────────────── */

export default function DashboardPage() {
  return (
    <Suspense fallback={<OwnerAppShell><LayoutWrapper variant="wide"><BoardSkeleton /></LayoutWrapper></OwnerAppShell>}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date');

  // Current date for the board
  const currentDate = dateParam || (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  // Messaging status for banner
  const { data: msgStatus } = useQuery({
    queryKey: ['owner', 'messaging-status'],
    queryFn: async () => {
      const res = await fetch('/api/ops/messaging-status');
      return res.ok ? res.json() : null;
    },
    staleTime: 300000,
  });

  // Payment analytics
  const { data: paymentStats } = useQuery({
    queryKey: ['owner', 'payment-analytics'],
    queryFn: async () => {
      const res = await fetch('/api/ops/payment-analytics');
      return res.ok ? res.json() : null;
    },
    staleTime: 60000,
  });

  const { data: boardData, isLoading: boardLoading, error: boardError, refetch: refetchBoard } = useQuery({
    queryKey: ['owner', 'daily-board', currentDate],
    queryFn: async () => {
      const [boardRes, sittersRes] = await Promise.all([
        fetch(`/api/ops/daily-board?date=${currentDate}`),
        fetch('/api/sitters?page=1&pageSize=200'),
      ]);
      const board = await boardRes.json().catch(() => ({}));
      const sittersData = await sittersRes.json().catch(() => ({}));
      if (!boardRes.ok) throw new Error(board.error || 'Failed to load');
      return { ...board, sitters: Array.isArray(sittersData.items) ? sittersData.items : [] };
    },
    refetchInterval: 30000,
  });

  const stats = boardData?.stats;
  const sitterSchedules = boardData?.sitterSchedules || [];
  const unassigned = boardData?.unassigned || [];
  const attention = boardData?.attention;
  const sitters = boardData?.sitters || [];

  const navigateDate = (offset: number) => {
    const d = new Date(currentDate + 'T12:00:00');
    d.setDate(d.getDate() + offset);
    const newDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    router.push(`/dashboard?date=${newDate}`);
  };

  const goToday = () => {
    router.push('/dashboard');
  };

  const quickAssignMutation = useQuickAssign();
  const quickAssign = (bookingId: string, sitterId: string) => {
    quickAssignMutation.mutate(
      { bookingId, sitterId },
      {
        onSuccess: () => {
          toastSuccess('Sitter assigned');
          void refetchBoard();
        },
        onError: (err: Error) => {
          toastError(err.message || 'Failed to assign sitter');
        },
      },
    );
  };

  const attentionCount =
    (attention?.alerts.length ?? 0) + (attention?.staffing.length ?? 0);
  const subtitle = boardData
    ? `${stats?.totalVisits ?? 0} visits today \u00b7 ${stats?.activeSittersCount ?? 0} sitters active${attentionCount > 0 ? ` \u00b7 ${attentionCount} need attention` : ''}`
    : '';

  return (
    <OwnerAppShell>
      <LayoutWrapper variant="wide">
        {/* Header */}
        <PageHeader
          title={`Daily Operations \u2014 ${boardData ? formatDateLabel(boardData.date) : ''}`}
          subtitle={subtitle}
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigateDate(-1)}
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-border-default bg-surface-primary text-text-secondary hover:bg-surface-secondary transition"
                aria-label="Previous day"
              >
                <i className="fas fa-chevron-left text-xs" />
              </button>
              {!isToday(currentDate) && (
                <button
                  type="button"
                  onClick={goToday}
                  className="min-h-[44px] rounded-lg border border-border-default bg-surface-primary px-3 text-sm font-medium text-text-secondary hover:bg-surface-secondary transition"
                >
                  Today
                </button>
              )}
              <button
                type="button"
                onClick={() => navigateDate(1)}
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-border-default bg-surface-primary text-text-secondary hover:bg-surface-secondary transition"
                aria-label="Next day"
              >
                <i className="fas fa-chevron-right text-xs" />
              </button>
              <button
                type="button"
                onClick={() => void refetchBoard()}
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-border-default bg-surface-primary text-text-secondary hover:bg-surface-secondary transition"
                aria-label="Refresh"
              >
                <i className={`fas fa-sync-alt text-xs ${boardLoading ? 'animate-spin' : ''}`} />
              </button>
              <Link href="/bookings/new">
                <Button size="sm">New booking</Button>
              </Link>
            </div>
          }
        />

        {/* Owner onboarding wizard */}
        <OnboardingWizard />

        {/* Messaging status banner */}
        {msgStatus && !msgStatus.active && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-status-warning-border bg-status-warning-bg px-4 py-3">
            <div>
              <p className="text-sm font-medium text-status-warning-text">Messaging not configured</p>
              <p className="text-xs text-status-warning-text-secondary">SMS notifications won't send until you connect a provider.</p>
            </div>
            <Link href="/messaging/twilio-setup" className="min-h-[44px] inline-flex items-center rounded-lg border border-status-warning-border px-3 text-sm font-medium text-status-warning-text hover:opacity-90 transition">
              Set up now
            </Link>
          </div>
        )}

        {/* Payment stats strip */}
        {paymentStats && (
          <div className="mb-4 flex gap-3 overflow-x-auto pb-1">
            <div className="shrink-0 rounded-xl border border-border-default bg-surface-primary px-4 py-3 min-w-[140px]">
              <p className="text-xs text-text-tertiary">Today</p>
              <p className="text-lg font-bold text-text-primary tabular-nums">${paymentStats.collected.today.amount.toFixed(0)}</p>
            </div>
            <div className="shrink-0 rounded-xl border border-border-default bg-surface-primary px-4 py-3 min-w-[140px]">
              <p className="text-xs text-text-tertiary">This week</p>
              <p className="text-lg font-bold text-text-primary tabular-nums">${paymentStats.collected.week.amount.toFixed(0)}</p>
            </div>
            {paymentStats.outstanding.count > 0 && (
              <div className="shrink-0 rounded-xl border border-status-warning-border bg-status-warning-bg px-4 py-3 min-w-[140px]">
                <p className="text-xs text-status-warning-text-secondary">Outstanding</p>
                <p className="text-lg font-bold text-status-warning-text tabular-nums">${paymentStats.outstanding.amount.toFixed(0)}</p>
                <p className="text-xs text-status-warning-text-secondary">{paymentStats.outstanding.count} unpaid</p>
              </div>
            )}
            {paymentStats.failedPayments > 0 && (
              <div className="shrink-0 rounded-xl border border-status-danger-border bg-status-danger-bg px-4 py-3 min-w-[140px]">
                <p className="text-xs text-status-danger-text-secondary">Failed</p>
                <p className="text-lg font-bold text-status-danger-text tabular-nums">{paymentStats.failedPayments}</p>
                <p className="text-xs text-status-danger-text-secondary">last 30 days</p>
              </div>
            )}
          </div>
        )}

        {boardLoading && !boardData ? (
          <BoardSkeleton />
        ) : boardError ? (
          <div className="rounded-xl border border-border-default bg-surface-primary p-8 text-center">
            <p className="text-sm text-text-secondary">{boardError.message}</p>
            <button
              type="button"
              onClick={() => void refetchBoard()}
              className="mt-3 min-h-[44px] rounded-lg bg-accent-primary px-4 text-sm font-semibold text-text-inverse hover:opacity-90 transition"
            >
              Retry
            </button>
          </div>
        ) : boardData ? (
          <div className="space-y-6">
            {/* Quick Stats */}
            <QuickStatsStrip stats={boardData.stats} />

            {/* Main content: schedule + attention */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr,380px]">
              {/* Left: Schedule Timeline */}
              <div className="space-y-4 min-w-0">
                {sitterSchedules.length === 0 && unassigned.length === 0 ? (
                  <div className="rounded-xl border border-border-default bg-surface-primary p-8 text-center">
                    <p className="text-lg font-semibold text-text-primary">No visits scheduled</p>
                    <p className="mt-1 text-sm text-text-secondary">
                      No visits scheduled for {formatDateLabel(boardData.date)}. Book a visit or check another day.
                    </p>
                    <Link href="/bookings/new" className="mt-4 inline-block">
                      <Button size="sm">New booking</Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    {sitterSchedules.map((schedule: SitterSchedule) => (
                      <SitterScheduleCard
                        key={schedule.sitter.id}
                        schedule={schedule}
                        boardDate={boardData.date}
                      />
                    ))}

                    {unassigned.length > 0 && (
                      <UnassignedCard
                        visits={unassigned}
                        sitters={sitters}
                        onAssign={quickAssign}
                      />
                    )}
                  </>
                )}
              </div>

              {/* Right: Attention Queue */}
              <div className="min-w-0">
                <AttentionQueue attention={boardData.attention} />
              </div>
            </div>

            {/* Predictions card */}
            <PredictionsCard />

            {/* Footer links */}
            <div className="flex flex-wrap gap-3 border-t border-border-default pt-4">
              <Link href="/calendar" className="text-sm font-medium text-accent-primary hover:underline">
                Full calendar
              </Link>
              <Link href="/bookings" className="text-sm font-medium text-accent-primary hover:underline">
                All bookings
              </Link>
              <Link href="/command-center" className="text-sm font-medium text-accent-primary hover:underline">
                Command center
              </Link>
            </div>
          </div>
        ) : null}
      </LayoutWrapper>
    </OwnerAppShell>
  );
}

/* ─── Quick Stats Strip ─────────────────────────────────────────────── */

function QuickStatsStrip({ stats }: { stats: BoardStats }) {
  const cards = [
    {
      label: 'Visits',
      value: `${stats.completedVisits}/${stats.totalVisits}`,
      sub: stats.inProgressVisits > 0 ? `${stats.inProgressVisits} in progress` : undefined,
    },
    {
      label: 'Unassigned',
      value: String(stats.unassignedCount),
      alert: stats.unassignedCount > 0,
    },
    {
      label: "Today's revenue",
      value: `$${stats.todayRevenue.toLocaleString()}`,
    },
    {
      label: 'On-time',
      value: `${stats.onTimeRate}%`,
    },
  ];

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`shrink-0 flex-1 min-w-[120px] rounded-xl border bg-surface-primary p-3 lg:p-4 ${
            card.alert ? 'border-status-danger-border bg-status-danger-bg' : 'border-border-default'
          }`}
        >
          <p className={`text-xs font-medium ${card.alert ? 'text-status-danger-text' : 'text-text-tertiary'}`}>
            {card.label}
          </p>
          <p className={`mt-1 text-2xl font-bold ${card.alert ? 'text-status-danger-text' : 'text-text-primary'}`}>
            {card.value}
          </p>
          {card.sub && (
            <p className="mt-0.5 text-xs text-text-tertiary">{card.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Sitter Schedule Card ──────────────────────────────────────────── */

interface GooglePersonalEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
}

function SitterScheduleCard({ schedule, boardDate }: { schedule: SitterSchedule; boardDate: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const [googleEvents, setGoogleEvents] = useState<GooglePersonalEvent[]>([]);
  const [googleConnected, setGoogleConnected] = useState(false);
  const { sitter, visits } = schedule;

  // Fetch Google Calendar events for this sitter
  useEffect(() => {
    const dayStart = new Date(boardDate + 'T00:00:00').toISOString();
    const dayEnd = new Date(boardDate + 'T23:59:59').toISOString();
    fetch(`/api/ops/sitters/${sitter.id}/google-events?start=${dayStart}&end=${dayEnd}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) {
          setGoogleConnected(d.connected ?? false);
          setGoogleEvents(Array.isArray(d.events) ? d.events : []);
        }
      })
      .catch(() => {});
  }, [sitter.id, boardDate]);
  const inProgress = visits.filter((v) => v.status === 'in_progress').length;
  const completed = visits.filter((v) => v.status === 'completed').length;

  return (
    <div className="rounded-xl border border-border-default bg-surface-primary overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between px-4 py-3 lg:px-5 lg:py-4 text-left hover:bg-surface-secondary transition min-h-[44px]"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-tertiary text-sm font-bold text-accent-primary">
            {sitter.firstName.charAt(0)}{sitter.lastName.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">
              {sitter.firstName} {sitter.lastName}
              {googleConnected && <span className="ml-1" title="Google Calendar connected">{'\ud83d\udcc5'}</span>}
            </p>
            <p className="text-xs text-text-tertiary">
              {visits.length} visit{visits.length !== 1 ? 's' : ''}
              {inProgress > 0 && ` \u00b7 ${inProgress} in progress`}
              {completed > 0 && ` \u00b7 ${completed} done`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {sitter.phone && (
            <a
              href={`sms:${sitter.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-default text-text-secondary hover:bg-surface-tertiary transition"
              aria-label={`Message ${sitter.firstName}`}
            >
              <i className="fas fa-comment-dots text-xs" />
            </a>
          )}
          <i className={`fas fa-chevron-${collapsed ? 'down' : 'up'} text-xs text-text-tertiary`} />
        </div>
      </button>

      {/* Visits + Google Calendar events */}
      {!collapsed && (
        <div className="border-t border-border-default divide-y divide-border-muted">
          {/* Merge and sort Snout visits + Google events by start time */}
          {(() => {
            const allItems: Array<{ type: 'visit'; data: Visit } | { type: 'google'; data: GooglePersonalEvent }> = [
              ...visits.map((v) => ({ type: 'visit' as const, data: v })),
              ...googleEvents.map((e) => ({ type: 'google' as const, data: e })),
            ];
            allItems.sort((a, b) => {
              const aTime = a.type === 'visit' ? a.data.startAt : a.data.start;
              const bTime = b.type === 'visit' ? b.data.startAt : b.data.start;
              return new Date(aTime).getTime() - new Date(bTime).getTime();
            });
            return allItems.map((item) => {
              if (item.type === 'visit') return <VisitRow key={item.data.bookingId} visit={item.data} />;
              return (
                <div key={item.data.id} className="flex items-center gap-3 px-4 py-3 lg:px-5 min-h-[44px]">
                  <div className="w-20 shrink-0 text-sm tabular-nums text-text-tertiary">
                    {formatTime(item.data.start)}
                  </div>
                  <div className="shrink-0">
                    <span className="block h-2.5 w-2.5 rounded-full bg-surface-tertiary" />
                  </div>
                  <p className="text-sm text-text-tertiary italic truncate">
                    {item.data.summary} <span className="text-text-disabled">(Personal)</span>
                  </p>
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}

/* ─── Visit Row ─────────────────────────────────────────────────────── */

function VisitRow({ visit }: { visit: Visit }) {
  const router = useRouter();
  const indicator = statusIndicator(visit.status, visit.checkedInAt);
  const petNames = visit.pets.map((p) => p.name || p.species).join(', ');

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 lg:px-5 hover:bg-surface-secondary transition cursor-pointer min-h-[44px]"
      onClick={() => router.push(`/bookings/${visit.bookingId}`)}
      onKeyDown={(e) => e.key === 'Enter' && router.push(`/bookings/${visit.bookingId}`)}
      role="button"
      tabIndex={0}
      aria-label={`${visit.service} for ${visit.clientName}`}
    >
      {/* Time */}
      <div className="w-20 shrink-0 text-sm font-medium tabular-nums text-text-primary">
        {formatTime(visit.startAt)}
      </div>

      {/* Status dot */}
      <div className="shrink-0">
        <span className={`block h-2.5 w-2.5 rounded-full ${indicator.dot}`} />
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-primary truncate">
          {visit.service}
          {visit.clientName && <span className="font-normal text-text-secondary"> \u00b7 {visit.clientName}</span>}
        </p>
        {petNames && (
          <p className="text-xs text-text-tertiary truncate">{petNames}</p>
        )}
      </div>

      {/* Status label */}
      <span className="shrink-0 text-xs text-text-tertiary hidden sm:block">
        {indicator.label}
      </span>

      {/* Payment indicator */}
      {visit.paymentStatus === 'unpaid' && (
        <span className="shrink-0 rounded-full bg-status-warning-bg px-2 py-0.5 text-xs font-medium text-status-warning-text">
          Unpaid
        </span>
      )}
    </div>
  );
}

/* ─── Unassigned Card ───────────────────────────────────────────────── */

function UnassignedCard({
  visits,
  sitters,
  onAssign,
}: {
  visits: UnassignedVisit[];
  sitters: SitterOption[];
  onAssign: (bookingId: string, sitterId: string) => void;
}) {
  return (
    <div className="rounded-xl border-2 border-status-danger-border bg-status-danger-bg overflow-hidden">
      <div className="px-4 py-3 lg:px-5 lg:py-4">
        <p className="text-sm font-semibold text-status-danger-text">
          Unassigned \u2014 {visits.length} visit{visits.length !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="border-t border-status-danger-border divide-y divide-status-danger-border">
        {visits.map((visit) => (
          <div key={visit.bookingId} className="px-4 py-3 lg:px-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-text-primary">
                    {formatTime(visit.startAt)} \u2014 {visit.service}
                  </p>
                  {(() => {
                    const hoursUntil = (new Date(visit.startAt).getTime() - Date.now()) / 3600000;
                    return hoursUntil > 0 && hoursUntil < 4 ? (
                      <span className="shrink-0 rounded-full bg-status-danger-fill px-2 py-0.5 text-[10px] font-bold text-status-danger-text-on-fill uppercase">
                        Urgent
                      </span>
                    ) : null;
                  })()}
                </div>
                <p className="text-xs text-text-secondary truncate">{visit.clientName}</p>
              </div>
              {sitters.length > 0 && (
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) onAssign(visit.bookingId, e.target.value);
                  }}
                  className="min-h-[44px] rounded-lg border border-border-default bg-surface-primary px-3 text-sm text-text-primary focus:border-border-focus focus:outline-none"
                  aria-label={`Assign sitter to ${visit.service}`}
                >
                  <option value="">Assign...</option>
                  {sitters.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Attention Queue ───────────────────────────────────────────────── */

function AttentionQueue({
  attention,
}: {
  attention: { alerts: AttentionItem[]; staffing: AttentionItem[] };
}) {
  const allItems = [...attention.alerts, ...attention.staffing];

  return (
    <div className="rounded-xl border border-border-default bg-surface-primary overflow-hidden">
      <div className="px-4 py-3 lg:px-5 lg:py-4 border-b border-border-default">
        <p className="text-sm font-semibold text-text-primary">Attention Queue</p>
        {allItems.length > 0 && (
          <p className="text-xs text-text-tertiary mt-0.5">{allItems.length} item{allItems.length !== 1 ? 's' : ''} need attention</p>
        )}
      </div>

      {allItems.length === 0 ? (
        <div className="px-4 py-6 lg:px-5 text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-status-success-bg text-status-success-text mb-2">
            <i className="fas fa-check text-sm" />
          </div>
          <p className="text-sm font-medium text-status-success-text">All clear</p>
          <p className="text-xs text-text-tertiary mt-0.5">No items need attention right now.</p>
        </div>
      ) : (
        <div className="divide-y divide-border-muted max-h-[600px] overflow-y-auto">
          {allItems.map((item) => (
            <AttentionItemRow key={item.id} item={item} />
          ))}
        </div>
      )}

      <div className="border-t border-border-default px-4 py-3 lg:px-5">
        <Link
          href="/command-center"
          className="text-xs font-medium text-accent-primary hover:underline"
        >
          Open full command center
        </Link>
      </div>
    </div>
  );
}

function AttentionItemRow({ item }: { item: AttentionItem }) {
  return (
    <div className={`border-l-4 ${severityColor(item.severity)} px-4 py-3 lg:px-5`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase ${severityBadge(item.severity)}`}>
              {item.severity}
            </span>
            <p className="text-sm font-medium text-text-primary truncate">{item.title}</p>
          </div>
          <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{item.subtitle}</p>
        </div>
        <Link
          href={item.primaryActionHref}
          className="shrink-0 min-h-[36px] inline-flex items-center rounded-lg border border-border-default bg-surface-primary px-3 text-xs font-medium text-text-primary hover:bg-surface-secondary transition"
        >
          {item.primaryActionLabel}
        </Link>
      </div>
    </div>
  );
}

/* ─── Loading Skeleton ──────────────────────────────────────────────── */

function BoardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Stats */}
      <div className="flex gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-1 min-w-[120px] rounded-xl border border-border-default bg-surface-primary p-4">
            <div className="h-3 w-16 rounded bg-surface-tertiary" />
            <div className="mt-2 h-8 w-12 rounded bg-surface-tertiary" />
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr,380px]">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border-default bg-surface-primary p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-full bg-surface-tertiary" />
                <div className="flex-1">
                  <div className="h-4 w-32 rounded bg-surface-tertiary" />
                  <div className="mt-1 h-3 w-20 rounded bg-surface-tertiary" />
                </div>
              </div>
              {[1, 2].map((j) => (
                <div key={j} className="flex items-center gap-3 py-2">
                  <div className="h-4 w-16 rounded bg-surface-tertiary" />
                  <div className="h-2.5 w-2.5 rounded-full bg-surface-tertiary" />
                  <div className="flex-1 h-4 rounded bg-surface-tertiary" />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border-default bg-surface-primary p-4">
          <div className="h-4 w-32 rounded bg-surface-tertiary mb-4" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="mb-3 h-16 rounded bg-surface-tertiary" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Predictions Card ─────────────────────────────────────────────── */

function PredictionsCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['owner', 'predictions'],
    queryFn: async () => {
      const res = await fetch('/api/ops/predictions');
      return res.ok ? res.json() : null;
    },
    staleTime: 300000,
  });

  if (isLoading || !data) return null;

  const alerts = data.missingBookingAlerts || [];
  const forecast = data.demandForecast || [];
  const revenue = data.revenueProjection;

  if (alerts.length === 0 && forecast.length === 0 && !revenue) return null;

  return (
    <div className="rounded-xl border border-border-default bg-surface-primary p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary">Predictions & Insights</h3>
        <span className="text-xs text-text-tertiary">Powered by booking history</span>
      </div>

      {/* Missing booking alerts */}
      {alerts.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-medium text-status-warning-text mb-1">Missing bookings</div>
          {alerts.slice(0, 3).map((a: any) => (
            <div key={a.clientId} className="flex items-center justify-between rounded-lg border border-status-warning-border bg-status-warning-bg p-2 mb-1 text-sm">
              <span>{a.clientName} usually books on {a.usualDay}s</span>
              <span className="text-xs text-text-tertiary">{a.service}</span>
            </div>
          ))}
        </div>
      )}

      {/* Revenue projection */}
      {revenue && (
        <div className="mb-3 flex gap-3">
          <div className="flex-1 rounded-lg border p-3 text-center">
            <div className="text-xs text-text-tertiary">This month</div>
            <div className="text-lg font-bold tabular-nums">${(revenue.currentMonthTotal || 0).toLocaleString()}</div>
          </div>
          <div className="flex-1 rounded-lg border p-3 text-center">
            <div className="text-xs text-text-tertiary">Projected</div>
            <div className="text-lg font-bold tabular-nums">${(revenue.projectedMonthEnd || 0).toLocaleString()}</div>
          </div>
          <div className="flex-1 rounded-lg border p-3 text-center">
            <div className="text-xs text-text-tertiary">Last month</div>
            <div className="text-lg font-bold tabular-nums">${(revenue.lastMonthTotal || 0).toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Demand forecast */}
      {forecast.length > 0 && (
        <div>
          <div className="text-xs font-medium text-text-secondary mb-1">Next week forecast</div>
          <div className="flex gap-1">
            {forecast.slice(0, 7).map((d: any) => (
              <div key={d.date} className="flex-1 rounded-lg border p-2 text-center">
                <div className="text-[10px] text-text-tertiary">{d.dayOfWeek?.slice(0, 3)}</div>
                <div className="text-sm font-semibold tabular-nums">{d.predicted}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Owner Onboarding Wizard ────────────────────────────────────── */

const STEP_LINKS: Record<string, string> = {
  business_profile: '/settings?section=business',
  services_created: '/settings?section=services',
  team_setup: '/sitters',
  messaging_setup: '/messaging/twilio-setup',
  payments_setup: '/settings?section=integrations',
  branding_done: '/settings?section=branding',
  first_client: '/clients',
  first_booking: '/bookings/new',
};

function OnboardingWizard() {
  const { data } = useQuery({
    queryKey: ['owner', 'onboarding'],
    queryFn: async () => {
      const res = await fetch('/api/ops/onboarding');
      return res.ok ? res.json() : null;
    },
    staleTime: 120000,
  });

  if (!data || data.isComplete) return null;

  const steps = data.steps || [];
  const completed = data.completedCount || 0;
  const total = data.totalSteps || steps.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="mb-4 rounded-xl border border-border-default bg-surface-primary p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-text-primary">Complete Your Setup</h3>
        <span className="text-xs text-text-tertiary">{completed}/{total} steps</span>
      </div>
      <div className="h-2 rounded-full bg-surface-tertiary mb-3 overflow-hidden">
        <div className="h-full rounded-full bg-accent-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex flex-wrap gap-2">
        {steps.filter((s: any) => !s.completed).slice(0, 4).map((step: any) => (
          <Link
            key={step.key}
            href={STEP_LINKS[step.key] || '/settings'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-default bg-surface-secondary px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-tertiary transition"
          >
            <i className="fas fa-circle text-[6px] text-status-warning-fill" />
            {step.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
