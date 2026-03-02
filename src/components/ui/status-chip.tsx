'use client';

/**
 * StatusChip - Enterprise status indicators.
 * Subtle background + border + text. Not loud.
 */

import { cn } from './utils';

export type StatusChipVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const VARIANT_STYLES: Record<StatusChipVariant, string> = {
  neutral:
    'border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]',
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200',
  warning:
    'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200',
  danger:
    'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200',
  info:
    'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-200',
};

export interface StatusChipProps {
  children: React.ReactNode;
  variant?: StatusChipVariant;
  className?: string;
}

export function StatusChip({ children, variant = 'neutral', className }: StatusChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
        VARIANT_STYLES[variant],
        className
      )}
      role="status"
    >
      {children}
    </span>
  );
}
