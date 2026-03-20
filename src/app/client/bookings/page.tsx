'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutWrapper, ClientRefreshButton } from '@/components/layout';
import {
  AppSkeletonList,
  AppErrorState,
  AppStatusPill,
} from '@/components/app';
import { useClientBookings, type ClientBooking } from '@/lib/api/client-hooks';

const pageSize = 20;
type TabFilter = 'All' | 'Upcoming' | 'Past';

export default function ClientBookingsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [displayed, setDisplayed] = useState<ClientBooking[]>([]);
  const [activeTab, setActiveTab] = useState<TabFilter>('All');

  const { data, isLoading, isFetching, error, refetch } = useClientBookings(page, pageSize);

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

  const filtered = displayed.filter((b) => {
    if (activeTab === 'All') return true;
    const isPast = ['completed', 'cancelled', 'no_show'].includes(b.status.toLowerCase());
    return activeTab === 'Past' ? isPast : !isPast;
  });

  return (
    <LayoutWrapper variant="narrow">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary font-heading">Your visits</h1>
            <p className="text-sm text-text-secondary mt-1">Upcoming and past bookings</p>
          </div>
          <ClientRefreshButton onRefresh={handleRefresh} loading={loading} />
        </div>

        {loading ? (
          <AppSkeletonList count={3} />
        ) : error ? (
          <AppErrorState title="Couldn't load bookings" subtitle={error.message || 'Unable to load bookings'} onRetry={handleRefresh} />
        ) : displayed.length === 0 ? (
          <div className="rounded-2xl border border-border-default bg-white p-12 text-center">
            <div className="text-5xl mb-4">📅</div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">No visits yet</h2>
            <p className="text-sm text-text-secondary max-w-xs mx-auto mb-6">
              Book your first visit and your pet will thank you!
            </p>
            <Link href="/client/bookings/new">
              <button className="rounded-xl bg-[#c2410c] text-white font-semibold px-6 py-3 hover:bg-[#9a3412] transition-all">
                Book a visit
              </button>
            </Link>
          </div>
        ) : (
          <>
            {/* Filter tabs */}
            <div className="inline-flex rounded-lg bg-surface-secondary p-1 mb-6">
              {(['All', 'Upcoming', 'Past'] as TabFilter[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
                    activeTab === tab
                      ? 'bg-white shadow-sm text-text-primary'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Booking cards */}
            <div className="space-y-3">
              {filtered.map((booking) => (
                <Link key={booking.id} href={`/client/bookings/${booking.id}`}>
                  <div className="rounded-xl border border-border-default bg-white p-4 hover:shadow-[var(--shadow-md)] hover:border-border-strong transition-all duration-200 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-lg shrink-0">
                          🐾
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-text-primary">{booking.service}</p>
                          <p className="text-xs text-text-secondary tabular-nums">{formatDate(booking.startAt)} · {formatTime(booking.startAt)}</p>
                          {booking.sitter?.name && <p className="text-xs text-text-tertiary">with {booking.sitter.name}</p>}
                        </div>
                      </div>
                      <AppStatusPill status={booking.status} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {displayed.length < total && (
              <div className="flex justify-center mt-4">
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
          </>
        )}
      </div>
    </LayoutWrapper>
  );
}
