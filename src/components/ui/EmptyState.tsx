/**
 * EmptyState Component
 * Enterprise empty data state. No playful copy. Optional icon. primaryAction + secondaryAction.
 */

import React from 'react';
import { tokens } from '@/lib/design-tokens';
import { Button, ButtonProps } from './Button';
import { cn } from './utils';

export interface EmptyStateProps {
  icon?: React.ReactNode | string;
  title: string;
  description?: string;
  /** @deprecated Use primaryAction instead */
  action?: {
    label: string;
    onClick: () => void;
    variant?: ButtonProps['variant'];
  };
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  primaryAction,
  secondaryAction,
  className,
}) => {
  const hasPrimary = primaryAction ?? action;
  const hasSecondary = secondaryAction;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border-muted)] bg-[var(--color-surface-secondary)] px-8 py-12 text-center',
        className
      )}
    >
      {icon && (
        <div
          className="mb-4 text-[var(--color-text-tertiary)] opacity-60"
          style={typeof icon === 'string' ? undefined : { fontSize: tokens.typography.fontSize['2xl'][0] }}
        >
          {typeof icon === 'string' ? icon : icon}
        </div>
      )}
      <p className="text-sm font-medium text-[var(--color-text-primary)]">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-[var(--color-text-tertiary)]">{description}</p>
      )}
      {(hasPrimary || hasSecondary) && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {hasPrimary && (
            <Button
              variant={action?.variant ?? 'primary'}
              size="sm"
              onClick={(primaryAction ?? action)!.onClick}
            >
              {(primaryAction ?? action)!.label}
            </Button>
          )}
          {hasSecondary && (
            <Button variant="secondary" size="sm" onClick={secondaryAction!.onClick}>
              {secondaryAction!.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

