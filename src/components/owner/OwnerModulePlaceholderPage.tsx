'use client';

import Link from 'next/link';
import { OwnerAppShell, LayoutWrapper, PageHeader, Section } from '@/components/layout';
import { EmptyState, Button, Card } from '@/components/ui';

type ChecklistItem = {
  label: string;
  href?: string;
};

export function OwnerModulePlaceholderPage({
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  checklist,
}: {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  checklist: ChecklistItem[];
}) {
  return (
    <OwnerAppShell>
      <LayoutWrapper variant="wide">
        <PageHeader title={title} subtitle={subtitle} />
        <Section>
          <EmptyState
            title={`${title} is live as an MVP module`}
            description="This surface is available in navigation and ready for workflow expansion."
            primaryAction={{
              label: ctaLabel,
              onClick: () => {
                window.location.href = ctaHref;
              },
            }}
          />
        </Section>
        <Section title="Coming next" description="Planned hardening for this module.">
          <Card>
            <div className="flex flex-col gap-2 text-sm text-slate-700">
              {checklist.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400" aria-hidden>
                      □
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.href ? (
                    <Link href={item.href}>
                      <Button variant="secondary" size="sm">
                        Open
                      </Button>
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>
        </Section>
      </LayoutWrapper>
    </OwnerAppShell>
  );
}
