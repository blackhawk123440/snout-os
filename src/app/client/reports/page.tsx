'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AppCard,
  AppCardHeader,
  AppCardBody,
  AppPageHeader,
  AppSkeletonList,
  AppEmptyState,
  AppErrorState,
} from '@/components/app';

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

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : '';

  const preview = (content: string, maxLen = 120) =>
    content.length > maxLen ? content.slice(0, maxLen) + '…' : content;

  return (
    <div className="mx-auto max-w-3xl pb-8">
      <AppPageHeader
        title="Visit reports"
        subtitle="Updates from your sitter"
        action={
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
      {loading ? (
        <AppSkeletonList count={3} />
      ) : error ? (
        <AppErrorState title="Couldn't load reports" subtitle={error} onRetry={() => void load()} />
      ) : reports.length === 0 ? (
        <AppEmptyState
          title="No reports yet"
          subtitle="Visit reports from your sitter will appear here."
        />
      ) : (
        <div className="space-y-4">
          {reports.map((r) => (
            <AppCard key={r.id} onClick={() => router.push(`/client/reports/${r.id}`)}>
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
          ))}
        </div>
      )}
    </div>
  );
}
