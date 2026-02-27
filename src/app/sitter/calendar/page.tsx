'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Drawer } from '@/components/ui';
import {
  SitterCard,
  SitterCardHeader,
  SitterCardBody,
  SitterCardActions,
  SitterPageHeader,
  SitterSkeletonList,
  SitterEmptyState,
  SitterErrorState,
  FeatureStatusPill,
  DailyDelightModal,
} from '@/components/sitter';

type ViewMode = 'week' | 'list';

type BookingStatus = string;

type AlertType = 'allergy' | 'medication' | 'behavior' | 'new_pet';

interface CalendarBooking {
  id: string;
  status: BookingStatus;
  service: string;
  startAt: string;
  endAt: string;
  address: string | null;
  clientName: string;
  pets: Array<{ id: string; name?: string | null; species?: string | null }>;
  threadId: string | null;
  alerts?: AlertType[];
}

const statusBadgeClass = (status: string) => {
  switch (status) {
    case 'confirmed':
      return 'bg-blue-100 text-blue-800';
    case 'pending':
      return 'bg-amber-100 text-amber-800';
    case 'in_progress':
      return 'bg-purple-100 text-purple-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-neutral-100 text-neutral-700';
  }
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
    default:
      return status.replace('_', ' ');
  }
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
const formatTime = (d: string) =>
  new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const formatDateTime = (d: string) =>
  new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function SitterCalendarPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<CalendarBooking | null>(null);
  const [delightBooking, setDelightBooking] = useState<CalendarBooking | null>(null);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [checkingOutId, setCheckingOutId] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sitter/calendar');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Unable to load calendar');
        setBookings([]);
        return;
      }
      setBookings(Array.isArray(data.bookings) ? data.bookings : []);
    } catch {
      setError('Unable to load calendar');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  const handleViewBooking = (id: string) => {
    router.push(`/sitter/bookings/${id}`);
  };

  const handleOpenChat = (booking: CalendarBooking) => {
    const query = booking.threadId ? `?thread=${encodeURIComponent(booking.threadId)}` : '';
    router.push(`/sitter/inbox${query}`);
  };

  const handleCheckIn = async (bookingId: string) => {
    setCheckingInId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/check-in`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Check in failed');
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: 'in_progress' } : b)));
      setSelectedBooking((b) => (b?.id === bookingId ? { ...b, status: 'in_progress' } : b));
    } catch {
      // Fail-soft: could show toast
    } finally {
      setCheckingInId(null);
    }
  };

  const handleCheckOut = async (bookingId: string) => {
    setCheckingOutId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/check-out`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Check out failed');
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: 'completed' } : b)));
      setSelectedBooking(null);
    } catch {
      // Fail-soft
    } finally {
      setCheckingOutId(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl pb-8">
      <SitterPageHeader
        title="Calendar"
        subtitle="Upcoming bookings"
        action={
          <Button variant="secondary" size="sm" onClick={() => void loadBookings()} disabled={loading}>
            Refresh
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-xl border border-neutral-200 p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('week')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${viewMode === 'week' ? 'bg-neutral-200 text-neutral-900' : 'text-neutral-600 hover:text-neutral-900'}`}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${viewMode === 'list' ? 'bg-neutral-200 text-neutral-900' : 'text-neutral-600 hover:text-neutral-900'}`}
          >
            List
          </button>
        </div>
      </div>

      <SitterCard className="mb-4 border-dashed">
        <SitterCardBody>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-neutral-700">Soon: the best route for your day 🚗🐾</p>
            <FeatureStatusPill featureKey="route_optimization" />
          </div>
          <p className="mt-1 text-xs text-neutral-500">We&apos;ll optimize based on timing + pet needs.</p>
        </SitterCardBody>
      </SitterCard>

      {loading ? (
        <SitterSkeletonList count={3} />
      ) : error ? (
        <SitterErrorState
          title="Couldn't load calendar"
          subtitle={error}
          onRetry={() => void loadBookings()}
        />
      ) : bookings.length === 0 ? (
        <SitterEmptyState
          title="No upcoming bookings"
          subtitle="Check back when you have visits scheduled."
        />
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <SitterCard key={b.id} onClick={() => setSelectedBooking(b)}>
              <SitterCardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-neutral-900">{b.clientName}</p>
                    <p className="text-sm text-neutral-600">{b.service}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(b.status)}`}>
                    {statusPillLabel(b.status)}
                  </span>
                </div>
              </SitterCardHeader>
              <SitterCardBody>
                <p>
                  {formatDate(b.startAt)} · {formatTime(b.startAt)} – {formatTime(b.endAt)}
                </p>
                {b.address && <p className="mt-1 text-neutral-600">{b.address}</p>}
                {b.pets.length > 0 && (
                  <p className="mt-1 text-neutral-600">
                    {b.pets.map((p) => (p.name ? `${p.name}${p.species ? ` (${p.species})` : ''}` : p.species || 'Pet')).join(', ')}
                  </p>
                )}
              </SitterCardBody>
              <SitterCardActions stopPropagation>
                <Button variant="primary" size="md" onClick={() => handleViewBooking(b.id)}>
                  Details
                </Button>
                <Button variant="secondary" size="md" onClick={() => handleOpenChat(b)}>
                  Message
                </Button>
              </SitterCardActions>
            </SitterCard>
          ))}
        </div>
      )}

      {/* Visit detail drawer */}
      <Drawer
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title={selectedBooking ? `${selectedBooking.service} · ${selectedBooking.clientName}` : ''}
        placement="right"
        width="min(400px, 100vw)"
      >
        {selectedBooking && (
          <div className="space-y-4">
            {(selectedBooking.alerts ?? []).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedBooking.alerts!.map((a) => (
                  <span key={a} className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                    {a === 'allergy' ? 'Allergy' : a === 'medication' ? 'Medication' : a === 'behavior' ? 'Behavior' : 'New pet'}
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              {selectedBooking.pets.length > 0 ? (
                <div className="flex -space-x-2">
                  {selectedBooking.pets.slice(0, 3).map((pet) => (
                    <div
                      key={pet.id}
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-white bg-amber-100 text-sm font-medium text-amber-800"
                    >
                      {(pet.name || pet.species || '?').charAt(0).toUpperCase()}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200 text-sm font-medium text-neutral-600">?</div>
              )}
              <div>
                <p className="font-semibold text-neutral-900">
                  {selectedBooking.pets.map((p) => p.name || p.species || 'Pet').join(', ')}
                </p>
                <p className="text-sm text-neutral-600">
                  {formatDateTime(selectedBooking.startAt)} – {formatTime(selectedBooking.endAt)}
                </p>
                {selectedBooking.address && (
                  <p className="mt-0.5 text-xs text-neutral-500">{selectedBooking.address}</p>
                )}
              </div>
            </div>

            <SitterCard className="border-dashed">
              <SitterCardBody>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-neutral-700">Soon: the best route for your day 🚗🐾</p>
                  <FeatureStatusPill featureKey="route_optimization" />
                </div>
                <p className="mt-1 text-xs text-neutral-500">We&apos;ll optimize based on timing + pet needs.</p>
              </SitterCardBody>
            </SitterCard>

            <div className="flex flex-wrap gap-2">
              {['pending', 'confirmed'].includes(selectedBooking.status) && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => void handleCheckIn(selectedBooking.id)}
                  disabled={checkingInId === selectedBooking.id}
                >
                  {checkingInId === selectedBooking.id ? 'Checking in...' : 'Start Visit'}
                </Button>
              )}
              {selectedBooking.status === 'in_progress' && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => void handleCheckOut(selectedBooking.id)}
                  disabled={checkingOutId === selectedBooking.id}
                >
                  {checkingOutId === selectedBooking.id ? 'Checking out...' : 'Finish Visit'}
                </Button>
              )}
              <Button variant="secondary" size="md" onClick={() => handleOpenChat(selectedBooking)}>
                Message
              </Button>
              <Button variant="secondary" size="md" onClick={() => { setDelightBooking(selectedBooking); setSelectedBooking(null); }}>
                ✨ Daily Delight
              </Button>
              <Button variant="secondary" size="md" onClick={() => handleViewBooking(selectedBooking.id)}>
                Details
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      <DailyDelightModal
        booking={delightBooking}
        isOpen={!!delightBooking}
        onClose={() => setDelightBooking(null)}
      />
    </div>
  );
}
