/**
 * Card Component
 * 
 * Content container with consistent styling and optional header/footer.
 * On mobile, uses compact padding automatically.
 */

import React from 'react';
import { tokens } from '@/lib/design-tokens';
import { useMobile } from '@/lib/use-mobile';

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
  const isMobile = useMobile();
  const cardPadding = isMobile ? tokens.spacing[3] : tokens.spacing[4];

  return (
    <div
      {...props}
      className={className}
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.7)', // Semi-transparent white for glassmorphism
        backdropFilter: 'blur(20px) saturate(180%)', // Frosted glass effect
        WebkitBackdropFilter: 'blur(20px) saturate(180%)', // Safari support
        border: `1px solid ${tokens.colors.border.default}`, // Ultra light pink stroke
        borderRadius: tokens.borderRadius.lg,
        boxShadow: tokens.shadows.sm, // Subtle shadow for depth
        overflow: 'visible', // Changed from 'hidden' to allow content to be visible - only clip if explicitly needed
        ...props.style,
      }}
    >
      {header && (
        <div
          style={{
            padding: padding
              ? isMobile
                ? `${cardPadding} ${cardPadding} ${tokens.spacing[2]}`
                : `${tokens.spacing[4]} ${tokens.spacing[4]} ${tokens.spacing[3]}`
              : 0,
            borderBottom: header ? `1px solid ${tokens.colors.border.default}` : 'none',
          }}
        >
          {header}
        </div>
      )}
      <div
        style={{
          padding: padding ? cardPadding : 0,
        }}
      >
        {children}
      </div>
      {footer && (
        <div
          style={{
            padding: padding
              ? isMobile
                ? `${tokens.spacing[2]} ${cardPadding} ${cardPadding}`
                : `${tokens.spacing[3]} ${tokens.spacing[4]} ${tokens.spacing[4]}`
              : 0,
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

