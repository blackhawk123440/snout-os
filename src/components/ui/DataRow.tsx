/**
 * DataRow Component
 * UI Constitution V1 - Data Component
 * 
 * Label-value layout with optional copy affordance and truncation rules.
 * 
 * @example
 * ```tsx
 * <DataRow
 *   label="Email"
 *   value="user@example.com"
 *   copyable
 * />
 * ```
 */

'use client';

import { ReactNode, useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { IconButton } from './IconButton';
import { cn } from './utils';

export interface DataRowProps {
  label: string;
  value: string | ReactNode;
  copyable?: boolean;
  truncate?: boolean;
  className?: string;
  'data-testid'?: string;
}

export function DataRow({
  label,
  value,
  copyable = false,
  truncate = false,
  className,
  'data-testid': testId,
}: DataRowProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (typeof value === 'string') {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      data-testid={testId || 'data-row'}
      className={cn('data-row', className)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: tokens.spacing[4],
        padding: `${tokens.spacing[3]} 0`,
        borderBottom: `1px solid ${tokens.colors.border.muted}`,
      }}
    >
      <div
        style={{
          minWidth: '120px',
          flexShrink: 0,
          fontSize: tokens.typography.fontSize.sm[0],
          fontWeight: tokens.typography.fontWeight.medium,
          color: tokens.colors.text.secondary,
        }}
      >
        {label}
      </div>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing[2],
        }}
      >
        <div
          style={{
            flex: 1,
            fontSize: tokens.typography.fontSize.base[0],
            color: tokens.colors.text.primary,
            ...(truncate && {
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }),
          }}
        >
          {value}
        </div>
        {copyable && typeof value === 'string' && (
          <IconButton
            icon={<i className={`fas fa-${copied ? 'check' : 'copy'}`} />}
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            aria-label={copied ? 'Copied' : 'Copy to clipboard'}
          />
        )}
      </div>
    </div>
  );
}
