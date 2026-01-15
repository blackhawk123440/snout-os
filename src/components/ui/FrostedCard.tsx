/**
 * FrostedCard Component
 * UI Constitution V1 - Surface Component
 * 
 * Frosted glass effect card with token blur, border, shadow, radius.
 * Interactive and non-interactive variants with hover and focus states.
 * 
 * @example
 * ```tsx
 * <FrostedCard
 *   interactive
 *   header={<h3>Title</h3>}
 *   footer={<Button>Action</Button>}
 * >
 *   Card content
 * </FrostedCard>
 * ```
 */

'use client';

import { ReactNode } from 'react';
import { tokens } from '@/lib/design-tokens';
import { cn } from './utils';

export interface FrostedCardProps {
  children?: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
  'data-testid'?: string;
}

export function FrostedCard({
  children,
  header,
  footer,
  interactive = false,
  onClick,
  className,
  'data-testid': testId,
}: FrostedCardProps) {
  return (
    <div
      data-testid={testId || 'frosted-card'}
      className={cn('frosted-card', className)}
      onClick={interactive ? onClick : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={(e) => {
        if (interactive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick?.();
        }
      }}
      style={{
        backgroundColor: tokens.colors.surface.frosted.mid, // Phase 8: Use frosted.mid
        backdropFilter: `blur(${tokens.blur.md}) saturate(180%)`, // Phase 8: Enhanced blur with saturation
        WebkitBackdropFilter: `blur(${tokens.blur.md}) saturate(180%)`,
        border: `1px solid ${tokens.colors.border.default}`,
        borderRadius: tokens.radius.lg,
        boxShadow: tokens.shadow.sm,
        padding: tokens.spacing[6], // Phase 8: Refined padding
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacing[4],
        transition: `all ${tokens.motion.duration.fast} ${tokens.motion.easing.standard}`, // Phase 8: Faster, smoother
        cursor: interactive ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        if (interactive) {
          e.currentTarget.style.boxShadow = tokens.shadow.md;
          e.currentTarget.style.transform = 'translateY(-1px)'; // Phase 8: Subtle lift
          e.currentTarget.style.transition = `all ${tokens.motion.duration.instant} ${tokens.motion.easing.standard}`;
        }
      }}
      onMouseLeave={(e) => {
        if (interactive) {
          e.currentTarget.style.boxShadow = tokens.shadow.sm;
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.transition = `all ${tokens.motion.duration.fast} ${tokens.motion.easing.decelerated}`;
        }
      }}
      onFocus={(e) => {
        if (interactive) {
          e.currentTarget.style.outline = `2px solid ${tokens.colors.border.focus}`;
          e.currentTarget.style.outlineOffset = '2px';
          e.currentTarget.style.boxShadow = tokens.shadow.md;
        }
      }}
      onBlur={(e) => {
        if (interactive) {
          e.currentTarget.style.outline = 'none';
          e.currentTarget.style.boxShadow = tokens.shadow.sm;
        }
      }}
    >
      {header && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: tokens.spacing[4],
          }}
        >
          {header}
        </div>
      )}
      
      {children && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children}
        </div>
      )}
      
      {footer && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: tokens.spacing[2],
            paddingTop: tokens.spacing[4],
            borderTop: `1px solid ${tokens.colors.border.muted}`,
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
