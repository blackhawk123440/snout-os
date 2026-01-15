/**
 * Panel Component
 * UI Constitution V1 - Surface Component
 * 
 * Non-frosted surface for dense data zones.
 * Used for table containers and calendar surfaces.
 * 
 * @example
 * ```tsx
 * <Panel>
 *   <DataTable data={rows} columns={columns} />
 * </Panel>
 * ```
 */

'use client';

import { ReactNode } from 'react';
import { tokens } from '@/lib/design-tokens';
import { cn } from './utils';

export interface PanelProps {
  children?: ReactNode;
  padding?: boolean | keyof typeof tokens.spacing;
  className?: string;
  'data-testid'?: string;
}

export function Panel({
  children,
  padding = true,
  className,
  'data-testid': testId,
}: PanelProps) {
  const paddingValue = padding === true
    ? tokens.spacing[6]
    : padding === false
    ? 0
    : tokens.spacing[padding];

  return (
    <div
      data-testid={testId || 'panel'}
      className={cn('panel', className)}
      style={{
        backgroundColor: tokens.colors.surface.frosted.low, // Phase 8: Use frosted.low
        border: `1px solid ${tokens.colors.border.default}`,
        borderRadius: tokens.radius.lg, // Phase 8: Larger radius for modern feel
        boxShadow: tokens.shadow.xs, // Phase 8: Subtle shadow
        padding: paddingValue || tokens.spacing[6], // Phase 8: Default refined padding
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {children}
    </div>
  );
}
