/**
 * Badge Component - Control Surface
 * 
 * Communicates state without screaming.
 * Restrained, purposeful, intelligent.
 */

import React from 'react';
import { controlSurface } from '@/lib/design-tokens-control-surface';
import { usePosture } from './PostureProvider';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', children, style, ...props }) => {
  const { config } = usePosture();

  const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
    default: {
      backgroundColor: controlSurface.colors.base.depth2,
      color: controlSurface.colors.base.neutral.primary,
      border: controlSurface.spatial.border.subtle,
    },
    success: {
      backgroundColor: controlSurface.colors.status.success.subtle,
      color: controlSurface.colors.status.success.base,
      border: controlSurface.spatial.border.subtle,
    },
    warning: {
      backgroundColor: controlSurface.colors.status.warning.subtle,
      color: controlSurface.colors.status.warning.base,
      border: controlSurface.spatial.border.subtle,
    },
    error: {
      backgroundColor: controlSurface.colors.status.error.subtle,
      color: controlSurface.colors.status.error.base,
      border: controlSurface.spatial.border.subtle,
    },
    info: {
      backgroundColor: controlSurface.colors.status.info.subtle,
      color: controlSurface.colors.status.info.base,
      border: controlSurface.spatial.border.subtle,
    },
    neutral: {
      backgroundColor: controlSurface.colors.base.depth1,
      color: controlSurface.colors.base.neutral.secondary,
      border: controlSurface.spatial.border.subtle,
    },
  };

  return (
    <span
      {...props}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: `${controlSurface.spacing[1]} ${controlSurface.spacing[2]}`,
        borderRadius: controlSurface.spatial.radius.full,
        fontSize: controlSurface.typography.fontSize.xs[0] as string,
        fontWeight: controlSurface.typography.fontWeight.medium,
        letterSpacing: '0.02em',
        fontFamily: controlSurface.typography.fontFamily.sans.join(', '),
        ...variantStyles[variant],
        ...style,
      }}
    >
      {children}
    </span>
  );
};

