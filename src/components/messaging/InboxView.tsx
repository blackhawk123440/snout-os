/**
 * Inbox View Component
 * 
 * Owner inbox with thread list, message view, routing drawer, retries, policy handling
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  useThreads,
  useThread,
  useMessages,
  useSendMessage,
  useRetryMessage,
  useMarkThreadRead,
  useRoutingHistory,
  type Thread,
  type Message,
} from '@/lib/api/hooks';
import { formatDistanceToNow } from 'date-fns';
import { Card, Button, Badge, EmptyState, Skeleton } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';
import { useAuth } from '@/lib/auth-client';
import { isMessagingEnabled } from '@/lib/flags';
import { DiagnosticsPanel } from './DiagnosticsPanel';

interface InboxViewProps {
  role?: 'owner' | 'sitter';
  sitterId?: string;
  initialThreadId?: string;
  inbox?: 'all' | 'owner'; // Filter by inbox type
}

function InboxViewContent({ role = 'owner', sitterId, initialThreadId, inbox = 'all' }: InboxViewProps) {
  const searchParams = useSearchParams();
  const threadParam = searchParams.get('thread');
  const sitterParam = searchParams.get('sitterId');
  
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(
    initialThreadId || threadParam || null
  );
  const [filters, setFilters] = useState<{
    unreadOnly?: boolean;
    hasPolicyViolation?: boolean;
    hasDeliveryFailure?: boolean;
    sitterId?: string;
    search?: string;
  }>({
    sitterId: sitterId || sitterParam || undefined,
  });
  const [showRoutingDrawer, setShowRoutingDrawer] = useState(false);
  const [composeMessage, setComposeMessage] = useState('');
  const [showPolicyOverride, setShowPolicyOverride] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [showPoolExhaustedConfirm, setShowPoolExhaustedConfirm] = useState(false);

  // Apply filters to API call - explicitly pass each filter
  const { data: threads = [], isLoading: threadsLoading, error: threadsError } = useThreads({
    unreadOnly: filters.unreadOnly,
    hasPolicyViolation: filters.hasPolicyViolation,
    hasDeliveryFailure: filters.hasDeliveryFailure,
    sitterId: filters.sitterId,
    search: filters.search,
    inbox, // Pass inbox filter to hook
  });
  const { data: selectedThread } = useThread(selectedThreadId);
  const { data: messages = [], isLoading: messagesLoading } = useMessages(selectedThreadId);
  const { data: routingHistory } = useRoutingHistory(selectedThreadId);
  const sendMessage = useSendMessage();
  const retryMessage = useRetryMessage();
  const markRead = useMarkThreadRead();
  const { user } = useAuth();
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [lastFetch, setLastFetch] = useState<{ url?: string; status?: number; responseSize?: number; error?: string } | null>(null);

  // Poll window.__lastThreadsFetch for diagnostics (set by apiRequest in client.ts)
  useEffect(() => {
    const checkFetch = () => {
      if (typeof window !== 'undefined' && (window as any).__lastThreadsFetch) {
        setLastFetch((window as any).__lastThreadsFetch);
      }
    };
    checkFetch();
    const interval = setInterval(checkFetch, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update filters when sitterId changes
  useEffect(() => {
    if (sitterId || sitterParam) {
      setFilters({ ...filters, sitterId: sitterId || sitterParam || undefined });
    }
  }, [sitterId, sitterParam]);

  // Auto-select most recent thread when sitter filter is applied
  useEffect(() => {
    if ((sitterId || sitterParam) && threads.length > 0 && !selectedThreadId) {
      // Select the most recent thread (first in list, sorted by lastActivityAt desc)
      setSelectedThreadId(threads[0].id);
    }
  }, [sitterId, sitterParam, threads, selectedThreadId]);

  // Mark thread as read when selected
  useEffect(() => {
    if (selectedThreadId) {
      markRead.mutate(selectedThreadId);
    }
  }, [selectedThreadId, markRead]);

  // Filter threads by search
  const filteredThreads = threads.filter((thread) => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    return (
      thread.client.name.toLowerCase().includes(searchLower) ||
      thread.messageNumber.e164.includes(searchLower) ||
      (thread.sitter?.name.toLowerCase().includes(searchLower) ?? false)
    );
  });

  const handleSendMessage = async (confirmPoolFallback = false) => {
    if (!selectedThreadId || !composeMessage.trim()) return;

    try {
      await sendMessage.mutateAsync({
        threadId: selectedThreadId,
        body: composeMessage,
        forceSend: false,
        confirmPoolFallback,
      });
      setComposeMessage('');
      setShowPoolExhaustedConfirm(false);
    } catch (error: any) {
      // Handle API errors - check both error.response (axios) and error directly
      const errorData = error?.response?.data || error?.data || {};
      const errorCode = errorData.errorCode || error?.errorCode || error?.code;
      
      if (errorCode === 'POOL_EXHAUSTED') {
        setShowPoolExhaustedConfirm(true);
      } else if (error.message?.includes('Policy violation') || errorData.error?.includes('Policy violation')) {
        setShowPolicyOverride(selectedThreadId);
      } else {
        const errorMessage = errorData.userMessage || errorData.error || error.message || 'Unknown error';
        alert(`Failed to send: ${errorMessage}`);
      }
    }
  };

  const handleOverrideAndSend = async () => {
    if (!selectedThreadId || !composeMessage.trim() || !overrideReason.trim()) return;

    try {
      await sendMessage.mutateAsync({
        threadId: selectedThreadId,
        body: composeMessage,
        forceSend: true,
      });
      setComposeMessage('');
      setOverrideReason('');
      setShowPolicyOverride(null);
    } catch (error: any) {
      alert(`Failed to send: ${error.message}`);
    }
  };

  const handleRetry = async (messageId: string) => {
    try {
      await retryMessage.mutateAsync(messageId);
    } catch (error: any) {
      alert(`Failed to retry: ${error.message}`);
    }
  };

  const handleSeed = async () => {
    try {
      const response = await fetch('/api/ops/seed-messaging', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        alert(`Demo data created! Thread A (failed delivery + active window) and Thread B (policy violation). Refreshing...`);
        window.location.reload();
      } else {
        alert(data.error || 'Failed to create demo data');
      }
    } catch (error: any) {
      alert(`Failed to create demo data: ${error.message}`);
    }
  };

  // Update lastFetch when window.__lastThreadsFetch changes (lastFetch already declared above at line 70)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const checkFetchData = () => {
      const fetchData = (window as any).__lastThreadsFetch;
      if (fetchData) {
        setLastFetch(fetchData);
      }
    };
    
    // Check immediately
    checkFetchData();
    
    // Also check periodically (in case fetch completes outside React cycle)
    const interval = setInterval(checkFetchData, 1000);
    
    return () => clearInterval(interval);
  }, [threadsLoading, threadsError, threads.length]); // Update when fetch state or data changes

  const getDeliveryStatus = (message: Message) => {
    if (message.direction === 'inbound') {
      return { status: 'delivered', label: 'Received' };
    }

    const latestDelivery = message.deliveries[message.deliveries.length - 1];
    if (!latestDelivery) {
      return { status: 'unknown', label: 'Unknown' };
    }

    return {
      status: latestDelivery.status,
      label:
        latestDelivery.status === 'delivered'
          ? 'Delivered'
          : latestDelivery.status === 'sent'
            ? 'Sent'
            : latestDelivery.status === 'failed'
              ? 'Failed'
              : 'Queued',
      error: latestDelivery.providerErrorMessage,
    };
  };

  const getSenderLabel = (message: Message) => {
    if (message.direction === 'inbound') {
      return selectedThread?.client.name || 'Client';
    }

    switch (message.senderType) {
      case 'owner':
        return 'You';
      case 'sitter':
        return selectedThread?.sitter?.name || 'Sitter';
      case 'system':
        return 'System';
      case 'automation':
        return 'Automation';
      default:
        return 'Unknown';
    }
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 200px)', minHeight: '600px', position: 'relative' }}>
      {/* Diagnostics Panel (dev + owner-only) */}
      <DiagnosticsPanel
        threadsCount={threads.length}
        threadsLoading={threadsLoading}
        threadsError={threadsError || null}
        lastFetchUrl={lastFetch?.url}
        lastFetchStatus={lastFetch?.status}
        lastFetchResponseSize={lastFetch?.responseSize}
        onSeed={handleSeed}
      />

      {/* Left: Thread List */}
      <div style={{ width: '33%', borderRight: `1px solid ${tokens.colors.border.default}`, backgroundColor: tokens.colors.neutral[50], display: 'flex', flexDirection: 'column' }}>
        {/* Filters */}
        <div style={{ padding: tokens.spacing[4], borderBottom: `1px solid ${tokens.colors.border.default}`, backgroundColor: 'white' }}>
          <h2 style={{ fontSize: tokens.typography.fontSize.lg[0], fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[3] }}>Threads</h2>

          {/* Search */}
          <input
            type="text"
            placeholder="Search threads..."
            style={{
              width: '100%',
              border: `1px solid ${tokens.colors.border.default}`,
              borderRadius: tokens.radius.sm,
              padding: `${tokens.spacing[2]} ${tokens.spacing[3]}`,
              marginBottom: tokens.spacing[3],
              fontSize: tokens.typography.fontSize.sm[0],
            }}
            value={filters.search || ''}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />

          {/* Filter Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: tokens.spacing[2] }}>
            <Button
              variant={filters.unreadOnly ? 'primary' : 'secondary'}
              size="sm"
              onClick={() =>
                setFilters({
                  ...filters,
                  unreadOnly: filters.unreadOnly ? undefined : true,
                })
              }
            >
              Unread
            </Button>
            <Button
              variant={filters.hasPolicyViolation ? 'primary' : 'secondary'}
              size="sm"
              onClick={() =>
                setFilters({
                  ...filters,
                  hasPolicyViolation: filters.hasPolicyViolation ? undefined : true,
                })
              }
            >
              Policy Issues
            </Button>
            <Button
              variant={filters.hasDeliveryFailure ? 'primary' : 'secondary'}
              size="sm"
              onClick={() =>
                setFilters({
                  ...filters,
                  hasDeliveryFailure: filters.hasDeliveryFailure ? undefined : true,
                })
              }
            >
              Delivery Failures
            </Button>
          </div>
        </div>

        {/* Thread List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {threadsLoading ? (
            <div style={{ padding: tokens.spacing[4], textAlign: 'center', color: tokens.colors.text.secondary }}>
              <Skeleton height={60} />
              <Skeleton height={60} />
              <Skeleton height={60} />
            </div>
          ) : filteredThreads.length === 0 ? (
            <div style={{ padding: tokens.spacing[4], textAlign: 'center', color: tokens.colors.text.secondary }}>
              {threads.length === 0 ? (
                <EmptyState
                  title="No threads yet"
                  description={process.env.NODE_ENV === 'development' || process.env.ALLOW_DEV_SEED === 'true'
                    ? "Create demo data to get started with messaging"
                    : "Start a conversation to see threads here"}
                  icon={<i className="fas fa-comments" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
                  action={
                    (process.env.NODE_ENV === 'development' || process.env.ALLOW_DEV_SEED === 'true') ? {
                      label: "Create Demo Data",
                      onClick: handleSeed,
                      variant: "primary" as const,
                    } : undefined
                  }
                />
              ) : (
                <div>
                  {filters.sitterId ? (
                    <EmptyState
                      title="No active conversations for this sitter"
                      description="Create an assignment window and thread to enable messaging for this sitter."
                      icon={<i className="fas fa-user-friends" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
                    />
                  ) : (
                    <div>No threads match your filters</div>
                  )}
                </div>
              )}
            </div>
          ) : (
            filteredThreads.map((thread) => (
              <div
                key={thread.id}
                onClick={() => setSelectedThreadId(thread.id)}
                style={{
                  padding: tokens.spacing[4],
                  borderBottom: `1px solid ${tokens.colors.border.default}`,
                  cursor: 'pointer',
                  backgroundColor: selectedThreadId === thread.id ? tokens.colors.primary[50] : 'white',
                  borderLeft: selectedThreadId === thread.id ? `4px solid ${tokens.colors.primary.DEFAULT}` : 'none',
                }}
                onMouseEnter={(e) => {
                  if (selectedThreadId !== thread.id) {
                    e.currentTarget.style.backgroundColor = tokens.colors.neutral[50];
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedThreadId !== thread.id) {
                    e.currentTarget.style.backgroundColor = 'white';
                  }
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: tokens.spacing[1] }}>
                  <div style={{ fontWeight: tokens.typography.fontWeight.medium, fontSize: tokens.typography.fontSize.sm[0] }}>
                    {thread.client.name || 'Unknown'}
                  </div>
                  {thread.ownerUnreadCount > 0 && (
                    <Badge variant="info">{thread.ownerUnreadCount}</Badge>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[1], marginBottom: tokens.spacing[1] }}>
                  <Badge 
                    variant={
                      thread.messageNumber.class === 'front_desk' ? 'default' :
                      thread.messageNumber.class === 'pool' ? 'info' :
                      thread.messageNumber.class === 'sitter' ? 'success' : 'default'
                    }
                    style={{ fontSize: tokens.typography.fontSize.xs[0] }}
                  >
                    {thread.messageNumber.class}
                  </Badge>
                  <span style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary }}>
                    {thread.messageNumber.e164}
                  </span>
                </div>
                {thread.sitter && (
                  <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                    Assigned to {thread.sitter.name}
                  </div>
                )}
                <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.tertiary }}>
                  {formatDistanceToNow(thread.lastActivityAt, { addSuffix: true })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: Message View */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedThreadId ? (
          <>
            {/* Thread Header */}
            <div style={{ padding: tokens.spacing[4], borderBottom: `1px solid ${tokens.colors.border.default}`, backgroundColor: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: tokens.typography.fontSize.lg[0], fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[2] }}>
                    {selectedThread?.client.name || 'Unknown'}
                  </h3>
                  <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, display: 'flex', flexDirection: 'column', gap: tokens.spacing[1] }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
                      <span>Business Number:</span>
                      <span style={{ fontFamily: 'monospace' }}>{selectedThread?.messageNumber.e164}</span>
                      <Badge 
                        variant={
                          selectedThread?.messageNumber.class === 'front_desk' ? 'default' :
                          selectedThread?.messageNumber.class === 'pool' ? 'info' :
                          selectedThread?.messageNumber.class === 'sitter' ? 'success' : 'default'
                        }
                        style={{ fontSize: tokens.typography.fontSize.xs[0] }}
                      >
                        {selectedThread?.messageNumber.class}
                      </Badge>
                    </div>
                    {selectedThread?.sitter && (
                      <div>
                        <span style={{ fontWeight: tokens.typography.fontWeight.medium }}>Assigned Sitter:</span> {selectedThread.sitter.name}
                      </div>
                    )}
                    {selectedThread?.assignmentWindows?.[0] && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
                        <span style={{ fontWeight: tokens.typography.fontWeight.medium }}>Window Status:</span>
                        <Badge variant="success">Active</Badge>
                        <span style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.tertiary }}>
                          (ends {formatDistanceToNow(selectedThread.assignmentWindows[0].endsAt, { addSuffix: true })})
                        </span>
                      </div>
                    )}
                    {selectedThread?.assignmentWindows && selectedThread.assignmentWindows.length === 0 && (
                      <div>
                        <Badge variant="default">No active window</Badge>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowRoutingDrawer(true)}
                  leftIcon={<i className="fas fa-question-circle" />}
                >
                  Why routed here?
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: tokens.spacing[4] }}>
              {messagesLoading ? (
                <div style={{ textAlign: 'center', color: tokens.colors.text.secondary }}>
                  <Skeleton height={100} />
                  <Skeleton height={100} />
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: tokens.colors.text.secondary }}>No messages yet</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
                  {messages.map((message) => {
                    const delivery = getDeliveryStatus(message);
                    const senderLabel = getSenderLabel(message);

                    return (
                      <Card
                        key={message.id}
                        style={{
                          maxWidth: message.direction === 'outbound' ? '80%' : '100%',
                          marginLeft: message.direction === 'outbound' ? 'auto' : 0,
                          backgroundColor: message.direction === 'inbound' ? tokens.colors.neutral[100] : tokens.colors.primary[50],
                          padding: tokens.spacing[3],
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: tokens.spacing[2] }}>
                          <div>
                            <div style={{ fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.medium, marginBottom: tokens.spacing[0.5] }}>
                              {senderLabel}
                            </div>
                            <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary }}>
                              {formatDistanceToNow(message.createdAt, { addSuffix: true })}
                            </div>
                          </div>
                          <Badge
                            variant={
                              delivery.status === 'delivered'
                                ? 'success'
                                : delivery.status === 'failed'
                                  ? 'error'
                                  : delivery.status === 'sent'
                                    ? 'info'
                                    : 'default'
                            }
                            style={{ fontSize: tokens.typography.fontSize.xs[0] }}
                          >
                            {delivery.label}
                          </Badge>
                        </div>

                        <div style={{ fontSize: tokens.typography.fontSize.sm[0], marginBottom: tokens.spacing[2], lineHeight: 1.5 }}>
                          {message.redactedBody || message.body}
                        </div>

                        {message.hasPolicyViolation && (
                          <div style={{ 
                            fontSize: tokens.typography.fontSize.xs[0], 
                            color: tokens.colors.error.DEFAULT, 
                            backgroundColor: tokens.colors.error[50],
                            padding: tokens.spacing[2],
                            borderRadius: tokens.radius.sm,
                            marginBottom: tokens.spacing[2]
                          }}>
                            ⚠️ Policy violation detected
                            {message.policyViolations?.[0] && (
                              <div style={{ marginTop: tokens.spacing[1], fontSize: tokens.typography.fontSize.xs[0] }}>
                                {message.policyViolations[0].detectedSummary}
                              </div>
                            )}
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], flexWrap: 'wrap' }}>
                          {delivery.status === 'failed' && message.direction === 'outbound' && (
                            <Button
                              variant="tertiary"
                              size="sm"
                              onClick={() => handleRetry(message.id)}
                              disabled={retryMessage.isPending}
                              leftIcon={<i className="fas fa-redo" />}
                            >
                              {retryMessage.isPending ? 'Retrying...' : 'Retry'}
                            </Button>
                          )}

                          {delivery.error && (
                            <div style={{ 
                              fontSize: tokens.typography.fontSize.xs[0], 
                              color: tokens.colors.error.DEFAULT,
                              backgroundColor: tokens.colors.error[50],
                              padding: `${tokens.spacing[1]} ${tokens.spacing[2]}`,
                              borderRadius: tokens.radius.sm,
                              maxWidth: '100%',
                              wordBreak: 'break-word'
                            }} title={delivery.error}>
                              Error: {delivery.error}
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Compose Box */}
            <div style={{ padding: tokens.spacing[4], borderTop: `1px solid ${tokens.colors.border.default}`, backgroundColor: 'white' }}>
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleSendMessage();
                  }
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary }}>
                  Press {navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+Enter to send
                </div>
                <Button
                  variant="primary"
                  onClick={handleSendMessage}
                  disabled={!composeMessage.trim() || sendMessage.isPending}
                >
                  {sendMessage.isPending ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tokens.colors.text.secondary }}>
            Select a thread to view messages
          </div>
        )}
      </div>

      {/* Routing Explanation Drawer */}
      {showRoutingDrawer && selectedThreadId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: tokens.spacing[4],
          }}
          onClick={() => setShowRoutingDrawer(false)}
        >
          <Card
            style={{
              maxWidth: '42rem',
              maxHeight: '80vh',
              overflowY: 'auto',
              backgroundColor: 'white',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: tokens.spacing[6] }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacing[4] }}>
                <h3 style={{ fontSize: tokens.typography.fontSize.lg[0], fontWeight: tokens.typography.fontWeight.semibold }}>Routing Explanation</h3>
                <Button variant="tertiary" size="sm" onClick={() => setShowRoutingDrawer(false)}>
                  ✕
                </Button>
              </div>

              {routingHistory?.events?.[0] ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
                  <div style={{ backgroundColor: tokens.colors.primary[50], padding: tokens.spacing[3], borderRadius: tokens.radius.sm }}>
                    <div style={{ fontWeight: tokens.typography.fontWeight.medium, fontSize: tokens.typography.fontSize.sm[0], marginBottom: tokens.spacing[1] }}>Final Decision</div>
                    <div style={{ fontSize: tokens.typography.fontSize.sm[0] }}>
                      <strong>Target:</strong> {routingHistory.events[0].decision.target}
                      {routingHistory.events[0].decision.targetId && (
                        <span> ({routingHistory.events[0].decision.targetId})</span>
                      )}
                    </div>
                    <div style={{ fontSize: tokens.typography.fontSize.sm[0], marginTop: tokens.spacing[1] }}>
                      <strong>Reason:</strong> {routingHistory.events[0].decision.reason}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontWeight: tokens.typography.fontWeight.medium, fontSize: tokens.typography.fontSize.sm[0], marginBottom: tokens.spacing[2] }}>Evaluation Steps</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2] }}>
                      {routingHistory.events[0].decision.evaluationTrace.map((step, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: tokens.spacing[2],
                            borderRadius: tokens.radius.sm,
                            fontSize: tokens.typography.fontSize.sm[0],
                            backgroundColor: step.result ? tokens.colors.success[50] : tokens.colors.neutral[50],
                          }}
                        >
                          <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>{step.rule}</div>
                          <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary, marginTop: tokens.spacing[1] }}>
                            {step.condition} → {step.result ? '✓' : '✗'}
                          </div>
                          <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.tertiary, marginTop: tokens.spacing[1] }}>{step.explanation}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ color: tokens.colors.text.secondary }}>No routing history available</div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Pool Exhausted Confirmation Dialog */}
      {showPoolExhaustedConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: tokens.spacing[4],
          }}
          onClick={() => {
            setShowPoolExhaustedConfirm(false);
          }}
        >
          <Card
            style={{
              maxWidth: '28rem',
              backgroundColor: 'white',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: tokens.spacing[6] }}>
              <h3 style={{ fontSize: tokens.typography.fontSize.lg[0], fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[4] }}>
                Pool Exhausted
              </h3>
              <p style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[4] }}>
                All pool numbers are at capacity. Your reply will send from the Front Desk number instead of a pool number.
              </p>
              <div style={{ display: 'flex', gap: tokens.spacing[2], justifyContent: 'flex-end' }}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowPoolExhaustedConfirm(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleSendMessage(true)}
                  disabled={sendMessage.isPending}
                >
                  Send from Front Desk
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Policy Override Dialog */}
      {showPolicyOverride && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: tokens.spacing[4],
          }}
          onClick={() => {
            setShowPolicyOverride(null);
            setOverrideReason('');
          }}
        >
          <Card
            style={{
              maxWidth: '28rem',
              backgroundColor: 'white',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: tokens.spacing[6] }}>
              <h3 style={{ fontSize: tokens.typography.fontSize.lg[0], fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[4] }}>Policy Violation Detected</h3>
              <p style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[4] }}>
                Your message contains content that violates our policy (phone numbers, emails, or external links).
                You can override and send anyway, but please provide a reason.
              </p>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Reason for override..."
                style={{
                  width: '100%',
                  border: `1px solid ${tokens.colors.border.default}`,
                  borderRadius: tokens.radius.sm,
                  padding: `${tokens.spacing[2]} ${tokens.spacing[3]}`,
                  marginBottom: tokens.spacing[4],
                  resize: 'none',
                  fontSize: tokens.typography.fontSize.sm[0],
                  fontFamily: 'inherit',
                }}
                rows={3}
              />
              <div style={{ display: 'flex', gap: tokens.spacing[2], justifyContent: 'flex-end' }}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowPolicyOverride(null);
                    setOverrideReason('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleOverrideAndSend}
                  disabled={!overrideReason.trim()}
                >
                  Override & Send
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function InboxView(props: InboxViewProps) {
  return (
    <Suspense fallback={<div style={{ padding: tokens.spacing[4] }}><Skeleton height={400} /></div>}>
      <InboxViewContent {...props} />
    </Suspense>
  );
}
