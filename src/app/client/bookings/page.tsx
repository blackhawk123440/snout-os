'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutWrapper, ClientRefreshButton } from '@/components/layout';
import { ClientAtAGlanceSidebar } from '@/components/client/ClientAtAGlanceSidebar';
import { ClientListSecondaryModule } from '@/components/client/ClientListSecondaryModule';
import {
  AppPageHeader,
  AppSkeletonList,
  AppEmptyState,
  AppErrorState,
  AppStatusPill,
} from '@/components/app';
import { InteractiveRow } from '@/components/ui/interactive-row';

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
    <LayoutWrapper variant="narrow">
      <AppPageHeader
        title="Bookings"
        subtitle="Your visits"
        action={<ClientRefreshButton onRefresh={load} loading={loading} />}
      />
      <div className="lg:grid lg:grid-cols-[1fr,auto] lg:gap-6">
        <div className="min-w-0">
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
            <div className="max-w-3xl space-y-4">
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                {bookings.map((b) => (
                  <InteractiveRow
                    key={b.id}
                    onClick={() => router.push(`/client/bookings/${b.id}`)}
                    className="last:border-b-0"
                  >
                    <div className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-0.5 sm:grid-cols-[1fr,auto,auto]">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{b.service}</p>
                        <p className="text-sm text-slate-600 sm:sr-only">
                          {formatDate(b.startAt)} · {formatTime(b.startAt)} – {formatTime(b.endAt)}
                        </p>
                      </div>
                      <div className="min-w-0 text-sm text-slate-600 max-sm:order-3">
                        {formatDate(b.startAt)} · {formatTime(b.startAt)} – {formatTime(b.endAt)}
                      </div>
                      <div className="shrink-0 max-sm:order-2">
                        <AppStatusPill status={b.status} />
                      </div>
                    </div>
                  </InteractiveRow>
                ))}
              </div>
              <ClientListSecondaryModule variant="bookings" />
            </div>
          )}
        </div>
        <ClientAtAGlanceSidebar />
      </div>
    </LayoutWrapper>
  );
}
