'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { OwnerAppShell, LayoutWrapper, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui';
import { toastSuccess, toastError } from '@/lib/toast';

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
      return { dot: 'bg-green-500', label: 'Complete' };
    case 'in_progress':
      return { dot: checkedInAt ? 'bg-green-500 animate-pulse' : 'bg-green-500', label: 'In progress' };
    case 'confirmed':
      return { dot: 'bg-blue-500', label: 'Upcoming' };
    case 'pending':
      return { dot: 'bg-amber-500', label: 'Pending' };
    default:
      return { dot: 'bg-surface-tertiary', label: status };
  }
};

const severityColor = (severity: string) => {
  switch (severity) {
    case 'high':
      return 'border-l-red-500';
    case 'medium':
      return 'border-l-amber-500';
    default:
      return 'border-l-blue-500';
  }
};

const severityBadge = (severity: string) => {
  switch (severity) {
    case 'high':
      return 'bg-red-100 text-red-800';
    case 'medium':
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-blue-100 text-blue-800';
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

  const [board, setBoard] = useState<BoardData | null>(null);
  const [sitters, setSitters] = useState<SitterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Current date for the board
  const currentDate = dateParam || (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const [boardRes, sittersRes] = await Promise.all([
        fetch(`/api/ops/daily-board?date=${currentDate}`),
        fetch('/api/sitters?page=1&pageSize=200'),
      ]);

      const boardJson = await boardRes.json().catch(() => ({}));
      if (!boardRes.ok) {
        setError(boardJson.error || 'Failed to load board');
        setBoard(null);
        return;
      }
      setBoard(boardJson);

      const sittersJson = await sittersRes.json().catch(() => ({}));
      if (sittersRes.ok && Array.isArray(sittersJson.items)) {
        setSitters(
          sittersJson.items
            .filter((s: any) => s.active !== false)
            .map((s: any) => ({
              id: s.id,
              firstName: s.firstName || '',
              lastName: s.lastName || '',
            }))
        );
      }
    } catch {
      setError('Failed to load daily board');
      setBoard(null);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    void load();
  }, [load]);

  // Poll every 30s for live updates
  useEffect(() => {
    pollRef.current = setInterval(() => {
      void load(false);
    }, 30000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load]);

  const navigateDate = (offset: number) => {
    const d = new Date(currentDate + 'T12:00:00');
    d.setDate(d.getDate() + offset);
    const newDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    router.push(`/dashboard?date=${newDate}`);
  };

  const goToday = () => {
    router.push('/dashboard');
  };

  const quickAssign = async (bookingId: string, sitterId: string) => {
    try {
      const res = await fetch('/api/ops/daily-board/quick-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, sitterId }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toastError(json.error || 'Failed to assign');
        return;
      }
      toastSuccess('Sitter assigned');
      void load(false);
    } catch {
      toastError('Failed to assign sitter');
    }
  };

  const stats = board?.stats;
  const attentionCount =
    (board?.attention.alerts.length ?? 0) + (board?.attention.staffing.length ?? 0);
  const subtitle = board
    ? `${stats?.totalVisits ?? 0} visits today \u00b7 ${stats?.activeSittersCount ?? 0} sitters active${attentionCount > 0 ? ` \u00b7 ${attentionCount} need attention` : ''}`
    : '';

  return (
    <OwnerAppShell>
      <LayoutWrapper variant="wide">
        {/* Header */}
        <PageHeader
          title={`Daily Operations \u2014 ${board ? formatDateLabel(board.date) : ''}`}
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
                onClick={() => void load()}
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-border-default bg-surface-primary text-text-secondary hover:bg-surface-secondary transition"
                aria-label="Refresh"
              >
                <i className={`fas fa-sync-alt text-xs ${loading ? 'animate-spin' : ''}`} />
              </button>
              <Link href="/bookings/new">
                <Button size="sm">New booking</Button>
              </Link>
            </div>
          }
        />

        {loading && !board ? (
          <BoardSkeleton />
        ) : error ? (
          <div className="rounded-xl border border-border-default bg-surface-primary p-8 text-center">
            <p className="text-sm text-text-secondary">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-3 min-h-[44px] rounded-lg bg-accent-primary px-4 text-sm font-semibold text-text-inverse hover:opacity-90 transition"
            >
              Retry
            </button>
          </div>
        ) : board ? (
          <div className="space-y-6">
            {/* Quick Stats */}
            <QuickStatsStrip stats={board.stats} />

            {/* Main content: schedule + attention */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr,380px]">
              {/* Left: Schedule Timeline */}
              <div className="space-y-4 min-w-0">
                {board.sitterSchedules.length === 0 && board.unassigned.length === 0 ? (
                  <div className="rounded-xl border border-border-default bg-surface-primary p-8 text-center">
                    <p className="text-lg font-semibold text-text-primary">No visits scheduled</p>
                    <p className="mt-1 text-sm text-text-secondary">
                      No visits scheduled for {formatDateLabel(board.date)}. Book a visit or check another day.
                    </p>
                    <Link href="/bookings/new" className="mt-4 inline-block">
                      <Button size="sm">New booking</Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    {board.sitterSchedules.map((schedule) => (
                      <SitterScheduleCard
                        key={schedule.sitter.id}
                        schedule={schedule}
                        boardDate={board.date}
                      />
                    ))}

                    {board.unassigned.length > 0 && (
                      <UnassignedCard
                        visits={board.unassigned}
                        sitters={sitters}
                        onAssign={quickAssign}
                      />
                    )}
                  </>
                )}
              </div>

              {/* Right: Attention Queue */}
              <div className="min-w-0">
                <AttentionQueue attention={board.attention} />
              </div>
            </div>

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
            card.alert ? 'border-red-300 bg-red-50' : 'border-border-default'
          }`}
        >
          <p className={`text-xs font-medium ${card.alert ? 'text-red-700' : 'text-text-tertiary'}`}>
            {card.label}
          </p>
          <p className={`mt-1 text-2xl font-bold ${card.alert ? 'text-red-800' : 'text-text-primary'}`}>
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
        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
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
    <div className="rounded-xl border-2 border-red-300 bg-red-50 overflow-hidden">
      <div className="px-4 py-3 lg:px-5 lg:py-4">
        <p className="text-sm font-semibold text-red-800">
          Unassigned \u2014 {visits.length} visit{visits.length !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="border-t border-red-200 divide-y divide-red-200">
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
                      <span className="shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
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
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600 mb-2">
            <i className="fas fa-check text-sm" />
          </div>
          <p className="text-sm font-medium text-green-700">All clear</p>
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
