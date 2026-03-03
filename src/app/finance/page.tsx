/**
 * Finance - Route scaffold
 * Header + actions, filter bar, table, drawer detail.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { LayoutWrapper, PageHeader, Section } from '@/components/layout';
import {
  AppFilterBar,
  AppTable,
  AppDrawer,
  AppStatCard,
} from '@/components/app';
import { useAuth } from '@/lib/auth-client';
import { tokens } from '@/lib/design-tokens';

const STUB_TRANSACTIONS = [
  { id: '1', client: 'Jane Doe', amount: 85, date: '2025-02-28', status: 'paid' },
  { id: '2', client: 'Bob Smith', amount: 120, date: '2025-02-27', status: 'pending' },
];

export default function FinancePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login?redirect=/finance');
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <AppShell>
        <LayoutWrapper variant="wide">
          <PageHeader title="Finance" subtitle="Loading..." />
          <div className="h-64 animate-pulse rounded-lg bg-[var(--color-surface-secondary)]" />
        </LayoutWrapper>
      </AppShell>
    );
  }
  if (!user) return null;

  return (
    <AppShell>
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
          <div className="mb-6 grid gap-4 md:grid-cols-3">
        <AppStatCard label="Revenue MTD" value="$2,450" icon={<i className="fas fa-dollar-sign" />} />
        <AppStatCard label="Outstanding" value="$340" icon={<i className="fas fa-clock" />} />
        <AppStatCard label="Invoices" value="12" icon={<i className="fas fa-file-invoice" />} />
      </div>

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

      <div className="mt-4">
        <AppTable
          columns={[
            { key: 'client', header: 'Client' },
            { key: 'amount', header: 'Amount', render: (r) => `$${r.amount}` },
            { key: 'date', header: 'Date' },
            { key: 'status', header: 'Status', statusKey: 'status' },
          ]}
          data={STUB_TRANSACTIONS}
          keyExtractor={(r) => r.id}
          onRowClick={(r) => setSelectedId(r.id)}
          emptyMessage="No transactions"
        />
      </div>

        <AppDrawer isOpen={!!selectedId} onClose={() => setSelectedId(null)} title={selectedId ? `Transaction #${selectedId}` : ''}>
          {selectedId && <p className="text-sm">Detail placeholder for transaction {selectedId}</p>}
        </AppDrawer>
        </Section>
      </LayoutWrapper>
    </AppShell>
  );
}
