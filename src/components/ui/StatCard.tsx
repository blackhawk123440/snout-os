/**
 * StatCard Component
 * 
 * Metric display card for dashboard statistics.
 * Supports compact mode for mobile to reduce height and padding.
 */

import React from 'react';
import { tokens } from '@/lib/design-tokens';
import { useMobile } from '@/lib/use-mobile';

export interface StatCardProps {
  label: string;
  value: string | number;
  change?: {
    value: number;
    trend: 'up' | 'down' | 'neutral';
  };
  icon?: React.ReactNode;
  onClick?: () => void;
  compact?: boolean; // Compact mode for mobile (reduces padding and height)
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  icon,
  onClick,
  compact,
}) => {
  const isMobile = useMobile();
  const useCompact = compact !== undefined ? compact : isMobile;
  
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
        borderRadius: tokens.borderRadius.xl,
        padding: useCompact ? tokens.spacing[5] : tokens.spacing[6],
        cursor: onClick ? 'pointer' : 'default',
        transition: `all ${tokens.transitions.duration.DEFAULT} ${tokens.transitions.timingFunction.DEFAULT}`,
        minHeight: useCompact ? '120px' : '180px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: tokens.shadows.sm,
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = tokens.colors.border.strong;
          e.currentTarget.style.boxShadow = tokens.shadows.md;
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.backgroundColor = tokens.colors.background.tertiary;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = tokens.colors.border.default;
        e.currentTarget.style.boxShadow = tokens.shadows.sm;
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.backgroundColor = tokens.colors.background.primary;
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
              color: tokens.colors.neutral[400],
              fontSize: useCompact ? tokens.typography.fontSize.lg[0] : tokens.typography.fontSize.xl[0],
              opacity: 0.6,
            }}
          >
            {icon}
          </div>
        )}
      </div>
      <div
        style={{
          fontSize: useCompact ? tokens.typography.fontSize['2xl'][0] : tokens.typography.fontSize['4xl'][0],
          fontWeight: tokens.typography.fontWeight.bold,
          color: tokens.colors.text.primary,
          lineHeight: '1.1',
          marginBottom: change ? tokens.spacing[2] : 0,
          minHeight: useCompact ? '2rem' : '3.5rem',
          display: 'flex',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          fontVariantNumeric: 'tabular-nums',
          wordBreak: 'break-word',
          letterSpacing: '-0.02em', // Tighter letter spacing for large numbers
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

