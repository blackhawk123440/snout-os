'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AppCard,
  AppCardHeader,
  AppCardBody,
  AppPageHeader,
  AppSkeletonList,
  AppEmptyState,
  AppErrorState,
} from '@/components/app';

interface BillingData {
  invoices: Array<{
    id: string;
    service: string;
    startAt: string;
    totalPrice: number;
    paymentLink: string | null;
    paymentStatus: string;
  }>;
  loyalty: { points: number; tier: string };
}

export default function ClientBillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/client/billing');
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
        title="Billing"
        subtitle={data ? `${data.loyalty.points} loyalty points · ${data.loyalty.tier} tier` : 'Invoices & loyalty'}
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
              <p className="font-semibold text-neutral-900">Loyalty points</p>
              <p className="mt-1 text-3xl font-bold text-amber-600">{data.loyalty.points}</p>
              <p className="mt-1 text-sm text-neutral-600">
                {data.loyalty.tier} tier · Earn points on every visit
              </p>
            </AppCardBody>
          </AppCard>

          <h2 className="text-lg font-semibold text-neutral-900">Invoices</h2>
          {data.invoices.length > 0 ? (
            <div className="space-y-3">
              {data.invoices.map((inv) => (
                <AppCard key={inv.id}>
                  <AppCardHeader>
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-neutral-900">{inv.service}</p>
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
                        {inv.paymentStatus}
                      </span>
                    </div>
                  </AppCardHeader>
                  <AppCardBody>
                    <p className="text-sm text-neutral-600">{formatDate(inv.startAt)}</p>
                    <p className="mt-2 font-semibold">${inv.totalPrice.toFixed(2)}</p>
                    {inv.paymentLink && (
                      <a
                        href={inv.paymentLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                      >
                        Pay now
                      </a>
                    )}
                  </AppCardBody>
                </AppCard>
              ))}
            </div>
          ) : (
            <AppEmptyState
              title="No unpaid invoices"
              subtitle="You're all caught up."
              cta={{ label: 'View bookings', onClick: () => window.location.assign('/client/bookings') }}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
