'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, Button, Tabs, TabPanel } from '@/components/ui';

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
    <article key={job.id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-neutral-900">{job.clientName}</p>
          <p className="text-sm text-neutral-600">{job.service}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(job.status)}`}>
          {job.status.replace('_', ' ')}
        </span>
      </div>
      <p className="text-sm text-neutral-600">{formatDate(job.startAt)} · {formatTime(job.startAt)}</p>
      {job.address && <p className="mt-1 truncate text-xs text-neutral-500">{job.address}</p>}
      <div className="mt-3 flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => router.push(`/sitter/bookings/${job.id}`)}>
          View details
        </Button>
        {job.threadId && (
          <Button variant="secondary" size="sm" onClick={() => router.push(`/sitter/inbox?thread=${job.threadId}`)}>
            Open chat
          </Button>
        )}
      </div>
    </article>
  );

  return (
    <>
      <PageHeader title="Jobs" description="Active, upcoming, and completed" />
      <div className="mx-auto max-w-3xl px-4 pb-8 pt-2">
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
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-xl border border-neutral-200 bg-white p-4">
                <div className="mb-2 h-4 w-1/2 rounded bg-neutral-200" />
                <div className="h-3 w-1/3 rounded bg-neutral-100" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="mt-4 rounded-xl border border-dashed border-neutral-200 bg-white p-10 text-center">
            <p className="text-sm text-neutral-600">{error}</p>
            <Button variant="secondary" size="md" className="mt-4" onClick={() => void loadBookings()}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {activeTab === 'active' && (active.length === 0 ? (
              <p className="rounded-xl border border-dashed border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
                No active jobs. Check Calendar for upcoming.
              </p>
            ) : active.map(renderJobCard))}
            {activeTab === 'upcoming' && (upcoming.length === 0 ? (
              <p className="rounded-xl border border-dashed border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
                No upcoming jobs.
              </p>
            ) : upcoming.map(renderJobCard))}
            {activeTab === 'completed' && (completed.length === 0 ? (
              <p className="rounded-xl border border-dashed border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
                No completed jobs yet.
              </p>
            ) : completed.map(renderJobCard))}
          </div>
        )}
      </div>
    </>
  );
}
