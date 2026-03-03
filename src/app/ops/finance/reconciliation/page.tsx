'use client';

/**
 * Finance reconciliation - run ledger vs Stripe comparison, view runs, export ledger.
 */

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { LayoutWrapper, PageHeader, Section } from '@/components/layout';
import { AppCard, AppCardBody, AppErrorState } from '@/components/app';
import { Button, Input, EmptyState } from '@/components/ui';
import { PageSkeleton } from '@/components/ui/loading-state';
import { StatusChip } from '@/components/ui/status-chip';

interface ReconcileRun {
  id: string;
  rangeStart: string;
  rangeEnd: string;
  status: string;
  totalsJson?: Record<string, number>;
  mismatchJson?: {
    missingInDb?: unknown[];
    missingInStripe?: unknown[];
    amountDiffs?: unknown[];
    error?: string;
  };
  createdAt: string;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function OpsFinanceReconciliationPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [runs, setRuns] = useState<ReconcileRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ops/finance/reconcile/runs?limit=20');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Failed to load runs');
        setRuns([]);
        return;
      }
      setRuns(json.runs || []);
    } catch {
      setError('Failed to load runs');
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
  }, [session, sessionStatus, router]);

  useEffect(() => {
    if (session) {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      setEndInput(end.toISOString().slice(0, 10));
      setStartInput(start.toISOString().slice(0, 10));
      void load();
    }
  }, [session, load]);

  const runReconciliation = async () => {
    const start = startInput ? new Date(startInput) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endInput ? new Date(endInput) : new Date();
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      alert('Invalid date range');
      return;
    }
    setRunning(true);
    try {
      const res = await fetch('/api/ops/finance/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start: start.toISOString(), end: end.toISOString() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed');
      alert(`Reconciliation job enqueued: ${json.jobId}`);
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to run');
    } finally {
      setRunning(false);
    }
  };

  const exportLedger = (format: 'csv' | 'json') => {
    const start = startInput ? new Date(startInput) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endInput ? new Date(endInput) : new Date();
    const url = `/api/ops/finance/ledger/export?start=${start.toISOString()}&end=${end.toISOString()}&format=${format}`;
    window.open(url, '_blank');
  };

  if (sessionStatus === 'loading' || !session) return null;

  return (
    <AppShell>
      <LayoutWrapper>
        <PageHeader
          title="Finance Reconciliation"
          subtitle="Ledger vs Stripe comparison and audit export"
          actions={
            <Button variant="secondary" size="sm" onClick={() => void load()} disabled={loading}>
              Refresh
            </Button>
          }
        />
        <Section>
      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <AppErrorState title="Couldn't load reconciliation" subtitle={error} onRetry={() => void load()} />
      ) : (
        <div className="space-y-4">
          <AppCard>
            <AppCardBody>
              <p className="mb-3 font-medium text-neutral-900">Run reconciliation</p>
              <p className="mb-3 text-sm text-neutral-600">
                Compare internal ledger (LedgerEntry) vs Stripe-persisted tables (StripeCharge, StripeRefund, PayoutTransfer) for the selected date range.
              </p>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <label className="text-sm text-neutral-700">Start</label>
                <Input type="date" value={startInput} onChange={(e) => setStartInput(e.target.value)} className="max-w-[160px]" />
                <label className="text-sm text-neutral-700">End</label>
                <Input type="date" value={endInput} onChange={(e) => setEndInput(e.target.value)} className="max-w-[160px]" />
                <Button variant="primary" size="sm" onClick={() => void runReconciliation()} disabled={running}>
                  {running ? 'Running...' : 'Run reconciliation'}
                </Button>
              </div>
            </AppCardBody>
          </AppCard>

          <AppCard>
            <AppCardBody>
              <p className="mb-3 font-medium text-neutral-900">Export ledger</p>
              <p className="mb-3 text-sm text-neutral-600">
                Download LedgerEntry rows for the selected date range.
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => exportLedger('csv')}>
                  Export CSV
                </Button>
                <Button variant="secondary" size="sm" onClick={() => exportLedger('json')}>
                  Export JSON
                </Button>
              </div>
            </AppCardBody>
          </AppCard>

          <AppCard>
            <AppCardBody>
              <p className="mb-3 font-medium text-neutral-900">Recent runs</p>
              {runs.length === 0 ? (
                <EmptyState
                  title="No runs yet"
                  description="Run reconciliation above to compare ledger vs Stripe."
                  primaryAction={{ label: 'Run reconciliation', onClick: () => void runReconciliation() }}
                />
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {runs.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {formatDate(r.rangeStart)} – {formatDate(r.rangeEnd)}
                        </span>
                        <StatusChip variant={r.status === 'succeeded' ? 'success' : 'danger'}>
                          {r.status}
                        </StatusChip>
                      </div>
                      {r.totalsJson && Object.keys(r.totalsJson).length > 0 && (
                        <p className="mt-1 text-neutral-600">
                          Totals: {Object.entries(r.totalsJson).map(([k, v]) => `${k}=$${(v / 100).toFixed(2)}`).join(', ')}
                        </p>
                      )}
                      {r.mismatchJson?.missingInDb?.length ? (
                        <p className="mt-1 text-amber-700">
                          Missing in ledger: {r.mismatchJson.missingInDb.length} items
                        </p>
                      ) : null}
                      {r.mismatchJson?.missingInStripe?.length ? (
                        <p className="mt-1 text-amber-700">
                          Missing in Stripe: {r.mismatchJson.missingInStripe.length} items
                        </p>
                      ) : null}
                      {r.mismatchJson?.error && (
                        <p className="mt-1 text-red-600">{r.mismatchJson.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </AppCardBody>
          </AppCard>
        </div>
      )}
        </Section>
      </LayoutWrapper>
    </AppShell>
  );
}
