'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutWrapper, PageHeader, Section, ClientRefreshButton } from '@/components/layout';
import { AppErrorState } from '@/components/app';
import { EmptyState, PageSkeleton } from '@/components/ui';
import { InteractiveRow } from '@/components/ui/interactive-row';
import { ClientListSecondaryModule } from '@/components/client/ClientListSecondaryModule';
import { renderClientPreview } from '@/lib/strip-emojis';

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

  return (
    <LayoutWrapper variant="narrow">
      <PageHeader
        title="Visit reports"
        subtitle="Updates from your sitter"
        actions={<ClientRefreshButton onRefresh={load} loading={loading} />}
      />
      <Section>
      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <AppErrorState title="Couldn't load reports" subtitle={error} onRetry={() => void load()} />
      ) : reports.length === 0 ? (
        <EmptyState
          title="No reports yet"
          description="After each visit, your sitter will share an update here. Book a visit to get started."
          primaryAction={{ label: 'View bookings', onClick: () => router.push('/client/bookings') }}
        />
      ) : (
        <div className="w-full space-y-3 lg:max-w-3xl">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white lg:rounded-lg">
            {reports.map((r) => (
              <InteractiveRow
                key={r.id}
                onClick={() => router.push(`/client/reports/${r.id}`)}
                className="last:border-b-0"
                aria-label={`View report ${r.booking?.service || 'Visit report'}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {r.booking?.service || 'Visit report'}
                  </p>
                  <p className="line-clamp-1 text-sm text-slate-700">{renderClientPreview(r.content, 120)}</p>
                </div>
                <div className="flex shrink-0 text-xs text-slate-500 tabular-nums">
                  {r.createdAt ? formatDate(r.createdAt) : '—'}
                </div>
              </InteractiveRow>
            ))}
          </div>
          <ClientListSecondaryModule variant="reports" />
        </div>
      )}
      </Section>
    </LayoutWrapper>
  );
}
