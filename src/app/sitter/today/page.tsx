'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui';
import { toastSuccess, toastError, toastWarning } from '@/lib/toast';
import { useAuth } from '@/lib/auth-client';
import { useOffline } from '@/hooks/useOffline';
import { useSSE } from '@/hooks/useSSE';
import { usePageVisible } from '@/hooks/usePageVisible';
import { saveTodayVisits, getTodayVisits } from '@/lib/offline';
import { enqueueAction } from '@/lib/offline';
import {
  SitterCard,
  SitterCardHeader,
  SitterCardBody,
  SitterCardActions,
  SitterPageHeader,
  SitterSkeletonList,
  SitterErrorState,
} from '@/components/sitter';
import { OnboardingChecklist } from '@/components/app/OnboardingChecklist';
import {
  getShowCancelledFromQuery,
  groupTodayVisits,
  normalizeTodayBooking,
  pickNextUpVisit,
  type TodayVisitLike,
} from './today-helpers';

type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'in_progress' | string;

interface TodayBooking extends TodayVisitLike {
  id: string;
  status: BookingStatus;
  service: string;
  startAt: string;
  endAt: string;
  address: string | null;
  clientName: string;
  pets: Array<{ id: string; name?: string | null; species?: string | null }>;
  threadId: string | null;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  clientPhone?: string | null;
  hasReport?: boolean;
  latestReportId?: string | null;
  mapLink?: { apple: string; google: string } | null;
}

function useCountdown(targetDate: string | null): string | null {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    if (!targetDate) return;
    const target = new Date(targetDate).getTime();
    const tick = () => {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setText('Started');
        return;
      }
      const mins = Math.floor(diff / 60000);
      const hrs = Math.floor(mins / 60);
      if (hrs >= 1) setText(`Starts in ${hrs}h ${mins % 60}m`);
      else if (mins >= 1) setText(`Starts in ${mins} min`);
      else setText('Starts in <1 min');
    };
    tick();
    const intervalMs = 60000; // every minute when <1hr
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [targetDate]);
  return text;
}

const statusPillLabel = (status: string) => {
  switch (status) {
    case 'confirmed':
    case 'pending':
      return 'Scheduled';
    case 'in_progress':
      return 'In progress';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status.replace('_', ' ');
  }
};

/** Visit execution flow: Start → In progress → End → Write report */
const getStatusSubtitle = (booking: TodayBooking) => {
  const start = new Date(booking.startAt);
  const end = new Date(booking.endAt);
  const timeStr = `${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – ${end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  if (['pending', 'confirmed'].includes(booking.status)) return `Starts ${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  if (booking.status === 'in_progress') return `In progress · ${timeStr}`;
  if (booking.status === 'completed') return `Completed · ${timeStr}`;
  return timeStr;
};

const statusBadgeClass = (status: string) => {
  switch (status) {
    case 'confirmed':
      return 'bg-blue-100 text-blue-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-amber-100 text-amber-800';
    case 'in_progress':
      return 'bg-purple-100 text-purple-800';
    case 'cancelled':
      return 'bg-gray-200 text-gray-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

function NextVisitHero({
  booking,
  onCheckIn,
  onCheckOut,
  onMessage,
  checkingInId,
  checkingOutId,
  nowMs,
}: {
  booking: TodayBooking;
  onCheckIn: (id: string) => void;
  onCheckOut: (id: string) => void;
  onMessage: (b: TodayBooking) => void;
  checkingInId: string | null;
  checkingOutId: string | null;
  nowMs: number;
}) {
  const router = useRouter();
  const countdown = useCountdown(
    ['pending', 'confirmed'].includes(booking.status) ? booking.startAt : null
  );
  const addressSnippet = booking.address
    ? booking.address.split(',')[0].trim().slice(0, 40) + (booking.address.length > 40 ? '…' : '')
    : null;

  const petNames = booking.pets.length > 0
    ? booking.pets.map((p) => p.name || p.species || 'Pet').join(', ')
    : '—';

  return (
    <SitterCard className="mb-4 border-2 border-blue-200 bg-blue-50">
      <SitterCardHeader>
        <p className="text-xs font-medium uppercase tracking-wide text-blue-700">Next up</p>
        {countdown && (
          <p className="mt-1 text-sm font-semibold text-blue-800">{countdown}</p>
        )}
          <div className="mt-2 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold tabular-nums text-neutral-900">
              {formatTimeRange(booking.startAt, booking.endAt)}
            </p>
            <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-neutral-500">
              {getStatusSubtitle(booking)}
            </p>
            {getLiveVisitText(booking, nowMs) && (
              <p className="mt-0.5 text-sm font-semibold text-indigo-700">{getLiveVisitText(booking, nowMs)}</p>
            )}
            {booking.status === 'in_progress' && booking.checkedInAt && (
              <p className="text-xs text-neutral-500">
                Started at {new Date(booking.checkedInAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </p>
            )}
            <p className="mt-0.5 font-medium text-neutral-900">{booking.service}</p>
            <p className="text-sm text-neutral-600">{petNames}</p>
            <p className="text-sm text-neutral-500">{booking.clientName}</p>
            {addressSnippet && (
              <p className="mt-0.5 truncate text-xs text-neutral-500" title={booking.address ?? undefined}>
                {addressSnippet}
              </p>
            )}
          </div>
          {booking.pets.length > 0 && (
            <div className="flex -space-x-2 shrink-0">
              {booking.pets.slice(0, 3).map((pet) => (
                <div
                  key={pet.id}
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-amber-100 text-sm font-medium text-amber-800"
                  title={pet.name || pet.species || 'Pet'}
                >
                  {(pet.name || pet.species || '?').charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
          )}
        </div>
      </SitterCardHeader>
      <SitterCardActions>
        {['pending', 'confirmed'].includes(booking.status) && (
          <Button
            variant="primary"
            size="md"
            onClick={() => void onCheckIn(booking.id)}
            disabled={checkingInId === booking.id}
          >
            {checkingInId === booking.id ? 'Saving…' : 'Start Visit'}
          </Button>
        )}
        {booking.status === 'in_progress' && (
          <Button
            variant="primary"
            size="md"
            onClick={() => void onCheckOut(booking.id)}
            disabled={checkingOutId === booking.id}
          >
            {checkingOutId === booking.id ? 'Saving…' : 'End visit'}
          </Button>
        )}
        {booking.status === 'completed' && (
          booking.hasReport && booking.latestReportId
            ? (
              <Button variant="primary" size="md" onClick={() => router.push(`/sitter/reports/edit/${booking.latestReportId}`)}>
                View report
              </Button>
            )
            : (
              <Button variant="primary" size="md" onClick={() => router.push(`/sitter/reports/new?bookingId=${booking.id}`)}>
                Write report
              </Button>
            )
        )}
        <Button variant="secondary" size="sm" onClick={() => onMessage(booking)}>
          Message
        </Button>
        {booking.clientPhone && (
          <a href={`tel:${booking.clientPhone}`} className="inline-flex min-h-[40px] items-center rounded-lg border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-700">
            Call
          </a>
        )}
        {booking.mapLink?.google && (
          <a href={booking.mapLink.google} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[40px] items-center rounded-lg border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-700">
            Navigate
          </a>
        )}
        <Button variant="secondary" size="sm" onClick={() => router.push(`/sitter/bookings/${booking.id}`)}>
          Details
        </Button>
      </SitterCardActions>
    </SitterCard>
  );
}

function QuickInsightsStrip({
  visitsRemaining,
  totalVisits,
}: {
  visitsRemaining: number;
  totalVisits: number;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-4 rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-sm">
      <span className="text-sm text-neutral-600">
        <span className="font-semibold text-neutral-900">Earnings today</span> — Coming soon
      </span>
      <span className="text-sm text-neutral-600">
        <span className="font-semibold text-neutral-900">{visitsRemaining}</span> visit{visitsRemaining !== 1 ? 's' : ''} remaining
      </span>
      <span className="text-sm text-amber-700">On track</span>
    </div>
  );
}

function VisitCard({
  booking,
  nowMs,
  checkingInId,
  checkingOutId,
  onCheckIn,
  onCheckOut,
  onMessage,
}: {
  booking: TodayBooking;
  nowMs: number;
  checkingInId: string | null;
  checkingOutId: string | null;
  onCheckIn: (id: string) => void;
  onCheckOut: (id: string) => void;
  onMessage: (b: TodayBooking) => void;
}) {
  const router = useRouter();
  const petNames = booking.pets.length > 0
    ? booking.pets.map((p) => p.name || p.species || 'Pet').join(', ')
    : '—';

  const runPrimary = () => {
    if (['pending', 'confirmed'].includes(booking.status)) return onCheckIn(booking.id);
    if (booking.status === 'in_progress') return onCheckOut(booking.id);
    if (booking.status === 'completed') {
      if (booking.hasReport && booking.latestReportId) {
        router.push(`/sitter/reports/edit/${booking.latestReportId}`);
      } else {
        router.push(`/sitter/reports/new?bookingId=${booking.id}`);
      }
      return;
    }
    router.push(`/sitter/bookings/${booking.id}`);
  };

  return (
    <SitterCard key={booking.id} onClick={() => router.push(`/sitter/bookings/${booking.id}`)}>
      <SitterCardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold tabular-nums text-neutral-900">
              {formatTimeRange(booking.startAt, booking.endAt)}
            </p>
            <p className="font-medium text-neutral-800">{booking.service}</p>
            <p className="text-sm text-neutral-600">{petNames}</p>
            <p className="text-sm text-neutral-500">{booking.clientName}</p>
            {getLiveVisitText(booking, nowMs) && (
              <p className="mt-0.5 text-sm font-semibold text-indigo-700">{getLiveVisitText(booking, nowMs)}</p>
            )}
            {booking.status === 'in_progress' && booking.checkedInAt && (
              <p className="text-xs text-neutral-500">
                Started at {new Date(booking.checkedInAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </p>
            )}
            {booking.address && booking.address.length <= 60 && (
              <p className="mt-0.5 truncate text-xs text-neutral-500" title={booking.address}>{booking.address}</p>
            )}
          </div>
          <div className="flex shrink-0 items-start">
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(booking.status)}`}>
              {statusPillLabel(booking.status)}
            </span>
          </div>
        </div>
      </SitterCardHeader>
      <SitterCardActions stopPropagation>
        <Button
          variant="primary"
          size="md"
          className="h-10 w-full"
          onClick={() => runPrimary()}
          disabled={checkingInId === booking.id || checkingOutId === booking.id}
        >
          {checkingInId === booking.id || checkingOutId === booking.id ? 'Saving…' : getPrimaryActionLabel(booking)}
        </Button>
        <div className="flex w-full flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => onMessage(booking)}>
            Message
          </Button>
          {booking.clientPhone && (
            <a href={`tel:${booking.clientPhone}`} className="inline-flex min-h-[36px] items-center rounded-lg border border-neutral-300 bg-white px-3 text-xs font-medium text-neutral-700">
              Call
            </a>
          )}
          {booking.mapLink?.google && (
            <a href={booking.mapLink.google} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[36px] items-center rounded-lg border border-neutral-300 bg-white px-3 text-xs font-medium text-neutral-700">
              Navigate
            </a>
          )}
        </div>
      </SitterCardActions>
    </SitterCard>
  );
}

const formatTimeRange = (startAt: string, endAt: string) => {
  const start = new Date(startAt);
  const end = new Date(endAt);
  return `${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
};

const formatDurationMinutes = (startIso: string, endIso: string) => {
  const minutes = Math.max(0, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000));
  return `${minutes}m`;
};

const formatElapsedTimer = (fromIso: string, nowMs: number) => {
  const diff = Math.max(0, nowMs - new Date(fromIso).getTime());
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const getLiveVisitText = (booking: TodayBooking, nowMs: number) => {
  if (booking.status === 'in_progress' && booking.checkedInAt) {
    return `In progress — ${formatElapsedTimer(booking.checkedInAt, nowMs)}`;
  }
  if (booking.status === 'completed' && booking.checkedInAt && booking.checkedOutAt) {
    return `Duration ${formatDurationMinutes(booking.checkedInAt, booking.checkedOutAt)}`;
  }
  return null;
};

const getPrimaryActionLabel = (booking: TodayBooking) => {
  if (['pending', 'confirmed'].includes(booking.status)) return 'Start';
  if (booking.status === 'in_progress') return 'End';
  if (booking.status === 'completed') return booking.hasReport ? 'View report' : 'Write report';
  return 'View details';
};

const TODAY_KEY = () => new Date().toISOString().slice(0, 10);

export default function SitterTodayPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { isOnline, refreshQueuedCount } = useOffline();
  const [bookings, setBookings] = useState<TodayBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [checkingOutId, setCheckingOutId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const showCancelled = getShowCancelledFromQuery(searchParams.get('showCancelled'));

  const todayLabel = useMemo(
    () => new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }),
    []
  );

  const loadBookings = useCallback(async (opts?: { preserveScroll?: boolean }) => {
    const preserveScroll = !!opts?.preserveScroll;
    const prevScrollY = preserveScroll && typeof window !== 'undefined' ? window.scrollY : null;
    setLoading(true);
    setLoadError(null);
    const dateKey = TODAY_KEY();
    try {
      if (navigator.onLine) {
        const res = await fetch('/api/sitter/today');
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const cached = await getTodayVisits(dateKey);
          if (cached && Array.isArray((cached as { bookings?: unknown[] }).bookings)) {
            setBookings(((cached as { bookings: unknown[] }).bookings || []).map((item) => normalizeTodayBooking(item) as TodayBooking));
            setLoadError(null);
          } else {
            setLoadError(data.error || 'Unable to load today\'s bookings');
            setBookings([]);
          }
          return;
        }
        const list = Array.isArray(data.bookings) ? data.bookings.map((item: unknown) => normalizeTodayBooking(item)) : [];
        setBookings(list);
        await saveTodayVisits(dateKey, { bookings: list });
      } else {
        const cached = await getTodayVisits(dateKey);
        if (cached && Array.isArray((cached as { bookings?: unknown[] }).bookings)) {
          setBookings(((cached as { bookings: unknown[] }).bookings || []).map((item) => normalizeTodayBooking(item) as TodayBooking));
        } else {
          setLoadError('Offline — no cached data. Connect to load.');
          setBookings([]);
        }
      }
    } catch {
      const cached = await getTodayVisits(dateKey);
      if (cached && Array.isArray((cached as { bookings?: unknown[] }).bookings)) {
        setBookings(((cached as { bookings: unknown[] }).bookings || []).map((item) => normalizeTodayBooking(item) as TodayBooking));
      } else {
        setLoadError('Unable to load today\'s bookings');
        setBookings([]);
      }
    } finally {
      setLoading(false);
      if (prevScrollY != null && typeof window !== 'undefined') {
        requestAnimationFrame(() => window.scrollTo(0, prevScrollY));
      }
    }
  }, []);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const sseUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/realtime/sitter/today` : null;
  const pageVisible = usePageVisible();
  useSSE(sseUrl, () => void loadBookings({ preserveScroll: true }), pageVisible);

  const getGeo = (): Promise<{ lat: number; lng: number } | null> =>
    new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    });

  const handleCheckIn = async (bookingId: string) => {
    setCheckingInId(bookingId);
    const orgId = user?.orgId || 'default';
    const sitterId = user?.sitterId || '';
    try {
      const geo = await getGeo();
      if (!geo && navigator.onLine) {
        toastWarning("Couldn't get location — continuing without it.");
      }
      const payload = geo ? { lat: geo.lat, lng: geo.lng } : {};
      if (!navigator.onLine) {
        await enqueueAction('visit.checkin', { orgId, sitterId, bookingId, payload });
        const nowIso = new Date().toISOString();
        setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: 'in_progress', checkedInAt: nowIso } : b)));
        toastSuccess('Queued — will sync when online');
        void refreshQueuedCount();
        return;
      }
      const res = await fetch(`/api/bookings/${bookingId}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toastError(data.error || 'Check in failed');
        setCheckingInId(null);
        return;
      }
      const nowIso = new Date().toISOString();
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: 'in_progress', checkedInAt: nowIso } : b)));
      toastSuccess('Checked in');
      void loadBookings();
    } catch {
      toastError('Check in failed');
      void loadBookings();
    } finally {
      setCheckingInId(null);
    }
  };

  const handleCheckOut = async (bookingId: string) => {
    setCheckingOutId(bookingId);
    const orgId = user?.orgId || 'default';
    const sitterId = user?.sitterId || '';
    try {
      const geo = await getGeo();
      if (!geo && navigator.onLine) {
        toastWarning("Couldn't get location — continuing without it.");
      }
      const payload = geo ? { lat: geo.lat, lng: geo.lng } : {};
      if (!navigator.onLine) {
        await enqueueAction('visit.checkout', { orgId, sitterId, bookingId, payload });
        const nowIso = new Date().toISOString();
        setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: 'completed', checkedOutAt: nowIso } : b)));
        toastSuccess('Queued — will sync when online');
        void refreshQueuedCount();
        return;
      }
      const res = await fetch(`/api/bookings/${bookingId}/check-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toastError(data.error || 'Check out failed');
        setCheckingOutId(null);
        return;
      }
      const nowIso = new Date().toISOString();
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: 'completed', checkedOutAt: nowIso } : b)));
      toastSuccess('Checked out');
      void loadBookings();
    } catch {
      toastError('Check out failed');
      void loadBookings();
    } finally {
      setCheckingOutId(null);
    }
  };

  const handleOpenChat = (booking: TodayBooking) => {
    const query = booking.threadId ? `?thread=${encodeURIComponent(booking.threadId)}` : '';
    router.push(`/sitter/inbox${query}`);
  };

  const toggleShowCancelled = () => {
    const next = !showCancelled;
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set('showCancelled', '1');
    else params.delete('showCancelled');
    router.replace(`/sitter/today${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const [routeUrl, setRouteUrl] = useState<string | null>(null);
  useEffect(() => {
    if (bookings.length > 0) {
      const today = new Date().toISOString().slice(0, 10);
      fetch(`/api/sitter/route?date=${today}`)
        .then((r) => r.json())
        .then((d) => setRouteUrl(d.googleMapsUrl || null))
        .catch(() => setRouteUrl(null));
    } else {
      setRouteUrl(null);
    }
  }, [bookings.length]);

  const sections = useMemo(() => groupTodayVisits(bookings, showCancelled), [bookings, showCancelled]);
  const nextUp = useMemo(() => pickNextUpVisit(bookings, showCancelled), [bookings, showCancelled]);

  return (
    <>
      <div className="mx-auto max-w-3xl pb-8">
        <div className="mb-6">
          <OnboardingChecklist />
        </div>
        <SitterPageHeader
          title="Today"
          subtitle={`${todayLabel} · You have ${bookings.length} ${bookings.length === 1 ? 'visit' : 'visits'}`}
          action={
            <div className="flex gap-2">
              {routeUrl && (
                <a
                  href={routeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <i className="fas fa-map-marker-alt mr-1.5" />
                  Open in Maps
                </a>
              )}
              <Button variant="secondary" size="sm" onClick={() => void loadBookings()} disabled={loading}>
                Refresh
              </Button>
            </div>
          }
        />
        {!loading && nextUp && (
          <>
            <NextVisitHero
              booking={nextUp}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
              onMessage={handleOpenChat}
              checkingInId={checkingInId}
              checkingOutId={checkingOutId}
              nowMs={nowMs}
            />
            <QuickInsightsStrip
              visitsRemaining={bookings.filter((b) => !['completed', 'cancelled'].includes(b.status)).length}
              totalVisits={bookings.length}
            />
          </>
        )}

        {loading ? (
          <SitterSkeletonList count={3} />
        ) : loadError ? (
          <SitterErrorState
            title="Couldn't load visits"
            subtitle={loadError}
            onRetry={() => void loadBookings()}
          />
        ) : bookings.length === 0 ? (
          <SitterCard>
            <SitterCardBody>
              <p className="text-base font-semibold text-neutral-900">No visits today</p>
              <p className="mt-1 text-sm text-neutral-500">You are all set for today.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="secondary" size="md" onClick={() => router.push('/sitter/calendar')}>
                  Open calendar
                </Button>
                <Button variant="secondary" size="md" onClick={() => router.push('/sitter/availability')}>
                  Update availability
                </Button>
              </div>
            </SitterCardBody>
          </SitterCard>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900">Today command center</h2>
              <button
                type="button"
                onClick={toggleShowCancelled}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700"
              >
                {showCancelled ? 'Hide cancelled' : 'Show cancelled'}
              </button>
            </div>

            {sections.inProgress.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-600">In progress</h3>
                  <span className="text-xs text-neutral-500">{sections.inProgress.length}</span>
                </div>
                {sections.inProgress.map((booking) => (
                  <VisitCard
                    key={booking.id}
                    booking={booking}
                    nowMs={nowMs}
                    checkingInId={checkingInId}
                    checkingOutId={checkingOutId}
                    onCheckIn={handleCheckIn}
                    onCheckOut={handleCheckOut}
                    onMessage={handleOpenChat}
                  />
                ))}
              </section>
            )}

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-600">Up next</h3>
                <span className="text-xs text-neutral-500">{sections.upNext.length}</span>
              </div>
              {sections.upNext.length === 0 ? (
                <SitterCard><SitterCardBody><p className="text-sm text-neutral-500">No upcoming visits in this section.</p></SitterCardBody></SitterCard>
              ) : (
                sections.upNext.map((booking) => (
                  <VisitCard
                    key={booking.id}
                    booking={booking}
                    nowMs={nowMs}
                    checkingInId={checkingInId}
                    checkingOutId={checkingOutId}
                    onCheckIn={handleCheckIn}
                    onCheckOut={handleCheckOut}
                    onMessage={handleOpenChat}
                  />
                ))
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-600">Later today</h3>
                <span className="text-xs text-neutral-500">{sections.laterToday.length}</span>
              </div>
              {sections.laterToday.map((booking) => (
                <VisitCard
                  key={booking.id}
                  booking={booking}
                  nowMs={nowMs}
                  checkingInId={checkingInId}
                  checkingOutId={checkingOutId}
                  onCheckIn={handleCheckIn}
                  onCheckOut={handleCheckOut}
                  onMessage={handleOpenChat}
                />
              ))}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-600">Completed today</h3>
                <span className="text-xs text-neutral-500">{sections.completed.length}</span>
              </div>
              {sections.completed.map((booking) => (
                <VisitCard
                  key={booking.id}
                  booking={booking}
                  nowMs={nowMs}
                  checkingInId={checkingInId}
                  checkingOutId={checkingOutId}
                  onCheckIn={handleCheckIn}
                  onCheckOut={handleCheckOut}
                  onMessage={handleOpenChat}
                />
              ))}
            </section>
          </div>
        )}
      </div>

    </>
  );
}
