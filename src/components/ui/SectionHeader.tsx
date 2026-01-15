/**
 * SectionHeader Component
 * 
 * Section divider with title and optional action.
 */

import React from 'react';
import { tokens } from '@/lib/design-tokens';

export interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  action,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: tokens.spacing[4],
        marginBottom: tokens.spacing[5],
        paddingBottom: tokens.spacing[3],
        borderBottom: `1px solid ${tokens.colors.border.default}`,
      }}
    >
      <div>
        <h2
          style={{
            fontSize: tokens.typography.fontSize['2xl'][0],
            fontWeight: tokens.typography.fontWeight.bold,
            color: tokens.colors.text.primary,
            margin: 0,
            marginBottom: description ? tokens.spacing[2] : 0,
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h2>
        {description && (
          <p
            style={{
              fontSize: tokens.typography.fontSize.base[0],
              color: tokens.colors.text.secondary,
              margin: 0,
            }}
          >
            {description}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

