/**
 * CommandPreview Component
 * UI Constitution V1 - Phase 3
 * 
 * Shows safety preview before command execution.
 * Blocks execution for dangerous commands until confirmation.
 */

'use client';

import { ReactNode, useState } from 'react';
import { Command, CommandContext } from '@/commands/types';
import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/Button';
import { Flex } from '@/components/ui/Flex';

export interface CommandPreviewProps {
  command: Command;
  context: CommandContext;
  onExecute: () => void;
  onCancel: () => void;
}

export function CommandPreview({
  command,
  context,
  onExecute,
  onCancel,
}: CommandPreviewProps) {
  const [confirmed, setConfirmed] = useState(false);

  const preview = command.preview(context);

  return (
    <div
      data-testid="command-preview"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacing[4],
        padding: tokens.spacing[6],
      }}
    >
      {/* Danger Warning */}
      {command.danger && (
        <div
          style={{
            padding: tokens.spacing[4],
            backgroundColor: tokens.colors.error[50],
            border: `1px solid ${tokens.colors.error[200]}`,
            borderRadius: tokens.radius.md,
            display: 'flex',
            alignItems: 'flex-start',
            gap: tokens.spacing[3],
          }}
        >
          <i
            className="fas fa-exclamation-triangle"
            style={{
              color: tokens.colors.error.DEFAULT,
              fontSize: tokens.typography.fontSize.xl[0],
              flexShrink: 0,
              marginTop: '2px',
            }}
          />
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: tokens.typography.fontSize.base[0],
                fontWeight: tokens.typography.fontWeight.bold,
                color: tokens.colors.error.DEFAULT,
                marginBottom: tokens.spacing[1],
              }}
            >
              Dangerous Action
            </div>
            <div
              style={{
                fontSize: tokens.typography.fontSize.sm[0],
                color: tokens.colors.text.secondary,
              }}
            >
              This action cannot be undone. Please confirm before proceeding.
            </div>
          </div>
        </div>
      )}

      {/* Command Info */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing[3],
          paddingBottom: tokens.spacing[4],
          borderBottom: `1px solid ${tokens.colors.border.default}`,
        }}
      >
        {command.icon && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              borderRadius: tokens.radius.md,
              backgroundColor: tokens.colors.accent.primary,
            }}
          >
            {command.icon}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: tokens.typography.fontSize.lg[0],
              fontWeight: tokens.typography.fontWeight.bold,
              color: tokens.colors.text.primary,
              marginBottom: tokens.spacing[1],
            }}
          >
            {command.label}
          </div>
          <div
            style={{
              fontSize: tokens.typography.fontSize.sm[0],
              color: tokens.colors.text.secondary,
            }}
          >
            {command.description}
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <div
        style={{
          padding: tokens.spacing[4],
          backgroundColor: tokens.colors.surface.secondary,
          borderRadius: tokens.radius.md,
          minHeight: '100px',
        }}
      >
        {preview}
      </div>

      {/* Confirmation Checkbox for Dangerous Commands */}
      {command.danger && (
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing[2],
            cursor: 'pointer',
            padding: tokens.spacing[3],
            borderRadius: tokens.radius.md,
            transition: `background-color ${tokens.motion.duration.fast} ${tokens.motion.easing.standard}`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = tokens.colors.accent.secondary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            style={{
              width: '20px',
              height: '20px',
              cursor: 'pointer',
            }}
          />
          <span
            style={{
              fontSize: tokens.typography.fontSize.sm[0],
              color: tokens.colors.text.primary,
            }}
          >
            I understand this action cannot be undone
          </span>
        </label>
      )}

      {/* Actions */}
      <Flex gap={2} justify="flex-end">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant={command.danger ? 'destructive' : 'primary'}
          onClick={onExecute}
          disabled={command.danger && !confirmed}
        >
          {command.danger ? 'Confirm & Execute' : 'Execute'}
        </Button>
      </Flex>
    </div>
  );
}
