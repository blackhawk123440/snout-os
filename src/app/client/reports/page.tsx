'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutWrapper, ClientRefreshButton } from '@/components/layout';
import { AppErrorState } from '@/components/app';
import { Button, PageSkeleton } from '@/components/ui';
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
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary font-heading">Visit reports</h1>
            <p className="text-sm text-text-secondary mt-1">Updates from your sitter</p>
          </div>
          <ClientRefreshButton onRefresh={refetch} loading={loading} />
        </div>

        {loading ? (
          <PageSkeleton />
        ) : error ? (
          <AppErrorState title="Couldn't load reports" subtitle={error.message || 'Unable to load reports'} onRetry={() => void refetch()} />
        ) : reports.length === 0 ? (
          <div className="rounded-2xl border border-border-default bg-surface-primary p-12 text-center">
            <h2 className="text-lg font-semibold text-text-primary mb-2">No reports yet</h2>
            <p className="text-sm text-text-secondary max-w-xs mx-auto mb-6">
              Reports appear here after each visit.
            </p>
            <Button variant="primary" size="md" onClick={() => router.push('/client/bookings')}>
              View bookings
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => {
              const photo = parseFirstPhoto(report.mediaUrls);
              const preview = report.personalNote?.slice(0, 120) || report.content?.slice(0, 120) || '';
              return (
                <Link key={report.id} href={`/client/reports/${report.id}`}>
                  <div className="rounded-xl border border-border-default bg-surface-primary overflow-hidden hover:shadow-[var(--shadow-md)] transition-all duration-200 cursor-pointer">
                    {photo && (
                      <img src={photo} alt="Visit photo" className="w-full h-40 object-cover" />
                    )}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold text-text-primary">
                          {report.booking?.service || 'Visit report'}
                        </h3>
                        <p className="text-xs text-text-tertiary tabular-nums">
                          {report.createdAt ? formatDate(report.createdAt) : '—'}
                        </p>
                      </div>
                      <p className="text-sm text-text-secondary line-clamp-2">{preview}</p>
                      {report.sitterName && (
                        <p className="text-xs text-text-tertiary mt-2">with {report.sitterName}</p>
                      )}
                      {report.clientRating && (
                        <div className="flex items-center gap-0.5 mt-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star} className={star <= report.clientRating! ? 'text-amber-400' : 'text-stone-200'}>★</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </LayoutWrapper>
  );
}
