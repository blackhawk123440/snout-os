'use client';

import Link from 'next/link';
import { OwnerAppShell, LayoutWrapper, PageHeader, Section } from '@/components/layout';
import { Card, Button } from '@/components/ui';

const MODULES = [
  { title: 'Owner Inbox', href: '/messaging/inbox', desc: 'Monitor and step into any owner thread.' },
  { title: 'Sitters', href: '/messaging/sitters', desc: 'Review sitter thread coverage and response flow.' },
  { title: 'Numbers', href: '/messaging/numbers', desc: 'Track masking numbers and delivery readiness.' },
  { title: 'Assignments', href: '/messaging/assignments', desc: 'Validate number-to-sitter-to-thread routing.' },
  { title: 'Twilio Setup', href: '/messaging/twilio-setup', desc: 'Credentials, webhooks, masking, and test SMS.' },
];

export default function MessagingHubPage() {
  return (
    <OwnerAppShell>
      <LayoutWrapper variant="wide">
        <PageHeader
          title="Messaging"
          subtitle="Communication control hub across inbox, masking, routing, and Twilio setup."
          actions={
            <Link href="/messaging/inbox">
              <Button size="sm" variant="primary">Inbox</Button>
            </Link>
          }
        />
        <Section title="Messaging modules">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {MODULES.map((module) => (
              <Card key={module.href}>
                <p className="text-base font-semibold text-slate-900">{module.title}</p>
                <p className="mt-1 text-sm text-slate-600">{module.desc}</p>
                <div className="mt-3">
                  <Link href={module.href}>
                    <Button variant="secondary" size="sm">
                      Open
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </Section>
      </LayoutWrapper>
    </OwnerAppShell>
  );
}
