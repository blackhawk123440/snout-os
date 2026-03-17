'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutWrapper, ClientRefreshButton } from '@/components/layout';
import { AppPageHeader, AppErrorState } from '@/components/app';
import { EmptyState, PageSkeleton } from '@/components/ui';
import { InteractiveRow } from '@/components/ui/interactive-row';
import { ClientListSecondaryModule } from '@/components/client/ClientListSecondaryModule';

interface Report {
  id: string;
  content: string;
  mediaUrls: string | null;
  personalNote: string | null;
  visitStarted: string | null;
  visitCompleted: string | null;
  createdAt: string | null;
  clientRating: number | null;
  sentAt: string | null;
  bookingId: string | null;
  sitterName: string | null;
  booking: { id: string; service: string; startAt: string | null } | null;
}

function parseFirstPhoto(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) && typeof parsed[0] === 'string' ? parsed[0] : null;
  } catch {
    return null;
  }
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
      <AppPageHeader
        title="Visit reports"
        subtitle="Updates from your sitter"
        action={<ClientRefreshButton onRefresh={load} loading={loading} />}
      />
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
          <div className="overflow-hidden rounded-xl border border-border-default bg-surface-primary lg:rounded-lg">
            {reports.map((r) => {
              const photo = parseFirstPhoto(r.mediaUrls);
              const preview = r.personalNote?.slice(0, 80) || r.content?.slice(0, 80) || '';
              return (
                <InteractiveRow
                  key={r.id}
                  onClick={() => router.push(`/client/reports/${r.id}`)}
                  className="last:border-b-0"
                  aria-label={`View report ${r.booking?.service || 'Visit report'}`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {/* Photo thumbnail or pet icon */}
                    {photo ? (
                      <img
                        src={photo}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-tertiary text-xl">
                        {'\ud83d\udc3e'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-text-primary">
                          {r.booking?.service || 'Visit report'}
                        </p>
                        {r.clientRating ? (
                          <span className="shrink-0 text-xs text-amber-500">
                            {'\u2605'.repeat(r.clientRating)}
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-accent-tertiary px-2 py-0.5 text-[10px] font-medium text-accent-primary">
                            Rate
                          </span>
                        )}
                      </div>
                      {r.sitterName && (
                        <p className="text-xs text-text-tertiary">with {r.sitterName}</p>
                      )}
                      <p className="line-clamp-1 text-sm text-text-secondary">{preview}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 text-xs text-text-tertiary tabular-nums">
                    {r.createdAt ? formatDate(r.createdAt) : '\u2014'}
                  </div>
                </InteractiveRow>
              );
            })}
          </div>
          <ClientListSecondaryModule variant="reports" />
        </div>
      )}
    </LayoutWrapper>
  );
}
