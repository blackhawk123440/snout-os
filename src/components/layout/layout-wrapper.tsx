'use client';

/**
 * LayoutWrapper - Consistent max width, padding, vertical rhythm.
 * Enterprise layout with page gutters across roles.
 */

import { ReactNode } from 'react';
import { cn } from '@/components/ui/utils';

export type LayoutVariant = 'default' | 'wide' | 'narrow';

export interface LayoutWrapperProps {
  children: ReactNode;
  variant?: LayoutVariant;
  className?: string;
}

const MAX_WIDTH: Record<LayoutVariant, string> = {
  default: 'max-w-5xl',
  wide: 'max-w-7xl',
  narrow: 'max-w-6xl',
};

export function LayoutWrapper({ children, variant = 'default', className }: LayoutWrapperProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 pt-4 pb-5 sm:px-6 lg:px-8',
        MAX_WIDTH[variant],
        'flex flex-col gap-4',
        className
      )}
    >
      {children}
    </div>
  );
}
