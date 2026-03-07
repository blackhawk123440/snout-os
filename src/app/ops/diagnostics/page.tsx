'use client';

import Link from 'next/link';
import { OwnerAppShell, LayoutWrapper, PageHeader, Section } from '@/components/layout';
import { Card, Button } from '@/components/ui';

const DIAGNOSTICS_LINKS = [
  { label: 'Automation failures', href: '/ops/automation-failures' },
  { label: 'Message failures', href: '/ops/message-failures' },
  { label: 'Payout operations', href: '/ops/payouts' },
  { label: 'Calendar repair', href: '/ops/calendar-repair' },
  { label: 'Finance reconciliation', href: '/ops/finance/reconciliation' },
  { label: 'AI operations', href: '/ops/ai' },
  { label: 'Proof tooling', href: '/ops/proof' },
];

export default function OpsDiagnosticsPage() {
  return (
    <OwnerAppShell>
      <LayoutWrapper variant="wide">
        <PageHeader
          title="Ops / Diagnostics"
          subtitle="Central diagnostics index for failures, recovery surfaces, and verification tools."
        />
        <Section title="Diagnostics surfaces">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {DIAGNOSTICS_LINKS.map((item) => (
              <Card key={item.href}>
                <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                <div className="mt-3">
                  <Link href={item.href}>
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
