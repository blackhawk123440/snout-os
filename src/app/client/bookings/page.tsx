'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AppCard,
  AppCardHeader,
  AppCardBody,
  AppPageHeader,
  AppSkeletonList,
  AppEmptyState,
  AppErrorState,
} from '@/components/app';

interface Booking {
  id: string;
  service: string;
  startAt: string;
  endAt: string;
  status: string;
}

export default function ClientBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/client/bookings');
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
    <div className="mx-auto max-w-3xl pb-8">
      <AppPageHeader
        title="Bookings"
        subtitle="Your visits"
        action={
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            Refresh
          </button>
        }
      />
      {loading ? (
        <AppSkeletonList count={3} />
      ) : error ? (
        <AppErrorState title="Couldn't load bookings" subtitle={error} onRetry={() => void load()} />
      ) : bookings.length === 0 ? (
        <AppEmptyState
          title="No bookings yet"
          subtitle="Your visits will appear here."
        />
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <AppCard key={b.id} onClick={() => router.push(`/client/bookings/${b.id}`)}>
              <AppCardHeader>
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-neutral-900">{b.service}</p>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
                    {b.status}
                  </span>
                </div>
              </AppCardHeader>
              <AppCardBody>
                <p className="text-sm text-neutral-600">
                  {formatDate(b.startAt)} · {formatTime(b.startAt)} – {formatTime(b.endAt)}
                </p>
              </AppCardBody>
            </AppCard>
          ))}
        </div>
      )}
    </div>
  );
}
