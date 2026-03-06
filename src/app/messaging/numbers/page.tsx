'use client';

import { OwnerAppShell, LayoutWrapper, PageHeader, Section } from '@/components/layout';
import { NumbersPanel } from '@/components/messaging/NumbersPanel';

export default function MessagingNumbersPage() {
  return (
    <OwnerAppShell>
      <LayoutWrapper variant="wide">
        <PageHeader
          title="Messaging — Numbers"
          subtitle="Twilio number inventory, lifecycle actions, and masking capacity visibility."
        />
        <Section>
          <NumbersPanel />
        </Section>
      </LayoutWrapper>
    </OwnerAppShell>
  );
}
