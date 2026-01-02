/**
 * Button Component - Control Surface
 * 
 * Restrained, purposeful actions.
 * Voltage integration for focus states.
 */

import React from 'react';
import Link from 'next/link';
import { controlSurface } from '@/lib/design-tokens-control-surface';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
  asChild?: boolean;
  href?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  isLoading,
  children,
  disabled,
  href,
  asChild,
  style,
  ...props
}) => {
  // Variant styles
  const variantStyles = {
    primary: {
      backgroundColor: controlSurface.colors.base.depth2,
      color: controlSurface.colors.base.neutral.primary,
      border: controlSurface.spatial.border.voltage,
      boxShadow: `0 0 0 1px ${controlSurface.colors.voltage.edge}, ${controlSurface.spatial.elevation.panel}`,
      hover: {
        border: controlSurface.spatial.border.focus,
        boxShadow: `0 0 0 1px ${controlSurface.colors.voltage.focus}, ${controlSurface.spatial.elevation.elevated}`,
      },
    },
    secondary: {
      backgroundColor: controlSurface.colors.base.depth1,
      color: controlSurface.colors.base.neutral.primary,
      border: controlSurface.spatial.border.base,
      boxShadow: controlSurface.spatial.elevation.panel,
      hover: {
        border: controlSurface.spatial.border.voltage,
        boxShadow: `0 0 0 1px ${controlSurface.colors.voltage.edge}, ${controlSurface.spatial.elevation.panel}`,
      },
    },
    tertiary: {
      backgroundColor: 'transparent',
      color: controlSurface.colors.base.neutral.secondary,
      border: 'none',
      boxShadow: 'none',
      hover: {
        color: controlSurface.colors.base.neutral.primary,
        backgroundColor: controlSurface.colors.base.depth1,
      },
    },
    ghost: {
      backgroundColor: 'transparent',
      color: controlSurface.colors.base.neutral.tertiary,
      border: 'none',
      boxShadow: 'none',
      hover: {
        color: controlSurface.colors.base.neutral.secondary,
      },
    },
  };

  // Size styles
  const sizeStyles = {
    sm: {
      padding: `${controlSurface.spacing[2]} ${controlSurface.spacing[4]}`,
      fontSize: controlSurface.typography.fontSize.sm[0],
      gap: controlSurface.spacing[2],
    },
    md: {
      padding: `${controlSurface.spacing[3]} ${controlSurface.spacing[5]}`,
      fontSize: controlSurface.typography.fontSize.base[0],
      gap: controlSurface.spacing[3],
    },
    lg: {
      padding: `${controlSurface.spacing[4]} ${controlSurface.spacing[6]}`,
      fontSize: controlSurface.typography.fontSize.lg[0],
      gap: controlSurface.spacing[4],
    },
  };

  const baseStyle: React.CSSProperties = {
    backgroundColor: variantStyles[variant].backgroundColor,
    color: variantStyles[variant].color,
    border: variantStyles[variant].border,
    boxShadow: variantStyles[variant].boxShadow,
    borderRadius: controlSurface.spatial.radius.base,
    fontWeight: controlSurface.typography.fontWeight.medium,
    fontFamily: controlSurface.typography.fontFamily.sans.join(', '),
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: sizeStyles[size].padding,
    fontSize: sizeStyles[size].fontSize as string,
    gap: sizeStyles[size].gap,
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    opacity: disabled || isLoading ? 0.5 : 1,
    transition: `all ${controlSurface.motion.duration.base} ${controlSurface.motion.easing.ambient}`,
    outline: 'none',
    textDecoration: 'none',
    ...style,
  };

  const content = (
    <>
      {isLoading ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: sizeStyles[size].gap }}>
          <span>Loading...</span>
        </span>
      ) : (
        <>
          {leftIcon && <span>{leftIcon}</span>}
          {children}
          {rightIcon && <span>{rightIcon}</span>}
        </>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        style={baseStyle}
        onMouseEnter={(e) => {
          if (!disabled && !isLoading) {
            Object.assign(e.currentTarget.style, variantStyles[variant].hover);
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !isLoading) {
            Object.assign(e.currentTarget.style, variantStyles[variant]);
          }
        }}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      style={baseStyle}
      onMouseEnter={(e) => {
        if (!disabled && !isLoading) {
          Object.assign(e.currentTarget.style, variantStyles[variant].hover);
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !isLoading) {
          Object.assign(e.currentTarget.style, variantStyles[variant]);
        }
      }}
    >
      {content}
    </button>
  );
};

