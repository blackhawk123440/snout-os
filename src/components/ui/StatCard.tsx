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
      className="glass-panel glass-panel-card"
      style={{
        borderRadius: tokens.borderRadius.lg,
        padding: tokens.spacing[6],
        cursor: onClick ? 'pointer' : 'default',
        transition: `all ${tokens.transitions.duration.DEFAULT}`,
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        // Glass styling handles hover via CSS
      }}
      onMouseLeave={(e) => {
        // Glass styling handles hover via CSS
      }}
    >
      <div className="glass-panel-sheen" />
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
          lineHeight: '1',
          marginBottom: change ? tokens.spacing[2] : 0,
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

