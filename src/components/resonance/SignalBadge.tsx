/**
 * SignalBadge Component
 * UI Constitution V1 - Phase 6
 * 
 * Individual signal indicator badge.
 */

'use client';

import { Signal } from '@/lib/resonance/types';
import { Badge } from '@/components/ui/Badge';
import { Tooltip } from '@/components/ui/Tooltip';
import { tokens } from '@/lib/design-tokens';

export interface SignalBadgeProps {
  signal: Signal;
  compact?: boolean;
}

export function SignalBadge({ signal, compact = false }: SignalBadgeProps) {
  const variant = signal.severity === 'critical' 
    ? 'error' 
    : signal.severity === 'warning' 
    ? 'warning' 
    : 'info';

  const badge = (
    <Badge variant={variant}>
      {compact ? (
        <i 
          className={
            signal.severity === 'critical' 
              ? 'fas fa-exclamation-circle' 
              : signal.severity === 'warning' 
              ? 'fas fa-exclamation-triangle' 
              : 'fas fa-info-circle'
          }
        />
      ) : (
        signal.label
      )}
    </Badge>
  );

  if (compact) {
    return (
      <Tooltip content={signal.label}>
        {badge}
      </Tooltip>
    );
  }

  return badge;
}
