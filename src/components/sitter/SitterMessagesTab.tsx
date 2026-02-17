/**
 * Sitter Messages Tab
 * 
 * Inbox-only view for sitter messages
 * NO tier content, NO tier metrics, NO tier badges
 */

'use client';

import { Card, Button, EmptyState } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';

interface SitterMessagesTabProps {
  sitterId: string;
}

export function SitterMessagesTab({ sitterId }: SitterMessagesTabProps) {
  return (
    <div style={{ padding: tokens.spacing[4] }}>
      <Card style={{ padding: tokens.spacing[4] }}>
        <div style={{ marginBottom: tokens.spacing[4] }}>
          <h2 style={{
            fontSize: tokens.typography.fontSize.xl[0],
            fontWeight: tokens.typography.fontWeight.bold,
            marginBottom: tokens.spacing[2],
          }}>
            Messages
          </h2>
          <p style={{
            color: tokens.colors.text.secondary,
            fontSize: tokens.typography.fontSize.sm[0],
          }}>
            View and manage messages for this sitter
          </p>
        </div>

        <EmptyState
          title="Open Full Inbox"
          description="Click below to open the full messaging inbox with all threads and conversations."
          icon="💬"
        />

        <Button
          variant="primary"
          size="md"
          onClick={() => window.location.href = `/messages?tab=inbox&sitterId=${sitterId}`}
          style={{ marginTop: tokens.spacing[4], width: '100%' }}
          leftIcon={<i className="fas fa-inbox" />}
        >
          Open Full Inbox
        </Button>
      </Card>
    </div>
  );
}
