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
        subtitle="Invoices & loyalty"
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
              {(() => {
                const tier = (data.loyalty.tier || 'bronze').toLowerCase();
                const points = data.loyalty.points ?? 0;
                const tiers: { next: string; needed: number; start: number }[] = [
                  { next: 'Silver', needed: 100, start: 0 },
                  { next: 'Gold', needed: 200, start: 100 },
                  { next: 'Platinum', needed: 500, start: 300 },
                ];
                const tierNames = ['bronze', 'silver', 'gold', 'platinum'];
                const tierIndex = tierNames.indexOf(tier);
                const currentTierLabel = tier.charAt(0).toUpperCase() + tier.slice(1) + ' tier';
                let progressLabel: string;
                let progressPct = 0;
                if (tierIndex < 0 || tierIndex >= tiers.length) {
                  progressLabel = `${points} points`;
                  progressPct = 0;
                } else if (tierIndex === 3) {
                  progressLabel = 'Max tier';
                  progressPct = 1;
                } else {
                  const t = tiers[tierIndex];
                  const inTier = Math.max(0, Math.min(t.needed, points - t.start));
                  progressLabel = `${inTier} / ${t.needed} points to ${t.next}`;
                  progressPct = t.needed ? inTier / t.needed : 0;
                }
                return (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold text-slate-900">{currentTierLabel}</p>
                    <p className="text-sm text-slate-600">{progressLabel}</p>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-slate-700 transition-[width]"
                        style={{ width: `${Math.min(100, progressPct * 100)}%` }}
                        aria-hidden
                      />
                    </div>
                  </div>
                );
              })()}
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
