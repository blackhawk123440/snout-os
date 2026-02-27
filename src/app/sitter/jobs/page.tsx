'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Tabs } from '@/components/ui';
import {
  SitterCard,
  SitterCardHeader,
  SitterCardBody,
  SitterCardActions,
  SitterPageHeader,
  SitterSkeletonList,
  SitterEmptyState,
  SitterErrorState,
} from '@/components/sitter';

type TabId = 'active' | 'upcoming' | 'completed';

interface Job {
  id: string;
  status: string;
  service: string;
  startAt: string;
  endAt: string;
  address: string | null;
  clientName: string;
  pets: Array<{ id: string; name?: string | null; species?: string | null }>;
  threadId: string | null;
}

const statusBadgeClass = (status: string) => {
  switch (status) {
    case 'confirmed': return 'bg-blue-100 text-blue-800';
    case 'completed': return 'bg-green-100 text-green-800';
    case 'pending': return 'bg-amber-100 text-amber-800';
    case 'in_progress': return 'bg-purple-100 text-purple-800';
    case 'cancelled': return 'bg-gray-200 text-gray-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const formatDate = (d: string) => new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
const formatTime = (d: string) => new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export default function SitterJobsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('active');
  const [bookings, setBookings] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [todayRes, calRes] = await Promise.all([
        fetch('/api/sitter/today'),
        fetch('/api/sitter/calendar'),
      ]);
      const todayData = await todayRes.json().catch(() => ({}));
      const calData = await calRes.json().catch(() => ({}));
      const today = Array.isArray(todayData.bookings) ? todayData.bookings : [];
      const upcoming = Array.isArray(calData.bookings) ? calData.bookings : [];
      const all = [...today, ...upcoming.filter((b: Job) => !today.some((t: Job) => t.id === b.id))];
      setBookings(all);
    } catch {
      setError('Unable to load jobs');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  const now = new Date().toISOString();
  const active = bookings
    .filter((b) => ['pending', 'confirmed', 'in_progress'].includes(b.status))
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  const upcoming = bookings
    .filter((b) => ['pending', 'confirmed'].includes(b.status) && b.startAt >= now)
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  const completed = bookings
    .filter((b) => b.status === 'completed')
    .sort((a, b) => b.startAt.localeCompare(a.startAt));

  const renderJobCard = (job: Job) => (
    <SitterCard key={job.id} onClick={() => router.push(`/sitter/bookings/${job.id}`)}>
      <SitterCardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-neutral-900">{job.clientName}</p>
            <p className="text-sm text-neutral-600">{job.service}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(job.status)}`}>
            {job.status.replace('_', ' ')}
          </span>
        </div>
      </SitterCardHeader>
      <SitterCardBody>
        <p className="text-sm text-neutral-600">{formatDate(job.startAt)} · {formatTime(job.startAt)}</p>
        {job.address && <p className="mt-1 truncate text-xs text-neutral-500">{job.address}</p>}
      </SitterCardBody>
      <SitterCardActions stopPropagation>
        <Button variant="secondary" size="sm" onClick={() => router.push(`/sitter/bookings/${job.id}`)}>
          Details
        </Button>
        {job.threadId && (
          <Button variant="secondary" size="sm" onClick={() => router.push(`/sitter/inbox?thread=${job.threadId}`)}>
            Message
          </Button>
        )}
      </SitterCardActions>
    </SitterCard>
  );

  const currentList = activeTab === 'active' ? active : activeTab === 'upcoming' ? upcoming : completed;
  const emptyConfig: { title: string; subtitle: string; cta?: { label: string; onClick: () => void } } = {
    active: { title: 'No active jobs', subtitle: 'Check Calendar for upcoming visits.', cta: { label: 'Open Calendar', onClick: () => router.push('/sitter/calendar') } },
    upcoming: { title: 'No upcoming jobs', subtitle: 'New bookings will appear here.' },
    completed: { title: 'No completed jobs yet', subtitle: 'Finished visits will show up here.' },
  }[activeTab];

  return (
    <div className="mx-auto max-w-3xl pb-8">
      <SitterPageHeader
        title="Jobs"
        subtitle="Active, upcoming, and completed"
        action={
          <Button variant="secondary" size="sm" onClick={() => void loadBookings()} disabled={loading}>
            Refresh
          </Button>
        }
      />
      <Tabs
        tabs={[
          { id: 'active', label: 'Active' },
          { id: 'upcoming', label: 'Upcoming' },
          { id: 'completed', label: 'Completed' },
        ]}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as TabId)}
      />
      {loading ? (
        <div className="mt-4">
          <SitterSkeletonList count={3} />
        </div>
      ) : error ? (
        <div className="mt-4">
          <SitterErrorState title="Couldn't load jobs" subtitle={error} onRetry={() => void loadBookings()} />
        </div>
      ) : currentList.length === 0 ? (
        <div className="mt-4">
          <SitterEmptyState
            title={emptyConfig.title}
            subtitle={emptyConfig.subtitle}
            cta={emptyConfig.cta}
          />
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {currentList.map(renderJobCard)}
        </div>
      )}
    </div>
  );
}
