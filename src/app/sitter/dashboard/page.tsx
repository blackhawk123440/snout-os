'use client';

import { Suspense, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Calendar, PhoneOff, GraduationCap, FileText, BarChart3, CalendarCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth-client';
import { useSitterDashboard } from '@/lib/api/sitter-dashboard-hooks';
import { statusDotClass, statusLabel } from '@/lib/status-colors';
import { Button } from '@/components/ui';
import {
  SitterCard,
  SitterCardHeader,
  SitterCardBody,
  SitterCardActions,
  SitterPageHeader,
} from '@/components/sitter';

/* ─── Helpers ───────────────────────────────────────────────────────── */

const formatTime = (d: Date | string) =>
  new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });


/* ─── Main Content ──────────────────────────────────────────────────── */

function SitterDashboardContent() {
  const { user, isSitter, isOwner, isClient, loading: authLoading } = useAuth();
  const router = useRouter();
  const sitterId = (user as any)?.sitterId;
  const { data: dash, isLoading, refetch } = useSitterDashboard(sitterId);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 30s polling
  useEffect(() => {
    pollRef.current = setInterval(() => { void refetch(); }, 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [refetch]);

  if (authLoading || isLoading) {
    return (
      <div className="mx-auto max-w-3xl pb-8">
        <SitterPageHeader title="Dashboard" subtitle="Loading\u2026" />
        <DashboardSkeleton />
      </div>
    );
  }

  if (!isSitter) {
    if (isOwner) router.push('/dashboard');
    else if (isClient) router.push('/client/home');
    else router.push('/login');
    return null;
  }

  if (!sitterId || !dash) {
    return (
      <div className="mx-auto max-w-3xl pb-8">
        <SitterPageHeader title="Dashboard" subtitle="Unable to load" />
        <SitterCard><SitterCardBody><p className="text-sm text-text-secondary">Please try logging in again.</p></SitterCardBody></SitterCard>
      </div>
    );
  }

  const todayVisits = dash.upcomingBookings || [];
  const completedVisits = dash.completedBookings || [];
  const pendingRequests = dash.pendingRequests || [];
  const allToday = [...todayVisits, ...completedVisits].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  const inProgressCount = todayVisits.filter((b) => b.status === 'in_progress').length;
  const completedCount = completedVisits.length;
  const totalToday = allToday.length;
  const reportsNeeded = completedVisits.filter((b) => b.status === 'completed').length;
  const totalEarnings = completedVisits.reduce((s, b) => s + (b.totalPrice * 0.8), 0);

  // Next upcoming visit
  const now = Date.now();
  const nextVisit = todayVisits
    .filter((b) => ['confirmed', 'pending'].includes(b.status) && new Date(b.startAt).getTime() > now)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0];
  const minutesUntilNext = nextVisit ? Math.max(0, Math.floor((new Date(nextVisit.startAt).getTime() - now) / 60000)) : null;

  return (
    <div className="mx-auto max-w-3xl pb-8">
      <SitterPageHeader
        title="Dashboard"
        subtitle="What's happening today"
        action={<Button variant="secondary" size="sm" onClick={() => void refetch()}>Refresh</Button>}
      />

      <div className="space-y-4">
        {/* Quick Stats */}
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
          <StatCard label="Today's visits" value={`${completedCount}/${totalToday}`} sub={inProgressCount > 0 ? `${inProgressCount} in progress` : undefined} />
          <StatCard label="Pending" value={String(pendingRequests.length)} alert={pendingRequests.length > 0} />
          <StatCard label="Earnings" value={`$${Math.round(totalEarnings)}`} />
          <StatCard label="Rating" value={dash.performance?.clientRating ? `${dash.performance.clientRating.toFixed(1)} \u2605` : 'N/A'} />
        </div>

        {/* Next Visit Hero */}
        {nextVisit ? (
          <SitterCard className="border-2 border-status-info-border bg-status-info-bg">
            <SitterCardBody>
              <p className="text-xs font-medium uppercase tracking-wide text-status-info-text">Next up</p>
              {minutesUntilNext != null && (
                <p className="mt-1 text-sm font-semibold text-status-info-text">
                  {minutesUntilNext < 60 ? `Starts in ${minutesUntilNext} min` : `Starts in ${Math.floor(minutesUntilNext / 60)}h ${minutesUntilNext % 60}m`}
                </p>
              )}
              <div className="mt-2">
                <p className="text-lg font-semibold text-text-primary">
                  {formatTime(nextVisit.startAt)} \u2014 {nextVisit.service}
                </p>
                <p className="text-sm text-text-secondary">
                  {nextVisit.client ? `${nextVisit.client.firstName} ${nextVisit.client.lastName}` : `${nextVisit.firstName} ${nextVisit.lastName}`}
                </p>
                {nextVisit.pets?.length > 0 && (
                  <p className="text-sm text-text-tertiary">{nextVisit.pets.map((p) => p.name || p.species).join(', ')}</p>
                )}
                {nextVisit.address && <p className="text-xs text-text-tertiary mt-0.5">{nextVisit.address}</p>}
              </div>
            </SitterCardBody>
            <SitterCardActions stopPropagation>
              <Button variant="primary" size="md" className="w-full min-h-[44px]" onClick={() => router.push('/sitter/today')}>
                Start working
              </Button>
            </SitterCardActions>
          </SitterCard>
        ) : totalToday === 0 ? (
          <SitterCard className="border border-border-default">
            <SitterCardBody>
              <div className="text-center py-4">
                <p className="text-base font-semibold text-text-primary">No visits today</p>
                <p className="mt-1 text-sm text-text-secondary">You're all set. Check your calendar for upcoming bookings.</p>
                <div className="mt-4 flex justify-center gap-3">
                  <Link href="/sitter/calendar">
                    <Button variant="secondary" size="sm">View calendar</Button>
                  </Link>
                  <Link href="/sitter/availability">
                    <Button variant="secondary" size="sm">Set availability</Button>
                  </Link>
                </div>
              </div>
            </SitterCardBody>
          </SitterCard>
        ) : null}

        {/* Action Required */}
        {(pendingRequests.length > 0 || dash.unreadMessageCount > 0 || reportsNeeded > 0) && (
          <SitterCard>
            <SitterCardHeader><h3 className="text-sm font-semibold text-text-primary">Action Required</h3></SitterCardHeader>
            <SitterCardBody>
              <div className="space-y-2">
                {pendingRequests.length > 0 && (
                  <Link href="/sitter/bookings" className="flex items-center justify-between min-h-[44px] rounded-lg border border-status-warning-border bg-status-warning-bg px-3 py-2 hover:opacity-90 transition">
                    <span className="text-sm font-medium text-status-warning-text">{pendingRequests.length} pending request{pendingRequests.length !== 1 ? 's' : ''}</span>
                    <ChevronRight className="h-3 w-3 text-status-warning-text-secondary" />
                  </Link>
                )}
                {dash.unreadMessageCount > 0 && (
                  <Link href="/sitter/inbox" className="flex items-center justify-between min-h-[44px] rounded-lg border border-border-default px-3 py-2 hover:bg-surface-secondary transition">
                    <span className="text-sm font-medium text-text-primary">{dash.unreadMessageCount} unread message{dash.unreadMessageCount !== 1 ? 's' : ''}</span>
                    <ChevronRight className="h-3 w-3 text-text-tertiary" />
                  </Link>
                )}
                {reportsNeeded > 0 && (
                  <Link href="/sitter/reports/new" className="flex items-center justify-between min-h-[44px] rounded-lg border border-border-default px-3 py-2 hover:bg-surface-secondary transition">
                    <span className="text-sm font-medium text-text-primary">{reportsNeeded} report{reportsNeeded !== 1 ? 's' : ''} due</span>
                    <ChevronRight className="h-3 w-3 text-text-tertiary" />
                  </Link>
                )}
              </div>
            </SitterCardBody>
          </SitterCard>
        )}

        {/* Schedule Preview */}
        <SitterCard>
          <SitterCardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">Schedule</h3>
              <Link href="/sitter/today" className="text-xs font-medium text-accent-primary hover:underline">Start working →</Link>
            </div>
          </SitterCardHeader>
          <SitterCardBody>
            {allToday.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-sm text-text-tertiary">No visits scheduled today.</p>
                <Link href="/sitter/calendar" className="mt-2 inline-block text-sm font-medium text-accent-primary hover:underline">Check calendar</Link>
              </div>
            ) : (
              <div className="divide-y divide-border-muted -mx-5">
                {allToday.slice(0, 3).map((b) => {
                  const isCompleted = b.status === 'completed';
                  const clientName = b.client ? `${b.client.firstName} ${b.client.lastName}` : `${b.firstName} ${b.lastName}`;
                  return (
                    <div
                      key={b.id}
                      className={`flex items-center gap-3 px-5 py-3 min-h-[44px] cursor-pointer hover:bg-surface-secondary transition ${isCompleted ? 'opacity-50' : ''}`}
                      onClick={() => router.push(`/sitter/bookings/${b.id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && router.push(`/sitter/bookings/${b.id}`)}
                    >
                      <div className="w-16 shrink-0 text-sm font-medium tabular-nums text-text-primary">{formatTime(b.startAt)}</div>
                      <span className={`shrink-0 h-2.5 w-2.5 rounded-full ${statusDotClass(b.status)}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text-primary truncate">{b.service}</p>
                        <p className="text-xs text-text-secondary truncate">{clientName}</p>
                      </div>
                      <span className="shrink-0 text-xs text-text-tertiary">{statusLabel(b.status)}</span>
                    </div>
                  );
                })}
                {allToday.length > 3 && (
                  <Link href="/sitter/today" className="flex items-center justify-center px-5 py-3 min-h-[44px] text-sm font-medium text-accent-primary hover:bg-surface-secondary transition">
                    +{allToday.length - 3} more — view full schedule
                  </Link>
                )}
              </div>
            )}
          </SitterCardBody>
        </SitterCard>

        {/* Performance Snapshot */}
        <SitterCard>
          <SitterCardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">Performance</h3>
              <Link href="/sitter/performance" className="text-xs font-medium text-accent-primary hover:underline">Full metrics {'\u2192'}</Link>
            </div>
          </SitterCardHeader>
          <SitterCardBody>
            <div className="flex items-center gap-4">
              {dash.currentTier && (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-tertiary text-lg font-bold text-accent-primary">
                  {dash.currentTier.name.charAt(0)}
                </div>
              )}
              <div className="grid grid-cols-3 gap-3 flex-1">
                <div>
                  <p className="text-xs text-text-tertiary">Accept</p>
                  <p className="text-sm font-semibold text-text-primary">{dash.performance?.acceptanceRate != null ? `${Math.round(dash.performance.acceptanceRate)}%` : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-text-tertiary">Complete</p>
                  <p className="text-sm font-semibold text-text-primary">{dash.performance?.completionRate != null ? `${Math.round(dash.performance.completionRate)}%` : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-text-tertiary">On-time</p>
                  <p className="text-sm font-semibold text-text-primary">{dash.performance?.onTimeRate != null ? `${Math.round(dash.performance.onTimeRate)}%` : 'N/A'}</p>
                </div>
              </div>
            </div>
          </SitterCardBody>
        </SitterCard>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-2">
          <Link href="/sitter/calendar" className="flex items-center gap-2 rounded-xl border border-border-default bg-surface-primary px-4 py-3 min-h-[44px] hover:bg-surface-secondary transition">
            <Calendar className="h-4 w-4 text-text-tertiary" />
            <span className="text-sm font-medium text-text-primary">Calendar</span>
          </Link>
          <Link href="/sitter/reports" className="flex items-center gap-2 rounded-xl border border-border-default bg-surface-primary px-4 py-3 min-h-[44px] hover:bg-surface-secondary transition">
            <FileText className="h-4 w-4 text-text-tertiary" />
            <span className="text-sm font-medium text-text-primary">Reports</span>
          </Link>
          <Link href="/sitter/performance" className="flex items-center gap-2 rounded-xl border border-border-default bg-surface-primary px-4 py-3 min-h-[44px] hover:bg-surface-secondary transition">
            <BarChart3 className="h-4 w-4 text-text-tertiary" />
            <span className="text-sm font-medium text-text-primary">Performance</span>
          </Link>
          <Link href="/sitter/availability" className="flex items-center gap-2 rounded-xl border border-border-default bg-surface-primary px-4 py-3 min-h-[44px] hover:bg-surface-secondary transition">
            <CalendarCheck className="h-4 w-4 text-text-tertiary" />
            <span className="text-sm font-medium text-text-primary">Availability</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Stat Card ─────────────────────────────────────────────────────── */

function StatCard({ label, value, sub, alert }: { label: string; value: string; sub?: string; alert?: boolean }) {
  return (
    <div className={`shrink-0 flex-1 min-w-[110px] rounded-xl border p-3 ${alert ? 'border-status-warning-border bg-status-warning-bg' : 'border-border-default bg-surface-primary'}`}>
      <p className={`text-xs font-medium ${alert ? 'text-status-warning-text-secondary' : 'text-text-tertiary'}`}>{label}</p>
      <p className={`mt-1 text-2xl font-bold ${alert ? 'text-status-warning-text' : 'text-text-primary'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-text-tertiary">{sub}</p>}
    </div>
  );
}

/* ─── Skeleton ──────────────────────────────────────────────────────── */

function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-1 min-w-[110px] rounded-xl border border-border-default bg-surface-primary p-3">
            <div className="h-3 w-14 rounded bg-surface-tertiary" />
            <div className="mt-2 h-8 w-10 rounded bg-surface-tertiary" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border-default bg-surface-primary p-4">
        <div className="h-4 w-24 rounded bg-surface-tertiary mb-3" />
        <div className="h-16 rounded bg-surface-tertiary" />
      </div>
      {[1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-border-default bg-surface-primary p-4">
          <div className="h-4 w-32 rounded bg-surface-tertiary mb-3" />
          {[1, 2, 3].map((j) => (
            <div key={j} className="flex items-center gap-3 py-2">
              <div className="h-4 w-14 rounded bg-surface-tertiary" />
              <div className="h-2.5 w-2.5 rounded-full bg-surface-tertiary" />
              <div className="flex-1 h-4 rounded bg-surface-tertiary" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─── Page Export ────────────────────────────────────────────────────── */

export default function SitterDashboardPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-3xl pb-8">
        <SitterPageHeader title="Dashboard" subtitle="Loading\u2026" />
        <DashboardSkeleton />
      </div>
    }>
      <SitterDashboardContent />
    </Suspense>
  );
}
