/**
 * PageHeader Component
 * 
 * Standard page header with title, description, and actions.
 * Responsive layout for mobile.
 */

import React from 'react';
import { tokens } from '@/lib/design-tokens';
import { useMobile } from '@/lib/use-mobile';

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
  const isMobile = useMobile();
  
  return (
    <div
      style={{
        marginBottom: isMobile ? tokens.spacing[6] : tokens.spacing[10],
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
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'flex-start',
          justifyContent: 'space-between',
          gap: isMobile ? tokens.spacing[3] : tokens.spacing[4],
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
              fontSize: isMobile
                ? tokens.typography.fontSize['2xl'][0]
                : tokens.typography.fontSize['4xl'][0],
              fontWeight: tokens.typography.fontWeight.bold,
              lineHeight: isMobile ? '1.2' : '1.15',
              color: tokens.colors.text.primary,
              margin: 0,
              marginBottom: description ? tokens.spacing[3] : 0,
              wordBreak: 'break-word',
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </h1>
          {description && (
            <p
              style={{
                fontSize: isMobile
                  ? tokens.typography.fontSize.sm[0]
                  : tokens.typography.fontSize.lg[0],
                lineHeight: isMobile ? '1.5' : '1.6',
                color: tokens.colors.text.secondary,
                margin: 0,
                wordBreak: 'break-word',
                fontWeight: tokens.typography.fontWeight.normal,
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
              width: isMobile ? '100%' : 'auto',
              ...(isMobile && {
                flexDirection: 'column',
                '& > *': {
                  width: '100%',
                },
              }),
            }}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

