/**
 * Badge Component - System DNA Implementation
 * 
 * Status and type indicators with restrained styling.
 * Uses spatial hierarchy and energy levels appropriately.
 */

import React from 'react';
import { tokens } from '@/lib/design-tokens';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'danger';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, { background: string; color: string }> = {
  default: {
    background: tokens.colors.primary.opacity[10],
    color: tokens.colors.primary.focused,
  },
  success: {
    background: tokens.colors.success[50],
    color: tokens.colors.success[600],
  },
  warning: {
    background: tokens.colors.warning[50],
    color: tokens.colors.warning[600],
  },
  error: {
    background: tokens.colors.error[50],
    color: tokens.colors.error[600],
  },
  info: {
    background: tokens.colors.info[50],
    color: tokens.colors.info[600],
  },
  neutral: {
    background: tokens.colors.neutral[100],
    color: tokens.colors.neutral[700],
  },
  danger: {
    background: tokens.colors.error[50],
    color: tokens.colors.error[600],
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
        padding: `${tokens.spacing[1]} ${tokens.spacing[2]}`,
        fontSize: tokens.typography.fontSize.xs[0],
        fontWeight: tokens.typography.fontWeight.medium,
        lineHeight: '1',
        borderRadius: tokens.borderRadius.full,
        backgroundColor: style.background,
        color: style.color,
        ...props.style,
      }}
    >
      {children}
    </span>
  );
};
