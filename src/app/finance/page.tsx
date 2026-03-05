/**
 * Finance - Route scaffold
 * Header + actions, filter bar, table, drawer detail.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { OwnerAppShell, LayoutWrapper, PageHeader, Section } from '@/components/layout';
import {
  AppFilterBar,
  AppErrorState,
  AppDrawer,
  AppStatCard,
} from '@/components/app';
import { MobileFilterDrawer } from '@/components/app/MobileFilterDrawer';
import { DataTableShell, EmptyState, Table, TableSkeleton } from '@/components/ui';
import { PageSkeleton } from '@/components/ui/loading-state';
import { useAuth } from '@/lib/auth-client';

const STUB_TRANSACTIONS = [
  { id: '1', client: 'Jane Doe', amount: 85, date: '2025-02-28', status: 'paid' },
  { id: '2', client: 'Bob Smith', amount: 120, date: '2025-02-27', status: 'pending' },
];

export default function FinancePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login?redirect=/finance');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    setLoading(true);
    setError(null);
    const id = setTimeout(() => setLoading(false), 150);
    return () => clearTimeout(id);
  }, [authLoading, user]);

  if (authLoading) {
    return (
      <OwnerAppShell>
        <LayoutWrapper variant="wide">
          <PageHeader title="Finance" subtitle="Loading..." />
          <PageSkeleton />
        </LayoutWrapper>
      </OwnerAppShell>
    );
  }
  if (!user) return null;

  return (
    <OwnerAppShell>
      <LayoutWrapper variant="wide">
        <PageHeader
          title="Finance"
          subtitle="Payments, invoices, and revenue"
          actions={
            <div className="flex gap-2">
              <Link
                href="/ops/payouts"
                className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] no-underline hover:bg-[var(--color-surface-tertiary)]"
              >
                Payouts
              </Link>
              <Link
                href="/ops/finance/reconciliation"
                className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] no-underline hover:bg-[var(--color-surface-tertiary)]"
              >
                Reconciliation
              </Link>
              <Link
                href="/payments"
                className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] no-underline hover:bg-[var(--color-surface-tertiary)]"
              >
                View Payments
              </Link>
            </div>
          }
        />

        <Section>
          {loading ? (
            <TableSkeleton rows={6} cols={4} />
          ) : error ? (
            <AppErrorState title="Couldn't load finance" subtitle={error} onRetry={() => setLoading(true)} />
          ) : (
            <>
          <div className="mb-6 grid gap-4 md:grid-cols-3">
        <AppStatCard label="Revenue MTD" value="$2,450" icon={<i className="fas fa-dollar-sign" />} />
        <AppStatCard label="Outstanding" value="$340" icon={<i className="fas fa-clock" />} />
        <AppStatCard label="Invoices" value="12" icon={<i className="fas fa-file-invoice" />} />
      </div>

      <MobileFilterDrawer triggerLabel="Filters" activeCount={Object.keys(filterValues).length}>
        <AppFilterBar
          filters={[
            { key: 'status', label: 'Status', type: 'select', options: [
              { value: 'paid', label: 'Paid' },
              { value: 'pending', label: 'Pending' },
            ]},
            { key: 'date', label: 'Date', type: 'date' },
          ]}
          values={filterValues}
          onChange={(k, v) => setFilterValues((p) => ({ ...p, [k]: v }))}
          onClear={() => setFilterValues({})}
        />
      </MobileFilterDrawer>

      <div className="mt-4">
        {STUB_TRANSACTIONS.length === 0 ? (
          <EmptyState
            title="No transactions"
            description="Finance transactions will appear here."
            primaryAction={{ label: 'View payments', onClick: () => router.push('/payments') }}
          />
        ) : (
          <DataTableShell stickyHeader>
            <Table
              columns={[
                { key: 'client', header: 'Client', mobileOrder: 1, mobileLabel: 'Client' },
                { key: 'amount', header: 'Amount', mobileOrder: 2, mobileLabel: 'Amount', align: 'right', render: (r) => `$${r.amount}` },
                { key: 'date', header: 'Date', mobileOrder: 3, mobileLabel: 'Date', hideBelow: 'md' },
                { key: 'status', header: 'Status', mobileOrder: 4, mobileLabel: 'Status', hideBelow: 'md', render: (r) => String(r.status).replace(/^./, (m) => m.toUpperCase()) },
              ]}
              data={STUB_TRANSACTIONS}
              keyExtractor={(r) => r.id}
              onRowClick={(r) => setSelectedId(r.id)}
              emptyMessage="No transactions"
              forceTableLayout
            />
          </DataTableShell>
        )}
      </div>

        <AppDrawer isOpen={!!selectedId} onClose={() => setSelectedId(null)} title={selectedId ? `Transaction #${selectedId}` : ''}>
          {selectedId && <p className="text-sm">Detail placeholder for transaction {selectedId}</p>}
        </AppDrawer>
            </>
          )}
        </Section>
      </LayoutWrapper>
    </OwnerAppShell>
  );
}
