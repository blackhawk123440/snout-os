/**
 * Sitter Messages Tab
 * 
 * Sitter-scoped inbox with threads tied to bookings
 */

'use client';

import { Card, SectionHeader, EmptyState, Button, Badge } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';
import { useSitterThreads } from '@/lib/api/sitter-hooks';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface SitterMessagesTabProps {
  sitterId: string;
}

export function SitterMessagesTab({ sitterId }: SitterMessagesTabProps) {
  const { data: threads = [], isLoading } = useSitterThreads();

  if (isLoading) {
    return (
      <Card style={{ padding: tokens.spacing[4] }}>
        <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
          Loading messages...
        </div>
      </Card>
    );
  }

  // Filter threads with active assignment windows
  const activeThreads = threads.filter((t: any) => {
    const window = t.assignmentWindows?.[0];
    if (!window) return false;
    const now = new Date();
    return new Date(window.startsAt) <= now && new Date(window.endsAt) >= now;
  });

  return (
    <Card>
      <SectionHeader 
        title="Messages" 
        description="Threads tied to your active assignment windows"
      />
      <div style={{ padding: tokens.spacing[4] }}>
        {activeThreads.length === 0 ? (
          <EmptyState
            title="No active conversations"
            description="You can message clients during active assignment windows. Messages will appear here."
            icon="💬"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2] }}>
            {activeThreads.map((thread: any) => (
              <Link 
                key={thread.id} 
                href={`/sitter/inbox?thread=${thread.id}`}
                style={{ textDecoration: 'none' }}
              >
                <Card
                  style={{
                    padding: tokens.spacing[3],
                    border: `1px solid ${tokens.colors.border.default}`,
                    cursor: 'pointer',
                    transition: `background-color ${tokens.transitions.duration.fast}`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = tokens.colors.neutral[50];
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = tokens.colors.background.default;
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontWeight: tokens.typography.fontWeight.semibold,
                        marginBottom: tokens.spacing[1],
                      }}>
                        {thread.client?.name || 'Client'}
                      </div>
                      <div style={{ 
                        fontSize: tokens.typography.fontSize.sm[0],
                        color: tokens.colors.text.secondary,
                      }}>
                        {formatDistanceToNow(new Date(thread.lastActivityAt), { addSuffix: true })}
                      </div>
                    </div>
                    {thread.ownerUnreadCount > 0 && (
                      <Badge variant="primary">
                        {thread.ownerUnreadCount}
                      </Badge>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
        <div style={{ marginTop: tokens.spacing[4], paddingTop: tokens.spacing[4], borderTop: `1px solid ${tokens.colors.border.default}` }}>
          <Link href="/sitter/inbox">
            <Button variant="primary" style={{ width: '100%' }}>
              Open Full Inbox
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
