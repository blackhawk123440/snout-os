'use client';

import { OwnerAppShell, LayoutWrapper, PageHeader, Section } from '@/components/layout';
import InboxView from '@/components/messaging/InboxView';

export default function MessagingInboxPage() {
  return (
    <OwnerAppShell>
      <LayoutWrapper variant="wide">
        <PageHeader
          title="Owner Inbox"
          subtitle="Live owner control center for client and sitter messaging threads."
        />
        <Section>
          <div className="h-[70vh] min-h-[520px]">
            <InboxView role="owner" inbox="owner" />
          </div>
        </Section>
      </LayoutWrapper>
    </OwnerAppShell>
  );
}
