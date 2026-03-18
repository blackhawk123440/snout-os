'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutWrapper, ClientRefreshButton } from '@/components/layout';
import { ClientAtAGlanceSidebarLazy } from '@/components/client/ClientAtAGlanceSidebarLazy';
import {
  AppCard,
  AppCardBody,
  AppPageHeader,
  AppErrorState,
  AppStatusPill,
} from '@/components/app';
import { EmptyState, PageSkeleton } from '@/components/ui';
import { toastSuccess } from '@/lib/toast';
import { useClientBilling } from '@/lib/api/client-hooks';

export default function ClientBillingPage() {
  const router = useRouter();
  const { data, isLoading: loading, error, refetch } = useClientBilling();
  const polledRef = useRef(false);

  // Detect return from Stripe payment — poll once after 2s on mount
  useEffect(() => {
    if (polledRef.current) return;
    polledRef.current = true;
    const timer = setTimeout(async () => {
      const before = data?.invoices.filter((i) => i.paymentStatus !== 'paid').length ?? 0;
      if (before === 0) return;
      const { data: fresh } = await refetch();
      if (!fresh) return;
      const after = fresh.invoices.filter((i) => i.paymentStatus !== 'paid').length;
      if (after < before) toastSuccess('Payment received! Thank you.');
    }, 2000);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  const unpaidInvoices = data?.invoices.filter((i) => i.paymentStatus !== 'paid') || [];
  const outstandingTotal = unpaidInvoices.reduce((s, i) => s + i.totalPrice, 0);
  const firstPaymentLink = unpaidInvoices.find((i) => i.paymentLink)?.paymentLink;

  return (
    <LayoutWrapper variant="narrow">
      <AppPageHeader
        title="Billing"
        subtitle="Invoices & payments"
        action={<ClientRefreshButton onRefresh={refetch} loading={loading} />}
      />
      <div className="lg:grid lg:grid-cols-[1fr,auto] lg:gap-6">
        <div className="min-w-0">
          {loading ? (
            <PageSkeleton />
          ) : error ? (
            <AppErrorState title="Couldn't load" subtitle={error.message || 'Unable to load'} onRetry={() => void refetch()} />
          ) : data ? (
            <div className="space-y-5 pb-8">
              {/* Outstanding balance */}
              {outstandingTotal > 0 && (
                <AppCard>
                  <AppCardBody>
                    <div className="text-center">
                      <p className="text-xs font-medium text-text-tertiary">Outstanding balance</p>
                      <p className="mt-1 text-3xl font-bold text-text-primary">${outstandingTotal.toFixed(2)}</p>
                      <p className="text-sm text-text-secondary">
                        {unpaidInvoices.length} unpaid invoice{unpaidInvoices.length !== 1 ? 's' : ''}
                      </p>
                      {firstPaymentLink && (
                        <a
                          href={firstPaymentLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-accent-primary px-6 text-sm font-semibold text-text-inverse hover:opacity-90 transition"
                        >
                          Pay {unpaidInvoices.length === 1 ? `$${unpaidInvoices[0].totalPrice.toFixed(2)}` : 'now'}
                        </a>
                      )}
                    </div>
                  </AppCardBody>
                </AppCard>
              )}

              {/* Unpaid invoices */}
              {unpaidInvoices.length > 0 && (
                <div>
                  <h2 className="mb-2 text-sm font-semibold text-text-primary">Unpaid</h2>
                  <div className="space-y-2">
                    {unpaidInvoices.map((inv) => (
                      <AppCard key={inv.id}>
                        <AppCardBody>
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-text-primary">
                                {inv.service} {'\u2014'} {formatDate(inv.startAt)}
                              </p>
                              {inv.sitterName && (
                                <p className="text-xs text-text-tertiary">with {inv.sitterName}</p>
                              )}
                              <div className="mt-1 flex items-center gap-2">
                                <span className="text-lg font-bold tabular-nums text-text-primary">
                                  ${inv.totalPrice.toFixed(2)}
                                </span>
                                <AppStatusPill status={inv.paymentStatus} />
                              </div>
                            </div>
                            {inv.paymentLink && (
                              <a
                                href={inv.paymentLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 min-h-[44px] inline-flex items-center justify-center rounded-lg bg-accent-primary px-4 text-sm font-semibold text-text-inverse hover:opacity-90 transition"
                              >
                                Pay ${inv.totalPrice.toFixed(2)}
                              </a>
                            )}
                          </div>
                        </AppCardBody>
                      </AppCard>
                    ))}
                  </div>
                </div>
              )}

              {/* Paid completions */}
              {data.paidCompletions?.length > 0 && (
                <div>
                  <h2 className="mb-2 text-sm font-semibold text-text-primary">Paid</h2>
                  <div className="space-y-2">
                    {data.paidCompletions.slice(0, 10).map((p) => (
                      <AppCard key={`${p.invoiceReference}-${p.paidAt}`}>
                        <AppCardBody>
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-text-primary">
                                {p.bookingService || 'Payment'} {p.bookingStartAt ? `${'\u2014'} ${formatDate(p.bookingStartAt)}` : ''}
                              </p>
                              <div className="mt-0.5 flex items-center gap-2">
                                <span className="text-lg font-bold tabular-nums text-text-primary">
                                  ${p.amount.toFixed(2)}
                                </span>
                                <AppStatusPill status="paid" />
                              </div>
                              <p className="text-xs text-text-tertiary">{formatDateTime(p.paidAt)}</p>
                            </div>
                            {p.receiptLink && (
                              <a
                                href={p.receiptLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 min-h-[44px] inline-flex items-center rounded-lg border border-border-default px-3 text-xs font-medium text-text-secondary hover:bg-surface-secondary transition"
                              >
                                Receipt
                              </a>
                            )}
                          </div>
                        </AppCardBody>
                      </AppCard>
                    ))}
                  </div>
                </div>
              )}

              {/* Loyalty */}
              {data.loyalty && (
                <AppCard>
                  <AppCardBody>
                    {(() => {
                      const tier = (data.loyalty.tier || 'bronze').toLowerCase();
                      const points = data.loyalty.points ?? 0;
                      const tiers = [
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
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-text-primary">{currentTierLabel}</p>
                          <p className="text-sm text-text-secondary">{progressLabel}</p>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-tertiary">
                            <div
                              className="h-full rounded-full bg-accent-primary transition-[width]"
                              style={{ width: `${Math.min(100, progressPct * 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </AppCardBody>
                </AppCard>
              )}

              {/* Empty state */}
              {unpaidInvoices.length === 0 && (!data.paidCompletions || data.paidCompletions.length === 0) && data.payments.length === 0 && (
                <EmptyState
                  title="No invoices yet"
                  description="Invoices will appear here after your visits are booked."
                  primaryAction={{ label: 'View bookings', onClick: () => router.push('/client/bookings') }}
                />
              )}
            </div>
          ) : null}
        </div>
        <ClientAtAGlanceSidebarLazy />
      </div>
    </LayoutWrapper>
  );
}
