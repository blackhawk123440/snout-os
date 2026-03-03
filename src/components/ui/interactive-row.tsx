'use client';

/**
 * InteractiveRow - Clickable table/list row with enterprise hover affordance.
 * Use for messages list, bookings list, payouts/reconciliation tables.
 */

import { forwardRef } from 'react';
import { cn } from './utils';

export interface InteractiveRowProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  as?: 'div' | 'tr';
}

export const InteractiveRow = forwardRef<HTMLDivElement, InteractiveRowProps>(
  ({ children, className, as: As = 'div', ...props }, ref) => {
    const base =
      'cursor-pointer transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1';
    const hover = 'hover:bg-slate-50';
    const active = 'active:bg-slate-100';

    if (As === 'tr') {
      return (
        <tr
          ref={ref as React.Ref<HTMLTableRowElement>}
          className={cn(base, hover, active, 'border-b border-slate-200', className)}
          {...(props as React.HTMLAttributes<HTMLTableRowElement>)}
        >
          {children}
        </tr>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(base, hover, active, 'border-b border-slate-200', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

InteractiveRow.displayName = 'InteractiveRow';
