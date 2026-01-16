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
        padding: `${tokens.spacing[6]} ${tokens.spacing[5]}`, // Phase B5: Tighter operational padding
        textAlign: 'center',
      }}
    >
      {icon && (
        <div
          style={{
            marginBottom: tokens.spacing[2], // Phase B5: Tighter spacing
            fontSize: tokens.typography.fontSize['2xl'][0], // Phase B5: Smaller, more restrained
            opacity: 0.3, // Phase B5: Very subtle
            color: tokens.colors.text.tertiary,
          }}
        >
          {typeof icon === 'string' ? icon : icon}
        </div>
      )}
      <h3
        style={{
          fontSize: tokens.typography.fontSize.sm[0], // Phase B5: Smaller, serious tone
          fontWeight: tokens.typography.fontWeight.medium,
          color: tokens.colors.text.secondary,
          margin: 0,
          marginBottom: description ? tokens.spacing[1] : tokens.spacing[2],
          letterSpacing: '-0.01em', // Phase B5: Tight tracking
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            fontSize: tokens.typography.fontSize.xs[0], // Phase B5: Smaller copy
            color: tokens.colors.text.tertiary,
            margin: 0,
            marginBottom: action ? tokens.spacing[3] : 0,
            maxWidth: '20rem', // Phase B5: Narrower, focused
            lineHeight: '1.4',
          }}
        >
          {description}
        </p>
      )}
      {action && (
        <Button 
          variant={action.variant || 'secondary'}
          size="sm"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};

