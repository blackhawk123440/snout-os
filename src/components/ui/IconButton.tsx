/**
 * IconButton Component
 * UI Constitution V1 - Control Component
 * 
 * Icon-only button with variants, sizes, loading state, and full accessibility.
 * 
 * @example
 * ```tsx
 * <IconButton
 *   icon={<CloseIcon />}
 *   variant="ghost"
 *   size="md"
 *   aria-label="Close dialog"
 *   onClick={() => {}}
 * />
 * ```
 */

'use client';

import { ReactNode } from 'react';
import { tokens } from '@/lib/design-tokens';
import { useMobile } from '@/lib/use-mobile';
import { Size, Variant } from './types';
import { cn } from './utils';

export interface IconButtonProps {
  icon: ReactNode;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  'aria-label': string;
  className?: string;
  'data-testid'?: string;
}

export function IconButton({
  icon,
  variant = 'ghost',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  'aria-label': ariaLabel,
  className,
  'data-testid': testId,
}: IconButtonProps) {
  const isMobile = useMobile();
  const effectiveDisabled = disabled || loading;

  const variantStyles = {
    primary: {
      backgroundColor: tokens.colors.primary.DEFAULT,
      color: tokens.colors.text.inverse,
      border: `1px solid ${tokens.colors.primary.DEFAULT}`,
    },
    secondary: {
      backgroundColor: tokens.colors.surface.primary,
      color: tokens.colors.text.primary,
      border: `1px solid ${tokens.colors.border.default}`,
    },
    ghost: {
      backgroundColor: 'transparent',
      color: tokens.colors.text.secondary,
      border: '1px solid transparent',
    },
    destructive: {
      backgroundColor: tokens.colors.error.DEFAULT,
      color: tokens.colors.text.inverse,
      border: `1px solid ${tokens.colors.error.DEFAULT}`,
    },
    error: {
      backgroundColor: tokens.colors.error.DEFAULT,
      color: tokens.colors.text.inverse,
      border: `1px solid ${tokens.colors.error.DEFAULT}`,
    },
    success: {
      backgroundColor: tokens.colors.success.DEFAULT,
      color: tokens.colors.text.inverse,
      border: `1px solid ${tokens.colors.success.DEFAULT}`,
    },
    warning: {
      backgroundColor: tokens.colors.warning.DEFAULT,
      color: tokens.colors.text.inverse,
      border: `1px solid ${tokens.colors.warning.DEFAULT}`,
    },
    info: {
      backgroundColor: tokens.colors.info.DEFAULT,
      color: tokens.colors.text.inverse,
      border: `1px solid ${tokens.colors.info.DEFAULT}`,
    },
  };

  const sizeStyles = {
    sm: {
      width: isMobile ? '44px' : '32px',
      height: isMobile ? '44px' : '32px',
      fontSize: tokens.typography.fontSize.sm[0],
    },
    md: {
      width: '44px',
      height: '44px',
      fontSize: tokens.typography.fontSize.base[0],
    },
    lg: {
      width: '48px',
      height: '48px',
      fontSize: tokens.typography.fontSize.lg[0],
    },
  };

  const baseStyles = variantStyles[variant] || variantStyles.ghost;
  const sizeConfig = sizeStyles[size];

  return (
    <button
      data-testid={testId || 'icon-button'}
      className={cn('icon-button', className)}
      type="button"
      onClick={onClick}
      disabled={effectiveDisabled}
      aria-label={loading ? `${ariaLabel} (loading)` : ariaLabel}
      aria-busy={loading}
      style={{
        ...baseStyles,
        ...sizeConfig,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: tokens.radius.md,
        padding: 0,
        cursor: effectiveDisabled ? 'not-allowed' : 'pointer',
        opacity: effectiveDisabled ? 0.6 : 1,
        transition: `all ${tokens.motion.duration.fast} ${tokens.motion.easing.standard}`,
        border: baseStyles.border,
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        if (!effectiveDisabled && variant === 'ghost') {
          e.currentTarget.style.backgroundColor = tokens.colors.accent.secondary;
          e.currentTarget.style.color = tokens.colors.text.primary;
        }
      }}
      onMouseLeave={(e) => {
        if (!effectiveDisabled && variant === 'ghost') {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = tokens.colors.text.secondary;
        }
      }}
      onFocus={(e) => {
        if (!effectiveDisabled) {
          e.currentTarget.style.outline = `2px solid ${tokens.colors.border.focus}`;
          e.currentTarget.style.outlineOffset = '2px';
        }
      }}
      onBlur={(e) => {
        e.currentTarget.style.outline = 'none';
      }}
    >
      {loading ? (
        <span
          style={{
            display: 'inline-block',
            width: '16px',
            height: '16px',
            border: `2px solid ${variant === 'ghost' ? tokens.colors.text.secondary : 'currentColor'}`,
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
          }}
          aria-hidden="true"
        />
      ) : (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </span>
      )}
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </button>
  );
}
