'use client';

import { useEffect, useState } from 'react';
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
import { useClientBookings, type ClientBooking } from '@/lib/api/client-hooks';

const pageSize = 20;

export default function ClientBookingsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [displayed, setDisplayed] = useState<ClientBooking[]>([]);

  const { data, isLoading, isFetching, error, refetch } = useClientBookings(page, pageSize);

  // Sync fetched data into accumulated displayed list
  useEffect(() => {
    if (!data) return;
    if (page === 1) {
      setDisplayed(data.items);
    } else {
      setDisplayed((prev) => {
        const existingIds = new Set(prev.map((b) => b.id));
        const newItems = data.items.filter((b) => !existingIds.has(b.id));
        return [...prev, ...newItems];
      });
    }
  }, [data, page]);

  const total = data?.total ?? 0;
  const loading = isLoading && page === 1;
  const loadingMore = isFetching && page > 1;

  const handleRefresh = () => {
    setPage(1);
    refetch();
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return (
    <LayoutWrapper variant="narrow">
      <AppPageHeader
        title="Bookings"
        subtitle="Your visits"
        action={<ClientRefreshButton onRefresh={handleRefresh} loading={loading} />}
      />
      <div className="lg:grid lg:grid-cols-[1fr,auto] lg:gap-6">
        <div className="min-w-0">
          {loading ? (
            <AppSkeletonList count={3} />
          ) : error ? (
            <AppErrorState title="Couldn't load bookings" subtitle={error.message || 'Unable to load bookings'} onRetry={handleRefresh} />
          ) : displayed.length === 0 ? (
            <AppEmptyState
              title="No upcoming visits"
              subtitle="Book your next visit anytime."
              cta={{ label: 'Book a visit', onClick: () => router.push('/client/bookings/new') }}
            />
          ) : (
            <div className="w-full space-y-3 lg:max-w-3xl">
              <div className="overflow-hidden rounded-xl border border-border-default bg-surface-primary lg:rounded-lg">
                {displayed.map((b) => (
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
              {displayed.length < total && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    className="min-h-[44px] rounded-lg border border-border-default px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary"
                    onClick={() => setPage((p) => p + 1)}
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
