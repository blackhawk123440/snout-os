/**
 * StatCard Component - Control Surface
 * 
 * Metric display with temporal intelligence.
 * Observational posture: calm, stable, gradual emphasis shifts.
 */

import React from 'react';
import { Panel } from './Panel';
import { controlSurface } from '@/lib/design-tokens-control-surface';

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
  voltage?: 'none' | 'ambient' | 'edge';
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  trend,
  subtitle,
  voltage = 'ambient',
}) => {
  return (
    <Panel depth="elevated" voltage={voltage} spacing="moderate">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: controlSurface.spacing[3],
        }}
      >
        {/* Label */}
        <div
          style={{
            fontSize: controlSurface.typography.fontSize.sm[0] as string,
            fontWeight: controlSurface.typography.fontWeight.medium,
            color: controlSurface.colors.base.neutral.secondary,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </div>

        {/* Value and Icon Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: controlSurface.spacing[4],
          }}
        >
          {/* Value */}
          <div
            style={{
              fontSize: controlSurface.typography.fontSize['3xl'][0] as string,
              fontWeight: controlSurface.typography.fontWeight.semibold,
              color: controlSurface.colors.base.neutral.primary,
              lineHeight: (controlSurface.typography.fontSize['3xl'][1] as { lineHeight: string }).lineHeight,
              letterSpacing: (controlSurface.typography.fontSize['3xl'][1] as { letterSpacing: string }).letterSpacing,
            }}
          >
            {value}
          </div>

          {/* Icon */}
          {icon && (
            <div
              style={{
                color: controlSurface.colors.base.neutral.tertiary,
                fontSize: controlSurface.typography.fontSize.xl[0] as string,
                opacity: 0.6,
                transition: `opacity ${controlSurface.motion.duration.base} ${controlSurface.motion.easing.ambient}`,
              }}
            >
              {icon}
            </div>
          )}
        </div>

        {/* Subtitle / Trend */}
        {(subtitle || trend) && (
          <div
            style={{
              fontSize: controlSurface.typography.fontSize.xs[0] as string,
              color: controlSurface.colors.base.neutral.tertiary,
              lineHeight: (controlSurface.typography.fontSize.xs[1] as { lineHeight: string }).lineHeight,
            }}
          >
            {subtitle || (trend === 'up' ? '↑ Increased' : trend === 'down' ? '↓ Decreased' : '→ Stable')}
          </div>
        )}
      </div>
    </Panel>
  );
};

