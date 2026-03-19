'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  const [filters, setFilters] = useState<Record<string, string>>({
    search: '',
    status: 'all',
    payment: 'all',
    from: '',
    to: '',
    sitterId: '',
    clientId: '',
  });
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { data, isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['owner', 'bookings', page, pageSize, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (filters.search) params.set('search', filters.search);
      if (filters.status && filters.status !== 'all') params.set('status', filters.status);
      if (filters.payment && filters.payment !== 'all') params.set('paymentStatus', filters.payment);
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      if (filters.sitterId) params.set('sitterId', filters.sitterId);
      if (filters.clientId) params.set('clientId', filters.clientId);
      const res = await fetch(`/api/bookings?${params.toString()}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to load bookings');
      return { items: json.items || [], total: json.total || 0 };
    },
  });
  const rows = data?.items || [];
  const total = data?.total || 0;
  const error = queryError?.message || null;

  const filtered = useMemo(() => rows, [rows]);

  const activeFilterCount =
    Number(Boolean(filters.search)) +
    Number(filters.status !== 'all') +
    Number(filters.payment !== 'all') +
    Number(Boolean(filters.from)) +
    Number(Boolean(filters.to)) +
    Number(Boolean(filters.sitterId)) +
    Number(Boolean(filters.clientId));

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
                { key: 'from', label: 'From', type: 'date' },
                { key: 'to', label: 'To', type: 'date' },
                { key: 'sitterId', label: 'Sitter Id', type: 'search', placeholder: 'Sitter ID' },
                { key: 'clientId', label: 'Client Id', type: 'search', placeholder: 'Client ID' },
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
              onChange={(k, v) => {
                setFilters((p) => ({ ...p, [k]: v }));
                setPage(1);
              }}
              onClear={() => {
                setFilters({
                  search: '',
                  status: 'all',
                  payment: 'all',
                  from: '',
                  to: '',
                  sitterId: '',
                  clientId: '',
                });
                setPage(1);
              }}
            />
          </MobileFilterDrawer>
        </Section>

        <Section>
          {loading ? (
            <TableSkeleton rows={8} cols={6} />
          ) : error ? (
            <AppErrorState title="Couldn't load bookings" subtitle={error} onRetry={() => void refetch()} />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No bookings found"
              description="Adjust filters or create a new booking."
              primaryAction={{ label: 'Create booking', onClick: () => (window.location.href = '/bookings/new') }}
            />
          ) : (
            <>
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
                      render: (r) => {
                        const ps = r.paymentStatus;
                        if (ps === 'paid') return <span className="rounded-full bg-status-success-bg px-2 py-0.5 text-xs font-medium text-status-success-text">Paid</span>;
                        if (ps === 'refunded') return <span className="rounded-full bg-surface-tertiary px-2 py-0.5 text-xs font-medium text-text-secondary">Refunded</span>;
                        if (['confirmed', 'completed'].includes(r.status)) return <span className="rounded-full bg-status-warning-bg px-2 py-0.5 text-xs font-medium text-status-warning-text">Payment required</span>;
                        return <span className="text-xs text-text-tertiary">Unpaid</span>;
                      },
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
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-[var(--color-text-secondary)]">
                  Page {page} · {total} bookings
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page * pageSize >= total}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </Section>
      </LayoutWrapper>
    </OwnerAppShell>
  );
}

