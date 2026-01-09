/**
 * StatCard Component
 * 
 * Metric display card for dashboard statistics.
 */

import React from 'react';
import { tokens } from '@/lib/design-tokens';

export interface StatCardProps {
  label: string;
  value: string | number;
  change?: {
    value: number;
    trend: 'up' | 'down' | 'neutral';
  };
  icon?: React.ReactNode;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  icon,
  onClick,
}) => {
  const changeColor =
    change?.trend === 'up'
      ? tokens.colors.success.DEFAULT
      : change?.trend === 'down'
      ? tokens.colors.error.DEFAULT
      : tokens.colors.text.secondary;

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: tokens.colors.background.primary,
        border: `1px solid ${tokens.colors.border.default}`,
        borderRadius: tokens.borderRadius.lg,
        padding: tokens.spacing[6],
        cursor: onClick ? 'pointer' : 'default',
        transition: `all ${tokens.transitions.duration.DEFAULT}`,
        minHeight: '140px', // Fixed height to prevent tile resize with big numbers
        display: 'flex',
        flexDirection: 'column',
        ...(onClick && {
          ':hover': {
            borderColor: tokens.colors.border.focus,
            boxShadow: tokens.shadows.md,
          },
        }),
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = tokens.colors.border.focus;
          e.currentTarget.style.boxShadow = tokens.shadows.md;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = tokens.colors.border.default;
        e.currentTarget.style.boxShadow = tokens.shadows.sm;
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: tokens.spacing[2],
        }}
      >
        <div
          style={{
            fontSize: tokens.typography.fontSize.sm[0],
            fontWeight: tokens.typography.fontWeight.medium,
            color: tokens.colors.text.secondary,
            textTransform: 'uppercase',
            letterSpacing: tokens.typography.letterSpacing.wide,
          }}
        >
          {label}
        </div>
        {icon && (
          <div
            style={{
              color: tokens.colors.text.tertiary,
            }}
          >
            {icon}
          </div>
        )}
      </div>
      <div
        style={{
          fontSize: tokens.typography.fontSize['3xl'][0],
          fontWeight: tokens.typography.fontWeight.bold,
          color: tokens.colors.text.primary,
          lineHeight: '1.2',
          marginBottom: change ? tokens.spacing[2] : 0,
          minHeight: '3rem', // Fixed height to prevent tile resize
          display: 'flex',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          fontVariantNumeric: 'tabular-nums', // Tabular numerals for consistent width
          wordBreak: 'break-word', // Allow wrapping if needed
        }}
      >
        {value}
      </div>
      {change && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing[1],
            fontSize: tokens.typography.fontSize.sm[0],
            color: changeColor,
          }}
        >
          <span>
            {change.trend === 'up' ? '↑' : change.trend === 'down' ? '↓' : '→'}
          </span>
          <span>{Math.abs(change.value)}%</span>
        </div>
      )}
    </div>
  );
};

