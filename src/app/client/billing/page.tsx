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
            className="text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50"
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
        <div className="flex flex-col gap-6">
          <AppCard className="shadow-none">
            <AppCardBody className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-500">Loyalty points</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{data.loyalty.points}</p>
                </div>
                <StatusChip variant="neutral" ariaLabel={`Tier: ${data.loyalty.tier}`}>
                  {data.loyalty.tier}
                </StatusChip>
              </div>
              <p className="mt-2 text-sm text-slate-500">Earn points on every visit</p>
            </AppCardBody>
          </AppCard>

          {data.payments.length > 0 && (
            <>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">Payment history</h2>
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

          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Invoices</h2>
          {data.invoices.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              {data.invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex flex-col border-b border-slate-200 px-4 py-3 last:border-b-0 hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-900">{inv.service}</p>
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
                  <p className="mt-0.5 text-sm text-slate-500">{formatDate(inv.startAt)}</p>
                  <p className="mt-1 font-medium tabular-nums text-slate-900">${inv.totalPrice.toFixed(2)}</p>
                  {inv.paymentLink && (
                    <a
                      href={inv.paymentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex min-h-[36px] w-fit items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                    >
                      Pay now
                    </a>
                  )}
                </div>
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
