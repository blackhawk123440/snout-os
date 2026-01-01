/**
 * Card Component
 * 
 * Content container with consistent styling and optional header/footer.
 */

import React from 'react';
import { tokens } from '@/lib/design-tokens';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  padding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  header,
  footer,
  padding = true,
  className = '',
  ...props
}) => {
  return (
    <div
      {...props}
      className={className}
      style={{
        backgroundColor: tokens.colors.background.primary,
        border: `1px solid ${tokens.colors.border.default}`,
        borderRadius: tokens.borderRadius.lg,
        boxShadow: tokens.shadows.sm,
        overflow: 'hidden',
        ...props.style,
      }}
    >
      {header && (
        <div
          style={{
            padding: padding ? `${tokens.spacing[4]} ${tokens.spacing[4]} ${tokens.spacing[3]}` : 0,
            borderBottom: header ? `1px solid ${tokens.colors.border.default}` : 'none',
          }}
        >
          {header}
        </div>
      )}
      <div
        style={{
          padding: padding ? tokens.spacing[4] : 0,
        }}
      >
        {children}
      </div>
      {footer && (
        <div
          style={{
            padding: padding ? `${tokens.spacing[3]} ${tokens.spacing[4]} ${tokens.spacing[4]}` : 0,
            borderTop: footer ? `1px solid ${tokens.colors.border.default}` : 'none',
            backgroundColor: tokens.colors.background.secondary,
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
};

