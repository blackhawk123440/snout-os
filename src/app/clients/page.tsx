/**
 * Clients List Page - Normalized with App design system
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
  BulkActionsConfirmModal,
} from '@/components/app';
import { usePersistedColumnVisibility, usePersistedFilters } from '@/hooks/usePersistedTableState';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';

interface Client extends Record<string, unknown> {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  petCount?: number;
  lastBooking?: Date | string;
  totalBookings?: number;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { values: filterValues, setOne: setFilterValue, clear: clearFilters } = usePersistedFilters('clients', { search: '', sort: 'name' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkConfirm, setBulkConfirm] = useState<{ actionId: string; actionLabel: string } | null>(null);

  const [visibleColumns, setVisibleColumns] = usePersistedColumnVisibility('clients', ['name', 'phone', 'pets', 'bookings', 'lastBooking']);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/clients').catch(() => null);
      if (response?.ok) {
        const data = await response.json();
        setClients((data.clients || []).map((c: any) => ({
          ...c,
          lastBooking: c.lastBooking ? new Date(c.lastBooking) : null,
        })));
      }
    } catch (err) {
      setError('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'Never';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filteredClients = useMemo(() => {
    let filtered = clients;
    const search = (filterValues.search ?? '').toLowerCase();
    if (search) {
      filtered = filtered.filter(
        (c) =>
          c.firstName.toLowerCase().includes(search) ||
          c.lastName.toLowerCase().includes(search) ||
          c.phone.includes(search) ||
          c.email.toLowerCase().includes(search)
      );
    }
    const sortBy = filterValues.sort ?? 'name';
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      }
      if (sortBy === 'recent') {
        const aDate = a.lastBooking ? new Date(a.lastBooking).getTime() : 0;
        const bDate = b.lastBooking ? new Date(b.lastBooking).getTime() : 0;
        return bDate - aDate;
      }
      return (b.totalBookings || 0) - (a.totalBookings || 0);
    });
    return filtered;
  }, [clients, filterValues]);

  const selectedClient = useMemo(() => clients.find((c) => c.id === selectedId), [clients, selectedId]);

  return (
    <AppShell>
      <AppPageHeader
        title="Clients"
        subtitle="Manage client information and contact details"
        action={
          <Link
            href="/clients/new"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-teal-600)] px-4 py-2 text-sm font-medium text-white no-underline transition hover:bg-[var(--color-teal-700)]"
          >
            <i className="fas fa-plus" />
            New Client
          </Link>
        }
      />

      {error && <AppErrorState message={error} onRetry={fetchClients} />}

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <SavedViewsDropdown persistKey="clients" />
        <AppFilterBar
          filters={[
            { key: 'search', label: 'Search', type: 'search', placeholder: 'Name, email, phone...' },
            {
              key: 'sort',
              label: 'Sort',
              type: 'select',
              options: [
                { value: 'name', label: 'Name' },
                { value: 'recent', label: 'Most Recent' },
                { value: 'bookings', label: 'Most Bookings' },
              ],
            },
          ]}
          values={filterValues}
          onChange={(k, v) => setFilterValue(k, v)}
          onClear={clearFilters}
        />
      </div>

      <AppTable<Client>
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={setVisibleColumns}
          columns={[
            {
              key: 'name',
              header: 'Client',
              render: (r) => (
                <div>
                  <div className="font-medium text-[var(--color-text-primary)]">
                    {r.firstName} {r.lastName}
                  </div>
                  <div className="text-xs text-[var(--color-text-secondary)]">{r.email}</div>
                </div>
              ),
            },
            { key: 'phone', header: 'Phone' },
            {
              key: 'pets',
              header: 'Pets',
              render: (r) => String(r.petCount ?? 0),
            },
            {
              key: 'bookings',
              header: 'Bookings',
              render: (r) => String(r.totalBookings ?? 0),
            },
            {
              key: 'lastBooking',
              header: 'Last Booking',
              render: (r) => formatDate(r.lastBooking),
            },
          ]}
          data={filteredClients}
          keyExtractor={(r) => r.id}
          onRowClick={(r) => setSelectedId(r.id)}
          emptyMessage="No clients found. Add your first client to get started."
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
        title={selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : ''}
      >
        {selectedClient && (
          <div className="space-y-4 text-sm">
            <p className="text-[var(--color-text-secondary)]">{selectedClient.email}</p>
            <p className="text-[var(--color-text-secondary)]">{selectedClient.phone}</p>
            <p className="text-[var(--color-text-secondary)]">{selectedClient.address || '—'}</p>
            <p>
              Pets: {selectedClient.petCount ?? 0} · Bookings: {selectedClient.totalBookings ?? 0}
            </p>
            <Link
              href={`/clients/${selectedClient.id}`}
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
