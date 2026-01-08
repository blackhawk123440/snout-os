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
        marginBottom: isMobile ? tokens.spacing[4] : tokens.spacing[8],
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
                ? tokens.typography.fontSize.xl[0]
                : tokens.typography.fontSize['3xl'][0],
              fontWeight: tokens.typography.fontWeight.bold,
              lineHeight: isMobile
                ? tokens.typography.fontSize.xl[1].lineHeight
                : tokens.typography.fontSize['3xl'][1].lineHeight,
              color: tokens.colors.text.primary,
              margin: 0,
              marginBottom: description ? tokens.spacing[2] : 0,
              wordBreak: 'break-word',
            }}
          >
            {title}
          </h1>
          {description && (
            <p
              style={{
                fontSize: isMobile
                  ? tokens.typography.fontSize.sm[0]
                  : tokens.typography.fontSize.base[0],
                lineHeight: isMobile
                  ? tokens.typography.fontSize.sm[1].lineHeight
                  : tokens.typography.fontSize.base[1].lineHeight,
                color: tokens.colors.text.secondary,
                margin: 0,
                wordBreak: 'break-word',
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

