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
        <div className="flex flex-col gap-3">
          {/* Dashboard row: Next visit (left) + Latest report (right) */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
            <AppCard className="shadow-sm">
              <AppCardBody className="flex flex-col gap-2 pb-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Next visit</p>
                <p className="text-xl font-semibold tabular-nums text-slate-900">
                  {data.upcomingCount} upcoming visit{data.upcomingCount !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-slate-600">Hi, {data.clientName?.split(' ')[0] || 'there'}</p>
                <Link
                  href="/bookings/new"
                  className="inline-flex h-8 items-center rounded-md bg-slate-900 px-3 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                >
                  Book a visit
                </Link>
              </AppCardBody>
            </AppCard>

            {data.latestReport ? (
              <AppCard onClick={() => router.push(`/client/reports/${data.latestReport!.id}`)}>
                <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2">
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
            ) : data.recentBookings?.length > 0 ? (
              <EmptyState
                title="No visit reports yet"
                description="Your sitter will send updates after each visit."
                primaryAction={{ label: 'View bookings', onClick: () => router.push('/client/bookings') }}
              />
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-4">
                <p className="text-sm text-slate-600">No reports yet. Updates will appear here after visits.</p>
              </div>
            )}
          </div>

          {/* Dense list: Upcoming & recent */}
          {data.recentBookings?.length > 0 ? (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <h2 className="mb-2 text-base font-semibold tracking-tight text-slate-900">Upcoming & recent</h2>
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                {data.recentBookings.map((b) => (
                  <div
                    key={b.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/client/bookings/${b.id}`)}
                    onKeyDown={(e) => e.key === 'Enter' && router.push(`/client/bookings/${b.id}`)}
                    className="flex min-h-[44px] cursor-pointer items-center border-b border-slate-200 px-4 py-1.5 last:border-b-0 hover:bg-slate-50 lg:min-h-[44px]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">{b.service}</p>
                      <p className="text-sm text-slate-600">{formatDate(b.startAt)}</p>
                    </div>
                    <AppStatusPill status={b.status} className="ml-3 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 border-t border-slate-200 pb-3 pt-4">
              <EmptyState
                title="No upcoming visits"
                description="Book a visit when you're ready."
                primaryAction={{ label: 'View bookings', onClick: () => router.push('/client/bookings') }}
              />
            </div>
          )}
        </div>
      ) : null}
    </LayoutWrapper>
  );
}
