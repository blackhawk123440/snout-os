/**
 * Sitter Messages Tab
 * 
 * Sitter-scoped inbox view for sitter messages
 * Shows ONLY threads where assignedSitterId === sitterId
 * NO tier content, NO tier metrics, NO tier badges
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, Button, EmptyState, Skeleton, Badge } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';
import { formatDistanceToNow } from 'date-fns';

interface SitterMessagesTabProps {
  sitterId: string;
}

interface SitterThread {
  id: string;
  clientName: string;
  bookingId: string | null;
  booking: {
    id: string;
    clientName: string;
    service: string;
    startAt: string;
    endAt: string;
  } | null;
  lastMessage: {
    id: string;
    body: string;
    direction: string;
    createdAt: string;
    actorType: string;
  } | null;
  lastMessageAt: string;
  hasActiveWindow: boolean;
  maskedNumber: string | null;
  status: string;
}

export function SitterMessagesTab({ sitterId }: SitterMessagesTabProps) {
  const [threads, setThreads] = useState<SitterThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSitterThreads();
  }, [sitterId]);

  const fetchSitterThreads = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/sitters/${sitterId}/messages`);
      if (!response.ok) {
        throw new Error('Failed to fetch sitter messages');
      }
      const data = await response.json();
      setThreads(data.threads || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: tokens.spacing[4] }}>
        <Card style={{ padding: tokens.spacing[4] }}>
          <Skeleton height={200} />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: tokens.spacing[4] }}>
        <Card style={{ padding: tokens.spacing[4] }}>
          <EmptyState
            title="Error Loading Messages"
            description={error}
            icon="⚠️"
          />
        </Card>
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div style={{ padding: tokens.spacing[4] }}>
        <Card style={{ padding: tokens.spacing[4] }}>
          <div style={{ marginBottom: tokens.spacing[4] }}>
            <h2 style={{
              fontSize: tokens.typography.fontSize.xl[0],
              fontWeight: tokens.typography.fontWeight.bold,
              marginBottom: tokens.spacing[2],
            }}>
              Messages
            </h2>
            <p style={{
              color: tokens.colors.text.secondary,
              fontSize: tokens.typography.fontSize.sm[0],
            }}>
              Sitter-scoped inbox: Only threads assigned to this sitter
            </p>
          </div>

          <EmptyState
            title="No Messages"
            description="This sitter has no active message threads."
            icon="💬"
          />
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: tokens.spacing[4] }}>
      <Card style={{ padding: tokens.spacing[4] }}>
        <div style={{ marginBottom: tokens.spacing[4] }}>
          <h2 style={{
            fontSize: tokens.typography.fontSize.xl[0],
            fontWeight: tokens.typography.fontWeight.bold,
            marginBottom: tokens.spacing[2],
          }}>
            Messages ({threads.length})
          </h2>
          <p style={{
            color: tokens.colors.text.secondary,
            fontSize: tokens.typography.fontSize.sm[0],
          }}>
            Sitter-scoped inbox: Only threads assigned to this sitter
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2] }}>
          {threads.map((thread) => (
            <Card
              key={thread.id}
              style={{
                padding: tokens.spacing[3],
                cursor: 'pointer',
                border: `1px solid ${tokens.colors.border.default}`,
              }}
              onClick={() => window.location.href = `/messages?thread=${thread.id}&sitterId=${sitterId}`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: tokens.spacing[2] }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[1] }}>
                    {thread.clientName}
                  </div>
                  {thread.booking && (
                    <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                      {thread.booking.service} • {new Date(thread.booking.startAt).toLocaleDateString()}
                    </div>
                  )}
                  {thread.lastMessage && (
                    <div style={{
                      fontSize: tokens.typography.fontSize.sm[0],
                      color: tokens.colors.text.secondary,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '100%',
                    }}>
                      {thread.lastMessage.body.substring(0, 100)}
                      {thread.lastMessage.body.length > 100 ? '...' : ''}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: tokens.spacing[1] }}>
                  {thread.hasActiveWindow && (
                    <Badge variant="success" size="sm">Active</Badge>
                  )}
                  <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary }}>
                    {formatDistanceToNow(new Date(thread.lastMessageAt), { addSuffix: true })}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Button
          variant="secondary"
          size="md"
          onClick={() => window.location.href = `/messages?tab=inbox&sitterId=${sitterId}`}
          style={{ marginTop: tokens.spacing[4], width: '100%' }}
          leftIcon={<i className="fas fa-external-link-alt" />}
        >
          Open Full Inbox
        </Button>
      </Card>
    </div>
  );
}
