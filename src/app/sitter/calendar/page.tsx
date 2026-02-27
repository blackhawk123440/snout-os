'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, Button } from '@/components/ui';
import { FeatureStatusPill } from '@/components/sitter/FeatureStatusPill';

type ViewMode = 'week' | 'list';

type BookingStatus = string;

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
}

const statusBadgeClass = (status: string) => {
  switch (status) {
    case 'confirmed':
      return 'bg-blue-100 text-blue-800';
    case 'pending':
      return 'bg-amber-100 text-amber-800';
    case 'in_progress':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
const formatTime = (d: string) =>
  new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export default function SitterCalendarPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <>
      <PageHeader title="Calendar" description="Upcoming bookings" />
      <div className="mx-auto max-w-3xl px-4 pb-8 pt-2">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex rounded-lg border border-neutral-200 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${viewMode === 'week' ? 'bg-neutral-200 text-neutral-900' : 'text-neutral-600 hover:text-neutral-900'}`}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${viewMode === 'list' ? 'bg-neutral-200 text-neutral-900' : 'text-neutral-600 hover:text-neutral-900'}`}
            >
              List
            </button>
          </div>
          <Button variant="secondary" size="sm" onClick={() => void loadBookings()} disabled={loading}>
            Refresh
          </Button>
        </div>

        <div className="mb-4 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-neutral-700">Optimized route + timing</p>
            <FeatureStatusPill featureKey="route_optimization" />
          </div>
          <p className="mt-1 text-xs text-neutral-500">Route optimization will suggest the best order for your visits.</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-2 h-4 w-1/2 rounded bg-gray-200" />
                <div className="mb-2 h-3 w-1/3 rounded bg-gray-100" />
                <div className="h-9 w-full rounded bg-gray-100" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="text-sm text-gray-600">{error}</p>
            <Button variant="secondary" size="md" className="mt-4" onClick={() => void loadBookings()}>
              Try again
            </Button>
          </div>
        ) : bookings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="text-sm text-gray-600">No upcoming bookings.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => (
              <article
                key={b.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{b.clientName}</p>
                    <p className="text-sm text-gray-600">{b.service}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(b.status)}`}
                  >
                    {b.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="mb-3 space-y-1 text-sm text-gray-700">
                  <p>
                    {formatDate(b.startAt)} · {formatTime(b.startAt)} – {formatTime(b.endAt)}
                  </p>
                  {b.address && <p className="text-gray-600">{b.address}</p>}
                  {b.pets.length > 0 && (
                    <p className="text-gray-600">
                      Pets:{' '}
                      {b.pets
                        .map((p) =>
                          p.name ? `${p.name}${p.species ? ` (${p.species})` : ''}` : p.species || 'Pet'
                        )
                        .join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" size="md" onClick={() => handleViewBooking(b.id)}>
                    View details
                  </Button>
                  <Button variant="secondary" size="md" onClick={() => handleOpenChat(b)}>
                    Open chat
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
