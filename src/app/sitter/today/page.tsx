'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, useToast } from '@/components/ui';
import {
  SitterCard,
  SitterCardHeader,
  SitterCardBody,
  SitterCardActions,
  SitterPageHeader,
  SitterSkeletonList,
  SitterEmptyState,
  SitterErrorState,
  DailyDelightModal,
} from '@/components/sitter';

type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'in_progress' | string;

type AlertType = 'allergy' | 'medication' | 'behavior' | 'new_pet';

interface TodayBooking {
  id: string;
  status: BookingStatus;
  service: string;
  startAt: string;
  endAt: string;
  address: string | null;
  clientName: string;
  pets: Array<{ id: string; name?: string | null; species?: string | null }>;
  threadId: string | null;
  /** Optional alert badges (stub - API may add later) */
  alerts?: AlertType[];
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

const ALERT_LABELS: Record<AlertType, string> = {
  allergy: 'Allergy',
  medication: 'Medication',
  behavior: 'Behavior',
  new_pet: 'New pet',
};

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
  onDelight,
  checkingInId,
  checkingOutId,
}: {
  booking: TodayBooking;
  onCheckIn: (id: string) => void;
  onCheckOut: (id: string) => void;
  onMessage: (b: TodayBooking) => void;
  onDelight: (b: TodayBooking) => void;
  checkingInId: string | null;
  checkingOutId: string | null;
}) {
  const router = useRouter();
  const countdown = useCountdown(
    ['pending', 'confirmed'].includes(booking.status) ? booking.startAt : null
  );
  const addressSnippet = booking.address
    ? booking.address.split(',')[0].trim().slice(0, 40) + (booking.address.length > 40 ? '…' : '')
    : null;

  return (
    <SitterCard className="mb-4 border-2 border-blue-200 bg-blue-50">
      <SitterCardHeader>
        <p className="text-xs font-medium uppercase tracking-wide text-blue-700">Next visit</p>
        {countdown && (
          <p className="mt-1 text-sm font-semibold text-blue-800">{countdown}</p>
        )}
        <div className="mt-2 flex items-center gap-2">
          {booking.pets.length > 0 ? (
            <div className="flex -space-x-2">
              {booking.pets.slice(0, 3).map((pet) => (
                <div
                  key={pet.id}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-white bg-amber-100 text-sm font-medium text-amber-800"
                  title={pet.name || pet.species || 'Pet'}
                >
                  {(pet.name || pet.species || '?').charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-neutral-200 text-sm font-medium text-neutral-600">
              ?
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-neutral-900">
              {booking.pets.map((p) => p.name || p.species || 'Pet').join(', ')}
            </p>
            <p className="text-sm text-neutral-600">{booking.service}</p>
            <p className="text-sm text-neutral-600">{formatTimeRange(booking.startAt, booking.endAt)}</p>
            {addressSnippet && (
              <p className="mt-0.5 truncate text-xs text-neutral-500" title={booking.address ?? undefined}>
                {addressSnippet}
              </p>
            )}
          </div>
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
            {checkingInId === booking.id ? 'Checking in...' : 'Start Visit'}
          </Button>
        )}
        {booking.status === 'in_progress' && (
          <Button
            variant="primary"
            size="md"
            onClick={() => void onCheckOut(booking.id)}
            disabled={checkingOutId === booking.id}
          >
            {checkingOutId === booking.id ? 'Checking out...' : 'Finish Visit'}
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={() => onMessage(booking)}>
          Message
        </Button>
        <Button variant="secondary" size="sm" onClick={() => onDelight(booking)}>
          ✨ Daily Delight
        </Button>
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
      <span className="text-sm text-amber-700">You&apos;re doing great 🐾</span>
    </div>
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

export default function SitterTodayPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [bookings, setBookings] = useState<TodayBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [checkingOutId, setCheckingOutId] = useState<string | null>(null);
  const [delightBooking, setDelightBooking] = useState<TodayBooking | null>(null);

  const todayLabel = useMemo(
    () => new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }),
    []
  );

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/sitter/today');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoadError(data.error || 'Unable to load today\'s bookings');
        setBookings([]);
        return;
      }
      setBookings(Array.isArray(data.bookings) ? data.bookings : []);
    } catch {
      setLoadError('Unable to load today\'s bookings');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

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
    try {
      const geo = await getGeo();
      if (!geo) {
        showToast({ message: "Couldn't get location — continuing without it.", variant: 'warning' });
      }
      const body = geo ? JSON.stringify({ lat: geo.lat, lng: geo.lng }) : undefined;
      const res = await fetch(`/api/bookings/${bookingId}/check-in`, {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast({ message: data.error || 'Check in failed', variant: 'error' });
        return;
      }
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: 'in_progress' } : b)));
      showToast({ message: 'Checked in successfully', variant: 'success' });
    } catch {
      showToast({ message: 'Check in failed', variant: 'error' });
    } finally {
      setCheckingInId(null);
    }
  };

  const handleCheckOut = async (bookingId: string) => {
    setCheckingOutId(bookingId);
    try {
      const geo = await getGeo();
      if (!geo) {
        showToast({ message: "Couldn't get location — continuing without it.", variant: 'warning' });
      }
      const body = geo ? JSON.stringify({ lat: geo.lat, lng: geo.lng }) : undefined;
      const res = await fetch(`/api/bookings/${bookingId}/check-out`, {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast({ message: data.error || 'Check out failed', variant: 'error' });
        return;
      }
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: 'completed' } : b)));
      showToast({ message: 'Checked out successfully', variant: 'success' });
    } catch {
      showToast({ message: 'Check out failed', variant: 'error' });
    } finally {
      setCheckingOutId(null);
    }
  };

  const handleOpenChat = (booking: TodayBooking) => {
    const query = booking.threadId ? `?thread=${encodeURIComponent(booking.threadId)}` : '';
    router.push(`/sitter/inbox${query}`);
  };

  const openDelightModal = (booking: TodayBooking) => {
    setDelightBooking(booking);
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

  return (
    <>
      <div className="mx-auto max-w-3xl pb-8">
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
        {!loading && bookings.length > 0 && (
          <>
            <NextVisitHero
              booking={bookings[0]}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
              onMessage={handleOpenChat}
              onDelight={openDelightModal}
              checkingInId={checkingInId}
              checkingOutId={checkingOutId}
            />
            <QuickInsightsStrip
              visitsRemaining={bookings.filter((b) => !['completed', 'cancelled'].includes(b.status)).length}
              totalVisits={bookings.length}
            />
          </>
        )}

        {!loading && bookings.length > 0 && (
          <h2 className="mb-4 mt-6 text-lg font-semibold text-neutral-900">Today's bookings</h2>
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
          <SitterEmptyState
            title="No visits today"
            subtitle="Enjoy the quiet—check Calendar for upcoming."
            cta={{ label: 'Open Calendar', onClick: () => router.push('/sitter/calendar') }}
          />
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <SitterCard key={booking.id} onClick={() => router.push(`/sitter/bookings/${booking.id}`)}>
                <SitterCardHeader>
                  {(booking.alerts ?? []).length > 0 && (
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      {(booking.alerts ?? []).map((a) => (
                        <span
                          key={a}
                          className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800"
                        >
                          {ALERT_LABELS[a]}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      {booking.pets.length > 0 ? (
                        <div className="flex -space-x-2">
                          {booking.pets.slice(0, 3).map((pet) => (
                            <div
                              key={pet.id}
                              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-2 border-white bg-amber-100 text-xs font-medium text-amber-800"
                              title={pet.name || pet.species || 'Pet'}
                            >
                              {(pet.name || pet.species || '?').charAt(0).toUpperCase()}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-medium text-neutral-600">
                          ?
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-neutral-900">{booking.clientName}</p>
                        <p className="text-sm text-neutral-600">{booking.service}</p>
                        {booking.pets.length > 0 && (
                          <p className="mt-0.5 truncate text-xs text-neutral-500">
                            {booking.pets.map((p) => p.name || p.species || 'Pet').join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(booking.status)}`}>
                      {statusPillLabel(booking.status)}
                    </span>
                  </div>
                </SitterCardHeader>
                <SitterCardBody>
                  <p>{formatTimeRange(booking.startAt, booking.endAt)}</p>
                  {booking.address ? (
                    <p className="mt-1 truncate text-neutral-600" title={booking.address}>{booking.address}</p>
                  ) : null}
                </SitterCardBody>
                <SitterCardActions stopPropagation>
                  {['pending', 'confirmed'].includes(booking.status) && (
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => void handleCheckIn(booking.id)}
                      disabled={checkingInId === booking.id}
                    >
                      {checkingInId === booking.id ? 'Checking in...' : 'Check in'}
                    </Button>
                  )}
                  {booking.status === 'in_progress' && (
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => void handleCheckOut(booking.id)}
                      disabled={checkingOutId === booking.id}
                    >
                      {checkingOutId === booking.id ? 'Checking out...' : 'Check out'}
                    </Button>
                  )}
                  <Button variant="secondary" size="md" onClick={() => router.push(`/sitter/bookings/${booking.id}`)}>
                    View details
                  </Button>
                  <Button variant="secondary" size="md" onClick={() => handleOpenChat(booking)}>
                    Open chat
                  </Button>
                  <Button variant="secondary" size="md" onClick={() => openDelightModal(booking)}>
                    ✨ Daily Delight
                  </Button>
                </SitterCardActions>
              </SitterCard>
            ))}
          </div>
        )}
      </div>

      <DailyDelightModal
        isOpen={!!delightBooking}
        booking={delightBooking}
        onClose={() => setDelightBooking(null)}
      />
    </>
  );
}
