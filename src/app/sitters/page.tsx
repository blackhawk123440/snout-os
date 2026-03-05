'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { OwnerAppShell, LayoutWrapper, PageHeader, Section } from '@/components/layout';
import { AppErrorState, AppFilterBar } from '@/components/app';
import { DataTableShell, EmptyState, Table, TableSkeleton, Button, StatusChip } from '@/components/ui';
import { MobileFilterDrawer } from '@/components/app/MobileFilterDrawer';

type SitterRow = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  isActive?: boolean;
  commissionPercentage?: number;
};

export default function SittersPage() {
  const [rows, setRows] = useState<SitterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({ search: '', active: 'all' });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sitters');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to load sitters');
      setRows(Array.isArray(json.sitters) ? json.sitters : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sitters');
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
    return rows.filter((r) => {
      if (filters.active === 'active' && !r.isActive) return false;
      if (filters.active === 'inactive' && r.isActive) return false;
      if (!term) return true;
      return (
        `${r.firstName} ${r.lastName}`.toLowerCase().includes(term) ||
        (r.email || '').toLowerCase().includes(term)
      );
    });
  }, [rows, filters]);

  const activeFilterCount = Number(Boolean(filters.search)) + Number(filters.active !== 'all');

  return (
    <OwnerAppShell>
      <LayoutWrapper variant="wide">
        <PageHeader
          title="Sitters"
          subtitle="Operator assignment and availability surface"
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
                { key: 'search', label: 'Search', type: 'search', placeholder: 'Name or email' },
                {
                  key: 'active',
                  label: 'Availability',
                  type: 'select',
                  options: [
                    { value: 'all', label: 'All' },
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                  ],
                },
              ]}
              values={filters}
              onChange={(k, v) => setFilters((p) => ({ ...p, [k]: v }))}
              onClear={() => setFilters({ search: '', active: 'all' })}
            />
          </MobileFilterDrawer>
        </Section>
        <Section>
          {loading ? (
            <TableSkeleton rows={8} cols={5} />
          ) : error ? (
            <AppErrorState title="Couldn't load sitters" subtitle={error} onRetry={() => void load()} />
          ) : filtered.length === 0 ? (
            <EmptyState title="No sitters found" description="Add or activate sitters to resolve staffing quickly." />
          ) : (
            <DataTableShell stickyHeader>
              <Table<SitterRow>
                forceTableLayout
                columns={[
                  {
                    key: 'name',
                    header: 'Sitter',
                    mobileOrder: 1,
                    mobileLabel: 'Sitter',
                    render: (r) => (
                      <div>
                        <div className="font-medium">{r.firstName} {r.lastName}</div>
                        <div className="text-xs text-[var(--color-text-secondary)]">{r.email || 'No email'}</div>
                      </div>
                    ),
                  },
                  { key: 'phone', header: 'Phone', mobileOrder: 2, mobileLabel: 'Phone', render: (r) => r.phone || '—' },
                  {
                    key: 'active',
                    header: 'Status',
                    mobileOrder: 3,
                    mobileLabel: 'Status',
                    render: (r) => <StatusChip variant={r.isActive ? 'success' : 'warning'}>{r.isActive ? 'Active' : 'Inactive'}</StatusChip>,
                  },
                  {
                    key: 'commission',
                    header: 'Commission',
                    mobileOrder: 4,
                    mobileLabel: 'Commission',
                    hideBelow: 'md',
                    render: (r) => `${r.commissionPercentage || 0}%`,
                  },
                ]}
                data={filtered}
                keyExtractor={(r) => r.id}
                onRowClick={(r) => (window.location.href = `/sitters/${r.id}`)}
                emptyMessage="No sitters"
              />
            </DataTableShell>
          )}
        </Section>
      </LayoutWrapper>
    </OwnerAppShell>
  );
}

