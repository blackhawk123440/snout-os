'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { OwnerAppShell, LayoutWrapper, PageHeader, Section } from '@/components/layout';
import { AppErrorState, AppFilterBar } from '@/components/app';
import { DataTableShell, EmptyState, Table, TableSkeleton, Button } from '@/components/ui';
import { MobileFilterDrawer } from '@/components/app/MobileFilterDrawer';

type ClientRow = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address?: string;
  totalBookings?: number;
  lastBooking?: string | null;
};

export default function ClientsEnterprisePage() {
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({ search: '', sort: 'recent' });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/clients');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to load clients');
      setRows(Array.isArray(json.clients) ? json.clients : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load clients');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const term = (filters.search || '').toLowerCase();
    const mapped = rows.filter((r) => {
      if (!term) return true;
      return (
        `${r.firstName} ${r.lastName}`.toLowerCase().includes(term) ||
        r.email.toLowerCase().includes(term) ||
        r.phone.includes(term)
      );
    });
    if (filters.sort === 'name') {
      return [...mapped].sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
    }
    return [...mapped].sort((a, b) => new Date(b.lastBooking || 0).getTime() - new Date(a.lastBooking || 0).getTime());
  }, [rows, filters]);

  const activeFilterCount = Number(Boolean(filters.search)) + Number(filters.sort !== 'recent');

  return (
    <OwnerAppShell>
      <LayoutWrapper variant="wide">
        <PageHeader
          title="Clients"
          subtitle="Operator surface for client health and actions"
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
                { key: 'search', label: 'Search', type: 'search', placeholder: 'Name, phone, email' },
                {
                  key: 'sort',
                  label: 'Sort',
                  type: 'select',
                  options: [
                    { value: 'recent', label: 'Most recent booking' },
                    { value: 'name', label: 'Name' },
                  ],
                },
              ]}
              values={filters}
              onChange={(k, v) => setFilters((p) => ({ ...p, [k]: v }))}
              onClear={() => setFilters({ search: '', sort: 'recent' })}
            />
          </MobileFilterDrawer>
        </Section>
        <Section>
          {loading ? (
            <TableSkeleton rows={8} cols={5} />
          ) : error ? (
            <AppErrorState title="Couldn't load clients" subtitle={error} onRetry={() => void load()} />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No clients found"
              description="Add your first booking to create client records."
              primaryAction={{ label: 'Create booking', onClick: () => (window.location.href = '/bookings/new') }}
            />
          ) : (
            <DataTableShell stickyHeader>
              <Table<ClientRow>
                forceTableLayout
                columns={[
                  {
                    key: 'name',
                    header: 'Client',
                    mobileOrder: 1,
                    mobileLabel: 'Client',
                    render: (r) => (
                      <div>
                        <div className="font-medium">{r.firstName} {r.lastName}</div>
                        <div className="text-xs text-[var(--color-text-secondary)]">{r.email}</div>
                      </div>
                    ),
                  },
                  { key: 'phone', header: 'Phone', mobileOrder: 2, mobileLabel: 'Phone' },
                  {
                    key: 'bookings',
                    header: 'Bookings',
                    mobileOrder: 3,
                    mobileLabel: 'Bookings',
                    hideBelow: 'md',
                    render: (r) => String(r.totalBookings || 0),
                  },
                  {
                    key: 'lastBooking',
                    header: 'Last Booking',
                    mobileOrder: 4,
                    mobileLabel: 'Last Booking',
                    hideBelow: 'lg',
                    render: (r) => (r.lastBooking ? new Date(r.lastBooking).toLocaleDateString() : 'Never'),
                  },
                ]}
                data={filtered}
                keyExtractor={(r) => r.id}
                onRowClick={(r) => (window.location.href = `/clients/${r.id}`)}
                emptyMessage="No clients"
              />
            </DataTableShell>
          )}
        </Section>
      </LayoutWrapper>
    </OwnerAppShell>
  );
}

