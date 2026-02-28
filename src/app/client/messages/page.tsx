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

interface Thread {
  id: string;
  status: string;
  lastActivityAt: string | null;
  sitter: { id: string; name: string } | null;
  booking: { id: string; service: string; startAt: string | null } | null;
  preview: string | null;
}

export default function ClientMessagesPage() {
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/client/messages');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Unable to load messages');
        setThreads([]);
        return;
      }
      setThreads(Array.isArray(json.threads) ? json.threads : []);
    } catch {
      setError('Unable to load messages');
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : '';

  return (
    <div className="mx-auto max-w-3xl pb-8">
      <AppPageHeader
        title="Messages"
        subtitle="Chat with your sitter"
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
        <AppErrorState title="Couldn't load messages" subtitle={error} onRetry={() => void load()} />
      ) : threads.length === 0 ? (
        <AppEmptyState
          title="No messages yet"
          subtitle="Your conversations with sitters will appear here."
        />
      ) : (
        <div className="space-y-3">
          {threads.map((t) => (
            <AppCard key={t.id} onClick={() => router.push(`/client/messages/${t.id}`)}>
              <AppCardHeader>
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-neutral-900">
                    {t.sitter?.name || t.booking?.service || 'Conversation'}
                  </p>
                  {t.lastActivityAt && (
                    <span className="text-xs text-neutral-500">
                      {formatDate(t.lastActivityAt)}
                    </span>
                  )}
                </div>
              </AppCardHeader>
              <AppCardBody>
                {t.booking && (
                  <p className="text-sm text-neutral-600">
                    {t.booking.service}
                    {t.booking.startAt && ` · ${formatDate(t.booking.startAt)}`}
                  </p>
                )}
              </AppCardBody>
            </AppCard>
          ))}
        </div>
      )}
    </div>
  );
}
