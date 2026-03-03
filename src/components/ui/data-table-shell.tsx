'use client';

/**
 * DataTableShell - Wraps tables in overflow container for mobile usability.
 * Subtle shadow edge hint. Use sticky thead on the table for sticky headers.
 */

import { cn } from './utils';

export interface DataTableShellProps {
  children: React.ReactNode;
  className?: string;
}

export function DataTableShell({ children, className }: DataTableShellProps) {
  return (
    <div
      className={cn(
        'overflow-x-auto rounded-lg border border-[var(--color-border-default)]',
        'shadow-[inset_-8px_0_8px_-8px_rgba(0,0,0,0.06)]',
        className
      )}
    >
      {children}
    </div>
  );
}
