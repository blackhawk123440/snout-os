'use client';

import React from 'react';
import { AppCard } from './AppCard';

export interface AppChartCardProps {
  title: string;
  subtitle?: string;
  timeframe?: string;
  onTimeframeChange?: (value: string) => void;
  children?: React.ReactNode;
  loading?: boolean;
  empty?: boolean;
  error?: string;
  onRetry?: () => void;
  className?: string;
}

const TIMEFRAME_OPTIONS = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
];

export function AppChartCard({
  title,
  subtitle,
  timeframe = '30d',
  onTimeframeChange,
  children,
  loading = false,
  empty = false,
  error,
  onRetry,
  className = '',
}: AppChartCardProps) {
  return (
    <AppCard className={className}>
      <div className="px-5 pt-5 pb-3" style={{ padding: 'var(--density-padding)' }}>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{title}</h3>
            {subtitle && (
              <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{subtitle}</p>
            )}
          </div>
          {onTimeframeChange && (
            <select
              value={timeframe}
              onChange={(e) => onTimeframeChange(e.target.value)}
              className="mt-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] sm:mt-0"
              aria-label="Timeframe"
            >
              {TIMEFRAME_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      <div
        className="mx-5 mb-5 min-h-[200px] rounded-lg border-2 border-dashed border-[var(--color-border-muted)] bg-[var(--color-surface-secondary)]"
        style={{ padding: 'var(--density-padding)', margin: '0 var(--density-padding) var(--density-padding)' }}
      >
        {error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-[var(--color-text-secondary)]">{error}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-2 text-sm font-medium text-[var(--color-teal-600)] hover:underline"
              >
                Retry
              </button>
            )}
          </div>
        ) : loading ? (
          <div className="flex aspect-video animate-pulse items-center justify-center">
            <div className="h-32 w-full rounded bg-[var(--color-border-muted)]" />
          </div>
        ) : empty ? (
          <div className="flex aspect-video items-center justify-center text-sm text-[var(--color-text-tertiary)]">
            No data
          </div>
        ) : (
          children ?? (
            <div className="flex aspect-video items-center justify-center text-sm text-[var(--color-text-tertiary)]">
              Chart placeholder
            </div>
          )
        )}
      </div>
    </AppCard>
  );
}
