/**
 * Dispatch - Route scaffold
 * Header + actions, filter bar, table, drawer detail, loading/empty/error states.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import {
  AppPageHeader,
  AppFilterBar,
  AppTable,
  AppDrawer,
  AppErrorState,
  SavedViewsDropdown,
} from '@/components/app';
import { useAuth } from '@/lib/auth-client';
import { tokens } from '@/lib/design-tokens';

const STUB_DISPATCH = [
  { id: '1', client: 'Jane Doe', sitter: 'Sarah M.', time: '10:00 AM', status: 'in_progress' },
  { id: '2', client: 'Bob Smith', sitter: '—', time: '2:00 PM', status: 'pending' },
];

export default function DispatchPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [savedView, setSavedView] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login?redirect=/dispatch');
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span style={{ color: tokens.colors.text.secondary }}>Loading...</span>
      </div>
    );
  }
  if (!user) return null;

  return (
    <AppShell>
      <AppPageHeader
        title="Dispatch"
        subtitle="Assign and manage visit schedules"
        action={
          <button
            type="button"
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            New Assignment
          </button>
        }
      />

      {error && <AppErrorState message={error} onRetry={() => setError(null)} />}

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <SavedViewsDropdown value={savedView} onChange={setSavedView} />
        <AppFilterBar
        filters={[
          { key: 'status', label: 'Status', type: 'select', options: [
            { value: 'pending', label: 'Pending' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' },
          ]},
          { key: 'search', label: 'Search', type: 'search', placeholder: 'Client or sitter...' },
        ]}
        values={filterValues}
        onChange={(k, v) => setFilterValues((p) => ({ ...p, [k]: v }))}
        onClear={() => setFilterValues({})}
        />
      </div>

      <div className="mt-4">
        <AppTable
          columns={[
            { key: 'client', header: 'Client' },
            { key: 'sitter', header: 'Sitter' },
            { key: 'time', header: 'Time' },
            { key: 'status', header: 'Status', statusKey: 'status' },
          ]}
          data={STUB_DISPATCH}
          keyExtractor={(r) => r.id}
          onRowClick={(r) => setSelectedId(r.id)}
          emptyMessage="No assignments"
          loading={loading}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onBulkAction={(actionId, ids) => console.log('Bulk action', actionId, ids)}
          columnPicker
        />
      </div>

      <AppDrawer
        isOpen={!!selectedId}
        onClose={() => setSelectedId(null)}
        title={selectedId ? `Assignment #${selectedId}` : ''}
      >
        {selectedId && (
          <div className="space-y-4 text-sm">
            <p>Detail view placeholder for assignment {selectedId}</p>
          </div>
        )}
      </AppDrawer>
    </AppShell>
  );
}
