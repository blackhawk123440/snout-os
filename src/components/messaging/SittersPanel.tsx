/**
 * Sitters Panel - Embedded in Messages tab
 */

'use client';

import { Card, EmptyState } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';

export function SittersPanel() {
  return (
    <Card>
      <EmptyState
        title="Sitters Management"
        description="View sitter list, status, and threads. Click a sitter to see their threads."
        icon={<i className="fas fa-user-friends" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
      />
    </Card>
  );
}
