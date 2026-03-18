'use client';

import { useRouter } from 'next/navigation';
import { LayoutWrapper, ClientRefreshButton } from '@/components/layout';
import { AppPageHeader, AppErrorState } from '@/components/app';
import { EmptyState, PageSkeleton } from '@/components/ui';
import { InteractiveRow } from '@/components/ui/interactive-row';
import { ClientListSecondaryModule } from '@/components/client/ClientListSecondaryModule';
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
      <AppPageHeader
        title="Visit reports"
        subtitle="Updates from your sitter"
        action={<ClientRefreshButton onRefresh={refetch} loading={loading} />}
      />
      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <AppErrorState title="Couldn't load reports" subtitle={error.message || 'Unable to load reports'} onRetry={() => void refetch()} />
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
