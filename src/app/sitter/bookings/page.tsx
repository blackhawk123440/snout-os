'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import {
  SitterPageHeader,
  SitterSkeletonList,
  SitterEmptyState,
  SitterErrorState,
} from '@/components/sitter';
import { InteractiveRow } from '@/components/ui/interactive-row';
import { statusBadgeClass } from '@/lib/status-colors';
import { useSitterBookings } from '@/lib/api/sitter-portal-hooks';

interface Booking {
  id: string;
  status: string;
  service: string;
  startAt: string;
  endAt: string;
  address: string | null;
  clientName: string;
  pets: Array<{ id: string; name?: string | null; species?: string | null }>;
}

export default function SitterBookingsPage() {
  const router = useRouter();
  const { data, isLoading: loading, error, refetch } = useSitterBookings();
  const bookings: Booking[] = data?.bookings || [];

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="mx-auto w-full max-w-3xl pb-6">
      <SitterPageHeader
        title="Bookings"
        subtitle="Your visits"
        action={
          <Button variant="secondary" size="sm" onClick={() => void refetch()} disabled={loading}>
            Refresh
          </Button>
        }
      />
      {loading ? (
        <SitterSkeletonList count={5} />
      ) : error ? (
        <SitterErrorState
          title="Couldn't load bookings"
          subtitle={error?.message}
          onRetry={() => void refetch()}
        />
      ) : bookings.length === 0 ? (
        <SitterEmptyState
          title="No visits yet"
          subtitle="Your assigned visits will appear here."
          cta={{ label: 'Today', onClick: () => router.push('/sitter/today') }}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border-default bg-surface-primary">
          {bookings.map((b) => (
            <InteractiveRow
              key={b.id}
              onClick={() => router.push(`/sitter/bookings/${b.id}`)}
              className="last:border-b-0"
              aria-label={`View booking ${b.service} for ${b.clientName}`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">{b.service}</p>
                <p className="truncate text-xs text-text-tertiary tabular-nums">
                  {formatDate(b.startAt)} · {formatTime(b.startAt)}
                </p>
                <p className="truncate text-xs text-text-secondary">{b.clientName}</p>
              </div>
              <div className="flex shrink-0">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(b.status)}`}
                >
                  {b.status.replace('_', ' ')}
                </span>
              </div>
            </InteractiveRow>
          ))}
        </div>
      )}
    </div>
  );
}
