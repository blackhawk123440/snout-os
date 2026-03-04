'use client';

import { useCallback, useEffect, useState } from 'react';
import { LayoutWrapper, PageHeader, Section, ClientRefreshButton } from '@/components/layout';
import { ClientAtAGlanceSidebarLazy } from '@/components/client/ClientAtAGlanceSidebarLazy';
import {
  AppCard,
  AppCardBody,
  AppErrorState,
} from '@/components/app';
import { EmptyState, PageSkeleton, DataTableShell, Table } from '@/components/ui';
import { StatusChip } from '@/components/ui/status-chip';
import { AppStatusPill } from '@/components/app';

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
        actions={<ClientRefreshButton onRefresh={load} loading={loading} />}
      />
      <div className="lg:grid lg:grid-cols-[1fr,auto] lg:gap-6">
        <div className="min-w-0">
      <Section>
      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <AppErrorState title="Couldn't load" subtitle={error} onRetry={() => void load()} />
      ) : data ? (
        <div className="flex flex-col gap-3">
          <AppCard className="shadow-none">
            <AppCardBody className="p-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-slate-500">Loyalty points</p>
                  <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{data.loyalty.points}</p>
                  <p className="mt-0.5 text-sm text-slate-700">Earn points on every visit</p>
                </div>
                <StatusChip variant="neutral" ariaLabel={`Tier: ${data.loyalty.tier}`}>
                  {data.loyalty.tier}
                </StatusChip>
              </div>
            </AppCardBody>
          </AppCard>

          {data.payments.length > 0 && (
            <div className="mt-4 border-t border-slate-200 py-3">
              <h2 className="mb-2 text-sm font-semibold tracking-tight text-slate-900">Payment history</h2>
              <DataTableShell className="mb-0" stickyHeader>
                <Table
                  columns={[
                    { key: 'amount', header: 'Amount', mobileOrder: 1, mobileLabel: 'Amount', render: (p) => (
                      <span className="text-lg font-semibold tabular-nums text-slate-900">${p.amount.toFixed(2)}</span>
                    )},
                    { key: 'date', header: 'Date', mobileOrder: 2, mobileLabel: 'Date', hideBelow: 'md', render: (p) =>
                      new Date(p.createdAt).toLocaleDateString()
                    },
                    { key: 'status', header: 'Status', mobileOrder: 3, mobileLabel: 'Status', render: (p) => <AppStatusPill status={p.status} /> },
                  ]}
                  data={data.payments.slice(0, 10)}
                  keyExtractor={(p) => p.id}
                  emptyMessage="No payments"
                  forceTableLayout
                />
              </DataTableShell>
            </div>
          )}

          <div className="mt-4 border-t border-slate-200 py-3">
            <h2 className="mb-2 text-sm font-semibold tracking-tight text-slate-900">Invoices</h2>
            {data.invoices.length > 0 ? (
              <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white lg:rounded-lg">
                {data.invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="grid min-h-[56px] grid-cols-1 gap-3 border-b border-slate-200 px-4 py-3 last:border-b-0 hover:bg-slate-50 active:bg-slate-100 sm:grid-cols-[1fr_auto] sm:items-center lg:min-h-[44px] lg:py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{inv.service}</p>
                      <p className="truncate text-xs text-slate-500 tabular-nums">{formatDate(inv.startAt)}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <div className="flex items-center justify-end gap-2">
                        <AppStatusPill status={inv.paymentStatus} />
                        <span className="font-medium tabular-nums text-slate-900">
                          ${inv.totalPrice.toFixed(2)}
                        </span>
                      </div>
                      {inv.paymentLink && (
                        <a
                          href={inv.paymentLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Pay invoice ${inv.service} ${formatDate(inv.startAt)}`}
                          className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center rounded-lg bg-slate-900 px-3 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 sm:w-auto sm:min-w-[44px]"
                        >
                          Pay now
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No unpaid invoices"
                description="You're all caught up. Invoices will appear here after visits."
                primaryAction={{ label: 'View bookings', onClick: () => window.location.assign('/client/bookings') }}
              />
            )}
          </div>
        </div>
      ) : null}
      </Section>
        </div>
        <ClientAtAGlanceSidebarLazy />
      </div>
    </LayoutWrapper>
  );
}
