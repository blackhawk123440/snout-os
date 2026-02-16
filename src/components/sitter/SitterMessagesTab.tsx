/**
 * Sitter Messages Tab
 * 
 * Sitter-scoped inbox workspace - always renders inbox structure
 */

'use client';

import { Card, SectionHeader, Button, Badge, Skeleton } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';
import { useSitterThreads } from '@/lib/api/sitter-hooks';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface SitterMessagesTabProps {
  sitterId: string;
}

export function SitterMessagesTab({ sitterId }: SitterMessagesTabProps) {
  const { data: threads = [], isLoading } = useSitterThreads();

  // Filter threads with active assignment windows
  const activeThreads = threads.filter((t: any) => {
    const window = t.assignmentWindows?.[0];
    if (!window) return false;
    const now = new Date();
    return new Date(window.startsAt) <= now && new Date(window.endsAt) >= now;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
      {/* Primary CTA at top */}
      <Card style={{ padding: tokens.spacing[4] }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
        }}>
          <div>
            <h3 style={{ 
              fontSize: tokens.typography.fontSize.lg[0], 
              fontWeight: tokens.typography.fontWeight.semibold,
              marginBottom: tokens.spacing[1],
            }}>
              Messages
            </h3>
            <div style={{ 
              fontSize: tokens.typography.fontSize.sm[0],
              color: tokens.colors.text.secondary,
            }}>
              Conversations tied to your active assignment windows
            </div>
          </div>
          <Link href="/sitter/inbox">
            <Button variant="primary" size="md">
              Open Full Inbox
            </Button>
          </Link>
        </div>
      </Card>

      {/* Inbox Thread List - Always rendered */}
      <Card>
        <SectionHeader 
          title="Active Conversations" 
          description="Messages appear here during active assignment windows"
        />
        <div style={{ padding: tokens.spacing[4] }}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
              <Skeleton height={80} />
              <Skeleton height={80} />
              <Skeleton height={80} />
            </div>
          ) : activeThreads.length === 0 ? (
            <div style={{ 
              padding: tokens.spacing[6],
              textAlign: 'center',
            }}>
              <div style={{ 
                fontSize: tokens.typography.fontSize.xl[0],
                marginBottom: tokens.spacing[2],
              }}>
                💬
              </div>
              <div style={{ 
                fontSize: tokens.typography.fontSize.base[0],
                fontWeight: tokens.typography.fontWeight.semibold,
                marginBottom: tokens.spacing[2],
                color: tokens.colors.text.primary,
              }}>
                No active conversations
              </div>
              <div style={{ 
                fontSize: tokens.typography.fontSize.sm[0],
                color: tokens.colors.text.secondary,
                maxWidth: '500px',
                margin: '0 auto',
                lineHeight: '1.5',
              }}>
                Conversations will appear here when you have active assignment windows. 
                You can message clients during these windows. Messages are automatically 
                tied to your bookings and assignment periods.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2] }}>
              {activeThreads.map((thread: any) => (
                <Link 
                  key={thread.id} 
                  href={`/sitter/inbox?thread=${thread.id}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    style={{
                      padding: tokens.spacing[3],
                      border: `1px solid ${tokens.colors.border.default}`,
                      borderRadius: tokens.borderRadius.md,
                      cursor: 'pointer',
                      transition: `background-color ${tokens.transitions.duration.fast}`,
                      backgroundColor: tokens.colors.background.primary,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = tokens.colors.neutral[50];
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = tokens.colors.background.primary;
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
                        <Badge variant="default">
                          {thread.ownerUnreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
