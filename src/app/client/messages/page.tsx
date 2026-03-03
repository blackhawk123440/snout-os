'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutWrapper, PageHeader, Section } from '@/components/layout';
import { AppErrorState } from '@/components/app';
import { EmptyState, PageSkeleton } from '@/components/ui';

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
    <LayoutWrapper variant="narrow">
      <PageHeader
        title="Messages"
        subtitle="Chat with your sitter"
        actions={
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50"
          >
            Refresh
          </button>
        }
      />
      <Section>
      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <AppErrorState title="Couldn't load messages" subtitle={error} onRetry={() => void load()} />
      ) : threads.length === 0 ? (
        <EmptyState
          title="No messages yet"
          description="Your conversations with sitters will appear here."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          {threads.map((t) => (
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/client/messages/${t.id}`)}
              onKeyDown={(e) => e.key === 'Enter' && router.push(`/client/messages/${t.id}`)}
              className="flex cursor-pointer flex-col border-b border-slate-200 px-4 py-3 last:border-b-0 hover:bg-slate-50"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-900">
                  {t.sitter?.name || t.booking?.service || 'Conversation'}
                </p>
                {t.lastActivityAt && (
                  <span className="text-xs text-slate-500 tabular-nums">
                    {formatDate(t.lastActivityAt)}
                  </span>
                )}
              </div>
              {t.booking && (
                <p className="mt-0.5 text-sm text-slate-500">
                  {t.booking.service}
                  {t.booking.startAt && ` · ${formatDate(t.booking.startAt)}`}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
      </Section>
    </LayoutWrapper>
  );
}
