'use client';

import { OwnerModulePlaceholderPage } from '@/components/owner/OwnerModulePlaceholderPage';

export default function OwnerSitterProfileRoutePage() {
  return (
    <OwnerModulePlaceholderPage
      title="Sitter Profile"
      subtitle="Direct entry point to individual sitter control surfaces."
      ctaLabel="Open sitter directory"
      ctaHref="/sitters"
      checklist={[
        { label: 'Pin recent sitters for one-tap profile access', href: '/sitters' },
        { label: 'Preloaded sitter profile routes from assignment queues', href: '/command-center' },
        { label: 'Cross-link payouts and report quality from profile page', href: '/ops/payouts' },
      ]}
    />
  );
}
