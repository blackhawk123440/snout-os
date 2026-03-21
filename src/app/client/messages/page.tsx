'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { LayoutWrapper, ClientRefreshButton } from '@/components/layout';
import { AppErrorState } from '@/components/app';
import { Button } from '@/components/ui';
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
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-text-primary font-heading leading-tight sm:text-2xl">
            Messages
          </h1>
          <p className="text-[14px] text-text-secondary mt-0.5">
            {threads.length > 0
              ? `${threads.length} conversation${threads.length !== 1 ? 's' : ''}`
              : 'Chat with your sitter'}
          </p>
        </div>
        <ClientRefreshButton onRefresh={refetch} loading={loading} />
      </div>

      {loading ? (
        <MessagesSkeleton />
      ) : error ? (
        <AppErrorState title="Couldn't load messages" subtitle={error.message || 'Unable to load messages'} onRetry={() => void refetch()} />
      ) : threads.length === 0 ? (
        <div className="rounded-2xl bg-accent-tertiary p-8 text-center mt-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-primary shadow-sm mb-4">
            <MessageCircle className="h-7 w-7 text-text-inverse" />
          </div>
          <p className="text-xl font-bold text-text-primary">No messages yet</p>
          <p className="mt-2 text-sm text-text-secondary max-w-[280px] mx-auto leading-relaxed">
            Conversations with your sitter will appear here after you book a visit.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/client/bookings/new">
              <Button variant="primary" size="md">Book a visit</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-surface-primary shadow-sm overflow-hidden mt-4">
          <div className="divide-y divide-border-muted">
            {threads.map((thread) => {
              const sitterName = thread.sitter?.name || thread.booking?.service || 'Conversation';
              const sitterInitial = sitterName.charAt(0).toUpperCase();
              const previewText = thread.preview
                ? renderClientPreview(thread.preview).trim()
                : thread.booking?.service && thread.booking.startAt
                  ? `${thread.booking.service} \u00b7 ${formatDate(thread.booking.startAt)}`
                  : '\u2014';

              return (
                <Link key={thread.id} href={`/client/messages/${thread.id}`}>
                  <div className="flex items-center gap-3 px-5 py-4 min-h-[64px] cursor-pointer hover:bg-surface-secondary transition-colors">
                    <div className="w-10 h-10 rounded-2xl bg-accent-tertiary flex items-center justify-center text-sm font-bold text-accent-primary shrink-0">
                      {sitterInitial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-text-primary truncate">{sitterName}</p>
                        <p className="text-[11px] text-text-tertiary tabular-nums shrink-0">
                          {thread.lastActivityAt ? formatDate(thread.lastActivityAt) : '\u2014'}
                        </p>
                      </div>
                      <p className="text-sm text-text-secondary truncate mt-0.5">{previewText}</p>
                    </div>
                    {thread.status === 'unread' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-accent-primary shrink-0" />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </LayoutWrapper>
  );
}

function MessagesSkeleton() {
  return (
    <div className="space-y-4 animate-pulse mt-4">
      <div className="rounded-2xl border border-border-default bg-surface-primary overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-4">
            <div className="w-10 h-10 rounded-2xl bg-surface-tertiary shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-surface-tertiary" />
              <div className="h-3 w-48 rounded bg-surface-tertiary" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
