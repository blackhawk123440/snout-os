'use client';

/**
 * Message Failures - Admin view: failed SMS/message deliveries + Retry.
 */

import { useCallback, useEffect, useState } from 'react';
import { useSSE } from '@/hooks/useSSE';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { LayoutWrapper, PageHeader, Section } from '@/components/layout';
import { AppCard, AppCardBody, AppErrorState } from '@/components/app';
import { Button, EmptyState, TableSkeleton } from '@/components/ui';

interface MessageFailureItem {
  id: string;
  threadId: string;
  body: string;
  error: string;
  errorCode?: string;
  createdAt: string;
  attemptCount: number;
  client: { id: string; name: string } | null;
  sitter: { id: string; name: string } | null;
}

export default function MessageFailuresPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<MessageFailureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ops/message-failures?limit=50');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Failed to load');
        setItems([]);
        return;
      }
      setItems(json.items || []);
    } catch {
      setError('Failed to load');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
  }, [session, sessionStatus, router]);

  useEffect(() => {
    if (session) void load();
  }, [session, load]);

  const sseUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/realtime/ops/failures` : null;
  useSSE(sseUrl, () => void load(), !!session);

  const handleRetry = async (messageId: string) => {
    setRetryingId(messageId);
    try {
      const res = await fetch(`/api/messages/${messageId}/retry`, {
        method: 'POST',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(json.error || 'Retry failed');
        return;
      }
      if (json.success) {
        void load();
      } else {
        alert(json.error || 'Retry failed');
      }
    } finally {
      setRetryingId(null);
    }
  };

  if (sessionStatus === 'loading' || !session) return null;

  return (
    <AppShell>
      <LayoutWrapper>
        <PageHeader
          title="Message Failures"
          subtitle="Failed SMS/message deliveries. Retry from here or in the thread."
        />
        <Section>
      {loading ? (
        <TableSkeleton rows={4} cols={3} />
      ) : error ? (
        <AppErrorState title="Couldn't load" subtitle={error} onRetry={() => void load()} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No failed messages"
          description="Failed deliveries will appear here. You can retry from the inbox or this page."
        />
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <AppCard key={item.id} className="border-red-200 bg-red-50/50">
              <AppCardBody>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-neutral-900">
                      {item.client?.name ?? 'Unknown client'}
                      {item.sitter && (
                        <span className="ml-2 text-sm font-normal text-neutral-600">
                          (Sitter: {item.sitter.name})
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-sm text-neutral-700 line-clamp-2">{item.body}</p>
                    <p className="mt-1 text-sm text-red-700">{item.error}</p>
                    {item.errorCode && (
                      <p className="mt-0.5 text-xs text-neutral-500">Code: {item.errorCode}</p>
                    )}
                    <p className="mt-1 text-xs text-neutral-500">
                      {new Date(item.createdAt).toLocaleString()} · Attempt {item.attemptCount}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/messages?thread=${item.threadId}`}>
                      <Button variant="secondary" size="sm">
                        View thread
                      </Button>
                    </Link>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => void handleRetry(item.id)}
                      disabled={retryingId === item.id}
                    >
                      {retryingId === item.id ? 'Retrying…' : 'Retry'}
                    </Button>
                  </div>
                </div>
              </AppCardBody>
            </AppCard>
          ))}
        </div>
      )}
        </Section>
      </LayoutWrapper>
    </AppShell>
  );
}
