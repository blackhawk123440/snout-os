/**
 * Input Component
 * 
 * Enterprise input field component with variants and states.
 */

import React from 'react';
import { tokens } from '@/lib/design-tokens';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: InputSize;
  fullWidth?: boolean;
}

const sizeStyles: Record<InputSize, { height: string; fontSize: string; padding: string }> = {
  sm: {
    height: '2rem',
    fontSize: tokens.typography.fontSize.sm[0],
    padding: `${tokens.spacing[2]} ${tokens.spacing[3]}`,
  },
  md: {
    height: '2.5rem',
    fontSize: tokens.typography.fontSize.base[0],
    padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
  },
  lg: {
    height: '3rem',
    fontSize: tokens.typography.fontSize.lg[0],
    padding: `${tokens.spacing[4]} ${tokens.spacing[5]}`,
  },
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      size = 'md',
      fullWidth = true,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const sizeStyle = sizeStyles[size];
    const hasIcon = leftIcon || rightIcon;

    return (
      <div
        style={{
          width: fullWidth ? '100%' : 'auto',
        }}
        className={className}
      >
        {label && (
          <label
            htmlFor={inputId}
            style={{
              display: 'block',
              marginBottom: tokens.spacing[2],
              fontSize: tokens.typography.fontSize.sm[0],
              fontWeight: tokens.typography.fontWeight.medium,
              color: tokens.colors.text.primary,
            }}
          >
            {label}
            {props.required && (
              <span
                style={{
                  color: tokens.colors.error.DEFAULT,
                  marginLeft: tokens.spacing[1],
                }}
              >
                *
              </span>
            )}
          </label>
        )}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {leftIcon && (
            <span
              style={{
                position: 'absolute',
                left: tokens.spacing[3],
                color: tokens.colors.text.tertiary,
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            >
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            {...props}
            style={{
              width: '100%',
              height: sizeStyle.height,
              fontSize: sizeStyle.fontSize,
              padding: hasIcon
                ? `${sizeStyle.padding.split(' ')[0]} ${leftIcon ? '2.5rem' : sizeStyle.padding.split(' ')[1]} ${rightIcon ? '2.5rem' : sizeStyle.padding.split(' ')[1]} ${sizeStyle.padding.split(' ')[0]}`
                : sizeStyle.padding,
              paddingLeft: leftIcon ? '2.5rem' : sizeStyle.padding.split(' ')[1],
              paddingRight: rightIcon ? '2.5rem' : sizeStyle.padding.split(' ')[1],
              fontFamily: tokens.typography.fontFamily.sans.join(', '),
              color: tokens.colors.text.primary,
              backgroundColor: tokens.colors.background.primary,
              border: `1px solid ${error ? tokens.colors.error.DEFAULT : tokens.colors.border.default}`,
              borderRadius: tokens.borderRadius.md,
              outline: 'none',
              transition: `all ${tokens.transitions.duration.DEFAULT} ${tokens.transitions.timingFunction.DEFAULT}`,
              ...(props.disabled && {
                backgroundColor: tokens.colors.background.tertiary,
                color: tokens.colors.text.disabled,
                cursor: 'not-allowed',
              }),
            }}
            onFocus={(e) => {
              props.onFocus?.(e);
              if (!error) {
                e.target.style.borderColor = tokens.colors.border.focus;
                e.target.style.boxShadow = `0 0 0 3px ${tokens.colors.primary[100]}`;
              }
            }}
            onBlur={(e) => {
              props.onBlur?.(e);
              e.target.style.borderColor = error ? tokens.colors.error.DEFAULT : tokens.colors.border.default;
              e.target.style.boxShadow = 'none';
            }}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
          />
          {rightIcon && (
            <span
              style={{
                position: 'absolute',
                right: tokens.spacing[3],
                color: tokens.colors.text.tertiary,
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            >
              {rightIcon}
            </span>
          )}
        </div>
        {error && (
          <div
            id={`${inputId}-error`}
            role="alert"
            style={{
              marginTop: tokens.spacing[1],
              fontSize: tokens.typography.fontSize.sm[0],
              color: tokens.colors.error.DEFAULT,
            }}
          >
            {error}
          </div>
        )}
        {!error && helperText && (
          <div
            id={`${inputId}-helper`}
            style={{
              marginTop: tokens.spacing[1],
              fontSize: tokens.typography.fontSize.sm[0],
              color: tokens.colors.text.secondary,
            }}
          >
            {helperText}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

