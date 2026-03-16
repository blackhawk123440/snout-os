'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutWrapper, PageHeader, Section, ClientRefreshButton } from '@/components/layout';
import { ClientAtAGlanceSidebarLazy } from '@/components/client/ClientAtAGlanceSidebarLazy';
import {
  AppCard,
  AppCardBody,
  AppErrorState,
} from '@/components/app';
import { EmptyState, PageSkeleton } from '@/components/ui';
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
  paidCompletions: Array<{
    status: string;
    amount: number;
    paidAt: string;
    bookingReference: string | null;
    bookingService: string | null;
    bookingStartAt: string | null;
    invoiceReference: string;
    paymentIntentId: string | null;
    currency: string;
    receiptLink: string | null;
    bookingPaymentStatus: string | null;
  }>;
  loyalty: { points: number; tier: string };
}

export default function ClientBillingPage() {
  const router = useRouter();
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
  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

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
                    <p className="text-sm font-semibold text-text-primary">{currentTierLabel}</p>
                    <p className="text-sm text-text-secondary">{progressLabel}</p>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-tertiary">
                      <div
                        className="h-full rounded-full bg-surface-inverse transition-[width]"
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
            <div className="mt-4 border-t border-border-default py-3">
              <h2 className="mb-2 text-sm font-semibold tracking-tight text-text-primary">Payment history</h2>
              <div className="w-full space-y-2">
                {data.payments.slice(0, 10).map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-border-default px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-lg font-semibold tabular-nums text-text-primary">${p.amount.toFixed(2)}</p>
                      <p className="text-xs text-text-tertiary tabular-nums">{new Date(p.createdAt).toLocaleDateString()}</p>
                    </div>
                    <AppStatusPill status={p.status} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.paidCompletions?.length > 0 && (
            <div className="mt-4 border-t border-border-default py-3">
              <h2 className="mb-2 text-sm font-semibold tracking-tight text-text-primary">Payment completion proof</h2>
              <div className="space-y-2">
                {data.paidCompletions.slice(0, 5).map((payment) => (
                  <div
                    key={`${payment.invoiceReference}-${payment.paidAt}`}
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AppStatusPill status="paid" />
                        <span className="font-semibold text-text-primary">
                          ${payment.amount.toFixed(2)}
                        </span>
                      </div>
                      <span className="text-xs text-text-secondary">{formatDateTime(payment.paidAt)}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
                      <span>Booking: {payment.bookingReference ? payment.bookingReference.slice(0, 8) : 'N/A'}</span>
                      <span>Invoice: {payment.invoiceReference.slice(0, 8)}</span>
                      {payment.paymentIntentId ? <span>Intent: {payment.paymentIntentId.slice(0, 12)}</span> : null}
                    </div>
                    {payment.receiptLink ? (
                      <a
                        href={payment.receiptLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex text-xs font-medium text-text-secondary underline underline-offset-2"
                      >
                        View receipt
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 border-t border-border-default py-3">
            <h2 className="mb-2 text-sm font-semibold tracking-tight text-text-primary">Invoices</h2>
            {data.invoices.length > 0 ? (
              <div className="w-full overflow-hidden rounded-xl border border-border-default bg-surface-primary lg:rounded-lg">
                {data.invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="grid min-h-[56px] grid-cols-1 gap-3 border-b border-border-default px-4 py-3 last:border-b-0 hover:bg-surface-secondary active:bg-surface-tertiary sm:grid-cols-[1fr_auto] sm:items-center lg:min-h-[44px] lg:py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">{inv.service}</p>
                      <p className="truncate text-xs text-text-tertiary tabular-nums">{formatDate(inv.startAt)}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <div className="flex items-center justify-end gap-2">
                        <AppStatusPill status={inv.paymentStatus} />
                        <span className="font-medium tabular-nums text-text-primary">
                          ${inv.totalPrice.toFixed(2)}
                        </span>
                      </div>
                      {inv.paymentLink && (
                        <a
                          href={inv.paymentLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Pay invoice ${inv.service} ${formatDate(inv.startAt)}`}
                          className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center rounded-lg bg-surface-inverse px-3 text-sm font-medium text-text-inverse transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-2 sm:w-auto sm:min-w-[44px]"
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
                primaryAction={{ label: 'View bookings', onClick: () => router.push('/client/bookings') }}
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
