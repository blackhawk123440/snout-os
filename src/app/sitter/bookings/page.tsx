'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  SitterPageHeader,
  SitterSkeletonList,
  SitterEmptyState,
  SitterErrorState,
} from '@/components/sitter';
import { InteractiveRow } from '@/components/ui/interactive-row';

interface Booking {
  id: string;
  status: string;
  service: string;
  startAt: string;
  endAt: string;
  address: string | null;
  clientName: string;
  pets: Array<{ id: string; name?: string | null; species?: string | null }>;
}

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

export default function SitterBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sitter/bookings');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Unable to load bookings');
        setBookings([]);
        return;
      }
      setBookings(Array.isArray(json.bookings) ? json.bookings : []);
    } catch {
      setError('Unable to load bookings');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="mx-auto w-full max-w-3xl pb-6">
      <SitterPageHeader
        title="Bookings"
        subtitle="Your visits"
        action={
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
          >
            Refresh
          </button>
        }
      />
      {loading ? (
        <SitterSkeletonList count={5} />
      ) : error ? (
        <SitterErrorState title="Couldn't load bookings" subtitle={error} onRetry={() => void load()} />
      ) : bookings.length === 0 ? (
        <SitterEmptyState
          title="No bookings yet"
          subtitle="Your assigned visits will appear here."
          cta={{ label: 'Today', onClick: () => router.push('/sitter/today') }}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {bookings.map((b) => (
            <InteractiveRow
              key={b.id}
              onClick={() => router.push(`/sitter/bookings/${b.id}`)}
              className="last:border-b-0"
              aria-label={`View booking ${b.service} for ${b.clientName}`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-900">{b.service}</p>
                <p className="truncate text-xs text-neutral-500 tabular-nums">
                  {formatDate(b.startAt)} · {formatTime(b.startAt)}
                </p>
                <p className="truncate text-xs text-neutral-600">{b.clientName}</p>
              </div>
              <div className="flex shrink-0">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(b.status)}`}
                >
                  {b.status.replace('_', ' ')}
                </span>
              </div>
            </InteractiveRow>
          ))}
        </div>
      )}
    </div>
  );
}
