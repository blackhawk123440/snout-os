/**
 * SitterTierBadge Component
 * 
 * Shared primitive for displaying sitter tier badges consistently across the app.
 * Universal Law: FEATURE COMPLETENESS RULE - Tier badges must appear everywhere sitters appear
 */

'use client';

import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { tokens } from '@/lib/design-tokens';

export interface TierInfo {
  id: string;
  name: string;
  priorityLevel?: number;
  color?: string;
}

export interface SitterTierBadgeProps {
  tier: TierInfo | null | undefined;
  size?: 'sm' | 'md' | 'lg';
}

export const SitterTierBadge: React.FC<SitterTierBadgeProps> = ({
  tier,
  size = 'md',
}) => {
  if (!tier) {
    return null;
  }

  const sizeStyles = {
    sm: {
      fontSize: tokens.typography.fontSize.xs[0],
      padding: `${tokens.spacing[1]} ${tokens.spacing[2]}`,
    },
    md: {
      fontSize: tokens.typography.fontSize.sm[0],
      padding: `${tokens.spacing[1]} ${tokens.spacing[2]}`,
    },
    lg: {
      fontSize: tokens.typography.fontSize.base[0],
      padding: `${tokens.spacing[2]} ${tokens.spacing[3]}`,
    },
  };

  const style = sizeStyles[size];

  return (
    <Badge
      variant="default"
      style={{
        backgroundColor: tier.color || tokens.colors.primary[100],
        color: tier.color ? tokens.colors.text.inverse : tokens.colors.primary.DEFAULT,
        fontSize: style.fontSize,
        padding: style.padding,
        fontWeight: tokens.typography.fontWeight.semibold,
      }}
    >
      {tier.name}
    </Badge>
  );
};

