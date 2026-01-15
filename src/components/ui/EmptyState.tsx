/**
 * EmptyState Component
 * 
 * Empty data state display with icon, title, and optional action.
 */

import React from 'react';
import { tokens } from '@/lib/design-tokens';
import { Button, ButtonProps } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode | string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: ButtonProps['variant'];
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: tokens.spacing[12],
        textAlign: 'center',
      }}
    >
      {icon && (
        <div
          style={{
            marginBottom: tokens.spacing[4],
            fontSize: tokens.typography.fontSize['5xl'][0],
            opacity: 0.5,
          }}
        >
          {typeof icon === 'string' ? icon : icon}
        </div>
      )}
      <h3
        style={{
          fontSize: tokens.typography.fontSize['2xl'][0],
          fontWeight: tokens.typography.fontWeight.bold,
          color: tokens.colors.text.primary,
          margin: 0,
          marginBottom: description ? tokens.spacing[3] : tokens.spacing[6],
          letterSpacing: '-0.02em',
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            fontSize: tokens.typography.fontSize.lg[0],
            color: tokens.colors.text.secondary,
            margin: 0,
            marginBottom: action ? tokens.spacing[8] : 0,
            maxWidth: '32rem',
            lineHeight: '1.6',
          }}
        >
          {description}
        </p>
      )}
      {action && (
        <Button variant={action.variant || 'primary'} onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
};

