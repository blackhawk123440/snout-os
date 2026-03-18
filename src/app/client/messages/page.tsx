'use client';

import { useRouter } from 'next/navigation';
import { LayoutWrapper, PageHeader, Section, ClientRefreshButton } from '@/components/layout';
import { ClientAtAGlanceSidebarLazy } from '@/components/client/ClientAtAGlanceSidebarLazy';
import { AppErrorState } from '@/components/app';
import { EmptyState, PageSkeleton } from '@/components/ui';
import { InteractiveRow } from '@/components/ui/interactive-row';
import { ClientListSecondaryModule } from '@/components/client/ClientListSecondaryModule';
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
      <PageHeader
        title="Messages"
        subtitle="Chat with your sitter"
        actions={<ClientRefreshButton onRefresh={refetch} loading={loading} />}
      />
      <div className="lg:grid lg:grid-cols-[1fr,auto] lg:gap-6">
        <div className="min-w-0">
          <Section>
            {loading ? (
              <PageSkeleton />
            ) : error ? (
              <AppErrorState title="Couldn't load messages" subtitle={error.message || 'Unable to load messages'} onRetry={() => void refetch()} />
            ) : threads.length === 0 ? (
              <EmptyState
                title="No messages yet"
                description="When you have a booking, you can message your sitter here."
              />
            ) : (
              <div className="w-full space-y-3 lg:max-w-3xl">
                <div className="overflow-hidden rounded-xl border border-border-default bg-surface-primary lg:rounded-lg">
                  {threads.map((t) => (
                    <InteractiveRow
                      key={t.id}
                      onClick={() => router.push(`/client/messages/${t.id}`)}
                      className="last:border-b-0"
                      aria-label={`Open conversation with ${t.sitter?.name || t.booking?.service || 'sitter'}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-primary">
                          {t.sitter?.name || t.booking?.service || 'Conversation'}
                        </p>
                        <p className="truncate text-sm text-text-secondary">
                          {(t.preview ? renderClientPreview(t.preview).trim() : '') || (t.booking?.service && t.booking.startAt ? `${t.booking.service} · ${formatDate(t.booking.startAt)}` : '') || '—'}
                        </p>
                      </div>
                      <div className="flex shrink-0 text-xs text-text-tertiary tabular-nums">
                        {t.lastActivityAt ? formatDate(t.lastActivityAt) : '—'}
                      </div>
                    </InteractiveRow>
                  ))}
                </div>
                <ClientListSecondaryModule variant="messages" />
              </div>
            )}
          </Section>
        </div>
        <ClientAtAGlanceSidebarLazy />
      </div>
    </LayoutWrapper>
  );
}
