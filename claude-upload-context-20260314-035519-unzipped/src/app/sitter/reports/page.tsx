'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SitterPageHeader, SitterEmptyState } from '@/components/sitter';

export default function SitterReportsPage() {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-3xl pb-8">
      <SitterPageHeader
        title="Reports"
        subtitle="Visit reports for clients"
        action={
          <Link
            href="/sitter/reports/new"
            className="inline-flex min-h-[36px] items-center justify-center rounded-lg bg-blue-600 px-3 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            New report
          </Link>
        }
      />
      <SitterEmptyState
        title="No reports yet"
        subtitle="Submit a report after a visit — it will appear in the client's Latest report."
        cta={{ label: 'New report', onClick: () => router.push('/sitter/reports/new') }}
      />
    </div>
  );
}
