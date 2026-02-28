'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AppCard,
  AppCardBody,
  AppPageHeader,
  AppSkeletonList,
  AppErrorState,
} from '@/components/app';

interface Message {
  id: string;
  body: string;
  direction: string;
  actorType: string;
  createdAt: string;
  isFromClient: boolean;
}

interface ThreadDetail {
  id: string;
  status: string;
  sitter: { id: string; name: string } | null;
  booking: { id: string; service: string; startAt: string } | null;
  messages: Message[];
}

export default function ClientMessageThreadPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composerValue, setComposerValue] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/client/messages/${id}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Thread not found');
        setThread(null);
        return;
      }
      setThread(json);
    } catch {
      setError('Unable to load thread');
      setThread(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.messages?.length]);

  const handleSend = async () => {
    const body = composerValue.trim();
    if (!body || !id || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/client/messages/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setComposerValue('');
        setThread((prev) =>
          prev
            ? { ...prev, messages: [...prev.messages, json] }
            : prev
        );
      }
    } finally {
      setSending(false);
    }
  };

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="mx-auto flex max-w-3xl flex-col pb-8" style={{ minHeight: '60vh' }}>
      <AppPageHeader
        title={thread?.sitter?.name || thread?.booking?.service || 'Conversation'}
        subtitle={thread?.booking?.service}
        action={
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Back
          </button>
        }
      />
      {loading ? (
        <AppSkeletonList count={3} />
      ) : error ? (
        <AppErrorState title="Couldn't load thread" subtitle={error} onRetry={() => void load()} />
      ) : thread ? (
        <>
          <div className="flex-1 space-y-3">
            {thread.messages?.length === 0 ? (
              <AppCard>
                <AppCardBody>
                  <p className="text-center text-sm text-neutral-500">No messages yet. Say hello!</p>
                </AppCardBody>
              </AppCard>
            ) : (
              thread.messages?.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.isFromClient ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                      m.isFromClient
                        ? 'bg-blue-600 text-white'
                        : 'bg-neutral-100 text-neutral-900'
                    }`}
                  >
                    <p className="text-sm">{m.body}</p>
                    <p
                      className={`mt-1 text-[10px] ${
                        m.isFromClient ? 'text-blue-100' : 'text-neutral-500'
                      }`}
                    >
                      {formatTime(m.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="mt-4 flex gap-2">
            <input
              type="text"
              value={composerValue}
              onChange={(e) => setComposerValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && void handleSend()}
              placeholder="Type a message..."
              className="flex-1 rounded-xl border border-neutral-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={sending}
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!composerValue.trim() || sending}
              className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
