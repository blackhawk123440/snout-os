'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
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
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [total, setTotal] = useState(0);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (filters.search) params.set('search', filters.search);
      if (filters.active && filters.active !== 'all') params.set('status', filters.active);
      const res = await fetch(`/api/sitters?${params.toString()}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to load sitters');
      setRows(Array.isArray(json.items) ? json.items : []);
      setTotal(typeof json.total === 'number' ? json.total : 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sitters');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [page, pageSize, filters.search, filters.active]);

  const filtered = useMemo(() => rows, [rows]);

  const activeFilterCount = Number(Boolean(filters.search)) + Number(filters.active !== 'all');

  return (
    <OwnerAppShell>
      <LayoutWrapper variant="wide">
        <PageHeader
          title="Sitters"
          subtitle="Operator assignment and availability surface"
          actions={
            <Link href="/bookings/new">
              <Button leftIcon={<Plus className="w-3.5 h-3.5" />}>New booking</Button>
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
              onChange={(k, v) => {
                setFilters((p) => ({ ...p, [k]: v }));
                setPage(1);
              }}
              onClear={() => {
                setFilters({ search: '', active: 'all' });
                setPage(1);
              }}
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
            <>
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
                          <div className="text-xs text-text-secondary">{r.email || 'No email'}</div>
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
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-text-secondary">
                  Page {page} · {total} sitters
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

