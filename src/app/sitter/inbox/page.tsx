/**
 * Sitter Inbox Page
 * Thread list + message view with standardized rows and suggested reply panel.
 */

'use client';

import { Suspense, useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import {
  SitterPageHeader,
  SitterSkeletonList,
  SitterEmptyState,
  FeatureStatusPill,
} from '@/components/sitter';
import { useAuth } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import {
  useSitterThreads,
  useSitterMessages,
  useSitterSendMessage,
  type SitterThread,
  type SitterMessage,
} from '@/lib/api/sitter-hooks';
import { formatDistanceToNow, format } from 'date-fns';

const formatThreadTime = (d: Date) => {
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  return isToday ? format(d, 'h:mm a') : format(d, 'MMM d');
};

const SUGGESTED_REPLIES = [
  'On my way! 🐾',
  'All done—they had a great time!',
  'Quick question about their routine',
  'See you at the next visit!',
];

function SitterInboxContent() {
  const { user, isSitter, loading: authLoading } = useAuth();
  const router = useRouter();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [composeMessage, setComposeMessage] = useState('');
  const [threadSearch, setThreadSearch] = useState('');
  const [suggestedTone, setSuggestedTone] = useState<'warm' | 'professional'>('warm');

  const { data: threads = [], isLoading: threadsLoading, error: threadsError } = useSitterThreads();
  const { data: messages = [], isLoading: messagesLoading } = useSitterMessages(selectedThreadId);
  const sendMessage = useSitterSendMessage();

  const selectedThread = threads.find((t) => t.id === selectedThreadId);
  const activeWindow = selectedThread?.assignmentWindows?.[0];
  const isWindowActive =
    activeWindow && new Date() >= activeWindow.startsAt && new Date() <= activeWindow.endsAt;

  useEffect(() => {
    if (!authLoading && !isSitter) {
      router.push('/messages');
    }
  }, [authLoading, isSitter, router]);

  useEffect(() => {
    if (threads.length > 0 && !selectedThreadId) {
      setSelectedThreadId(threads[0].id);
    }
  }, [threads, selectedThreadId]);

  const handleSend = async () => {
    if (!selectedThreadId || !composeMessage.trim() || !isWindowActive) return;
    try {
      await sendMessage.mutateAsync({ threadId: selectedThreadId, body: composeMessage });
      setComposeMessage('');
    } catch {
      // Fail-soft
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  if (authLoading) {
    return (
      <div className="mx-auto max-w-4xl pb-8">
        <SitterPageHeader title="Inbox" subtitle="Messages from clients" />
        <SitterSkeletonList count={4} />
      </div>
    );
  }

  if (!isSitter) return null;

  const filteredThreads = threadSearch.trim()
    ? threads.filter((t) =>
        t.client?.name?.toLowerCase().includes(threadSearch.toLowerCase())
      )
    : threads;

  return (
    <div className="mx-auto max-w-4xl pb-8">
      <SitterPageHeader
        title="Inbox"
        subtitle="Messages from clients during your active assignments"
      />

      <div className="flex min-h-[60vh] flex-col gap-0 rounded-2xl border border-neutral-200 bg-white shadow-sm md:flex-row">
        {/* Thread list */}
        <div className="flex w-full flex-col border-b border-neutral-200 md:w-80 md:border-b-0 md:border-r">
          <div className="border-b border-neutral-200 p-4">
            <input
              type="search"
              placeholder="Search threads..."
              value={threadSearch}
              onChange={(e) => setThreadSearch(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {threadsLoading ? (
              <div className="p-4">
                <SitterSkeletonList count={3} />
              </div>
            ) : threadsError ? (
              <div className="p-4">
                <SitterEmptyState
                  title="Couldn't load threads"
                  subtitle="Give it another try in a moment."
                />
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-4">
                <SitterEmptyState
                  title="No active assignments"
                  subtitle="Messages will appear here when you have visits."
                />
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const tw = thread.assignmentWindows?.[0];
                const isActive =
                  tw && new Date() >= tw.startsAt && new Date() <= tw.endsAt;
                const isSelected = selectedThreadId === thread.id;
                const displayName = thread.client?.name || 'Client';
                const initial = displayName.charAt(0).toUpperCase();
                const lastMsg = isSelected && messages.length > 0 ? messages[messages.length - 1] : null;
                const preview = lastMsg
                  ? ((lastMsg.redactedBody || lastMsg.body || '').slice(0, 50) + ((lastMsg.body?.length ?? 0) > 50 ? '…' : ''))
                  : 'Tap to view messages';

                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => setSelectedThreadId(thread.id)}
                    className={`flex min-h-[72px] min-w-0 items-center gap-3 border-b border-neutral-100 px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${
                      isSelected ? 'bg-blue-50' : 'hover:bg-neutral-50'
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-800">
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-neutral-900">
                        {displayName} • {formatThreadTime(thread.lastActivityAt)}
                      </p>
                      <p className="truncate text-xs text-neutral-500">{preview}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            isActive ? 'bg-green-100 text-green-800' : 'bg-neutral-100 text-neutral-600'
                          }`}
                        >
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                        {/* Unread badge placeholder */}
                        {false && (
                          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-medium text-white">
                            1
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Message view */}
        <div className="flex flex-1 flex-col min-h-0">
          {selectedThreadId ? (
            <>
              {/* Thread header bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 bg-white p-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-800">
                    {(selectedThread?.client?.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900">
                      {selectedThread?.client?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {activeWindow
                        ? `Active until ${format(activeWindow.endsAt, 'MMM d, h:mm a')}`
                        : 'Window inactive'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => router.push('/sitter/today')}>
                    Details
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => router.push('/sitter/today')}>
                    ✨ Daily Delight
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4">
                {messagesLoading ? (
                  <SitterSkeletonList count={2} />
                ) : messages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-neutral-500">No messages yet. Say hi! 👋</p>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                          msg.direction === 'outbound'
                            ? 'ml-auto bg-blue-100 text-neutral-900'
                            : 'bg-neutral-100 text-neutral-900'
                        }`}
                      >
                        <p className="text-xs font-medium text-neutral-600">
                          {msg.direction === 'inbound' ? selectedThread?.client?.name : 'You'} •{' '}
                          {formatDistanceToNow(msg.createdAt, { addSuffix: true })}
                        </p>
                        <p className="mt-1 text-sm">{msg.redactedBody || msg.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Suggested reply panel (Beta) */}
              <div className="border-t border-neutral-200 bg-amber-50/50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-sm font-medium text-neutral-800">Suggested replies</span>
                  <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-900">
                    🧪 Beta
                  </span>
                </div>
                <div className="mb-3 flex gap-2">
                  {SUGGESTED_REPLIES.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setComposeMessage((prev) => (prev ? `${prev} ${s}` : s))}
                      className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-700 transition hover:border-amber-300 hover:bg-amber-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500">Tone:</span>
                  <button
                    type="button"
                    onClick={() => setSuggestedTone('warm')}
                    className={`rounded-lg px-2 py-1 text-xs font-medium ${
                      suggestedTone === 'warm' ? 'bg-amber-200 text-amber-900' : 'text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    Warm
                  </button>
                  <button
                    type="button"
                    onClick={() => setSuggestedTone('professional')}
                    className={`rounded-lg px-2 py-1 text-xs font-medium ${
                      suggestedTone === 'professional' ? 'bg-amber-200 text-amber-900' : 'text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    Professional
                  </button>
                </div>
              </div>

              {/* Compose */}
              <div className="border-t border-neutral-200 p-4">
                {!isWindowActive ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <p className="font-medium">Can&apos;t send right now</p>
                    <p className="mt-0.5 text-xs">
                      Messages are only available during your active assignment window.
                    </p>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      aria-label="Add attachment"
                      className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-neutral-300 text-neutral-500 hover:bg-neutral-50"
                    >
                      <i className="fas fa-paperclip" />
                    </button>
                    <textarea
                      value={composeMessage}
                      onChange={(e) => setComposeMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message..."
                      rows={2}
                      className="min-h-[44px] flex-1 resize-none rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => void handleSend()}
                      disabled={!composeMessage.trim() || sendMessage.isPending}
                      className="shrink-0"
                    >
                      {sendMessage.isPending ? 'Sending…' : 'Send'}
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-neutral-500">
              <p>Select a thread to view messages</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SitterInboxPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl pb-8">
          <SitterPageHeader title="Inbox" subtitle="Loading…" />
          <SitterSkeletonList count={4} />
        </div>
      }
    >
      <SitterInboxContent />
    </Suspense>
  );
}
