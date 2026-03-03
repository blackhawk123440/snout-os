'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutWrapper, PageHeader, Section } from '@/components/layout';
import {
  AppCard,
  AppCardHeader,
  AppCardBody,
  AppErrorState,
} from '@/components/app';
import { InteractiveRow } from '@/components/ui/interactive-row';
import { EmptyState, PageSkeleton } from '@/components/ui';

interface Report {
  id: string;
  content: string;
  mediaUrls: string | null;
  visitStarted: string | null;
  visitCompleted: string | null;
  createdAt: string | null;
  bookingId: string | null;
  booking: { id: string; service: string; startAt: string | null } | null;
}

export default function ClientReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/client/reports');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Unable to load reports');
        setReports([]);
        return;
      }
      setReports(Array.isArray(json.reports) ? json.reports : []);
    } catch {
      setError('Unable to load reports');
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : '';

  const preview = (content: string, maxLen = 120) =>
    content.length > maxLen ? content.slice(0, maxLen) + '…' : content;

  return (
    <LayoutWrapper variant="narrow">
      <PageHeader
        title="Visit reports"
        subtitle="Updates from your sitter"
        actions={
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            Refresh
          </button>
        }
      />
      <Section>
      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <AppErrorState title="Couldn't load reports" subtitle={error} onRetry={() => void load()} />
      ) : reports.length === 0 ? (
        <EmptyState
          title="No reports yet"
          description="Visit reports from your sitter will appear here after each visit."
          primaryAction={{ label: 'View bookings', onClick: () => router.push('/client/bookings') }}
        />
      ) : (
        <div className="space-y-4">
          {reports.map((r) => (
            <InteractiveRow key={r.id} onClick={() => router.push(`/client/reports/${r.id}`)} className="border-b-0 rounded-lg">
            <AppCard className="mb-0">
              <AppCardHeader>
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-neutral-900">
                    {r.booking?.service || 'Visit report'}
                  </p>
                  {r.createdAt && (
                    <span className="text-xs text-neutral-500">{formatDate(r.createdAt)}</span>
                  )}
                </div>
              </AppCardHeader>
              <AppCardBody>
                <p className="text-sm text-neutral-600 line-clamp-3">{preview(r.content)}</p>
              </AppCardBody>
            </AppCard>
            </InteractiveRow>
          ))}
        </div>
      )}
      </Section>
    </LayoutWrapper>
  );
}
