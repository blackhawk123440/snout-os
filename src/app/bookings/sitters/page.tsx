'use client';

import Link from 'next/link';
import { OwnerAppShell, LayoutWrapper, PageHeader, Section } from '@/components/layout';
import { EmptyState, Button } from '@/components/ui';

export default function BookingSittersIndexPage() {
  return (
    <OwnerAppShell>
      <LayoutWrapper variant="wide">
        <PageHeader
          title="Sitter Ops Surface"
          subtitle="Use the dedicated sitters operator surface for assignment and availability workflows."
          actions={
            <Link href="/sitters">
              <Button>Open sitters</Button>
            </Link>
          }
        />
        <Section>
          <EmptyState
            title="Moved to Sitters"
            description="This legacy route now points to the unified sitters operator page."
            primaryAction={{ label: 'Go to sitters', onClick: () => (window.location.href = '/sitters') }}
          />
        </Section>
      </LayoutWrapper>
    </OwnerAppShell>
  );
}

