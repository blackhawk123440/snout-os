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
  sitter: { id: string; name: string } | null;
}

export default function ClientBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [total, setTotal] = useState(0);

  const load = useCallback(async (targetPage = 1, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await fetch(`/api/client/bookings?page=${targetPage}&pageSize=${pageSize}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Unable to load bookings');
        if (!append) setBookings([]);
        return;
      }
      const items = Array.isArray(json.items) ? json.items : [];
      setBookings((prev) => (append ? [...prev, ...items] : items));
      setPage(targetPage);
      setTotal(typeof json.total === 'number' ? json.total : 0);
    } catch {
      setError('Unable to load bookings');
      if (!append) setBookings([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [pageSize]);

  useEffect(() => {
    void load(1, false);
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
        action={<ClientRefreshButton onRefresh={() => load(1, false)} loading={loading} />}
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
              cta={{ label: 'Book a visit', onClick: () => router.push('/client/bookings/new') }}
            />
          ) : (
            <div className="w-full space-y-3 lg:max-w-3xl">
              <div className="overflow-hidden rounded-xl border border-border-default bg-surface-primary lg:rounded-lg">
                {bookings.map((b) => (
                  <InteractiveRow
                    key={b.id}
                    onClick={() => router.push(`/client/bookings/${b.id}`)}
                    className="last:border-b-0"
                    aria-label={`View booking ${b.service}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-primary">{b.service}</p>
                      <p className="truncate text-xs text-text-tertiary tabular-nums">
                        {formatDate(b.startAt)} · {formatTime(b.startAt)}
                      </p>
                      {b.sitter?.name ? (
                        <p className="truncate text-xs text-text-secondary">with {b.sitter.name}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <AppStatusPill status={b.status} />
                      <span className="hidden text-sm text-text-secondary tabular-nums sm:inline">
                        {formatDate(b.startAt)}
                      </span>
                    </div>
                  </InteractiveRow>
                ))}
              </div>
              {bookings.length < total && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    className="min-h-[44px] rounded-lg border border-border-default px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary"
                    onClick={() => load(page + 1, true)}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}
              <ClientListSecondaryModule variant="bookings" />
            </div>
          )}
        </div>
        <ClientAtAGlanceSidebarLazy />
      </div>
    </LayoutWrapper>
  );
}
