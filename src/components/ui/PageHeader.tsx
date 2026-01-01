/**
 * PageHeader Component
 * 
 * Standard page header with title, description, and actions.
 */

import React from 'react';
import { tokens } from '@/lib/design-tokens';

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
  breadcrumbs,
}) => {
  return (
    <div
      style={{
        marginBottom: tokens.spacing[8],
      }}
    >
      {breadcrumbs && (
        <div
          style={{
            marginBottom: tokens.spacing[2],
          }}
        >
          {breadcrumbs}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: tokens.spacing[4],
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            flex: '1 1 auto',
            minWidth: '0',
          }}
        >
          <h1
            style={{
              fontSize: tokens.typography.fontSize['3xl'][0],
              fontWeight: tokens.typography.fontWeight.bold,
              lineHeight: tokens.typography.fontSize['3xl'][1].lineHeight,
              color: tokens.colors.text.primary,
              margin: 0,
              marginBottom: description ? tokens.spacing[2] : 0,
            }}
          >
            {title}
          </h1>
          {description && (
            <p
              style={{
                fontSize: tokens.typography.fontSize.base[0],
                lineHeight: tokens.typography.fontSize.base[1].lineHeight,
                color: tokens.colors.text.secondary,
                margin: 0,
              }}
            >
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing[2],
              flexWrap: 'wrap',
            }}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

