'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText } from 'lucide-react';
import { LayoutWrapper, ClientRefreshButton } from '@/components/layout';
import { AppErrorState } from '@/components/app';
import { Button } from '@/components/ui';
import { useClientReports } from '@/lib/api/client-hooks';

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
  const { data, isLoading: loading, error, refetch } = useClientReports();
  const reports = data?.reports ?? [];

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : '';

  return (
    <LayoutWrapper variant="narrow">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-text-primary font-heading leading-tight sm:text-2xl">
            Visit reports
          </h1>
          <p className="text-[14px] text-text-secondary mt-0.5">
            {reports.length > 0
              ? `${reports.length} report${reports.length !== 1 ? 's' : ''} from your sitter`
              : 'Updates from your sitter'}
          </p>
        </div>
        <ClientRefreshButton onRefresh={refetch} loading={loading} />
      </div>

      {loading ? (
        <ReportsSkeleton />
      ) : error ? (
        <AppErrorState title="Couldn't load reports" subtitle={error.message || 'Unable to load reports'} onRetry={() => void refetch()} />
      ) : reports.length === 0 ? (
        <div className="rounded-2xl bg-accent-tertiary p-8 text-center mt-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-primary shadow-sm mb-4">
            <FileText className="h-7 w-7 text-text-inverse" />
          </div>
          <p className="text-xl font-bold text-text-primary">No reports yet</p>
          <p className="mt-2 text-sm text-text-secondary max-w-[280px] mx-auto leading-relaxed">
            Your sitter will send visit reports after each appointment.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/client/bookings">
              <Button variant="primary" size="md">View bookings</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4 mt-4">
          {reports.map((report) => {
            const photo = parseFirstPhoto(report.mediaUrls);
            const preview = report.personalNote?.slice(0, 120) || report.content?.slice(0, 120) || '';
            return (
              <div
                key={report.id}
                className="rounded-2xl border border-border-default bg-surface-primary overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition"
                onClick={() => router.push(`/client/reports/${report.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && router.push(`/client/reports/${report.id}`)}
              >
                {photo && (
                  <img src={photo} alt="Visit photo" className="w-full h-[180px] object-cover" />
                )}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="text-[14px] font-semibold text-text-primary">
                      {report.booking?.service || 'Visit report'}
                    </h3>
                    <p className="text-[11px] text-text-tertiary tabular-nums shrink-0">
                      {report.createdAt ? formatDate(report.createdAt) : '\u2014'}
                    </p>
                  </div>
                  <p className="text-[14px] text-text-secondary line-clamp-2 leading-relaxed">{preview}</p>
                  <div className="flex items-center justify-between mt-3">
                    {report.sitterName && (
                      <p className="text-[12px] text-text-tertiary">with {report.sitterName}</p>
                    )}
                    {report.clientRating != null && (
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star} className={`text-sm ${star <= report.clientRating! ? 'text-status-warning-fill' : 'text-border-default'}`}>{'\u2605'}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </LayoutWrapper>
  );
}

function ReportsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse mt-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-border-default bg-surface-primary overflow-hidden">
          <div className="h-[180px] bg-surface-tertiary" />
          <div className="p-5 space-y-2">
            <div className="h-4 w-32 rounded bg-surface-tertiary" />
            <div className="h-3 w-full rounded bg-surface-tertiary" />
            <div className="h-3 w-2/3 rounded bg-surface-tertiary" />
          </div>
        </div>
      ))}
    </div>
  );
}
