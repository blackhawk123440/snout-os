'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutWrapper, ClientRefreshButton } from '@/components/layout';
import { ClientAtAGlanceSidebarLazy } from '@/components/client/ClientAtAGlanceSidebarLazy';
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
              title="No upcoming visits"
              subtitle="Book your next visit anytime."
              cta={{ label: 'Book a visit', onClick: () => router.push('/bookings/new') }}
            />
          ) : (
            <div className="w-full space-y-3 lg:max-w-3xl">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white lg:rounded-lg">
                {bookings.map((b) => (
                  <InteractiveRow
                    key={b.id}
                    onClick={() => router.push(`/client/bookings/${b.id}`)}
                    className="last:border-b-0"
                    aria-label={`View booking ${b.service}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{b.service}</p>
                      <p className="truncate text-xs text-slate-500 tabular-nums">
                        {formatDate(b.startAt)} · {formatTime(b.startAt)} – {formatTime(b.endAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <AppStatusPill status={b.status} />
                      <span className="hidden text-sm text-slate-700 tabular-nums sm:inline">
                        {formatDate(b.startAt)}
                      </span>
                    </div>
                  </InteractiveRow>
                ))}
              </div>
              <ClientListSecondaryModule variant="bookings" />
            </div>
          )}
        </div>
        <ClientAtAGlanceSidebarLazy />
      </div>
    </LayoutWrapper>
  );
}
