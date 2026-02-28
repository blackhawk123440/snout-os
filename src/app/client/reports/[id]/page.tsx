'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AppCard,
  AppCardHeader,
  AppCardBody,
  AppPageHeader,
  AppSkeletonList,
  AppErrorState,
} from '@/components/app';

interface ReportDetail {
  id: string;
  content: string;
  mediaUrls: string | null;
  visitStarted: string | null;
  visitCompleted: string | null;
  createdAt: string | null;
  booking: {
    id: string;
    service: string;
    startAt: string | null;
    endAt: string | null;
  } | null;
}

export default function ClientReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/client/reports/${id}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Report not found');
        setReport(null);
        return;
      }
      setReport(json);
    } catch {
      setError('Unable to load report');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }) : '';
  const formatTime = (d: string | null) =>
    d ? new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';

  return (
    <div className="mx-auto max-w-3xl pb-8">
      <AppPageHeader
        title={report?.booking?.service || 'Visit report'}
        subtitle={report?.createdAt ? formatDate(report.createdAt) : ''}
        action={
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Back
          </button>
        }
      />
      {loading ? (
        <AppSkeletonList count={2} />
      ) : error ? (
        <AppErrorState title="Couldn't load report" subtitle={error} onRetry={() => void load()} />
      ) : report ? (
        <div className="space-y-4">
          <AppCard>
            <AppCardHeader>
              <p className="font-semibold text-neutral-900">
                {report.booking?.service || 'Visit report'}
              </p>
              {report.booking && (
                <p className="mt-1 text-sm text-neutral-600">
                  {formatDate(report.booking.startAt)}
                  {report.booking.startAt && report.booking.endAt && (
                    <> · {formatTime(report.booking.startAt)} – {formatTime(report.booking.endAt)}</>
                  )}
                </p>
              )}
            </AppCardHeader>
            <AppCardBody>
              <div className="whitespace-pre-wrap text-sm text-neutral-700">{report.content}</div>
            </AppCardBody>
          </AppCard>
        </div>
      ) : null}
    </div>
  );
}
