'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutWrapper, PageHeader } from '@/components/layout';
import {
  AppCard,
  AppCardBody,
  AppCardHeader,
  AppErrorState,
  AppStatusPill,
} from '@/components/app';
import { EmptyState, PageSkeleton } from '@/components/ui';

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
        subtitle={data ? `You have ${data.upcomingCount} upcoming visit${data.upcomingCount !== 1 ? 's' : ''}` : 'Your pet care hub'}
        actions={
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
        <PageSkeleton />
      ) : error ? (
        <AppErrorState title="Couldn't load" subtitle={error} onRetry={() => void load()} />
      ) : data ? (
        <div className="flex flex-col gap-4">
          {/* Top row: 2-col on desktop */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
            <AppCard className="shadow-sm">
              <AppCardBody>
                <p className="font-semibold text-slate-900">Welcome back, {data.clientName?.split(' ')[0] || 'there'}</p>
                {data.upcomingCount > 0 && (
                  <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">
                    {data.upcomingCount} upcoming visit{data.upcomingCount !== 1 ? 's' : ''}
                  </p>
                )}
                <p className="mt-1 text-sm text-slate-500">Your next visit is just a tap away.</p>
                <Link
                  href="/bookings/new"
                  className="mt-3 inline-flex min-h-[40px] items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                >
                  Book a visit
                </Link>
              </AppCardBody>
            </AppCard>

            {data.latestReport ? (
              <div className="flex flex-col">
                <AppCard onClick={() => router.push(`/client/reports/${data.latestReport!.id}`)}>
                  <AppCardHeader>
                    <p className="font-semibold text-slate-900">Latest update</p>
                    {data.latestReport.service && (
                      <p className="mt-0.5 text-sm text-slate-500">{data.latestReport.service}</p>
                    )}
                  </AppCardHeader>
                  <AppCardBody>
                    <p className="line-clamp-2 text-sm text-slate-700">{data.latestReport.content}</p>
                    <p className="mt-2 text-xs text-slate-500 tabular-nums">
                      {new Date(data.latestReport.createdAt).toLocaleDateString()}
                    </p>
                  </AppCardBody>
                </AppCard>
                <button
                  type="button"
                  onClick={() => router.push('/client/reports')}
                  className="mt-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  View all reports
                </button>
              </div>
            ) : data.recentBookings?.length > 0 ? (
              <EmptyState
                title="No visit reports yet"
                description="Your sitter will send updates after each visit. Check back after your next appointment."
                primaryAction={{ label: 'View bookings', onClick: () => router.push('/client/bookings') }}
              />
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white px-5 py-5">
                <p className="text-sm text-slate-500">No reports yet. Updates will appear here after visits.</p>
              </div>
            )}
          </div>

          {/* Full-width list with section divider */}
          {data.recentBookings?.length > 0 ? (
            <div className="border-t border-slate-200 pt-6">
              <h2 className="mb-4 text-lg font-semibold tracking-tight text-slate-900">Upcoming & recent</h2>
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                {data.recentBookings.map((b) => (
                  <div
                    key={b.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/client/bookings/${b.id}`)}
                    onKeyDown={(e) => e.key === 'Enter' && router.push(`/client/bookings/${b.id}`)}
                    className="flex cursor-pointer flex-col border-b border-slate-200 px-4 py-2.5 last:border-b-0 hover:bg-slate-50 lg:flex-row lg:items-center lg:justify-between lg:py-2"
                  >
                    <div className="flex flex-1 flex-col min-w-0">
                      <p className="font-medium text-slate-900">{b.service}</p>
                      <p className="mt-0.5 text-sm text-slate-500">{formatDate(b.startAt)}</p>
                    </div>
                    <AppStatusPill status={b.status} className="mt-1.5 shrink-0 lg:mt-0" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="border-t border-slate-200 pt-6">
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
