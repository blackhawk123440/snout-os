/**
 * Badge Component
 * 
 * Status and type indicators with semantic variants.
 */

import React from 'react';
import { tokens } from '@/lib/design-tokens';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, { background: string; color: string; border?: string }> = {
  default: {
    background: tokens.colors.primary[100],
    color: tokens.colors.primary[700],
  },
  success: {
    background: tokens.colors.success[100],
    color: tokens.colors.success[700],
  },
  warning: {
    background: tokens.colors.warning[100],
    color: tokens.colors.warning[700],
  },
  error: {
    background: tokens.colors.error[100],
    color: tokens.colors.error[700],
  },
  info: {
    background: tokens.colors.info[100],
    color: tokens.colors.info[700],
  },
  neutral: {
    background: tokens.colors.neutral[100],
    color: tokens.colors.neutral[700],
  },
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  children,
  className = '',
  ...props
}) => {
  const style = variantStyles[variant];

  return (
    <span
      {...props}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: `${tokens.spacing[1.5] || tokens.spacing[2]} ${tokens.spacing[3]}`,
        fontSize: tokens.typography.fontSize.xs[0],
        fontWeight: tokens.typography.fontWeight.bold,
        lineHeight: '1.2',
        borderRadius: tokens.borderRadius.full,
        backgroundColor: style.background,
        color: style.color,
        border: style.border ? `1px solid ${style.border}` : 'none',
        letterSpacing: '0.03em',
        whiteSpace: 'nowrap',
        ...props.style,
      }}
    >
      {children}
    </span>
  );
};

