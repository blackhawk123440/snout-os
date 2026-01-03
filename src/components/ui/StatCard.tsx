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
      className="glass-panel glass-panel-card stat-card-depth"
      style={{
        borderRadius: tokens.borderRadius.lg,
        padding: tokens.spacing[6],
        cursor: onClick ? 'pointer' : 'default',
        transition: `all ${tokens.transitions.duration.DEFAULT} cubic-bezier(0.4, 0, 0.2, 1)`,
        position: 'relative',
        transform: 'translateZ(0)', // Enable GPU acceleration
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
            color: 'rgba(0, 255, 255, 0.7)',
            textTransform: 'uppercase',
            letterSpacing: tokens.typography.letterSpacing.wide,
            textShadow: '0 0 10px rgba(0, 255, 255, 0.3)',
          }}
        >
          {label}
        </div>
        {icon && (
          <div
            style={{
              color: 'rgba(0, 255, 255, 0.8)',
              filter: 'drop-shadow(0 0 8px rgba(0, 255, 255, 0.5))',
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
          color: '#ffffff',
          lineHeight: '1',
          marginBottom: change ? tokens.spacing[2] : 0,
          textShadow: 
            '0 0 10px rgba(0, 255, 255, 0.5), 0 0 20px rgba(138, 43, 226, 0.3), 0 2px 4px rgba(0, 0, 0, 0.5)',
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

