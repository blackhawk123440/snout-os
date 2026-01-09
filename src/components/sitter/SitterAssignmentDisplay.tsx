/**
 * SitterAssignmentDisplay Component
 * 
 * Shared primitive for displaying sitter assignment consistently across the app.
 * Universal Law: ONE ASSIGNMENT VISIBILITY CONTRACT
 */

'use client';

import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { tokens } from '@/lib/design-tokens';

export interface SitterInfo {
  id: string;
  firstName: string;
  lastName: string;
  currentTier?: {
    id: string;
    name: string;
    priorityLevel?: number;
    color?: string;
  } | null;
}

export interface SitterAssignmentDisplayProps {
  sitter: SitterInfo | null | undefined;
  showUnassigned?: boolean; // Show "Unassigned" badge when sitter is null
  compact?: boolean; // For use in lists/cards
  showTierBadge?: boolean; // Show tier badge if available
}

export const SitterAssignmentDisplay: React.FC<SitterAssignmentDisplayProps> = ({
  sitter,
  showUnassigned = true,
  compact = false,
  showTierBadge = false,
}) => {
  if (!sitter) {
    if (showUnassigned) {
      return (
        <span style={{ color: tokens.colors.text.tertiary, fontSize: compact ? tokens.typography.fontSize.sm[0] : tokens.typography.fontSize.base[0] }}>
          Unassigned
        </span>
      );
    }
    return null;
  }

  const fullName = `${sitter.firstName} ${sitter.lastName}`;

  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], flexWrap: 'wrap' }}>
        <span style={{ fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.medium }}>
          {fullName}
        </span>
        {showTierBadge && sitter.currentTier && (
          <Badge
            variant="default"
            style={{
              backgroundColor: sitter.currentTier.color || tokens.colors.primary[100],
              color: tokens.colors.primary.DEFAULT,
              fontSize: tokens.typography.fontSize.xs[0],
              padding: `${tokens.spacing[1]} ${tokens.spacing[2]}`,
            }}
          >
            {sitter.currentTier.name}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], flexWrap: 'wrap' }}>
      <div style={{ fontSize: tokens.typography.fontSize.base[0], fontWeight: tokens.typography.fontWeight.medium }}>
        {fullName}
      </div>
      {showTierBadge && sitter.currentTier && (
        <Badge
          variant="default"
          style={{
            backgroundColor: sitter.currentTier.color || tokens.colors.primary[100],
            color: tokens.colors.primary.DEFAULT,
            fontSize: tokens.typography.fontSize.xs[0],
            padding: `${tokens.spacing[1]} ${tokens.spacing[2]}`,
          }}
        >
          {sitter.currentTier.name}
        </Badge>
      )}
    </div>
  );
};

