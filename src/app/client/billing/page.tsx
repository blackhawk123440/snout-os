'use client';

import { useCallback, useEffect, useState } from 'react';
import { LayoutWrapper, PageHeader, Section } from '@/components/layout';
import {
  AppCard,
  AppCardHeader,
  AppCardBody,
  AppErrorState,
} from '@/components/app';
import { EmptyState, PageSkeleton, DataTableShell, Table } from '@/components/ui';
import { StatusChip } from '@/components/ui/status-chip';

interface BillingData {
  invoices: Array<{
    id: string;
    service: string;
    startAt: string;
    totalPrice: number;
    paymentLink: string | null;
    paymentStatus: string;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    status: string;
    createdAt: string;
    bookingId: string | null;
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
    <LayoutWrapper variant="narrow">
      <PageHeader
        title="Billing"
        subtitle={data ? `${data.loyalty.points} loyalty points · ${data.loyalty.tier} tier` : 'Invoices & loyalty'}
        actions={
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
      <Section>
      {loading ? (
        <PageSkeleton />
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

          {data.payments.length > 0 && (
            <>
              <h2 className="text-lg font-semibold text-neutral-900">Payment history</h2>
              <DataTableShell className="mb-6" stickyHeader>
                <Table
                  columns={[
                    { key: 'amount', header: 'Amount', mobileOrder: 1, mobileLabel: 'Amount', render: (p) => (
                      <span className="tabular-nums font-medium">${p.amount.toFixed(2)}</span>
                    )},
                    { key: 'date', header: 'Date', mobileOrder: 2, mobileLabel: 'Date', hideBelow: 'md', render: (p) =>
                      new Date(p.createdAt).toLocaleDateString()
                    },
                    { key: 'status', header: 'Status', mobileOrder: 3, mobileLabel: 'Status', render: (p) => p.status },
                  ]}
                  data={data.payments.slice(0, 10)}
                  keyExtractor={(p) => p.id}
                  emptyMessage="No payments"
                  forceTableLayout
                />
              </DataTableShell>
            </>
          )}

          <h2 className="text-lg font-semibold text-neutral-900">Invoices</h2>
          {data.invoices.length > 0 ? (
            <div className="space-y-3">
              {data.invoices.map((inv) => (
                <AppCard key={inv.id}>
                  <AppCardHeader>
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-neutral-900">{inv.service}</p>
                      <StatusChip
                        variant={
                          inv.paymentStatus === 'paid' ? 'success' :
                          inv.paymentStatus === 'pending' ? 'warning' : 'neutral'
                        }
                        ariaLabel={`Invoice payment status: ${inv.paymentStatus}`}
                      >
                        {inv.paymentStatus}
                      </StatusChip>
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
            <EmptyState
              title="No unpaid invoices"
              description="You're all caught up."
              primaryAction={{ label: 'View bookings', onClick: () => window.location.assign('/client/bookings') }}
            />
          )}
        </div>
      ) : null}
      </Section>
    </LayoutWrapper>
  );
}
