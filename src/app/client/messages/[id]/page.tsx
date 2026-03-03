'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LayoutWrapper, PageHeader, Section } from '@/components/layout';
import { AppCard, AppCardBody, AppErrorState } from '@/components/app';
import { toastSuccess } from '@/lib/toast';

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
    const tempId = `pending-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      body,
      direction: 'outbound',
      actorType: 'client',
      createdAt: new Date().toISOString(),
      isFromClient: true,
    };
    setComposerValue('');
    setThread((prev) =>
      prev ? { ...prev, messages: [...prev.messages, optimisticMsg] } : prev
    );
    setSending(true);
    try {
      const res = await fetch(`/api/client/messages/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        toastSuccess('Message sent');
        void load();
      } else {
        setThread((prev) =>
          prev
            ? { ...prev, messages: prev.messages.filter((m) => m.id !== tempId) }
            : prev
        );
        setComposerValue(body);
      }
    } catch {
      setThread((prev) =>
        prev
          ? { ...prev, messages: prev.messages.filter((m) => m.id !== tempId) }
          : prev
      );
      setComposerValue(body);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <LayoutWrapper variant="narrow">
      <PageHeader
        title={thread?.sitter?.name || thread?.booking?.service || 'Conversation'}
        subtitle={thread?.booking?.service}
        actions={
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Back
          </button>
        }
      />
      <Section>
      {loading ? (
          <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <AppErrorState title="Couldn't load thread" subtitle={error} onRetry={() => void load()} />
      ) : thread ? (
        <>
          <div className="flex-1 space-y-3">
            {thread.messages?.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white px-6 py-4">
                <p className="text-center text-sm text-slate-500">No messages yet. Say hello!</p>
              </div>
            ) : (
              thread.messages?.map((m) => {
                const isPending = String(m.id).startsWith('pending-');
                return (
                  <div
                    key={m.id}
                    className={`flex ${m.isFromClient ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-4 py-2 ${
                        m.isFromClient
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-900'
                      }`}
                    >
                      <p className="text-sm">{m.body}</p>
                      <p
                        className={`mt-1 text-[10px] ${
                          m.isFromClient ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {isPending ? 'Sending…' : formatTime(m.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
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
              className="flex-1 rounded-lg border border-slate-200 px-4 py-3 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              disabled={sending}
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!composerValue.trim() || sending}
              className="rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
            >
              Send
            </button>
          </div>
        </>
      ) : null}
      </Section>
    </LayoutWrapper>
  );
}
