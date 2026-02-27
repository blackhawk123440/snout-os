'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHeader, Button } from '@/components/ui';
import { FeatureStatusPill } from '@/components/sitter/FeatureStatusPill';

type PeriodTab = 'today' | 'week' | 'month';

interface EarningsData {
  commissionPercentage: number;
  grossTotal: number;
  earningsTotal: number;
  grossThisMonth: number;
  earningsThisMonth: number;
  grossLastMonth: number;
  earningsLastMonth: number;
  completedBookingsCount: number;
  completedThisMonthCount: number;
  completedLastMonthCount: number;
}

export default function SitterEarningsPage() {
  const [periodTab, setPeriodTab] = useState<PeriodTab>('month');
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEarnings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sitter/earnings');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Unable to load earnings');
        setData(null);
        return;
      }
      setData(json);
    } catch {
      setError('Unable to load earnings');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEarnings();
  }, [loadEarnings]);

  return (
    <>
      <PageHeader title="Earnings" description="Your commission summary" />
      <div className="mx-auto max-w-3xl px-4 pb-8 pt-2">
        {loading ? (
          <div className="space-y-4">
            <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-6">
              <div className="mb-3 h-6 w-32 rounded bg-gray-200" />
              <div className="h-10 w-48 rounded bg-gray-100" />
            </div>
            <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-6">
              <div className="mb-3 h-4 w-24 rounded bg-gray-200" />
              <div className="h-6 w-full rounded bg-gray-100" />
            </div>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="text-sm text-gray-600">{error}</p>
            <button
              type="button"
              onClick={() => void loadEarnings()}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Try again
            </button>
          </div>
        ) : data ? (
          <div className="space-y-4">
            <div className="flex gap-2 rounded-lg border border-neutral-200 p-0.5">
              {(['today', 'week', 'month'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriodTab(p)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${
                    periodTab === p ? 'bg-neutral-200 text-neutral-900' : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-500">Total earnings</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                ${data.earningsTotal.toFixed(2)}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {data.completedBookingsCount} completed bookings · {data.commissionPercentage}% commission
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-500">This month</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">
                ${data.earningsThisMonth.toFixed(2)}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {data.completedThisMonthCount} bookings · Gross ${data.grossThisMonth.toFixed(2)}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-500">Last month</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">
                ${data.earningsLastMonth.toFixed(2)}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {data.completedLastMonthCount} bookings · Gross ${data.grossLastMonth.toFixed(2)}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2">
              <Button variant="secondary" size="md" disabled>
                Instant payout
              </Button>
              <FeatureStatusPill featureKey="instant_payout" />
            </div>
            <p className="text-center text-xs text-gray-500">
              Earnings are estimates based on completed bookings. No payments or payouts in this MVP.
            </p>
          </div>
        ) : null}
      </div>
    </>
  );
}
