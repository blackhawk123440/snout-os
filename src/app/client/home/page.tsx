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

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="mx-auto max-w-3xl pb-8">
      <AppPageHeader
        title="Home"
        subtitle={data ? `You have ${data.upcomingCount} upcoming visit${data.upcomingCount !== 1 ? 's' : ''}` : 'Your pet care hub'}
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
        <AppSkeletonList count={2} />
      ) : error ? (
        <AppErrorState title="Couldn't load" subtitle={error} onRetry={() => void load()} />
      ) : data ? (
        <div className="space-y-4">
          <AppCard className="border-amber-200 bg-amber-50/50">
            <AppCardBody>
              <p className="font-semibold text-neutral-900">Welcome back, {data.clientName?.split(' ')[0] || 'there'} 🐾</p>
              <p className="mt-1 text-sm text-neutral-600">Your next visit is just a tap away.</p>
              <a
                href="/bookings/new"
                className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
              >
                Book a visit
              </a>
            </AppCardBody>
          </AppCard>

          {data.latestReport && (
            <div>
              <AppCard
                className="border-amber-200 bg-amber-50/30"
                onClick={() => router.push(`/client/reports/${data.latestReport!.id}`)}
              >
                <AppCardHeader>
                  <p className="font-semibold text-neutral-900">Latest update 💛</p>
                  {data.latestReport.service && (
                    <p className="mt-0.5 text-sm text-neutral-600">{data.latestReport.service}</p>
                  )}
                </AppCardHeader>
                <AppCardBody>
                  <p className="line-clamp-2 text-sm text-neutral-700">{data.latestReport.content}</p>
                  <p className="mt-2 text-xs text-neutral-500">
                    {new Date(data.latestReport.createdAt).toLocaleDateString()}
                  </p>
                </AppCardBody>
              </AppCard>
              <button
                type="button"
                onClick={() => router.push('/client/reports')}
                className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                View all reports
              </button>
            </div>
          )}

          {data.recentBookings?.length > 0 ? (
            <>
              <h2 className="text-lg font-semibold text-neutral-900">Upcoming & recent</h2>
              <div className="space-y-3">
                {data.recentBookings.map((b) => (
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
                      <p className="text-sm text-neutral-600">{formatDate(b.startAt)}</p>
                    </AppCardBody>
                  </AppCard>
                ))}
              </div>
            </>
          ) : (
            <AppEmptyState
              title="No upcoming visits"
              subtitle="Book a visit when you're ready."
              cta={{ label: 'View bookings', onClick: () => router.push('/client/bookings') }}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
