'use client';

import Link from 'next/link';
import { OwnerAppShell, LayoutWrapper, PageHeader, Section } from '@/components/layout';
import { Card, Button } from '@/components/ui';
import { TwilioSetupPanel } from '@/components/messaging/TwilioSetupPanel';

export default function TwilioSetupPage() {
  return (
    <OwnerAppShell>
      <LayoutWrapper variant="wide">
        <PageHeader
          title="Twilio Setup"
          subtitle="Connect Twilio, install webhooks, and verify masking behavior."
          actions={
            <Link href="/messaging/twilio-setup">
              <Button variant="secondary" size="sm">
                Open in messaging workspace
              </Button>
            </Link>
          }
        />

        <Section title="What masking does">
          <Card>
            <div className="space-y-2 text-sm text-slate-700">
              <p>Client messages a business number, then traffic routes to the assigned sitter.</p>
              <p>Sitter replies through the same masked route, so the client still sees the business number.</p>
              <p>Owner can audit thread state, assignments, and delivery events at any point.</p>
            </div>
            <div className="mt-3">
              <Link href="/messaging/twilio-setup">
                <Button size="sm">Run Test SMS workflow</Button>
              </Link>
            </div>
          </Card>
        </Section>

        <Section title="Connection and test workflow">
          <TwilioSetupPanel />
        </Section>
      </LayoutWrapper>
    </OwnerAppShell>
  );
}
