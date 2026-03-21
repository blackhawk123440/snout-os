'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutWrapper, ClientRefreshButton } from '@/components/layout';
import { AppErrorState } from '@/components/app';
import { PageSkeleton } from '@/components/ui';
import { renderClientPreview } from '@/lib/strip-emojis';
import { useClientMessages } from '@/lib/api/client-hooks';

export default function ClientMessagesPage() {
  const router = useRouter();
  const { data, isLoading: loading, error, refetch } = useClientMessages();
  const threads = data?.threads ?? [];

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : '';

  return (
    <LayoutWrapper variant="narrow">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary font-heading">Messages</h1>
            <p className="text-sm text-text-secondary mt-1">Chat with your sitter</p>
          </div>
          <ClientRefreshButton onRefresh={refetch} loading={loading} />
        </div>

        {loading ? (
          <PageSkeleton />
        ) : error ? (
          <AppErrorState title="Couldn't load messages" subtitle={error.message || 'Unable to load messages'} onRetry={() => void refetch()} />
        ) : threads.length === 0 ? (
          <div className="rounded-2xl border border-border-default bg-surface-primary p-12 text-center">
            <h2 className="text-lg font-semibold text-text-primary mb-2">No messages</h2>
            <p className="text-sm text-text-secondary max-w-xs mx-auto">
              Conversations with your sitter will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {threads.map((thread) => {
              const sitterName = thread.sitter?.name || thread.booking?.service || 'Conversation';
              const sitterInitial = sitterName.charAt(0).toUpperCase();
              const previewText = thread.preview
                ? renderClientPreview(thread.preview).trim()
                : thread.booking?.service && thread.booking.startAt
                  ? `${thread.booking.service} · ${formatDate(thread.booking.startAt)}`
                  : '—';

              return (
                <Link key={thread.id} href={`/client/messages/${thread.id}`}>
                  <div className="rounded-xl border border-border-default bg-surface-primary p-4 hover:shadow-[var(--shadow-md)] transition-all cursor-pointer flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-secondary flex items-center justify-center text-sm font-semibold text-text-primary shrink-0">
                      {sitterInitial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-text-primary truncate">{sitterName}</p>
                        <p className="text-xs text-text-tertiary tabular-nums shrink-0 ml-2">
                          {thread.lastActivityAt ? formatDate(thread.lastActivityAt) : '—'}
                        </p>
                      </div>
                      <p className="text-sm text-text-secondary truncate">{previewText}</p>
                    </div>
                    {thread.status === 'unread' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-accent-primary shrink-0" />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </LayoutWrapper>
  );
}
