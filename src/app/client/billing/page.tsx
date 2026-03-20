'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { useClientBilling, useClientPaymentMethods, useRemovePaymentMethod } from '@/lib/api/client-hooks';
import { toastError } from '@/lib/toast';

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

              {/* Service Bundles */}
              <BundlesSection />

              {/* Saved payment methods */}
              <SavedPaymentMethods />

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

/* ─── Saved Payment Methods ──────────────────────────────────────── */

/* ─── Service Bundles ────────────────────────────────────────────── */

function BundlesSection() {
  const queryClient = useQueryClient();
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{
    bundles: Array<{ id: string; name: string; serviceType: string; visitCount: number; priceInCents: number; discountPercent: number; expirationDays: number }>;
    purchases: Array<{ id: string; bundleId: string; remainingVisits: number; expiresAt: string; status: string }>;
  }>({
    queryKey: ['client', 'bundles'],
    queryFn: async () => {
      const res = await fetch('/api/client/bundles');
      if (!res.ok) return { bundles: [], purchases: [] };
      return res.json();
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async (bundleId: string) => {
      setBuyingId(bundleId);
      const res = await fetch('/api/client/bundles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundleId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Purchase failed');
      }
      return res.json();
    },
    onSuccess: () => {
      toastSuccess('Bundle purchased!');
      queryClient.invalidateQueries({ queryKey: ['client', 'bundles'] });
      setBuyingId(null);
    },
    onError: (err: Error) => {
      toastError(err.message);
      setBuyingId(null);
    },
  });

  if (isLoading) return null;

  const bundles = data?.bundles || [];
  const purchases = (data?.purchases || []).filter(p => p.status === 'active');

  // Don't render the section at all if no bundles available and no active purchases
  if (bundles.length === 0 && purchases.length === 0) return null;

  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold text-text-primary">Service Bundles</h2>

      {/* Available bundles */}
      {bundles.length > 0 && (
        <div className="space-y-2 mb-3">
          {bundles.map((b) => (
            <AppCard key={b.id}>
              <AppCardBody>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary">{b.name}</p>
                    <p className="text-xs text-text-tertiary">
                      {b.visitCount} {b.serviceType} visits · {b.discountPercent}% off · Expires in {b.expirationDays} days
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-lg font-bold tabular-nums text-text-primary">
                      ${(b.priceInCents / 100).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Buy "${b.name}" for $${(b.priceInCents / 100).toFixed(2)}?`)) {
                          purchaseMutation.mutate(b.id);
                        }
                      }}
                      disabled={buyingId === b.id}
                      className="min-h-[44px] rounded-lg bg-accent-primary px-4 text-sm font-semibold text-text-inverse hover:opacity-90 transition disabled:opacity-50"
                    >
                      {buyingId === b.id ? 'Buying…' : 'Buy'}
                    </button>
                  </div>
                </div>
              </AppCardBody>
            </AppCard>
          ))}
        </div>
      )}

      {/* Active purchases */}
      {purchases.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-text-tertiary">Your active bundles</p>
          {purchases.map((p) => {
            const bundle = bundles.find(b => b.id === p.bundleId);
            return (
              <AppCard key={p.id}>
                <AppCardBody>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary">
                        {bundle?.name || 'Bundle'}
                      </p>
                      <p className="text-xs text-text-tertiary">
                        {p.remainingVisits} visits remaining · Expires {new Date(p.expiresAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <AppStatusPill status="active" />
                  </div>
                </AppCardBody>
              </AppCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Saved Payment Methods ──────────────────────────────────────── */

function SavedPaymentMethods() {
  const { data, isLoading } = useClientPaymentMethods();
  const removeMutation = useRemovePaymentMethod();

  if (isLoading) return null;

  const methods = data?.methods || [];

  const brandIcon = (brand: string) => {
    switch (brand) {
      case 'visa': return 'Visa';
      case 'mastercard': return 'MC';
      case 'amex': return 'Amex';
      default: return brand;
    }
  };

  return (
    <AppCard>
      <AppCardBody>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-text-primary">Payment Methods</p>
        </div>
        {methods.length === 0 ? (
          <p className="text-sm text-text-tertiary">No saved cards. Payment links will be sent for each booking.</p>
        ) : (
          <div className="space-y-2">
            {methods.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border border-border-default px-3 py-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-text-secondary bg-surface-tertiary rounded px-2 py-1">
                    {brandIcon(m.brand)}
                  </span>
                  <span className="text-sm text-text-primary font-mono">
                    {'•••• '}{m.last4}
                  </span>
                  <span className="text-xs text-text-tertiary">
                    {m.expMonth}/{m.expYear}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Remove this card?')) {
                      removeMutation.mutate(m.id, {
                        onError: () => toastError('Failed to remove card'),
                      });
                    }
                  }}
                  disabled={removeMutation.isPending}
                  className="min-h-[44px] text-xs text-status-danger-text-secondary hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </AppCardBody>
    </AppCard>
  );
}
