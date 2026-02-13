/**
 * Twilio Setup Panel - Embedded in Messages tab
 */

'use client';

import { Card, EmptyState } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';

export function TwilioSetupPanel() {
  return (
    <Card>
      <EmptyState
        title="Twilio Setup"
        description="Save credentials, test connection, install webhooks, purchase/import numbers, and check readiness."
        icon={<i className="fas fa-cog" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
      />
    </Card>
  );
}
