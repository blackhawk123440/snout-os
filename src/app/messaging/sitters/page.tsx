'use client';

import { OwnerAppShell, LayoutWrapper, PageHeader, Section } from '@/components/layout';
import { SittersPanel } from '@/components/messaging/SittersPanel';

export default function MessagingSittersPage() {
  return (
    <OwnerAppShell>
      <LayoutWrapper variant="wide">
        <PageHeader
          title="Messaging — Sitters"
          subtitle="Sitter-centric thread visibility with direct handoff into inbox operations."
        />
        <Section>
          <SittersPanel />
        </Section>
      </LayoutWrapper>
    </OwnerAppShell>
  );
}
