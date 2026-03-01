'use client';

import React from 'react';
import { getStatusPill, type StatusPillVariant } from './getStatusPill';

/* WCAG AA: bg/foreground pairs chosen for 4.5:1+ contrast */
const VARIANT_CLASSES: Record<StatusPillVariant, string> = {
  default: 'bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]',
  success: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100',
  warning: 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100',
  error: 'bg-red-100 text-red-900 dark:bg-red-900/50 dark:text-red-100',
  info: 'bg-sky-100 text-sky-900 dark:bg-sky-900/50 dark:text-sky-100',
};

export interface AppStatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: number; label?: string };
  sublabel?: string;
  className?: string;
}

export function AppStatCard({ label, value, icon, trend, sublabel, className = '' }: AppStatCardProps) {
  return (
    <div
      className={`rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] shadow-sm transition hover:shadow-md ${className}`}
      style={{ padding: 'var(--density-padding)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">{label}</p>
          <p className="mt-1 truncate text-2xl font-bold text-[var(--color-text-primary)]">{value}</p>
          {sublabel && <p className="mt-0.5 text-xs text-[var(--color-text-tertiary)]">{sublabel}</p>}
          {trend !== undefined && (
            <p
              className={`mt-1 text-xs font-medium ${
                trend.value >= 0 ? 'text-[var(--color-teal-600)]' : 'text-red-600'
              }`}
            >
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%{trend.label ? ` ${trend.label}` : ''}
            </p>
          )}
        </div>
        {icon && <div className="shrink-0 text-2xl text-[var(--color-text-tertiary)]">{icon}</div>}
      </div>
    </div>
  );
}

export interface AppStatusPillProps {
  status: string;
  className?: string;
}

export function AppStatusPill({ status, className = '' }: AppStatusPillProps) {
  const { variant, label } = getStatusPill(status);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {label}
    </span>
  );
}
