/**
 * Select Component
 * 
 * Enterprise dropdown select component.
 */

import React from 'react';
import { tokens } from '@/lib/design-tokens';

export type SelectSize = 'sm' | 'md' | 'lg';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  size?: SelectSize;
  fullWidth?: boolean;
  placeholder?: string;
}

const sizeStyles: Record<SelectSize, { minHeight: string; fontSize: string; lineHeight: string; padding: string }> = {
  sm: {
    minHeight: '2.5rem', // 40px - ensures no clipping
    fontSize: tokens.typography.fontSize.sm[0],
    lineHeight: 'normal',
    padding: `${tokens.spacing[2]} ${tokens.spacing[3]}`,
  },
  md: {
    minHeight: '2.75rem', // 44px - prevents text clipping, matches recommended touch target
    fontSize: tokens.typography.fontSize.base[0],
    lineHeight: 'normal',
    padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
  },
  lg: {
    minHeight: '3rem', // 48px
    fontSize: tokens.typography.fontSize.lg[0],
    lineHeight: 'normal',
    padding: `${tokens.spacing[4]} ${tokens.spacing[5]}`,
  },
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      options,
      size = 'md',
      fullWidth = true,
      placeholder,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
    const sizeStyle = sizeStyles[size];

    return (
      <div
        style={{
          width: fullWidth ? '100%' : 'auto',
        }}
        className={className}
      >
        {label && (
          <label
            htmlFor={selectId}
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
        <select
          ref={ref}
          id={selectId}
          {...props}
          style={{
            width: '100%',
            minHeight: sizeStyle.minHeight,
            fontSize: sizeStyle.fontSize,
            lineHeight: sizeStyle.lineHeight,
            padding: sizeStyle.padding,
            paddingRight: '2.5rem',
            fontFamily: tokens.typography.fontFamily.sans.join(', '),
            color: tokens.colors.text.primary,
            backgroundColor: tokens.colors.background.primary,
            border: `1px solid ${error ? tokens.colors.error.DEFAULT : tokens.colors.border.default}`,
            borderRadius: tokens.radius.DEFAULT, // Phase B2: Tighter radius
            outline: 'none',
            cursor: props.disabled ? 'not-allowed' : 'pointer',
            transition: `all ${tokens.transitions.duration.DEFAULT} ${tokens.transitions.timingFunction.DEFAULT}`,
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='${encodeURIComponent(tokens.colors.text.tertiary)}' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: `right ${tokens.spacing[3]} center`,
            backgroundSize: '1rem',
            ...(props.disabled && {
              backgroundColor: tokens.colors.background.tertiary,
              color: tokens.colors.text.disabled,
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
            error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined
          }
        >
          {placeholder && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <div
            id={`${selectId}-error`}
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
            id={`${selectId}-helper`}
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

Select.displayName = 'Select';

