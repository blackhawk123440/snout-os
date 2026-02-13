/**
 * Assignments Panel - Embedded in Messages tab
 */

'use client';

import { Card, EmptyState } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';

export function AssignmentsPanel() {
  return (
    <Card>
      <EmptyState
        title="Assignment Windows"
        description="Create, edit, and manage assignment windows. Prevent overlaps and view routing during windows."
        icon={<i className="fas fa-calendar-check" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
      />
    </Card>
  );
}
