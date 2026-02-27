/**
 * Sitter Inbox Page
 * 
 * Sitter-specific messaging inbox showing only threads assigned to the sitter
 * with active assignment windows.
 */

'use client';

'use client';

import { Suspense, useState, useEffect } from 'react';
import { PageHeader, Card, Button, EmptyState, Skeleton } from '@/components/ui';
import { FeatureStatusPill } from '@/components/sitter/FeatureStatusPill';
import { useAuth } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useSitterThreads, useSitterMessages, useSitterSendMessage, type SitterThread, type SitterMessage } from '@/lib/api/sitter-hooks';
import { formatDistanceToNow } from 'date-fns';
import { tokens } from '@/lib/design-tokens';

function SitterInboxContent() {
  const { user, isSitter, loading: authLoading } = useAuth();
  const router = useRouter();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [composeMessage, setComposeMessage] = useState('');
  const [threadSearch, setThreadSearch] = useState('');
  
  const { data: threads = [], isLoading: threadsLoading } = useSitterThreads();
  const { data: messages = [], isLoading: messagesLoading } = useSitterMessages(selectedThreadId);
  const sendMessage = useSitterSendMessage();
  
  const selectedThread = threads.find(t => t.id === selectedThreadId);
  const activeWindow = selectedThread?.assignmentWindows?.[0];
  const isWindowActive = activeWindow && new Date() >= activeWindow.startsAt && new Date() <= activeWindow.endsAt;

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
      await sendMessage.mutateAsync({
        threadId: selectedThreadId,
        body: composeMessage,
      });
      setComposeMessage('');
    } catch (error: any) {
      alert(`Failed to send: ${error.message}`);
    }
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!isSitter) {
    return null;
  }

  return (
    <>
      <PageHeader
        title="My Inbox"
        description="Messages from clients during your active assignments"
      />
      
      <div className="flex flex-1 min-h-0 overflow-hidden h-full">
        {/* Left: Thread List */}
        <div className="w-1/3 flex flex-col min-h-0" style={{ borderRight: `1px solid ${tokens.colors.border.default}`, backgroundColor: tokens.colors.neutral[50] }}>
          <div style={{ padding: tokens.spacing[4], borderBottom: `1px solid ${tokens.colors.border.default}`, backgroundColor: 'white' }}>
            <h2 style={{ fontSize: tokens.typography.fontSize.lg[0], fontWeight: tokens.typography.fontWeight.semibold }}>Active Assignments</h2>
            <input
              type="search"
              placeholder="Search threads..."
              value={threadSearch}
              onChange={(e) => setThreadSearch(e.target.value)}
              style={{
                marginTop: tokens.spacing[2],
                width: '100%',
                padding: `${tokens.spacing[2]} ${tokens.spacing[3]}`,
                border: `1px solid ${tokens.colors.border.default}`,
                borderRadius: tokens.borderRadius.sm,
                fontSize: tokens.typography.fontSize.sm[0],
              }}
            />
          </div>
          
          <div className="flex-1 min-h-0 overflow-y-auto">
            {threadsLoading ? (
              <div style={{ padding: tokens.spacing[4] }}>
                <Skeleton height={60} />
                <Skeleton height={60} />
              </div>
            ) : threads.length === 0 ? (
              <div style={{ padding: tokens.spacing[4], textAlign: 'center' }}>
                <EmptyState
                  title="No active assignments"
                  description="You don't have any active assignment windows with messages"
                  icon={<i className="fas fa-inbox" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
                />
              </div>
            ) : (
              threads.map((thread) => {
                const threadWindow = thread.assignmentWindows?.[0];
                const isThreadWindowActive = threadWindow && new Date() >= threadWindow.startsAt && new Date() <= threadWindow.endsAt;
                
                return (
                  <Card
                    key={thread.id}
                    onClick={() => setSelectedThreadId(thread.id)}
                    style={{
                      margin: tokens.spacing[2],
                      padding: tokens.spacing[3],
                      cursor: 'pointer',
                      backgroundColor: selectedThreadId === thread.id ? tokens.colors.primary[50] : 'white',
                      border: selectedThreadId === thread.id ? `2px solid ${tokens.colors.primary.DEFAULT}` : `1px solid ${tokens.colors.border.default}`,
                    }}
                  >
                    <div style={{ fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[1] }}>
                      {thread.client.name}
                    </div>
                    {threadWindow && (
                      <div style={{ 
                        fontSize: tokens.typography.fontSize.xs[0], 
                        color: isThreadWindowActive ? tokens.colors.success[700] : tokens.colors.text.secondary,
                        marginBottom: tokens.spacing[0.5]
                      }}>
                        {isThreadWindowActive ? '✓ Active' : 'Inactive'} • {formatDistanceToNow(new Date(threadWindow.endsAt), { addSuffix: true })}
                      </div>
                    )}
                    <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary }}>
                      {formatDistanceToNow(thread.lastActivityAt, { addSuffix: true })}
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Message View */}
        <div className="flex-1 min-h-0 flex flex-col">
          {selectedThreadId ? (
            <>
              {/* Thread Header */}
              <div style={{ padding: tokens.spacing[4], borderBottom: `1px solid ${tokens.colors.border.default}`, backgroundColor: 'white' }}>
                <div style={{ marginBottom: tokens.spacing[3] }}>
                  <h3 style={{ fontSize: tokens.typography.fontSize.lg[0], fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[1] }}>
                    {selectedThread?.client.name || 'Unknown'}
                  </h3>
                  {user && (
                    <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                      {user.name || user.email} • {selectedThread?.messageNumber?.e164 ? `Assigned number: ${selectedThread.messageNumber.e164}` : 'No assigned number'}
                    </div>
                  )}
                </div>
                {activeWindow ? (
                  <div style={{ 
                    padding: tokens.spacing[2], 
                    backgroundColor: tokens.colors.success[50], 
                    borderRadius: tokens.radius.sm,
                    fontSize: tokens.typography.fontSize.sm[0],
                    color: tokens.colors.success[800]
                  }}>
                    ✓ Active assignment window ends {formatDistanceToNow(new Date(activeWindow.endsAt), { addSuffix: true })}
                  </div>
                ) : (
                  <div style={{ 
                    padding: tokens.spacing[2], 
                    backgroundColor: tokens.colors.warning[50], 
                    borderRadius: tokens.radius.sm,
                    fontSize: tokens.typography.fontSize.sm[0],
                    color: tokens.colors.warning[800]
                  }}>
                    ⚠ Assignment window is not active. You cannot send messages outside your active assignment window.
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 min-h-0 overflow-y-auto" style={{ padding: tokens.spacing[4] }}>
                {messagesLoading ? (
                  <div style={{ textAlign: 'center' }}>
                    <Skeleton height={100} />
                    <Skeleton height={100} />
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: tokens.colors.text.secondary }}>No messages yet</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
                    {messages.map((message) => (
                      <Card
                        key={message.id}
                        style={{
                          maxWidth: message.direction === 'outbound' ? '80%' : '100%',
                          marginLeft: message.direction === 'outbound' ? 'auto' : 0,
                          backgroundColor: message.direction === 'inbound' ? tokens.colors.neutral[100] : tokens.colors.primary[50],
                          padding: tokens.spacing[3],
                        }}
                      >
                        <div style={{ fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.medium, marginBottom: tokens.spacing[1] }}>
                          {message.direction === 'inbound' ? selectedThread?.client.name : 'You'}
                        </div>
                        <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[2] }}>
                          {formatDistanceToNow(message.createdAt, { addSuffix: true })}
                        </div>
                        <div style={{ fontSize: tokens.typography.fontSize.sm[0] }}>
                          {message.redactedBody || message.body}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* AI suggested reply placeholder */}
              <div style={{ padding: tokens.spacing[4], borderBottom: `1px solid ${tokens.colors.border.default}`, backgroundColor: tokens.colors.primary[50], display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacing[2] }}>
                <p style={{ fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.medium, color: tokens.colors.primary[800] }}>
                  AI suggested reply
                </p>
                <FeatureStatusPill featureKey="ai_suggested_reply" />
              </div>

              {/* Compose Box - Pinned Bottom */}
              <div className="flex-shrink-0" style={{ padding: tokens.spacing[4], borderTop: `1px solid ${tokens.colors.border.default}`, backgroundColor: 'white' }}>
                {!isWindowActive ? (
                  <div style={{ 
                    padding: tokens.spacing[3], 
                    backgroundColor: tokens.colors.warning[50], 
                    borderRadius: tokens.radius.sm, 
                    color: tokens.colors.warning[800],
                    fontSize: tokens.typography.fontSize.sm[0],
                    lineHeight: 1.5
                  }}>
                    <div style={{ fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[1] }}>
                      Cannot send messages
                    </div>
                    <div>
                      Your assignment window is not currently active. Messages can only be sent during active assignment windows. Contact the owner if you need to communicate outside your window.
                    </div>
                  </div>
                ) : (
                  <>
                    <textarea
                      value={composeMessage}
                      onChange={(e) => setComposeMessage(e.target.value)}
                      placeholder="Type a message..."
                      style={{
                        width: '100%',
                        border: `1px solid ${tokens.colors.border.default}`,
                        borderRadius: tokens.radius.sm,
                        padding: `${tokens.spacing[2]} ${tokens.spacing[3]}`,
                        marginBottom: tokens.spacing[2],
                        resize: 'none',
                        fontSize: tokens.typography.fontSize.sm[0],
                        fontFamily: 'inherit',
                      }}
                      rows={3}
                    />
                    <Button
                      variant="primary"
                      onClick={handleSend}
                      disabled={!composeMessage.trim() || sendMessage.isPending}
                    >
                      {sendMessage.isPending ? 'Sending...' : 'Send'}
                    </Button>
                  </>
                )}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tokens.colors.text.secondary }}>
              Select a thread to view messages
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function SitterInboxPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Loading...</div>
      </div>
    }>
      <SitterInboxContent />
    </Suspense>
  );
}
