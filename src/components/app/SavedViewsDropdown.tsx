'use client';

import React from 'react';

export interface SavedView {
  id: string;
  label: string;
}

export interface SavedViewsDropdownProps {
  views?: SavedView[];
  value?: string;
  onChange?: (id: string) => void;
  className?: string;
}

const DEFAULT_VIEWS: SavedView[] = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This week' },
  { id: 'my_sitters', label: 'My sitters' },
  { id: 'unassigned', label: 'Unassigned' },
];

export function SavedViewsDropdown({
  views = DEFAULT_VIEWS,
  value = 'all',
  onChange,
  className = '',
}: SavedViewsDropdownProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className={`rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-teal-500)] focus:outline-none focus:ring-1 focus:ring-[var(--color-teal-500)] ${className}`}
      style={{ padding: 'var(--density-row) var(--density-gap)' }}
      aria-label="Saved view"
    >
      {views.map((v) => (
        <option key={v.id} value={v.id}>
          {v.label}
        </option>
      ))}
    </select>
  );
}
