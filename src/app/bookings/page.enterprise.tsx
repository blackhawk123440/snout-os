'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { OwnerAppShell, LayoutWrapper, PageHeader, Section } from '@/components/layout';
import { AppErrorState, AppFilterBar, getStatusPill } from '@/components/app';
import { DataTableShell, EmptyState, Table, TableSkeleton, Button } from '@/components/ui';
import { MobileFilterDrawer } from '@/components/app/MobileFilterDrawer';
import { StatusChip } from '@/components/ui/status-chip';

type BookingRow = {
  id: string;
  firstName: string;
  lastName: string;
  service: string;
  startAt: string;
  status: string;
  paymentStatus: string;
  totalPrice: number;
  sitter?: { id: string; firstName: string; lastName: string } | null;
  client?: { id: string; firstName: string; lastName: string } | null;
  hasReport?: boolean;
};

export default function BookingsEnterprisePage() {
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({
    search: '',
    status: 'all',
    payment: 'all',
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/bookings');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to load bookings');
      setRows(Array.isArray(json.bookings) ? json.bookings : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load bookings');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const search = (filters.search || '').toLowerCase().trim();
    return rows.filter((r) => {
      if (filters.status !== 'all' && r.status !== filters.status) return false;
      if (filters.payment !== 'all' && r.paymentStatus !== filters.payment) return false;
      if (!search) return true;
      return (
        `${r.firstName} ${r.lastName}`.toLowerCase().includes(search) ||
        r.service.toLowerCase().includes(search) ||
        (r.sitter ? `${r.sitter.firstName} ${r.sitter.lastName}`.toLowerCase().includes(search) : false)
      );
    });
  }, [rows, filters]);

  const activeFilterCount =
    Number(Boolean(filters.search)) +
    Number(filters.status !== 'all') +
    Number(filters.payment !== 'all');

  return (
    <OwnerAppShell>
      <LayoutWrapper variant="wide">
        <PageHeader
          title="Bookings Ops Cockpit"
          subtitle="Operator queue with assignment and execution visibility"
          actions={
            <Link href="/bookings/new">
              <Button>New booking</Button>
            </Link>
          }
        />

        <Section>
          <MobileFilterDrawer triggerLabel="Filters" activeCount={activeFilterCount}>
            <AppFilterBar
              filters={[
                { key: 'search', label: 'Search', type: 'search', placeholder: 'Client, service, sitter...' },
                {
                  key: 'status',
                  label: 'Status',
                  type: 'select',
                  options: [
                    { value: 'all', label: 'All' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'confirmed', label: 'Confirmed' },
                    { value: 'in_progress', label: 'In Progress' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'cancelled', label: 'Cancelled' },
                  ],
                },
                {
                  key: 'payment',
                  label: 'Payment',
                  type: 'select',
                  options: [
                    { value: 'all', label: 'All' },
                    { value: 'paid', label: 'Paid' },
                    { value: 'unpaid', label: 'Unpaid' },
                    { value: 'pending', label: 'Pending' },
                  ],
                },
              ]}
              values={filters}
              onChange={(k, v) => setFilters((p) => ({ ...p, [k]: v }))}
              onClear={() => setFilters({ search: '', status: 'all', payment: 'all' })}
            />
          </MobileFilterDrawer>
        </Section>

        <Section>
          {loading ? (
            <TableSkeleton rows={8} cols={6} />
          ) : error ? (
            <AppErrorState title="Couldn't load bookings" subtitle={error} onRetry={() => void load()} />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No bookings found"
              description="Adjust filters or create a new booking."
              primaryAction={{ label: 'Create booking', onClick: () => (window.location.href = '/bookings/new') }}
            />
          ) : (
            <DataTableShell stickyHeader>
              <Table<BookingRow>
                forceTableLayout
                columns={[
                  {
                    key: 'client',
                    header: 'Client',
                    mobileOrder: 1,
                    mobileLabel: 'Client',
                    render: (r) => (
                      <div>
                        <div className="font-medium">{r.firstName} {r.lastName}</div>
                        <div className="text-xs text-[var(--color-text-secondary)]">{r.service}</div>
                      </div>
                    ),
                  },
                  {
                    key: 'startAt',
                    header: 'Scheduled',
                    mobileOrder: 2,
                    mobileLabel: 'Scheduled',
                    render: (r) => new Date(r.startAt).toLocaleString(),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    mobileOrder: 3,
                    mobileLabel: 'Status',
                    render: (r) => {
                      const pill = getStatusPill(r.status);
                      return <StatusChip variant="neutral" ariaLabel={`Booking status: ${pill.label}`}>{pill.label}</StatusChip>;
                    },
                  },
                  {
                    key: 'sitter',
                    header: 'Sitter',
                    mobileOrder: 4,
                    mobileLabel: 'Sitter',
                    hideBelow: 'md',
                    render: (r) => (r.sitter ? `${r.sitter.firstName} ${r.sitter.lastName}` : 'Unassigned'),
                  },
                  {
                    key: 'payment',
                    header: 'Payment',
                    mobileOrder: 5,
                    mobileLabel: 'Payment',
                    hideBelow: 'lg',
                    render: (r) => getStatusPill(r.paymentStatus).label,
                  },
                  {
                    key: 'total',
                    header: 'Total',
                    mobileOrder: 6,
                    mobileLabel: 'Total',
                    align: 'right',
                    render: (r) => `$${Number(r.totalPrice).toFixed(2)}`,
                  },
                ]}
                data={filtered}
                keyExtractor={(r) => r.id}
                onRowClick={(r) => (window.location.href = `/bookings/${r.id}`)}
                emptyMessage="No bookings"
              />
            </DataTableShell>
          )}
        </Section>
      </LayoutWrapper>
    </OwnerAppShell>
  );
}

