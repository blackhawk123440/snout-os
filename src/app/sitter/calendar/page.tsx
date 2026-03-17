'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
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
      return 'bg-surface-tertiary text-text-secondary';
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

  // Detect scheduling conflicts (overlapping bookings)
  const conflictIds = useMemo(() => {
    const ids = new Set<string>();
    const active = bookings.filter((b) => !['cancelled', 'completed'].includes(b.status));
    const sorted = [...active].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    for (let i = 0; i < sorted.length - 1; i++) {
      if (new Date(sorted[i].endAt).getTime() > new Date(sorted[i + 1].startAt).getTime()) {
        ids.add(sorted[i].id);
        ids.add(sorted[i + 1].id);
      }
    }
    return ids;
  }, [bookings]);

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
        <div className="flex rounded-xl border border-border-default p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('week')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${viewMode === 'week' ? 'bg-surface-tertiary text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${viewMode === 'list' ? 'bg-surface-tertiary text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
          >
            List
          </button>
        </div>
      </div>

      <SitterCard className="mb-4 border-dashed">
        <SitterCardBody>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-text-secondary">Soon: the best route for your day 🚗🐾</p>
            <FeatureStatusPill featureKey="route_optimization" />
          </div>
          <p className="mt-1 text-xs text-text-tertiary">We&apos;ll optimize based on timing + pet needs.</p>
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
            <SitterCard key={b.id} onClick={() => handleViewBooking(b.id)} className={conflictIds.has(b.id) ? 'border-red-300' : ''}>
              <SitterCardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-text-primary">{b.clientName}</p>
                    <p className="text-sm text-text-secondary">{b.service}</p>
                    {conflictIds.has(b.id) && (
                      <p className="text-xs font-medium text-red-600 mt-0.5">{'\u26a0\ufe0f'} Schedule conflict</p>
                    )}
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
                {b.address && <p className="mt-1 text-text-secondary">{b.address}</p>}
                {b.pets.length > 0 && (
                  <p className="mt-1 text-text-secondary">
                    {b.pets.map((p) => (p.name ? `${p.name}${p.species ? ` (${p.species})` : ''}` : p.species || 'Pet')).join(', ')}
                  </p>
                )}
              </SitterCardBody>
              <SitterCardActions stopPropagation>
                <Button variant="secondary" size="md" onClick={(e) => { e.stopPropagation(); handleOpenChat(b); }}>
                  Message
                </Button>
              </SitterCardActions>
            </SitterCard>
          ))}
        </div>
      )}

      <DailyDelightModal
        booking={delightBooking}
        isOpen={!!delightBooking}
        onClose={() => setDelightBooking(null)}
      />
    </div>
  );
}
