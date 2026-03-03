'use client';

/**
 * Payouts - Owner view: list transfers by sitter with filters and failures.
 */

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { LayoutWrapper, PageHeader, Section } from '@/components/layout';
import { AppCard, AppCardBody, AppErrorState } from '@/components/app';
import { Button, EmptyState, StatusChip, TableSkeleton } from '@/components/ui';

interface PayoutItem {
  id: string;
  sitterId: string;
  sitterName: string;
  bookingId?: string | null;
  stripeTransferId?: string | null;
  amount: number;
  currency: string;
  status: string;
  lastError?: string | null;
  createdAt: string;
}

type StatusFilter = 'all' | 'paid' | 'pending' | 'failed';

export default function OpsPayoutsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [transfers, setTransfers] = useState<PayoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/ops/payouts?${params.toString()}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Failed to load payouts');
        setTransfers([]);
        return;
      }
      setTransfers(json.transfers || []);
    } catch {
      setError('Failed to load payouts');
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
  }, [session, sessionStatus, router]);

  useEffect(() => {
    if (session) void load();
  }, [session, load]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  if (sessionStatus === 'loading' || !session) return null;

  return (
    <AppShell>
      <LayoutWrapper>
        <PageHeader
          title="Payouts"
          subtitle="Sitter payout transfers and failures"
          actions={
            <Button variant="secondary" size="sm" onClick={() => void load()} disabled={loading}>
              Refresh
            </Button>
          }
        />
        <Section>
          <div className="mb-4 flex gap-2">
        {(['all', 'paid', 'pending', 'failed'] as StatusFilter[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${
              statusFilter === s ? 'bg-blue-100 text-blue-800' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      {loading ? (
        <TableSkeleton rows={5} cols={3} />
      ) : error ? (
        <AppErrorState title="Couldn't load payouts" subtitle={error} onRetry={() => void load()} />
      ) : transfers.length === 0 ? (
        <EmptyState
          title="No payouts"
          description="Transfers will appear here after completed bookings are paid out to sitters."
        />
      ) : (
        <div className="space-y-2">
          {transfers.map((t) => (
            <AppCard key={t.id}>
              <AppCardBody className="flex flex-row items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-neutral-900">{t.sitterName}</p>
                  <p className="text-sm text-neutral-600">
                    ${(t.amount / 100).toFixed(2)} {t.currency.toUpperCase()} · {formatDate(t.createdAt)}
                    {t.bookingId && ` · Booking ${t.bookingId.slice(0, 8)}…`}
                  </p>
                  {t.lastError && (
                    <p className="mt-1 text-xs text-red-600" title={t.lastError}>
                      {t.lastError.slice(0, 80)}
                      {t.lastError.length > 80 ? '…' : ''}
                    </p>
                  )}
                </div>
                <StatusChip variant={t.status === 'paid' ? 'success' : t.status === 'failed' ? 'danger' : 'neutral'}>
                  {t.status}
                </StatusChip>
              </AppCardBody>
            </AppCard>
          ))}
        </div>
      )}
        </Section>
      </LayoutWrapper>
    </AppShell>
  );
}
