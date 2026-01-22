/**
 * Conversation List Component
 * 
 * Displays a list of conversations with masked numbers
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, Badge, EmptyState, Skeleton, Tabs, TabPanel } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';

interface Conversation {
  id: string;
  participantName: string;
  participantPhone: string;
  participantType: 'client' | 'sitter';
  bookingId: string | null;
  bookingTitle: string | null;
  lastMessage: string;
  lastMessageAt: Date | string;
  unreadCount: number;
  messageCount: number;
  // Phase 4.1: Enhanced fields
  numberClass?: 'front_desk' | 'sitter' | 'pool';
  assignedSitterId?: string | null;
  assignedSitterName?: string | null;
  hasActiveWindow?: boolean;
  scope?: string;
  hasAntiPoachingFlag?: boolean;
  isBlocked?: boolean;
  blockedEventId?: string | null;
}

interface ConversationListProps {
  role?: 'owner' | 'sitter';
  sitterId?: string;
  onSelectConversation?: (conversation: Conversation) => void;
  scope?: 'internal' | 'all'; // Phase 4.1: Filter by scope (internal = owner inbox)
}

export default function ConversationList({ 
  role = 'owner', 
  sitterId,
  onSelectConversation,
  scope = 'all', // Phase 4.1: Default to all threads
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConversations();
  }, [role, sitterId, scope]);

  const fetchConversations = async () => {
    setLoading(true);
    setError(null);
    try {
      // Phase 4.1: Use new messaging endpoints with scope filtering
      // Feature flag is checked server-side in the API route
      const params = new URLSearchParams();
      
      // Add filters if provided
      if (sitterId) {
        params.append('assignedSitterId', sitterId);
      }

      // Phase 4.1: Filter by scope for owner inbox
      if (scope === 'internal') {
        params.append('scope', 'internal');
      }

      const endpoint = `/api/messages/threads?${params}`;
      console.log('[ConversationList] Fetching threads from:', endpoint);
      const response = await fetch(endpoint);
      if (!response.ok) {
        // Fallback to old endpoint if new one fails (backward compatibility)
        if (response.status === 404) {
          const oldParams = new URLSearchParams({ role });
          if (sitterId) {
            oldParams.append('sitterId', sitterId);
          }
          const oldResponse = await fetch(`/api/conversations?${oldParams}`);
          if (oldResponse.ok) {
            const oldData = await oldResponse.json();
            setConversations(oldData.conversations || []);
            setLoading(false);
            return;
          }
        }
        throw new Error('Failed to fetch conversations');
      }

      const data = await response.json();
      setConversations(data.threads || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
        <Skeleton height={80} />
        <Skeleton height={80} />
        <Skeleton height={80} />
      </div>
    );
  }

  if (error) {
    return (
      <Card style={{ backgroundColor: tokens.colors.error[50], borderColor: tokens.colors.error[200] }}>
        <div style={{ padding: tokens.spacing[4], color: tokens.colors.error[700] }}>
          {error}
          <button
            onClick={fetchConversations}
            style={{
              marginLeft: tokens.spacing[3],
              padding: `${tokens.spacing[1]} ${tokens.spacing[3]}`,
              backgroundColor: tokens.colors.error.DEFAULT,
              color: 'white',
              border: 'none',
              borderRadius: tokens.borderRadius.md,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      </Card>
    );
  }

  if (conversations.length === 0) {
    return (
      <EmptyState
        icon="💬"
        title="No conversations"
        description="Start messaging clients or sitters to see conversations here"
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
      {conversations.map((conversation) => (
        <Card
          key={conversation.id}
          style={{
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = tokens.colors.background.tertiary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = tokens.colors.background.secondary;
          }}
          onClick={() => onSelectConversation?.(conversation)}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: tokens.spacing[4] }}>
            <div
              style={{
                width: '3rem',
                height: '3rem',
                borderRadius: '50%',
                backgroundColor: tokens.colors.primary[100],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: tokens.typography.fontSize.xl[0],
              }}
            >
              {conversation.participantName.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], marginBottom: tokens.spacing[1], flexWrap: 'wrap' }}>
                <div
                  style={{
                    fontWeight: tokens.typography.fontWeight.semibold,
                    fontSize: tokens.typography.fontSize.base[0],
                    color: tokens.colors.text.primary,
                  }}
                >
                  {conversation.participantName}
                </div>
                {/* Phase 4.1: Number class badge */}
                {conversation.numberClass && (
                  <Badge 
                    variant={
                      conversation.numberClass === 'front_desk' ? 'default' :
                      conversation.numberClass === 'sitter' ? 'info' :
                      'default'
                    }
                  >
                    {conversation.numberClass === 'front_desk' ? 'Front Desk' :
                     conversation.numberClass === 'sitter' ? 'Sitter' :
                     'Pool'}
                  </Badge>
                )}
                {/* Phase 4.1: Assignment status */}
                {conversation.assignedSitterName && (
                  <Badge variant="info" style={{ fontSize: tokens.typography.fontSize.xs[0] }}>
                    {conversation.assignedSitterName}
                  </Badge>
                )}
                {/* Phase 4.1: Anti-poaching flag */}
                {conversation.hasAntiPoachingFlag && (
                  <Badge variant="error" title="Anti-poaching violation detected">
                    ⚠️
                  </Badge>
                )}
                {/* Phase 4.1: Owner inbox indicator */}
                {conversation.scope === 'internal' && (
                  <Badge variant="warning">Owner Inbox</Badge>
                )}
                {conversation.unreadCount > 0 && (
                  <Badge variant="warning">{conversation.unreadCount}</Badge>
                )}
              </div>
              {conversation.bookingTitle && (
                <div
                  style={{
                    fontSize: tokens.typography.fontSize.sm[0],
                    color: tokens.colors.text.secondary,
                    marginBottom: tokens.spacing[1],
                  }}
                >
                  {conversation.bookingTitle}
                </div>
              )}
              <div
                style={{
                  fontSize: tokens.typography.fontSize.sm[0],
                  color: tokens.colors.text.secondary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {conversation.lastMessage}
              </div>
            </div>
            <div
              style={{
                fontSize: tokens.typography.fontSize.xs[0],
                color: tokens.colors.text.tertiary,
                flexShrink: 0,
              }}
            >
              {formatTime(conversation.lastMessageAt)}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}


