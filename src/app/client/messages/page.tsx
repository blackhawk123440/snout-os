'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutWrapper, PageHeader, Section, ClientRefreshButton } from '@/components/layout';
import { AppErrorState } from '@/components/app';
import { EmptyState, PageSkeleton } from '@/components/ui';
import { InteractiveRow } from '@/components/ui/interactive-row';

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
        actions={<ClientRefreshButton onRefresh={load} loading={loading} />}
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
            <InteractiveRow
              key={t.id}
              onClick={() => router.push(`/client/messages/${t.id}`)}
              className="last:border-b-0"
            >
              <div className="flex flex-1 flex-col gap-0.5 px-4 py-2.5 lg:flex-row lg:items-center lg:justify-between lg:py-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">
                    {t.sitter?.name || t.booking?.service || 'Conversation'}
                  </p>
                  {t.booking && (
                    <p className="text-sm text-slate-500">
                      {t.booking.service}
                      {t.booking.startAt && ` · ${formatDate(t.booking.startAt)}`}
                    </p>
                  )}
                </div>
                {t.lastActivityAt && (
                  <span className="shrink-0 text-xs text-slate-500 tabular-nums">
                    {formatDate(t.lastActivityAt)}
                  </span>
                )}
              </div>
            </InteractiveRow>
          ))}
        </div>
      )}
      </Section>
    </LayoutWrapper>
  );
}
