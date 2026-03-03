'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AppPageHeader,
  AppSkeletonList,
  AppEmptyState,
  AppErrorState,
  AppStatusPill,
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
            className="text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50"
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
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          {bookings.map((b) => (
            <div
              key={b.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/client/bookings/${b.id}`)}
              onKeyDown={(e) => e.key === 'Enter' && router.push(`/client/bookings/${b.id}`)}
              className="flex cursor-pointer flex-col border-b border-slate-200 px-4 py-3 last:border-b-0 hover:bg-slate-50"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-900">{b.service}</p>
                <AppStatusPill status={b.status} />
              </div>
              <p className="mt-0.5 text-sm text-slate-500">
                {formatDate(b.startAt)} · {formatTime(b.startAt)} – {formatTime(b.endAt)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
