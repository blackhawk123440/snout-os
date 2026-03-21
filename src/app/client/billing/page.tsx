'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LayoutWrapper, ClientRefreshButton } from '@/components/layout';
import {
  AppCard,
  AppCardBody,
  AppErrorState,
  AppStatusPill,
} from '@/components/app';
import { Button, EmptyState, PageSkeleton } from '@/components/ui';
import { toastSuccess } from '@/lib/toast';
import { useClientBilling, useClientPaymentMethods, useRemovePaymentMethod } from '@/lib/api/client-hooks';
import { toastError } from '@/lib/toast';

export default function ClientBillingPage() {
  const router = useRouter();
  const { data, isLoading: loading, error, refetch } = useClientBilling();
  const polledRef = useRef(false);

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
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary font-heading">Billing</h1>
            <p className="text-sm text-text-secondary mt-1">Invoices &amp; payments</p>
          </div>
          <ClientRefreshButton onRefresh={refetch} loading={loading} />
        </div>

        {loading ? (
          <PageSkeleton />
        ) : error ? (
          <AppErrorState title="Couldn't load" subtitle={error.message || 'Unable to load'} onRetry={() => void refetch()} />
        ) : data ? (
          <div className="space-y-8 pb-8">
            {/* Balance Hero */}
            <div className="rounded-2xl border border-border-default bg-surface-primary p-6 text-center shadow-[var(--shadow-card)]">
              <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary mb-1">Outstanding balance</p>
              <p className="text-3xl font-bold text-text-primary font-heading tabular-nums">${outstandingTotal.toFixed(2)}</p>
              <p className="text-sm text-text-secondary mt-1">
                {unpaidInvoices.length} unpaid invoice{unpaidInvoices.length !== 1 ? 's' : ''}
              </p>
              {outstandingTotal > 0 && (
                firstPaymentLink ? (
                  <a
                    href={firstPaymentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-accent-primary px-6 text-sm font-semibold text-white hover:brightness-90 active:scale-[0.98] transition-all"
                  >
                    Pay {unpaidInvoices.length === 1 ? `$${unpaidInvoices[0].totalPrice.toFixed(2)}` : 'now'}
                  </a>
                ) : (
                  <Button variant="primary" size="md" className="mt-4">
                    Pay now
                  </Button>
                )
              )}
            </div>

            {/* Unpaid invoices */}
            {unpaidInvoices.length > 0 && (
              <div>
                <h2 className="mb-3 text-sm font-semibold text-text-primary">Unpaid</h2>
                <div className="space-y-3">
                  {unpaidInvoices.map((inv) => (
                    <div key={inv.id} className="rounded-xl border border-border-default bg-surface-primary p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {inv.service} — {formatDate(inv.startAt)}
                        </p>
                        {inv.sitterName && (
                          <p className="text-xs text-text-tertiary">with {inv.sitterName}</p>
                        )}
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div>
                          <p className="text-base font-bold text-text-primary font-heading tabular-nums">
                            ${inv.totalPrice.toFixed(2)}
                          </p>
                          <AppStatusPill status={inv.paymentStatus} />
                        </div>
                        {inv.paymentLink && (
                          <a
                            href={inv.paymentLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 min-h-[44px] inline-flex items-center justify-center rounded-xl bg-accent-primary px-4 text-sm font-semibold text-white hover:brightness-90 transition-all"
                          >
                            Pay
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Paid completions */}
            {data.paidCompletions?.length > 0 && (
              <div>
                <h2 className="mb-3 text-sm font-semibold text-text-primary">Paid</h2>
                <div className="space-y-3">
                  {data.paidCompletions.slice(0, 10).map((p) => (
                    <div key={`${p.invoiceReference}-${p.paidAt}`} className="rounded-xl border border-border-default bg-surface-primary p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {p.bookingService || 'Payment'} {p.bookingStartAt ? `— ${formatDate(p.bookingStartAt)}` : ''}
                        </p>
                        <p className="text-xs text-text-tertiary tabular-nums">{formatDateTime(p.paidAt)}</p>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div>
                          <p className="text-base font-bold text-text-primary font-heading tabular-nums">
                            ${p.amount.toFixed(2)}
                          </p>
                          <AppStatusPill status="paid" />
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
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Loyalty */}
            {data.loyalty && (
              <div className="rounded-xl border border-border-default bg-surface-primary p-5 shadow-[var(--shadow-card)]">
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
                      <p className="text-sm font-semibold text-text-primary font-heading">{currentTierLabel}</p>
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
              </div>
            )}

            {/* Service Bundles */}
            <BundlesSection />

            {/* Saved payment methods */}
            <SavedPaymentMethods />

            {/* Empty state */}
            {unpaidInvoices.length === 0 && (!data.paidCompletions || data.paidCompletions.length === 0) && data.payments.length === 0 && (
              <div className="rounded-2xl border border-border-default bg-surface-primary p-12 text-center">
                <h2 className="text-lg font-semibold text-text-primary mb-2">No invoices</h2>
                <p className="text-sm text-text-secondary max-w-xs mx-auto mb-6">
                  Invoices appear here after completed visits.
                </p>
                <Button variant="primary" size="md" onClick={() => router.push('/client/bookings')}>
                  View bookings
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </LayoutWrapper>
  );
}

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

  if (bundles.length === 0 && purchases.length === 0) return null;

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-text-primary">Service Bundles</h2>

      {bundles.length > 0 && (
        <div className="space-y-3 mb-3">
          {bundles.map((b) => (
            <div key={b.id} className="rounded-xl border border-border-default bg-surface-primary p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary">{b.name}</p>
                  <p className="text-xs text-text-tertiary">
                    {b.visitCount} {b.serviceType} visits · {b.discountPercent}% off · Expires in {b.expirationDays} days
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-lg font-bold tabular-nums text-text-primary font-heading">
                    ${(b.priceInCents / 100).toFixed(2)}
                  </span>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => {
                      if (confirm(`Buy "${b.name}" for $${(b.priceInCents / 100).toFixed(2)}?`)) {
                        purchaseMutation.mutate(b.id);
                      }
                    }}
                    disabled={buyingId === b.id}
                    isLoading={buyingId === b.id}
                  >
                    Buy
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {purchases.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-text-tertiary">Your active bundles</p>
          {purchases.map((p) => {
            const bundle = bundles.find(b => b.id === p.bundleId);
            return (
              <div key={p.id} className="rounded-xl border border-border-default bg-surface-primary p-4">
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
              </div>
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
    <div className="rounded-xl border border-border-default bg-surface-primary p-5 shadow-[var(--shadow-card)]">
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
    </div>
  );
}
