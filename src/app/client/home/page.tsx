'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutWrapper, PageHeader, ClientRefreshButton } from '@/components/layout';
import {
  AppCard,
  AppCardBody,
  AppErrorState,
  AppStatusPill,
} from '@/components/app';
import { EmptyState, PageSkeleton } from '@/components/ui';
import { renderClientPreview } from '@/lib/strip-emojis';

interface HomeData {
  clientName: string;
  upcomingCount: number;
  recentBookings: Array<{
    id: string;
    service: string;
    startAt: string;
    status: string;
  }>;
  latestReport?: {
    id: string;
    content: string;
    createdAt: string;
    service?: string;
  } | null;
}

export default function ClientHomePage() {
  const router = useRouter();
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/client/home');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Unable to load');
        setData(null);
        return;
      }
      setData(json);
    } catch {
      setError('Unable to load');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Poll reports every 45s for real-time feed
  useEffect(() => {
    const interval = setInterval(load, 45000);
    return () => clearInterval(interval);
  }, [load]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <LayoutWrapper variant="narrow">
      <PageHeader
        title="Home"
        subtitle="Your pet care hub"
        actions={<ClientRefreshButton onRefresh={load} loading={loading} />}
      />
      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <AppErrorState title="Couldn't load" subtitle={error} onRetry={() => void load()} />
      ) : data ? (
        <div className="flex w-full flex-col gap-4">
          {/* App-style feed: Next visit → Latest report → Upcoming & recent */}
          <AppCard className="shadow-sm w-full">
              <AppCardBody className="flex flex-col gap-3 pb-4">
                <p className="text-sm font-semibold text-slate-900">Next visit</p>
                {data.upcomingCount > 0 ? (
                  <>
                    <p className="text-base font-medium text-slate-900">
                      {data.upcomingCount} upcoming visit{data.upcomingCount !== 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-slate-600">Hi, {data.clientName?.split(' ')[0] || 'there'}</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-slate-900">No upcoming visits</p>
                    <p className="text-sm text-slate-600">Book your next visit anytime.</p>
                  </>
                )}
                <Link
                  href="/bookings/new"
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                >
                  Book a visit
                </Link>
              </AppCardBody>
            </AppCard>

          {data.latestReport ? (
            <AppCard className="w-full" onClick={() => router.push(`/client/reports/${data.latestReport!.id}`)}>
              <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2 lg:px-0 lg:pt-0">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Latest report</p>
                  <p className="mt-0.5 font-semibold text-slate-900">{data.latestReport.service || 'Update'}</p>
                </div>
                <Link
                  href="/client/reports"
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 text-sm text-slate-600 hover:text-slate-900 hover:underline"
                >
                  All reports
                </Link>
              </div>
              <AppCardBody className="relative">
                <p className="line-clamp-2 text-sm text-slate-700">
                  {renderClientPreview(data.latestReport.content)}
                </p>
                <p className="mt-2 text-right text-xs text-slate-500 tabular-nums">
                  {new Date(data.latestReport.createdAt).toLocaleDateString()}
                </p>
              </AppCardBody>
            </AppCard>
          ) : (
            <div className="w-full rounded-xl border border-dashed border-slate-200 bg-white px-6 py-8 lg:rounded-lg">
              <p className="text-center text-sm font-semibold text-slate-900">No visit reports yet</p>
              <p className="mt-1 text-center text-sm text-slate-600">After each visit, your sitter will share an update here.</p>
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => router.push('/client/bookings')}
                  className="min-h-[44px] rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  View bookings
                </button>
              </div>
            </div>
          )}

          {data.recentBookings?.length > 0 ? (
            <section className="w-full" aria-label="Upcoming and recent visits">
              <h2 className="mb-2 text-sm font-semibold tracking-tight text-slate-900">Upcoming & recent</h2>
              <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white lg:rounded-lg">
                {data.recentBookings.map((b) => (
                  <div
                    key={b.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`View booking ${b.service}`}
                    onClick={() => router.push(`/client/bookings/${b.id}`)}
                    onKeyDown={(e) => e.key === 'Enter' && router.push(`/client/bookings/${b.id}`)}
                    className="flex min-h-[56px] cursor-pointer items-center gap-3 border-b border-slate-200 px-4 py-1.5 last:border-b-0 hover:bg-slate-50 active:bg-slate-100 lg:min-h-[44px]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{b.service}</p>
                      <p className="truncate text-xs text-slate-500 tabular-nums">{formatDate(b.startAt)}</p>
                    </div>
                    <div className="flex shrink-0">
                      <AppStatusPill status={b.status} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <div className="w-full">
              <EmptyState
                title="No upcoming visits"
                description="Book your next visit anytime."
                primaryAction={{ label: 'Book a visit', onClick: () => router.push('/bookings/new') }}
              />
            </div>
          )}
        </div>
      ) : null}
    </LayoutWrapper>
  );
}
