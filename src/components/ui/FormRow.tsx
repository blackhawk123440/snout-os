/**
 * FormRow Component
 * 
 * Form field wrapper with consistent spacing.
 */

import React from 'react';
import { tokens } from '@/lib/design-tokens';

export interface FormRowProps {
  label?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  children: React.ReactNode;
}

export const FormRow: React.FC<FormRowProps> = ({
  label,
  required,
  error,
  helperText,
  children,
}) => {
  return (
    <div
      style={{
        marginBottom: tokens.spacing[6],
      }}
    >
      {label && (
        <label
          style={{
            display: 'block',
            marginBottom: tokens.spacing[2],
            fontSize: tokens.typography.fontSize.sm[0],
            fontWeight: tokens.typography.fontWeight.medium,
            color: tokens.colors.text.primary,
          }}
        >
          {label}
          {required && (
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
      {children}
      {error && (
        <div
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
};

