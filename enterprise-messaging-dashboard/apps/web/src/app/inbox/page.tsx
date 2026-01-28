'use client';

import { useState, useEffect } from 'react';
import { RequireAuth, useAuth } from '@/lib/auth';
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

/**
 * Inbox Page - Owner View
 * 
 * Features:
 * - Thread list with filters (unread, assigned, unassigned, policy violations, delivery failures, date range)
 * - Search
 * - Message view with delivery status
 * - Routing explanation drawer
 * - Compose box (thread-bound only)
 * - Retry failed deliveries
 * - Policy violation handling with owner override
 */
function InboxContent() {
  const { isOwner } = useAuth();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [filters, setFilters] = useState<{
    unreadOnly?: boolean;
    hasPolicyViolation?: boolean;
    hasDeliveryFailure?: boolean;
    sitterId?: string;
    search?: string;
  }>({});
  const [showRoutingDrawer, setShowRoutingDrawer] = useState(false);
  const [composeMessage, setComposeMessage] = useState('');
  const [showPolicyOverride, setShowPolicyOverride] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState('');

  const { data: threads = [], isLoading: threadsLoading } = useThreads(filters);
  const { data: selectedThread } = useThread(selectedThreadId);
  const { data: messages = [], isLoading: messagesLoading } = useMessages(selectedThreadId);
  const { data: routingHistory } = useRoutingHistory(selectedThreadId);
  const sendMessage = useSendMessage();
  const retryMessage = useRetryMessage();
  const markRead = useMarkThreadRead();

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

  const handleSendMessage = async () => {
    if (!selectedThreadId || !composeMessage.trim()) return;

    try {
      await sendMessage.mutateAsync({
        threadId: selectedThreadId,
        body: composeMessage,
        forceSend: false,
      });
      setComposeMessage('');
    } catch (error: any) {
      if (error.message?.includes('Policy violation')) {
        // Show override dialog
        setShowPolicyOverride(selectedThreadId);
      } else {
        alert(`Failed to send: ${error.message}`);
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

  if (!isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Access denied. Owner access required.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left: Thread List */}
      <div className="w-1/3 border-r bg-gray-50 flex flex-col">
        {/* Filters */}
        <div className="p-4 border-b bg-white">
          <h2 className="text-lg font-semibold mb-3">Threads</h2>

          {/* Search */}
          <input
            type="text"
            placeholder="Search threads..."
            className="w-full border rounded px-3 py-2 mb-3 text-sm"
            value={filters.search || ''}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() =>
                setFilters({
                  ...filters,
                  unreadOnly: filters.unreadOnly ? undefined : true,
                })
              }
              className={`px-3 py-1 text-xs rounded ${
                filters.unreadOnly
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Unread
            </button>
            <button
              onClick={() =>
                setFilters({
                  ...filters,
                  hasPolicyViolation: filters.hasPolicyViolation ? undefined : true,
                })
              }
              className={`px-3 py-1 text-xs rounded ${
                filters.hasPolicyViolation
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Policy Issues
            </button>
            <button
              onClick={() =>
                setFilters({
                  ...filters,
                  hasDeliveryFailure: filters.hasDeliveryFailure ? undefined : true,
                })
              }
              className={`px-3 py-1 text-xs rounded ${
                filters.hasDeliveryFailure
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Delivery Failures
            </button>
          </div>
        </div>

        {/* Thread List */}
        <div className="flex-1 overflow-y-auto">
          {threadsLoading ? (
            <div className="p-4 text-center text-gray-500">Loading threads...</div>
          ) : filteredThreads.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No threads found</div>
          ) : (
            filteredThreads.map((thread) => (
              <div
                key={thread.id}
                onClick={() => setSelectedThreadId(thread.id)}
                className={`p-4 border-b cursor-pointer hover:bg-white transition-colors ${
                  selectedThreadId === thread.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="font-medium text-sm">{thread.client.name}</div>
                  {thread.ownerUnreadCount > 0 && (
                    <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                      {thread.ownerUnreadCount}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mb-1">
                  {thread.messageNumber.e164} • {thread.messageNumber.class}
                </div>
                {thread.sitter && (
                  <div className="text-xs text-gray-500">Assigned to {thread.sitter.name}</div>
                )}
                <div className="text-xs text-gray-400 mt-1">
                  {formatDistanceToNow(thread.lastActivityAt, { addSuffix: true })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: Message View */}
      <div className="flex-1 flex flex-col">
        {selectedThreadId ? (
          <>
            {/* Thread Header */}
            <div className="p-4 border-b bg-white">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">{selectedThread?.client.name}</h3>
                  <div className="text-sm text-gray-500 mt-1">
                    <div>
                      Number: {selectedThread?.messageNumber.e164} ({selectedThread?.messageNumber.class})
                    </div>
                    {selectedThread?.sitter && (
                      <div>Assigned to: {selectedThread.sitter.name}</div>
                    )}
                    {selectedThread?.assignmentWindows?.[0] && (
                      <div className="text-xs text-blue-600 mt-1">
                        Active window: {formatDistanceToNow(selectedThread.assignmentWindows[0].endsAt, {
                          addSuffix: true,
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowRoutingDrawer(true)}
                  className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                >
                  Why routed here?
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messagesLoading ? (
                <div className="text-center text-gray-500">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-500">No messages yet</div>
              ) : (
                messages.map((message) => {
                  const delivery = getDeliveryStatus(message);
                  const senderLabel = getSenderLabel(message);

                  return (
                    <div
                      key={message.id}
                      className={`p-3 rounded-lg ${
                        message.direction === 'inbound'
                          ? 'bg-gray-100'
                          : 'bg-blue-50 ml-auto max-w-[80%]'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="text-sm font-medium">{senderLabel}</div>
                        <div className="text-xs text-gray-500">
                          {formatDistanceToNow(message.createdAt, { addSuffix: true })}
                        </div>
                      </div>

                      <div className="text-sm mb-2">
                        {message.redactedBody || message.body}
                      </div>

                      {message.hasPolicyViolation && (
                        <div className="text-xs text-red-600 mb-2">
                          ⚠️ Policy violation detected
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            delivery.status === 'delivered'
                              ? 'bg-green-100 text-green-700'
                              : delivery.status === 'failed'
                                ? 'bg-red-100 text-red-700'
                                : delivery.status === 'sent'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {delivery.label}
                        </span>

                        {delivery.status === 'failed' && message.direction === 'outbound' && (
                          <button
                            onClick={() => handleRetry(message.id)}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Retry
                          </button>
                        )}

                        {delivery.error && (
                          <span className="text-xs text-red-600" title={delivery.error}>
                            {delivery.error.substring(0, 50)}...
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Compose Box */}
            <div className="p-4 border-t bg-white">
              <textarea
                value={composeMessage}
                onChange={(e) => setComposeMessage(e.target.value)}
                placeholder="Type a message..."
                className="w-full border rounded px-3 py-2 mb-2 resize-none"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.metaKey) {
                    handleSendMessage();
                  }
                }}
              />
              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  Press Cmd+Enter to send
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!composeMessage.trim() || sendMessage.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendMessage.isPending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a thread to view messages
          </div>
        )}
      </div>

      {/* Routing Explanation Drawer */}
      {showRoutingDrawer && selectedThreadId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-lg sm:rounded-lg w-full sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Routing Explanation</h3>
                <button
                  onClick={() => setShowRoutingDrawer(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {routingHistory?.events?.[0] ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-3 rounded">
                    <div className="font-medium text-sm mb-1">Final Decision</div>
                    <div className="text-sm">
                      <strong>Target:</strong> {routingHistory.events[0].decision.target}
                      {routingHistory.events[0].decision.targetId && (
                        <span> ({routingHistory.events[0].decision.targetId})</span>
                      )}
                    </div>
                    <div className="text-sm mt-1">
                      <strong>Reason:</strong> {routingHistory.events[0].decision.reason}
                    </div>
                  </div>

                  <div>
                    <div className="font-medium text-sm mb-2">Evaluation Steps</div>
                    <div className="space-y-2">
                      {routingHistory.events[0].decision.evaluationTrace.map((step, idx) => (
                        <div
                          key={idx}
                          className={`p-2 rounded text-sm ${
                            step.result ? 'bg-green-50' : 'bg-gray-50'
                          }`}
                        >
                          <div className="font-medium">{step.rule}</div>
                          <div className="text-xs text-gray-600 mt-1">
                            {step.condition} → {step.result ? '✓' : '✗'}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{step.explanation}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500">No routing history available</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Policy Override Dialog */}
      {showPolicyOverride && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Policy Violation Detected</h3>
            <p className="text-sm text-gray-600 mb-4">
              Your message contains content that violates our policy (phone numbers, emails, or external links).
              You can override and send anyway, but please provide a reason.
            </p>
            <textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Reason for override..."
              className="w-full border rounded px-3 py-2 mb-4 resize-none"
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowPolicyOverride(null);
                  setOverrideReason('');
                }}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleOverrideAndSend}
                disabled={!overrideReason.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Override & Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InboxPage() {
  return (
    <RequireAuth requireOwner>
      <InboxContent />
    </RequireAuth>
  );
}
