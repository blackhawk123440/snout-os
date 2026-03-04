'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutWrapper, PageHeader, Section, ClientRefreshButton } from '@/components/layout';
import { ClientAtAGlanceSidebar } from '@/components/client/ClientAtAGlanceSidebar';
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
      <div className="lg:grid lg:grid-cols-[1fr,auto] lg:gap-6">
        <div className="min-w-0">
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
              <div
                className={`overflow-hidden rounded-lg border border-slate-200 bg-white ${threads.length === 1 ? 'mx-auto max-w-3xl lg:mx-0' : ''}`}
              >
                {threads.map((t) => (
                  <InteractiveRow
                    key={t.id}
                    onClick={() => router.push(`/client/messages/${t.id}`)}
                    className="last:border-b-0"
                  >
                    <div className="grid min-w-0 grid-cols-1 gap-x-4 sm:grid-cols-[1fr,minmax(0,2fr),auto]">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">
                          {t.sitter?.name || t.booking?.service || 'Conversation'}
                        </p>
                      </div>
                      <div className="min-w-0 line-clamp-1 text-sm text-slate-600">
                        {t.preview || (t.booking?.service && t.booking.startAt ? `${t.booking.service} · ${formatDate(t.booking.startAt)}` : '—')}
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
        </div>
        <ClientAtAGlanceSidebar />
      </div>
    </LayoutWrapper>
  );
}
