/**
 * Sitters Management Page - Normalized with App design system
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  AppPageHeader,
  AppFilterBar,
  AppTable,
  AppDrawer,
  AppErrorState,
  SavedViewsDropdown,
  AppStatusPill,
  BulkActionsConfirmModal,
} from '@/components/app';
import { usePersistedColumnVisibility, usePersistedFilters } from '@/hooks/usePersistedTableState';
import { AppShell } from '@/components/layout/AppShell';
import { SitterTierBadge } from '@/components/sitter';

interface Sitter extends Record<string, unknown> {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  personalPhone?: string | null;
  email: string;
  isActive: boolean;
  commissionPercentage?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  currentTier?: { id: string; name: string; priorityLevel: number } | null;
}

export default function SittersPage() {
  const [sitters, setSitters] = useState<Sitter[]>([]);
  const [tiers, setTiers] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { values: filterValues, setOne: setFilterValue, clear: clearFilters } = usePersistedFilters('sitters', { search: '', tier: 'all', status: 'all', sort: 'name' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkConfirm, setBulkConfirm] = useState<{ actionId: string; actionLabel: string } | null>(null);

  const [visibleColumns, setVisibleColumns] = usePersistedColumnVisibility('sitters', ['name', 'email', 'phone', 'tier', 'status', 'created']);

  useEffect(() => {
    fetchSitters();
    fetchTiers();
  }, []);

  const fetchSitters = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/sitters');
      if (!response.ok) throw new Error('Failed to fetch sitters');
      const data = await response.json();
      setSitters((data.sitters || []).map((s: any) => ({
        ...s,
        isActive: s.active !== false,
        currentTier: s.currentTier || null,
      })));
    } catch (err) {
      setError('Failed to load sitters');
      setSitters([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTiers = async () => {
    try {
      const response = await fetch('/api/sitter-tiers');
      if (response.ok) {
        const data = await response.json();
        setTiers(data.tiers || []);
      }
    } catch {
      // ignore
    }
  };

  const formatPhone = (phone: string | null | undefined) => {
    if (!phone) return '—';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    return phone;
  };

  const filteredSitters = useMemo(() => {
    let filtered = sitters;
    const search = (filterValues.search ?? '').toLowerCase();
    if (search) {
      filtered = filtered.filter(
        (s) =>
          s.firstName.toLowerCase().includes(search) ||
          s.lastName.toLowerCase().includes(search) ||
          s.email.toLowerCase().includes(search) ||
          s.phone.includes(search)
      );
    }
    const tier = filterValues.tier ?? 'all';
    if (tier !== 'all') {
      filtered = filtered.filter((s) => s.currentTier?.id === tier);
    }
    const status = filterValues.status ?? 'all';
    if (status !== 'all') {
      const active = status === 'active';
      filtered = filtered.filter((s) => s.isActive === active);
    }
    const sortBy = filterValues.sort ?? 'name';
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'name') return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      if (sortBy === 'tier') return (b.currentTier?.priorityLevel ?? 0) - (a.currentTier?.priorityLevel ?? 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return filtered;
  }, [sitters, filterValues]);

  const selectedSitter = useMemo(() => sitters.find((s) => s.id === selectedId), [sitters, selectedId]);

  const tierOptions = [{ value: 'all', label: 'All Tiers' }, ...tiers.map((t) => ({ value: t.id, label: t.name }))];

  return (
    <AppShell>
      <AppPageHeader
        title="Sitters"
        subtitle="Manage your pet care team"
        action={
          <div className="flex gap-2">
            <Link
              href="/bookings"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border-default)] px-4 py-2 text-sm font-medium no-underline hover:bg-[var(--color-surface-secondary)]"
            >
              <i className="fas fa-arrow-left" />
              Back to Bookings
            </Link>
            <button
              type="button"
              onClick={() => window.location.href = '/bookings/sitters?add=1'}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-teal-600)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-teal-700)]"
            >
              <i className="fas fa-plus" />
              Add Sitter
            </button>
          </div>
        }
      />

      {error && <AppErrorState message={error} onRetry={fetchSitters} />}

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <SavedViewsDropdown persistKey="sitters" />
        <AppFilterBar
          filters={[
            { key: 'search', label: 'Search', type: 'search', placeholder: 'Name, email, phone...' },
            { key: 'tier', label: 'Tier', type: 'select', options: tierOptions },
            {
              key: 'status',
              label: 'Status',
              type: 'select',
              options: [
                { value: 'all', label: 'All' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ],
            },
            {
              key: 'sort',
              label: 'Sort',
              type: 'select',
              options: [
                { value: 'name', label: 'Name' },
                { value: 'tier', label: 'Tier' },
                { value: 'created', label: 'Newest' },
              ],
            },
          ]}
          values={filterValues}
          onChange={(k, v) => setFilterValue(k, v)}
          onClear={clearFilters}
        />
      </div>

      <AppTable<Sitter>
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        columns={[
          {
            key: 'name',
            header: 'Sitter',
            render: (r) => (
              <div>
                <div className="font-medium text-[var(--color-text-primary)]">
                  {r.firstName} {r.lastName}
                </div>
                <div className="text-xs text-[var(--color-text-secondary)]">{r.email}</div>
              </div>
            ),
          },
          {
            key: 'tier',
            header: 'Tier',
            render: (r) =>
              r.currentTier ? (
                <SitterTierBadge tier={r.currentTier} />
              ) : (
                <span className="text-[var(--color-text-tertiary)]">No tier</span>
              ),
          },
          {
            key: 'status',
            header: 'Status',
            render: (r) => <AppStatusPill status={r.isActive ? 'active' : 'inactive'} />,
          },
          {
            key: 'commission',
            header: 'Commission',
            render: (r) => `${r.commissionPercentage ?? 80}%`,
          },
          {
            key: 'phone',
            header: 'Contact',
            render: (r) => formatPhone(r.phone),
          },
        ]}
        data={filteredSitters}
        keyExtractor={(r) => r.id}
        onRowClick={(r) => setSelectedId(r.id)}
        emptyMessage="No sitters found. Add your first sitter to get started."
        loading={loading}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onBulkAction={(actionId) => {
          const labels: Record<string, string> = { assign: 'Assign', message: 'Message', export: 'Export' };
          setBulkConfirm({ actionId, actionLabel: labels[actionId] ?? actionId });
        }}
        columnPicker
      />

      <BulkActionsConfirmModal
        isOpen={!!bulkConfirm}
        onClose={() => setBulkConfirm(null)}
        actionId={bulkConfirm?.actionId ?? ''}
        actionLabel={bulkConfirm?.actionLabel ?? ''}
        selectedCount={selectedIds.length}
        onConfirm={() => {
          console.log('Bulk action confirmed', bulkConfirm?.actionId, selectedIds);
          setSelectedIds([]);
        }}
      />

      <AppDrawer
        isOpen={!!selectedId}
        onClose={() => setSelectedId(null)}
        title={selectedSitter ? `${selectedSitter.firstName} ${selectedSitter.lastName}` : ''}
      >
        {selectedSitter && (
          <div className="space-y-4 text-sm">
            <p className="text-[var(--color-text-secondary)]">{selectedSitter.email}</p>
            <p className="text-[var(--color-text-secondary)]">{formatPhone(selectedSitter.phone)}</p>
            <p>
              <AppStatusPill status={selectedSitter.isActive ? 'active' : 'inactive'} />
            </p>
            <p>Commission: {selectedSitter.commissionPercentage ?? 80}%</p>
            <Link
              href={`/sitters/${selectedSitter.id}`}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border-default)] px-4 py-2 text-sm font-medium no-underline hover:bg-[var(--color-surface-secondary)]"
            >
              View full profile
            </Link>
          </div>
        )}
      </AppDrawer>
    </AppShell>
  );
}
