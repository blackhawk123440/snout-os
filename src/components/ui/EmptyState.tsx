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
        padding: `${tokens.spacing[8]} ${tokens.spacing[6]}`, // Phase B3: Reduced padding
        textAlign: 'center',
      }}
    >
      {icon && (
        <div
          style={{
            marginBottom: tokens.spacing[3], // Phase B3: Tighter
            fontSize: tokens.typography.fontSize['3xl'][0], // Phase B3: Smaller icon
            opacity: 0.35, // Phase B3: More subtle
            color: tokens.colors.text.tertiary,
          }}
        >
          {typeof icon === 'string' ? icon : icon}
        </div>
      )}
      <h3
        style={{
          fontSize: tokens.typography.fontSize.base[0], // Phase B3: Smaller headline
          fontWeight: tokens.typography.fontWeight.medium, // Phase B3: Lighter weight
          color: tokens.colors.text.secondary, // Phase B3: Less prominent
          margin: 0,
          marginBottom: description ? tokens.spacing[1] : tokens.spacing[3],
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            fontSize: tokens.typography.fontSize.sm[0], // Phase B3: Smaller
            color: tokens.colors.text.tertiary, // Phase B3: Less prominent
            margin: 0,
            marginBottom: action ? tokens.spacing[4] : 0,
            maxWidth: '24rem', // Phase B3: Narrower
            lineHeight: '1.5',
          }}
        >
          {description}
        </p>
      )}
      {action && (
        <Button 
          variant={action.variant || 'secondary'} // Phase B3: Secondary by default
          size="sm" // Phase B3: Smaller button
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};

