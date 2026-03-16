/**
 * AppChartCard — Standardized chart wrapper
 * Drop into: src/components/app/AppChartCard.tsx
 *
 * Closes UI_DONE_CHECKLIST:
 * - [x] AppChartCard used everywhere
 * - [x] AppChartCard: title, subtitle, timeframe selector
 * - [x] Placeholder skeleton, empty, error states
 * - [x] Dark mode: chart placeholder backgrounds
 */

'use client';

import React, { useState } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/utils';

export interface TimeframeOption {
  value: string;
  label: string;
}

export interface AppChartCardProps {
  title: string;
  subtitle?: string;
  timeframes?: TimeframeOption[];
  activeTimeframe?: string;
  onTimeframeChange?: (value: string) => void;
  isLoading?: boolean;
  isEmpty?: boolean;
  error?: string | null;
  onRetry?: () => void;
  children: React.ReactNode;
  className?: string;
  headerRight?: React.ReactNode;
}

export const AppChartCard: React.FC<AppChartCardProps> = ({
  title,
  subtitle,
  timeframes,
  activeTimeframe,
  onTimeframeChange,
  isLoading,
  isEmpty,
  error,
  onRetry,
  children,
  className,
  headerRight,
}) => {
  // ── Loading ──
  if (isLoading) {
    return (
      <div className={cn('rounded-lg border border-border-default bg-surface-overlay p-[var(--density-padding)]', className)}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <Skeleton width="40%" height="0.875rem" variant="text" />
            {subtitle && <Skeleton width="60%" height="0.625rem" variant="text" style={{ marginTop: 4 }} />}
          </div>
          {timeframes && (
            <div className="flex gap-1">
              {timeframes.map((_, i) => (
                <Skeleton key={i} width={48} height={28} />
              ))}
            </div>
          )}
        </div>
        <div className="flex items-end gap-1" style={{ height: '12rem' }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} width="100%" height={`${25 + Math.random() * 70}%`} style={{ flex: 1 }} />
          ))}
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className={cn('rounded-lg border border-border-default bg-surface-overlay p-[var(--density-padding)]', className)}>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-500">
            <i className="fas fa-exclamation-triangle" />
          </div>
          <p className="text-sm font-medium text-text-primary">Failed to load chart</p>
          <p className="mt-1 text-xs text-text-tertiary">{error}</p>
          {onRetry && (
            <Button variant="secondary" size="sm" onClick={onRetry} className="mt-3">
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── Empty ──
  if (isEmpty) {
    return (
      <div className={cn('rounded-lg border border-border-default bg-surface-overlay p-[var(--density-padding)]', className)}>
        <div className="mb-3 text-sm font-semibold text-text-primary">{title}</div>
        <EmptyState
          title="Not enough data"
          description="Complete a few more bookings to see trends here."
        />
      </div>
    );
  }

  // ── Chart ──
  return (
    <div className={cn('rounded-lg border border-border-default bg-surface-overlay p-[var(--density-padding)]', className)}>
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-text-tertiary">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {timeframes && timeframes.length > 0 && (
            <div className="flex rounded border border-border-default overflow-hidden">
              {timeframes.map((tf) => (
                <button
                  key={tf.value}
                  onClick={() => onTimeframeChange?.(tf.value)}
                  className={cn(
                    'px-2.5 py-1 text-xs font-medium transition-colors',
                    activeTimeframe === tf.value
                      ? 'bg-accent-primary text-text-inverse'
                      : 'bg-surface-primary text-text-secondary hover:bg-surface-secondary'
                  )}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          )}
          {headerRight}
        </div>
      </div>

      {/* Chart content */}
      {children}
    </div>
  );
};
