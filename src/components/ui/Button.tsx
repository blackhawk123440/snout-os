/**
 * Button Component
 * 
 * Enterprise button component with variants and sizes.
 * All buttons in the dashboard must use this component.
 * On mobile, ensures minimum touch target size of 44px.
 */

import React from 'react';
import { tokens } from '@/lib/design-tokens';
import { useMobile } from '@/lib/use-mobile';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

const getVariantStyles = (variant: ButtonVariant) => {
  const styles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      backgroundColor: tokens.colors.primary.DEFAULT,
      color: tokens.colors.text.inverse,
      border: `1px solid ${tokens.colors.primary.DEFAULT}`,
    },
    secondary: {
      backgroundColor: tokens.colors.background.primary,
      color: tokens.colors.text.primary,
      border: `1px solid ${tokens.colors.border.default}`,
    },
    tertiary: {
      backgroundColor: 'transparent',
      color: tokens.colors.text.primary,
      border: '1px solid transparent',
    },
    danger: {
      backgroundColor: tokens.colors.error.DEFAULT,
      color: tokens.colors.text.inverse,
      border: `1px solid ${tokens.colors.error.DEFAULT}`,
    },
    ghost: {
      backgroundColor: 'transparent',
      color: tokens.colors.text.secondary,
      border: '1px solid transparent',
    },
  };
  return styles[variant];
};

const getSizeStyles = (size: ButtonSize, isMobile: boolean) => {
  // On mobile, ensure minimum 44px touch target
  const sizes: Record<ButtonSize, { padding: string; fontSize: string; height: string; minHeight?: string }> = {
    sm: {
      padding: isMobile
        ? `${tokens.spacing[2]} ${tokens.spacing[3]}`
        : `${tokens.spacing[2]} ${tokens.spacing[3]}`,
      fontSize: isMobile
        ? tokens.typography.fontSize.sm[0]
        : tokens.typography.fontSize.sm[0],
      height: isMobile ? '44px' : '2rem',
      minHeight: isMobile ? '44px' : undefined,
    },
    md: {
      padding: isMobile
        ? `${tokens.spacing[3]} ${tokens.spacing[4]}`
        : `${tokens.spacing[3]} ${tokens.spacing[4]}`,
      fontSize: isMobile
        ? tokens.typography.fontSize.base[0]
        : tokens.typography.fontSize.base[0],
      height: isMobile ? '44px' : '2.5rem',
      minHeight: isMobile ? '44px' : undefined,
    },
    lg: {
      padding: isMobile
        ? `${tokens.spacing[3]} ${tokens.spacing[5]}`
        : `${tokens.spacing[4]} ${tokens.spacing[6]}`,
      fontSize: isMobile
        ? tokens.typography.fontSize.base[0]
        : tokens.typography.fontSize.lg[0],
      height: isMobile ? '44px' : '3rem',
      minHeight: isMobile ? '44px' : undefined,
    },
  };
  return sizes[size];
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      className = '',
      onMouseEnter,
      onMouseLeave,
      ...props
    },
    ref
  ) => {
    const isMobile = useMobile();
    const sizeStyle = getSizeStyles(size, isMobile);
    const variantStyle = getVariantStyles(variant);
    const isDisabled = disabled || isLoading;

    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!isDisabled && variant === 'primary') {
        e.currentTarget.style.backgroundColor = tokens.colors.primary[700];
      } else if (!isDisabled && variant === 'secondary') {
        e.currentTarget.style.backgroundColor = tokens.colors.background.secondary;
      } else if (!isDisabled && variant === 'tertiary') {
        e.currentTarget.style.backgroundColor = tokens.colors.background.secondary;
      } else if (!isDisabled && variant === 'danger') {
        e.currentTarget.style.backgroundColor = tokens.colors.error[600];
      } else if (!isDisabled && variant === 'ghost') {
        e.currentTarget.style.backgroundColor = tokens.colors.background.secondary;
        e.currentTarget.style.color = tokens.colors.text.primary;
      }
      onMouseEnter?.(e);
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!isDisabled) {
        e.currentTarget.style.backgroundColor = variantStyle.backgroundColor as string;
        e.currentTarget.style.color = variantStyle.color as string;
      }
      onMouseLeave?.(e);
    };

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: tokens.spacing[2],
          borderRadius: tokens.borderRadius.md,
          fontWeight: tokens.typography.fontWeight.medium,
          fontFamily: tokens.typography.fontFamily.sans.join(', '),
          height: sizeStyle.height,
          minHeight: sizeStyle.minHeight || sizeStyle.height,
          padding: sizeStyle.padding,
          fontSize: sizeStyle.fontSize,
          lineHeight: '1',
          ...variantStyle,
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          opacity: isDisabled ? 0.5 : 1,
          transition: `all ${tokens.transitions.duration.DEFAULT} ${tokens.transitions.timingFunction.DEFAULT}`,
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        {isLoading && (
          <span
            style={{
              display: 'inline-block',
              width: '1em',
              height: '1em',
              border: `2px solid currentColor`,
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
            }}
            aria-hidden="true"
          />
        )}
        {!isLoading && leftIcon && <span>{leftIcon}</span>}
        <span>{children}</span>
        {!isLoading && rightIcon && <span>{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
