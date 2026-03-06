'use client';

import { OwnerAppShell, LayoutWrapper, PageHeader, Section } from '@/components/layout';
import { TwilioSetupPanel } from '@/components/messaging/TwilioSetupPanel';

export default function MessagingTwilioSetupPage() {
  return (
    <OwnerAppShell>
      <LayoutWrapper variant="wide">
        <PageHeader
          title="Messaging — Twilio Setup"
          subtitle="Provider credentials, webhook installation, readiness checks, and test SMS."
        />
        <Section>
          <TwilioSetupPanel />
        </Section>
      </LayoutWrapper>
    </OwnerAppShell>
  );
}
