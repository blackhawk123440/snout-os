'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { OwnerAppShell, LayoutWrapper, PageHeader, Section } from '@/components/layout';
import { Card, Button } from '@/components/ui';

const MODULES = [
  { title: 'Owner Inbox', href: '/messaging/inbox', desc: 'Monitor and step into any owner thread.' },
  { title: 'Sitters', href: '/messaging/sitters', desc: 'Review sitter thread coverage and response flow.' },
  { title: 'Numbers', href: '/messaging/numbers', desc: 'Track masking numbers and delivery readiness.' },
  { title: 'Assignments', href: '/messaging/assignments', desc: 'Validate number-to-sitter-to-thread routing.' },
  { title: 'Twilio Setup', href: '/messaging/twilio-setup', desc: 'Credentials, webhooks, masking, and test SMS.' },
  { title: 'OpenPhone Setup', href: '/messaging/openphone-setup', desc: 'API key, webhook URL, and test send.' },
];

export default function MessagingHubPage() {
  const { data: providerStatus } = useQuery({
    queryKey: ['messaging-provider-status'],
    queryFn: async () => {
      const res = await fetch('/api/settings/messaging-provider');
      return res.ok ? res.json() : null;
    },
    staleTime: 300000,
  });

  return (
    <OwnerAppShell>
      <LayoutWrapper variant="wide">
        <PageHeader
          title="Messaging"
          subtitle="Communication control hub across inbox, masking, routing, and provider setup."
          actions={
            <Link href="/messaging/inbox">
              <Button size="sm" variant="primary">Inbox</Button>
            </Link>
          }
        />

        {/* Provider status banner */}
        {providerStatus?.activeProvider === 'openphone' && (
          <div className="mb-4 rounded-xl border border-status-info-border bg-status-info-bg px-4 py-3">
            <p className="text-sm font-medium text-status-info-text">
              Using OpenPhone {providerStatus.openphone?.phoneNumber ? `· ${providerStatus.openphone.phoneNumber}` : ''}
            </p>
            <p className="text-xs text-text-tertiary mt-0.5">Sitters use real phone numbers. No number masking.</p>
          </div>
        )}
        {providerStatus?.activeProvider === 'twilio' && (
          <div className="mb-4 rounded-xl border border-status-info-border bg-status-info-bg px-4 py-3">
            <p className="text-sm font-medium text-status-info-text">Using Twilio</p>
          </div>
        )}
        {providerStatus && providerStatus.activeProvider === 'none' && (
          <div className="mb-4 rounded-xl border border-status-warning-border bg-status-warning-bg px-4 py-3">
            <p className="text-sm font-medium text-status-warning-text">No messaging provider connected</p>
            <p className="text-xs text-status-warning-text-secondary mt-0.5">Connect OpenPhone or Twilio to send messages.</p>
          </div>
        )}

        <Section title="Messaging modules">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {MODULES.map((module) => (
              <Card key={module.href}>
                <p className="text-base font-semibold text-text-primary">{module.title}</p>
                <p className="mt-1 text-sm text-text-secondary">{module.desc}</p>
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
