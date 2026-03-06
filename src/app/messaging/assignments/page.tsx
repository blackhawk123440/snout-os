'use client';

import { OwnerAppShell, LayoutWrapper, PageHeader, Section } from '@/components/layout';
import { AssignmentsPanel } from '@/components/messaging/AssignmentsPanel';

export default function MessagingAssignmentsPage() {
  return (
    <OwnerAppShell>
      <LayoutWrapper variant="wide">
        <PageHeader
          title="Messaging — Assignments"
          subtitle="Manage assignment windows and routing ownership for masked message threads."
        />
        <Section>
          <AssignmentsPanel />
        </Section>
      </LayoutWrapper>
    </OwnerAppShell>
  );
}
