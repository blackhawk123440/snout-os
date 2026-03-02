'use client';

/**
 * Automation Failures - Admin view: Failures, Dead, Successes tabs + Retry.
 */

import { useCallback, useEffect, useState } from 'react';
import { useSSE } from '@/hooks/useSSE';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { AppPageHeader, AppCard, AppCardBody, AppEmptyState, AppErrorState } from '@/components/app';
import { Button } from '@/components/ui';

interface FailureItem {
  id: string;
  eventType?: string;
  automationType: string;
  status: string;
  error: string | null;
  bookingId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

type Tab = 'fail' | 'dead' | 'success';

export default function AutomationFailuresPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<FailureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('fail');
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ops/automation-failures?limit=50&tab=${tab}`);
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
  }, [tab]);

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

  const handleRetry = async (eventLogId: string) => {
    setRetryingId(eventLogId);
    try {
      const res = await fetch(`/api/ops/automation-failures/${eventLogId}/retry`, {
        method: 'POST',
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 409) {
        alert(json.error || 'Job already succeeded');
        return;
      }
      if (!res.ok) {
        alert(json.error || 'Retry failed');
        return;
      }
      void load();
    } finally {
      setRetryingId(null);
    }
  };

  if (sessionStatus === 'loading' || !session) return null;

  const canRetry = tab === 'fail' || tab === 'dead';

  return (
    <AppShell>
      <AppPageHeader
        title="Automation Failures"
        subtitle="Failed, dead, and recent automation jobs from EventLog."
      />
      <div className="mb-4 flex gap-2">
        {(['fail', 'dead', 'success'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === t
                ? 'bg-red-100 text-red-800'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {t === 'fail' ? 'Failures' : t === 'dead' ? 'Dead' : 'Recent successes'}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-24 rounded-xl bg-neutral-100" />
          <div className="h-24 rounded-xl bg-neutral-100" />
        </div>
      ) : error ? (
        <AppErrorState title="Couldn't load" subtitle={error} onRetry={() => void load()} />
      ) : items.length === 0 ? (
        <AppEmptyState
          title={tab === 'success' ? 'No recent successes' : `No ${tab} events`}
          subtitle={tab === 'success' ? 'Successful automation runs will appear here.' : 'Jobs are processing successfully.'}
        />
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <AppCard
              key={item.id}
              className={
                tab === 'success'
                  ? 'border-green-200 bg-green-50/30'
                  : tab === 'dead'
                    ? 'border-amber-200 bg-amber-50/50'
                    : 'border-red-200 bg-red-50/50'
              }
            >
              <AppCardBody>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-neutral-900">{item.automationType}</p>
                    {item.error && (
                      <p className="mt-1 text-sm text-red-700">{item.error}</p>
                    )}
                    {item.bookingId && (
                      <p className="mt-1 text-xs text-neutral-600">Booking: {item.bookingId}</p>
                    )}
                    <p className="mt-1 text-xs text-neutral-500">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {canRetry && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void handleRetry(item.id)}
                      disabled={retryingId === item.id}
                    >
                      {retryingId === item.id ? 'Retrying…' : 'Re-run'}
                    </Button>
                  )}
                </div>
                {item.metadata && Object.keys(item.metadata).length > 0 && (
                  <pre className="mt-3 overflow-x-auto rounded bg-white/50 p-2 text-xs text-neutral-700">
                    {JSON.stringify(item.metadata, null, 2)}
                  </pre>
                )}
              </AppCardBody>
            </AppCard>
          ))}
        </div>
      )}
    </AppShell>
  );
}
