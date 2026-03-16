/**
 * AppTable — Enterprise Data Table
 * Drop into: src/components/app/AppTable.tsx
 *
 * Closes UI_DONE_CHECKLIST items:
 * - [x] AppTable used consistently across list pages
 * - [x] Column picker on AppTable (visibility toggle)
 * - [x] Bulk actions row (Assign / Message / Export) in table header
 * - [x] data-density affects row height and padding
 * - [x] Dark mode: table borders, pills, hover states
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { tokens } from '@/lib/design-tokens';
import { useMobile } from '@/lib/use-mobile';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/utils';

// ── Types ──

export interface AppTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  hiddenByDefault?: boolean;
  align?: 'left' | 'center' | 'right';
}

export interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  onClick: (selectedIds: string[]) => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface AppTableProps<T extends { id: string }> {
  columns: AppTableColumn<T>[];
  data: T[];
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyState?: React.ReactNode;
  bulkActions?: BulkAction[];
  onRowClick?: (row: T) => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  stickyHeader?: boolean;
  className?: string;
  /** Number of skeleton rows to show while loading */
  skeletonRows?: number;
}

// ── Column Picker ──

function ColumnPicker<T>({
  columns,
  visibleKeys,
  onToggle,
}: {
  columns: AppTableColumn<T>[];
  visibleKeys: Set<string>;
  onToggle: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded border border-border-default bg-surface-primary px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors duration-fast"
        aria-label="Toggle columns"
      >
        <i className="fas fa-columns text-[10px]" />
        Columns
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-layer-floating" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-layer-floating mt-1 w-52 rounded-lg border border-border-default bg-surface-overlay shadow-lg p-1.5">
            {columns.map((col) => (
              <label
                key={col.key}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-surface-secondary transition-colors"
              >
                <input
                  type="checkbox"
                  checked={visibleKeys.has(col.key)}
                  onChange={() => onToggle(col.key)}
                  className="h-3.5 w-3.5 rounded border-border-default text-accent-primary focus:ring-accent-primary"
                />
                <span className="text-text-primary">{col.header}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Component ──

export function AppTable<T extends { id: string }>({
  columns,
  data,
  isLoading = false,
  isEmpty = false,
  emptyState,
  bulkActions,
  onRowClick,
  sortKey,
  sortDirection,
  onSort,
  stickyHeader = true,
  className,
  skeletonRows = 8,
}: AppTableProps<T>) {
  const isMobile = useMobile();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(
    () => new Set(columns.filter((c) => !c.hiddenByDefault).map((c) => c.key))
  );

  const visibleColumns = useMemo(
    () => columns.filter((c) => visibleKeys.has(c.key)),
    [columns, visibleKeys]
  );

  const toggleColumn = useCallback((key: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key); // Keep at least 1
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map((r) => r.id)));
    }
  }, [data, selectedIds.size]);

  const toggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const hasBulk = bulkActions && bulkActions.length > 0;
  const hasSelection = selectedIds.size > 0;

  // ── Loading State ──
  if (isLoading) {
    return (
      <div className={cn('overflow-hidden rounded-lg border border-border-default bg-surface-overlay', className)}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-default bg-surface-secondary">
                {hasBulk && <th className="w-10 px-3 py-[var(--density-row)]" />}
                {visibleColumns.map((col) => (
                  <th key={col.key} className="px-3 py-[var(--density-row)] text-left">
                    <Skeleton width="60%" height="0.625rem" variant="text" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={i} className="border-b border-border-muted last:border-0">
                  {hasBulk && <td className="px-3 py-[var(--density-row)]"><Skeleton width={16} height={16} /></td>}
                  {visibleColumns.map((col, ci) => (
                    <td key={col.key} className="px-3 py-[var(--density-row)]">
                      <Skeleton width={ci === 0 ? '70%' : `${40 + (ci * 7) % 30}%`} height="0.625rem" variant="text" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Empty State ──
  if (isEmpty || data.length === 0) {
    return (
      <div className={cn('rounded-lg border border-border-default bg-surface-overlay', className)}>
        {emptyState || (
          <EmptyState
            title="No data"
            description="There's nothing here yet."
          />
        )}
      </div>
    );
  }

  // ── Table ──
  return (
    <div className={cn('overflow-hidden rounded-lg border border-border-default bg-surface-overlay', className)}>
      {/* Bulk Actions Bar */}
      {hasSelection && hasBulk && (
        <div className="flex items-center gap-2 border-b border-border-default bg-accent-secondary px-3 py-2">
          <span className="text-xs font-medium text-accent-primary">
            {selectedIds.size} selected
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            {bulkActions!.map((action) => (
              <Button
                key={action.label}
                variant={action.variant || 'secondary'}
                size="sm"
                onClick={() => action.onClick(Array.from(selectedIds))}
                leftIcon={action.icon}
              >
                {action.label}
              </Button>
            ))}
          </div>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-2 text-xs text-text-tertiary hover:text-text-primary"
          >
            Clear
          </button>
        </div>
      )}

      {/* Column Picker (top-right) */}
      {!isMobile && (
        <div className="flex items-center justify-end border-b border-border-muted px-3 py-1.5">
          <ColumnPicker columns={columns} visibleKeys={visibleKeys} onToggle={toggleColumn} />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={cn(
              'border-b border-border-default bg-surface-secondary',
              stickyHeader && 'sticky top-0 z-[1]'
            )}>
              {hasBulk && (
                <th className="w-10 px-3 py-[var(--density-row)]">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === data.length && data.length > 0}
                    onChange={toggleAll}
                    className="h-3.5 w-3.5 rounded border-border-default text-accent-primary focus:ring-accent-primary"
                    aria-label="Select all"
                  />
                </th>
              )}
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-3 py-[var(--density-row)] text-[10px] font-semibold uppercase tracking-wider text-text-tertiary whitespace-nowrap',
                    col.align === 'center' && 'text-center',
                    col.align === 'right' && 'text-right',
                    col.sortable && 'cursor-pointer select-none hover:text-text-primary'
                  )}
                  style={{ width: col.width }}
                  onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      <i className={`fas fa-chevron-${sortDirection === 'asc' ? 'up' : 'down'} text-[8px]`} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b border-border-muted last:border-0 transition-colors duration-fast',
                  onRowClick && 'cursor-pointer hover:bg-surface-secondary',
                  selectedIds.has(row.id) && 'bg-accent-secondary'
                )}
              >
                {hasBulk && (
                  <td className="px-3 py-[var(--density-row)]" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.id)}
                      onChange={() => toggleRow(row.id)}
                      className="h-3.5 w-3.5 rounded border-border-default text-accent-primary focus:ring-accent-primary"
                    />
                  </td>
                )}
                {visibleColumns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-3 py-[var(--density-row)] text-text-primary',
                      col.align === 'center' && 'text-center',
                      col.align === 'right' && 'text-right'
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
