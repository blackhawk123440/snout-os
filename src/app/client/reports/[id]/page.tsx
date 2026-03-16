'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LayoutWrapper, PageHeader, Section } from '@/components/layout';
import {
  AppCard,
  AppCardHeader,
  AppCardBody,
  AppErrorState,
} from '@/components/app';
import { PageSkeleton } from '@/components/ui/loading-state';

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
    <LayoutWrapper variant="narrow">
      <PageHeader
        title={report?.booking?.service || 'Visit report'}
        subtitle={report?.createdAt ? formatDate(report.createdAt) : ''}
        actions={
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm font-medium text-text-secondary hover:text-text-primary"
          >
            Back
          </button>
        }
      />
      <Section>
      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <AppErrorState title="Couldn't load report" subtitle={error} onRetry={() => void load()} />
      ) : report ? (
        <div className="space-y-4 pb-8">
          <AppCard>
            <AppCardHeader>
              <p className="font-semibold text-text-primary">
                {report.booking?.service || 'Visit report'}
              </p>
              {report.booking && (
                <p className="mt-1 text-sm text-text-secondary">
                  {formatDate(report.booking.startAt)}
                  {report.booking.startAt && report.booking.endAt && (
                    <> · {formatTime(report.booking.startAt)} – {formatTime(report.booking.endAt)}</>
                  )}
                </p>
              )}
            </AppCardHeader>
            <AppCardBody>
              <div className="whitespace-pre-wrap text-sm text-text-secondary">{report.content}</div>
              {report.mediaUrls && (() => {
                let urls: string[] = [];
                try {
                  urls = typeof report.mediaUrls === 'string'
                    ? (JSON.parse(report.mediaUrls) as string[])
                    : Array.isArray(report.mediaUrls)
                      ? report.mediaUrls
                      : [];
                } catch {
                  urls = [];
                }
                if (urls.length === 0) return null;
                return (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {urls.map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block overflow-hidden rounded-lg border border-border-default"
                      >
                        <img
                          src={url}
                          alt="Visit photo"
                          className="h-32 w-32 object-cover"
                        />
                      </a>
                    ))}
                  </div>
                );
              })()}
            </AppCardBody>
          </AppCard>
        </div>
      ) : null}
      </Section>
    </LayoutWrapper>
  );
}
