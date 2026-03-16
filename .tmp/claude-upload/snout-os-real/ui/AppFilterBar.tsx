/**
 * AppFilterBar — Filter bar with saved views for list pages
 * Drop into: src/components/app/AppFilterBar.tsx
 *
 * Closes UI_DONE_CHECKLIST:
 * - [x] AppFilterBar on list pages
 * - [x] Saved Views dropdown (All / Today / This week / My sitters etc.)
 * - [x] data-density affects filter bar padding
 * - [x] Dark mode: filter inputs, borders
 */

'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/components/ui/utils';

// ── Types ──

export interface SavedView {
  id: string;
  label: string;
  filters: Record<string, string>;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'search' | 'date';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface AppFilterBarProps {
  filters: FilterConfig[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onClear?: () => void;
  savedViews?: SavedView[];
  activeView?: string;
  onViewChange?: (viewId: string) => void;
  className?: string;
}

export const AppFilterBar: React.FC<AppFilterBarProps> = ({
  filters,
  values,
  onChange,
  onClear,
  savedViews,
  activeView,
  onViewChange,
  className,
}) => {
  const hasActiveFilters = Object.values(values).some((v) => v && v !== 'all' && v !== '');

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-[var(--density-gap)] rounded-lg border border-border-default bg-surface-overlay px-[var(--density-padding)] py-[var(--density-row)]',
        className
      )}
    >
      {/* Saved Views */}
      {savedViews && savedViews.length > 0 && (
        <div className="flex items-center gap-1 border-r border-border-muted pr-[var(--density-gap)]">
          {savedViews.map((view) => (
            <button
              key={view.id}
              onClick={() => onViewChange?.(view.id)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-fast',
                activeView === view.id
                  ? 'bg-accent-primary text-text-inverse'
                  : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'
              )}
            >
              {view.label}
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      {filters.map((filter) => (
        <div key={filter.key} className="flex items-center">
          {filter.type === 'search' && (
            <div className="relative">
              <i className="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-text-disabled" />
              <input
                type="text"
                value={values[filter.key] || ''}
                onChange={(e) => onChange(filter.key, e.target.value)}
                placeholder={filter.placeholder || `Search ${filter.label.toLowerCase()}...`}
                className="h-8 w-48 rounded border border-border-default bg-surface-primary pl-7 pr-2.5 text-xs text-text-primary placeholder:text-text-disabled focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary transition-colors"
              />
            </div>
          )}
          {filter.type === 'select' && filter.options && (
            <select
              value={values[filter.key] || ''}
              onChange={(e) => onChange(filter.key, e.target.value)}
              className="h-8 rounded border border-border-default bg-surface-primary px-2.5 text-xs text-text-primary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary transition-colors"
            >
              <option value="">{filter.label}</option>
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}
          {filter.type === 'date' && (
            <input
              type="date"
              value={values[filter.key] || ''}
              onChange={(e) => onChange(filter.key, e.target.value)}
              className="h-8 rounded border border-border-default bg-surface-primary px-2.5 text-xs text-text-primary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary transition-colors"
            />
          )}
        </div>
      ))}

      {/* Clear */}
      {hasActiveFilters && onClear && (
        <button
          onClick={onClear}
          className="ml-auto text-xs text-text-tertiary hover:text-accent-primary transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  );
};
