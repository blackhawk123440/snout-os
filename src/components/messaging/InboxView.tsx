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
  useMessagePoolHealth,
  useUpdateThreadLifecycle,
  useThreadTimeline,
  useThreadWorkflowAction,
  type Thread,
  type Message,
} from '@/lib/api/hooks';
import { formatDistanceToNow } from 'date-fns';
import { Card, Button, Badge, EmptyState, Skeleton, Input, Textarea } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';
import { useAuth } from '@/lib/auth-client';
import { isMessagingEnabled } from '@/lib/flags';
import { DiagnosticsPanel } from './DiagnosticsPanel';
import { NewMessageModal } from './NewMessageModal';
import { MESSAGING_POLICY_RULES, OWNER_LIFECYCLE_HELPERS } from '@/lib/messaging/policy-copy';

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
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [pendingMessages, setPendingMessages] = useState<Array<{ tempId: string; body: string; status: 'sending' | 'failed'; error?: string }>>([]);

  // Apply filters to API call - explicitly pass each filter
  const threadsQuery = useThreads({
    unreadOnly: filters.unreadOnly,
    hasPolicyViolation: filters.hasPolicyViolation,
    hasDeliveryFailure: filters.hasDeliveryFailure,
    sitterId: filters.sitterId,
    search: filters.search,
    inbox, // Pass inbox filter to hook
    pageSize: 40,
  });
  const threads = threadsQuery.data?.pages.flatMap((p) => p.items) ?? [];
  const threadsLoading = threadsQuery.isLoading;
  const threadsError = threadsQuery.error;
  const { data: selectedThread } = useThread(selectedThreadId);
  const { data: timelineData } = useThreadTimeline(selectedThreadId);
  const { data: poolHealth } = useMessagePoolHealth();
  const updateLifecycle = useUpdateThreadLifecycle();
  const workflowAction = useThreadWorkflowAction();
  const messagesQuery = useMessages(selectedThreadId, { pageSize: 50 });
  const messages = messagesQuery.data?.pages.slice().reverse().flatMap((p) => p.items) ?? [];
  const messagesLoading = messagesQuery.isLoading;
  const { data: routingHistory } = useRoutingHistory(selectedThreadId);
  const sendMessage = useSendMessage();
  const retryMessage = useRetryMessage();
  const markRead = useMarkThreadRead();
  const { user } = useAuth();
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [manualStage, setManualStage] = useState<'intake' | 'staffing' | 'meet_and_greet' | 'follow_up'>('staffing');
  const [meetAndGreetAt, setMeetAndGreetAt] = useState('');
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
      setFilters((f) => ({ ...f, sitterId: sitterId || sitterParam || undefined }));
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

    const body = composeMessage.trim();
    const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setPendingMessages((prev) => [...prev, { tempId, body, status: 'sending' }]);
    setComposeMessage('');
    setShowPoolExhaustedConfirm(false);

    try {
      await sendMessage.mutateAsync({
        threadId: selectedThreadId,
        body,
        forceSend: false,
        confirmPoolFallback,
      });
      setPendingMessages((prev) => prev.filter((p) => p.tempId !== tempId));
    } catch (error: any) {
      const errorData = error?.response?.data || error?.data || {};
      const errorCode = errorData.errorCode || error?.errorCode || error?.code;
      const errorMessage = errorData.userMessage || errorData.error || error.message || 'Failed to send';

      if (errorCode === 'POOL_EXHAUSTED') {
        setShowPoolExhaustedConfirm(true);
        setPendingMessages((prev) => prev.filter((p) => p.tempId !== tempId));
        setComposeMessage(body);
      } else if (error.message?.includes('Policy violation') || errorData.error?.includes('Policy violation')) {
        setShowPolicyOverride(selectedThreadId);
        setPendingMessages((prev) => prev.filter((p) => p.tempId !== tempId));
        setComposeMessage(body);
      } else {
        setPendingMessages((prev) =>
          prev.map((p) => (p.tempId === tempId ? { ...p, status: 'failed' as const, error: errorMessage } : p))
        );
      }
    }
  };

  const handleRetryPending = (tempId: string) => {
    const pending = pendingMessages.find((p) => p.tempId === tempId);
    if (!pending || !selectedThreadId) return;
    setPendingMessages((prev) => prev.map((p) => (p.tempId === tempId ? { ...p, status: 'sending' as const } : p)));
    sendMessage
      .mutateAsync({ threadId: selectedThreadId, body: pending.body, forceSend: false })
      .then(() => setPendingMessages((prev) => prev.filter((p) => p.tempId !== tempId)))
      .catch((err: any) => {
        const msg = err?.response?.data?.userMessage || err?.message || 'Failed to send';
        setPendingMessages((prev) =>
          prev.map((p) => (p.tempId === tempId ? { ...p, status: 'failed' as const, error: msg } : p))
        );
      });
  };

  const handleOverrideAndSend = async () => {
    if (!selectedThreadId || !composeMessage.trim() || !overrideReason.trim()) return;

    const body = composeMessage.trim();
    const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setPendingMessages((prev) => [...prev, { tempId, body, status: 'sending' }]);
    setComposeMessage('');
    setOverrideReason('');
    setShowPolicyOverride(null);

    try {
      await sendMessage.mutateAsync({
        threadId: selectedThreadId,
        body,
        forceSend: true,
      });
      setPendingMessages((prev) => prev.filter((p) => p.tempId !== tempId));
    } catch (error: any) {
      const msg = error?.response?.data?.userMessage || error?.message || 'Failed to send';
      setPendingMessages((prev) =>
        prev.map((p) => (p.tempId === tempId ? { ...p, status: 'failed' as const, error: msg } : p))
      );
    }
  };

  const handleRetry = async (messageId: string) => {
    try {
      await retryMessage.mutateAsync(messageId);
    } catch (error: any) {
      alert(`Failed to retry: ${error.message}`);
    }
  };

  const [seeding, setSeeding] = useState(false);

  const handleSeed = async () => {
    if (seeding) return;
    setSeeding(true);
    try {
      const response = await fetch('/api/messages/seed-proof', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        alert('✅ Demo data created! Refreshing to show proof scenarios...');
        window.location.reload();
      } else {
        alert(data.error || 'Failed to create demo data');
      }
    } catch (error: any) {
      alert(`Failed to create demo data: ${error.message}`);
    } finally {
      setSeeding(false);
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

  const stageLabel = (value?: string) => {
    if (!value) return 'Intake';
    if (value === 'meet_and_greet') return 'Meet & Greet';
    return value
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const lifecycleLabel = (value?: string) => {
    if (!value) return 'Active';
    if (value === 'grace') return 'Post-service grace';
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const runLifecycleAction = async (payload: Record<string, unknown>) => {
    if (!selectedThreadId) return;
    try {
      await updateLifecycle.mutateAsync({ threadId: selectedThreadId, payload });
    } catch (error: any) {
      alert(error?.message || 'Failed to update lifecycle');
    }
  };

  const runWorkflowAction = async (
    payload:
      | { action: 'schedule_meet_and_greet'; scheduledAt: string }
      | { action: 'confirm_meet_and_greet' }
      | { action: 'client_approves_sitter' }
      | { action: 'sitter_approves_client' }
  ) => {
    if (!selectedThreadId) return;
    try {
      await workflowAction.mutateAsync({ threadId: selectedThreadId, payload });
    } catch (error: any) {
      alert(error?.message || 'Failed to run workflow action');
    }
  };

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden h-full">
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

      {/* Left: Thread List - App design system */}
      <div className="w-1/3 flex flex-col min-h-0 border-r border-[var(--color-border-default)] bg-[var(--color-surface-secondary)]">
        {/* Filters */}
        <div className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-primary)]" style={{ padding: 'var(--density-padding)' }}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Threads</h2>
            {role === 'owner' && (
              <Button variant="primary" size="sm" onClick={() => setShowNewMessageModal(true)} leftIcon={<i className="fas fa-plus" />}>
                New message
              </Button>
            )}
          </div>
          {role === 'owner' && poolHealth && (
            <details className="mb-3 rounded border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-2 text-xs">
              <summary className="cursor-pointer font-semibold text-[var(--color-text-primary)]">System health</summary>
              <div className="mt-1 text-[var(--color-text-secondary)]">
                Office numbers: {poolHealth.availableCompany} available | Service numbers: {poolHealth.availableService} available | Assigned: {poolHealth.assigned}
              </div>
              {poolHealth.shouldProvision && (
                <div className="mt-1 text-[var(--color-warning-700)]">Add numbers soon to avoid fallback routing.</div>
              )}
            </details>
          )}

          <Input
            type="text"
            placeholder="Search threads..."
            value={filters.search || ''}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            aria-label="Search threads"
            size="sm"
            fullWidth
            className="mb-3"
          />

          <div className="flex flex-wrap gap-2">
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
        <div className="flex-1 min-h-0 overflow-y-auto">
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
                    : "Start a conversation or send a new message to see threads here."}
                  icon={<i className="fas fa-comments" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
                  action={
                    role === 'owner'
                      ? { label: 'New message', onClick: () => setShowNewMessageModal(true), variant: 'primary' as const }
                      : undefined
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
            <div>
              {filteredThreads.map((thread) => (
                <div
                  key={thread.id}
                  onClick={() => setSelectedThreadId(thread.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedThreadId(thread.id)}
                  className={`group cursor-pointer border-b border-[var(--color-border-default)] transition hover:bg-[var(--color-surface-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-teal-500)] focus:ring-inset ${
                    selectedThreadId === thread.id
                      ? 'bg-[var(--color-teal-50)] dark:bg-teal-900/20 border-l-4 border-l-[var(--color-teal-500)]'
                      : 'bg-[var(--color-surface-primary)]'
                  }`}
                  style={{ padding: `${tokens.spacing[3]} ${tokens.spacing[4]}` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-[var(--color-text-primary)] truncate">
                          {thread.client.name || 'Unknown'}
                        </span>
                        {thread.ownerUnreadCount > 0 && (
                          <Badge variant="info" className="shrink-0">{thread.ownerUnreadCount}</Badge>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-[var(--color-text-secondary)]">
                        {thread.sitter ? (
                          <span><span className="font-medium">Sitter:</span> {thread.sitter.name}</span>
                        ) : (
                          <span className="text-[var(--color-text-tertiary)]">Unassigned</span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                        <Badge variant={thread.laneType === 'service' ? 'success' : 'default'} className="text-xs shrink-0">
                          {thread.laneType === 'service' ? 'Visit line' : 'Office line'}
                        </Badge>
                        <Badge variant="neutral" className="text-xs shrink-0">
                          {stageLabel(thread.activationStage)}
                        </Badge>
                        <Badge variant={thread.lifecycleStatus === 'active' ? 'success' : 'warning'} className="text-xs shrink-0">
                          {lifecycleLabel(thread.lifecycleStatus)}
                        </Badge>
                        <Badge
                          variant={
                            thread.messageNumber.class === 'front_desk' ? 'default' :
                            thread.messageNumber.class === 'pool' ? 'info' :
                            thread.messageNumber.class === 'sitter' ? 'success' : 'default'
                          }
                          className="text-xs shrink-0"
                        >
                          {thread.messageNumber.class}
                        </Badge>
                        <span className="text-xs text-[var(--color-text-tertiary)] font-mono">
                          {thread.messageNumber.e164}
                        </span>
                        <span className="text-xs text-[var(--color-text-tertiary)]">
                          {formatDistanceToNow(thread.lastActivityAt, { addSuffix: true })}
                        </span>
                        {(thread.flags?.length || 0) > 0 && (
                          <Badge variant="warning" className="text-xs shrink-0">
                            {thread.flags?.length} flag{(thread.flags?.length || 0) > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {(thread.availabilityResponses?.length || 0) > 0 && (
                          <Badge variant="info" className="text-xs shrink-0">
                            Availability updates
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                      <span className="text-xs text-[var(--color-text-tertiary)]">Open</span>
                      <i className="fas fa-chevron-right text-[var(--color-text-tertiary)]" style={{ fontSize: '0.65rem' }} aria-hidden />
                    </div>
                  </div>
                </div>
              ))}
              {threadsQuery.hasNextPage && (
                <div className="p-3 flex justify-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => threadsQuery.fetchNextPage()}
                    disabled={threadsQuery.isFetchingNextPage}
                  >
                    {threadsQuery.isFetchingNextPage ? 'Loading…' : 'Load more'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Message View */}
      <div className="flex-1 min-h-0 flex flex-col">
        {selectedThreadId ? (
          <>
            {/* Thread Header - App design system */}
            <div className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-primary)]" style={{ padding: 'var(--density-padding)' }}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                    {selectedThread?.client.name || 'Unknown'}
                  </h3>
                  <div className="text-sm text-[var(--color-text-secondary)] flex flex-col gap-1">
                    <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], flexWrap: 'wrap' }}>
                      <Badge variant={selectedThread?.laneType === 'service' ? 'success' : 'default'}>
                        {selectedThread?.laneType === 'service' ? 'Visit line' : 'Office line'}
                      </Badge>
                      <Badge variant="neutral">{stageLabel(selectedThread?.activationStage)}</Badge>
                      <Badge variant={selectedThread?.lifecycleStatus === 'active' ? 'success' : 'warning'}>
                        {lifecycleLabel(selectedThread?.lifecycleStatus)}
                      </Badge>
                    </div>
                    {selectedThread?.laneType === 'service' ? (
                      <div className="text-xs text-[var(--color-text-secondary)]">{OWNER_LIFECYCLE_HELPERS.serviceLane}</div>
                    ) : (
                      <div className="text-xs text-[var(--color-text-secondary)]">{OWNER_LIFECYCLE_HELPERS.companyLane}</div>
                    )}
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
                    <div>
                      <span style={{ fontWeight: tokens.typography.fontWeight.medium }}>Approvals:</span>{' '}
                      Client {selectedThread?.clientApprovedAt ? 'approved' : 'pending'} / Sitter {selectedThread?.sitterApprovedAt ? 'approved' : 'pending'}
                    </div>
                    <div className="text-xs text-[var(--color-text-secondary)]">{OWNER_LIFECYCLE_HELPERS.approvals}</div>
                    {selectedThread?.serviceWindow && (
                      <div>
                        <span style={{ fontWeight: tokens.typography.fontWeight.medium }}>Service Window:</span>{' '}
                        {selectedThread.serviceWindow.startAt.toLocaleString()} - {selectedThread.serviceWindow.endAt.toLocaleString()}
                      </div>
                    )}
                    {selectedThread?.graceEndsAt && (
                      <div>
                        <span style={{ fontWeight: tokens.typography.fontWeight.medium }}>Grace Ends:</span>{' '}
                        {new Date(selectedThread.graceEndsAt).toLocaleString()}
                      </div>
                    )}
                    {(selectedThread?.availabilityResponses?.length || 0) > 0 && (
                      <div>
                        <span style={{ fontWeight: tokens.typography.fontWeight.medium }}>Availability:</span>{' '}
                        {selectedThread?.availabilityResponses
                          ?.map((r) => `${r.status.toUpperCase()}${r.responseLatencySec != null ? ` (${r.responseLatencySec}s)` : ''}`)
                          .join(' | ')}
                      </div>
                    )}
                    {(selectedThread?.flags?.length || 0) > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: tokens.typography.fontWeight.medium }}>Flags:</span>
                        {selectedThread?.flags?.map((flag) => (
                          <Badge key={flag.id} variant={flag.severity === 'high' || flag.severity === 'critical' ? 'error' : 'warning'}>
                            {flag.type}:{flag.severity}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {role === 'owner' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], flexWrap: 'wrap' }}>
                        <input
                          type="datetime-local"
                          value={meetAndGreetAt}
                          onChange={(e) => setMeetAndGreetAt(e.target.value)}
                          style={{
                            border: `1px solid ${tokens.colors.border.default}`,
                            borderRadius: tokens.radius.sm,
                            padding: `${tokens.spacing[1]} ${tokens.spacing[2]}`,
                            fontSize: tokens.typography.fontSize.xs[0],
                          }}
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            if (!meetAndGreetAt) return;
                            const iso = new Date(meetAndGreetAt).toISOString();
                            void runWorkflowAction({ action: 'schedule_meet_and_greet', scheduledAt: iso });
                          }}
                        >
                          Schedule M&G
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => runWorkflowAction({ action: 'confirm_meet_and_greet' })}>
                          Confirm M&G
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => runWorkflowAction({ action: 'client_approves_sitter' })}>
                          Client approved
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => runWorkflowAction({ action: 'sitter_approves_client' })}>
                          Sitter approved
                        </Button>
                        <select
                          value={manualStage}
                          onChange={(e) => setManualStage(e.target.value as typeof manualStage)}
                          style={{
                            border: `1px solid ${tokens.colors.border.default}`,
                            borderRadius: tokens.radius.sm,
                            padding: `${tokens.spacing[1]} ${tokens.spacing[2]}`,
                            fontSize: tokens.typography.fontSize.xs[0],
                          }}
                        >
                          <option value="intake">intake</option>
                          <option value="staffing">staffing</option>
                          <option value="meet_and_greet">meet_and_greet</option>
                          <option value="follow_up">follow_up</option>
                        </select>
                        <Button size="sm" variant="secondary" onClick={() => runLifecycleAction({ action: 'set_stage', stage: manualStage })}>
                          Override stage
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => runLifecycleAction({ action: 'meet_and_greet_confirmed' })}>
                          M&G confirmed
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            runLifecycleAction({
                              action: 'activate_service_lane',
                              sitterId: selectedThread?.sitter?.id,
                              serviceWindowStart:
                                selectedThread?.serviceWindow?.startAt?.toISOString() ??
                                selectedThread?.assignmentWindows?.[0]?.startsAt?.toISOString(),
                              serviceWindowEnd:
                                selectedThread?.serviceWindow?.endAt?.toISOString() ??
                                selectedThread?.assignmentWindows?.[0]?.endsAt?.toISOString(),
                            })
                          }
                        >
                          Activate service lane
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => runLifecycleAction({ action: 'expire_if_needed' })}>
                          Check reroute state
                        </Button>
                        <span className="text-xs text-[var(--color-text-secondary)]">{OWNER_LIFECYCLE_HELPERS.reroute}</span>
                      </div>
                    )}
                    {role === 'owner' && (
                      <details className="rounded border border-[var(--color-border-default)] p-2 text-xs">
                        <summary className="cursor-pointer font-medium text-[var(--color-text-primary)]">Policy behavior</summary>
                        <div className="mt-2 flex flex-col gap-1 text-[var(--color-text-secondary)]">
                          {MESSAGING_POLICY_RULES.map((rule) => (
                            <div key={rule.key}>
                              <strong>{rule.scenario}:</strong> {rule.userFacingBehavior}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                    {role === 'owner' && (
                      <details className="rounded border border-[var(--color-border-default)] p-2 text-xs">
                        <summary className="cursor-pointer font-medium text-[var(--color-text-primary)]">Audit timeline</summary>
                        <div className="mt-2 max-h-40 overflow-y-auto">
                          {(timelineData?.items ?? []).length === 0 ? (
                            <div className="text-[var(--color-text-secondary)]">No timeline events yet.</div>
                          ) : (
                            <div className="flex flex-col gap-2 text-[var(--color-text-secondary)]">
                              {(timelineData?.items ?? []).map((item) => (
                                <div key={`${item.kind}-${item.id}`} className="rounded border border-[var(--color-border-default)] p-2">
                                  <div className="font-medium text-[var(--color-text-primary)]">{item.label}</div>
                                  <div>{new Date(item.createdAt).toLocaleString()} • {item.status}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </details>
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
            <div className="flex-1 min-h-0 overflow-y-auto" style={{ padding: 'var(--density-padding)' }}>
              {messagesLoading ? (
                <div style={{ textAlign: 'center', color: tokens.colors.text.secondary }}>
                  <Skeleton height={100} />
                  <Skeleton height={100} />
                </div>
              ) : messages.length === 0 && pendingMessages.length === 0 ? (
                <div style={{ textAlign: 'center', color: tokens.colors.text.secondary }}>No messages yet</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
                  {messagesQuery.hasNextPage && (
                    <div className="flex justify-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => messagesQuery.fetchNextPage()}
                        disabled={messagesQuery.isFetchingNextPage}
                      >
                        {messagesQuery.isFetchingNextPage ? 'Loading…' : 'Load earlier messages'}
                      </Button>
                    </div>
                  )}
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
                        {message.routingDisposition && message.routingDisposition !== 'normal' && (
                          <div style={{ fontSize: tokens.typography.fontSize.xs[0], marginBottom: tokens.spacing[2] }}>
                            <Badge variant={message.routingDisposition === 'rerouted' ? 'warning' : 'error'}>
                              Routing: {message.routingDisposition}
                            </Badge>
                          </div>
                        )}

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
                  {selectedThreadId &&
                    pendingMessages.map((p) => (
                      <Card
                        key={p.tempId}
                        style={{
                          maxWidth: '80%',
                          marginLeft: 'auto',
                          backgroundColor: tokens.colors.primary[50],
                          padding: tokens.spacing[3],
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: tokens.spacing[2] }}>
                          <div>
                            <div style={{ fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.medium, marginBottom: tokens.spacing[0.5] }}>
                              You
                            </div>
                            <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary }}>
                              Just now
                            </div>
                          </div>
                          <Badge
                            variant={p.status === 'failed' ? 'error' : 'default'}
                            style={{ fontSize: tokens.typography.fontSize.xs[0] }}
                          >
                            {p.status === 'sending' ? 'Sending' : 'Failed'}
                          </Badge>
                        </div>
                        <div style={{ fontSize: tokens.typography.fontSize.sm[0], marginBottom: tokens.spacing[2], lineHeight: 1.5 }}>
                          {p.body}
                        </div>
                        {p.status === 'failed' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], flexWrap: 'wrap' }}>
                            <Button
                              variant="tertiary"
                              size="sm"
                              onClick={() => handleRetryPending(p.tempId)}
                              disabled={sendMessage.isPending}
                              leftIcon={<i className="fas fa-redo" />}
                            >
                              Retry
                            </Button>
                            {p.error && (
                              <div
                                style={{
                                  fontSize: tokens.typography.fontSize.xs[0],
                                  color: tokens.colors.error.DEFAULT,
                                  backgroundColor: tokens.colors.error[50],
                                  padding: `${tokens.spacing[1]} ${tokens.spacing[2]}`,
                                  borderRadius: tokens.radius.sm,
                                  maxWidth: '100%',
                                  wordBreak: 'break-word',
                                }}
                                title={p.error}
                              >
                                {p.error}
                              </div>
                            )}
                          </div>
                        )}
                      </Card>
                    ))}
                </div>
              )}
            </div>

            {/* Compose Box - App design system */}
            <div className="flex-shrink-0 border-t border-[var(--color-border-default)] bg-[var(--color-surface-primary)]" style={{ padding: 'var(--density-padding)' }}>
              <Textarea
                value={composeMessage}
                onChange={(e) => setComposeMessage(e.target.value)}
                placeholder="Type a message..."
                rows={3}
                size="sm"
                fullWidth
                className="mb-2 resize-none"
                aria-label="Compose message"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleSendMessage();
                  }
                }}
              />
              <div className="flex justify-between items-center">
                <div className="text-xs text-[var(--color-text-secondary)]">
                  Press {typeof navigator !== 'undefined' && navigator.platform?.includes('Mac') ? 'Cmd' : 'Ctrl'}+Enter to send
                </div>
                <Button
                  variant="primary"
                  onClick={() => handleSendMessage()}
                  disabled={!composeMessage.trim() || sendMessage.isPending}
                  className="focus:outline-none focus:ring-2 focus:ring-[var(--color-teal-500)] focus:ring-offset-2"
                >
                  {sendMessage.isPending ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[var(--color-text-secondary)]">
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

      {/* New Message Modal */}
      {role === 'owner' && (
        <NewMessageModal
          isOpen={showNewMessageModal}
          onClose={() => setShowNewMessageModal(false)}
          onThreadCreated={(threadId) => {
            setSelectedThreadId(threadId);
            setShowNewMessageModal(false);
          }}
        />
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
