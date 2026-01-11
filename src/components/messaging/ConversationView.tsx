/**
 * Conversation View Component
 * 
 * Displays messages in a conversation thread
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, Button, Input, Badge, EmptyState, Skeleton } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';

interface Message {
  id: string;
  direction: 'inbound' | 'outbound';
  from: string;
  to: string;
  body: string;
  status: string;
  bookingId: string | null;
  createdAt: Date | string;
}

interface ConversationViewProps {
  participantPhone: string;
  participantName: string;
  bookingId?: string | null;
  role?: 'owner' | 'sitter';
  onBack?: () => void;
}

export default function ConversationView({
  participantPhone,
  participantName,
  bookingId,
  role = 'owner',
  onBack,
}: ConversationViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [participantPhone, bookingId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const params = new URLSearchParams({ role });
      if (bookingId) {
        params.append('bookingId', bookingId);
      }

      const response = await fetch(`/api/conversations/${encodeURIComponent(participantPhone)}?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      setMessages(data.messages || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!messageText.trim() || sending) return;

    setSending(true);
    setError(null);

    try {
      const response = await fetch(`/api/conversations/${encodeURIComponent(participantPhone)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          bookingId,
          role,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setMessageText('');
      // Refresh messages
      await fetchMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <Card>
        <Skeleton height={400} />
      </Card>
    );
  }

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', height: '600px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing[3],
          padding: tokens.spacing[4],
          borderBottom: `1px solid ${tokens.colors.border.default}`,
        }}
      >
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            leftIcon={<i className="fas fa-arrow-left" />}
          >
            Back
          </Button>
        )}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontWeight: tokens.typography.fontWeight.semibold,
              fontSize: tokens.typography.fontSize.lg[0],
              color: tokens.colors.text.primary,
            }}
          >
            {participantName}
          </div>
          <div
            style={{
              fontSize: tokens.typography.fontSize.sm[0],
              color: tokens.colors.text.secondary,
            }}
          >
            {participantPhone}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: tokens.spacing[4],
          display: 'flex',
          flexDirection: 'column',
          gap: tokens.spacing[3],
        }}
      >
        {messages.length === 0 ? (
          <EmptyState
            icon="💬"
            title="No messages yet"
            description="Start the conversation by sending a message"
          />
        ) : (
          messages.map((message) => {
            const isOutbound = message.direction === 'outbound';
            return (
              <div
                key={message.id}
                style={{
                  display: 'flex',
                  justifyContent: isOutbound ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '70%',
                    padding: tokens.spacing[3],
                    borderRadius: tokens.borderRadius.md,
                    backgroundColor: isOutbound
                      ? tokens.colors.primary.DEFAULT
                      : tokens.colors.background.tertiary,
                    color: isOutbound ? 'white' : tokens.colors.text.primary,
                  }}
                >
                  <div style={{ marginBottom: tokens.spacing[1] }}>{message.body}</div>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.xs[0],
                      opacity: 0.7,
                      textAlign: 'right',
                    }}
                  >
                    {formatTime(message.createdAt)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: tokens.spacing[4],
          borderTop: `1px solid ${tokens.colors.border.default}`,
        }}
      >
        {error && (
          <div
            style={{
              marginBottom: tokens.spacing[2],
              padding: tokens.spacing[2],
              backgroundColor: tokens.colors.error[50],
              color: tokens.colors.error[700],
              borderRadius: tokens.borderRadius.md,
              fontSize: tokens.typography.fontSize.sm[0],
            }}
          >
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: tokens.spacing[2] }}>
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message..."
            style={{ flex: 1 }}
          />
          <Button
            variant="primary"
            onClick={handleSend}
            disabled={!messageText.trim() || sending}
            leftIcon={<i className="fas fa-paper-plane" />}
          >
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </div>
    </Card>
  );
}


