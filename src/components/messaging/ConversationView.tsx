/**
 * Conversation View Component
 * 
 * Displays messages in a conversation thread
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, Button, Input, Badge, EmptyState, Skeleton, Select, Modal, Textarea } from '@/components/ui';
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
  // Phase 4.1: Anti-poaching fields
  wasBlocked?: boolean;
  antiPoachingFlagged?: boolean;
  antiPoachingAttempt?: {
    id: string;
    violationType: string;
    detectedContent: string;
    action: string;
    resolvedAt: string | null;
    resolvedByUserId: string | null;
  } | null;
  redactedBody?: string | null;
}

interface ConversationViewProps {
  threadId?: string; // New messaging system uses threadId
  participantPhone?: string; // Legacy: used if threadId not provided
  participantName: string;
  bookingId?: string | null;
  role?: 'owner' | 'sitter';
  onBack?: () => void;
}

export default function ConversationView({
  threadId,
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
  
  // Gate 2: Assignment state
  const [assignedSitterId, setAssignedSitterId] = useState<string | null>(null);
  const [assignedSitterName, setAssignedSitterName] = useState<string | null>(null);
  const [assignmentHistory, setAssignmentHistory] = useState<any[]>([]);
  const [sitters, setSitters] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedSitterId, setSelectedSitterId] = useState('');
  const [assigning, setAssigning] = useState(false);
  // Phase 4.1: Window status and anti-poaching
  const [activeWindow, setActiveWindow] = useState<{ startAt: string; endAt: string } | null>(null);
  const [sitterHasActiveWindow, setSitterHasActiveWindow] = useState<boolean>(true); // default true so send enabled until we know
  const [nextUpcomingWindow, setNextUpcomingWindow] = useState<{ startAt: string; endAt: string } | null>(null);
  const [numberClass, setNumberClass] = useState<string>('');
  const [showForceSendModal, setShowForceSendModal] = useState(false);
  const [selectedBlockedEvent, setSelectedBlockedEvent] = useState<Message | null>(null);
  const [forceSendReason, setForceSendReason] = useState('');
  const [forceSending, setForceSending] = useState(false);

  useEffect(() => {
    fetchMessages();
    fetchSitters(); // Gate 2: Load sitters for assignment
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [threadId, participantPhone, bookingId]);

  const fetchSitters = async () => {
    try {
      const response = await fetch('/api/sitters');
      if (response.ok) {
        const data = await response.json();
        setSitters(data.sitters || []);
      }
    } catch (err) {
      // Silently fail - sitters not critical
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      // Use new messaging endpoints if threadId is available (Gate 1)
      if (threadId) {
        const endpoint = `/api/messages/threads/${threadId}`;
        console.log('[ConversationView] Fetching thread from:', endpoint);
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error('Failed to fetch messages');
        }
        const data = await response.json();
        // Phase 4.1: Transform new format with anti-poaching fields
        const transformedMessages = (data.messages || []).map((msg: any) => ({
          id: msg.id,
          direction: msg.direction,
          from: msg.actorType === 'client' ? participantPhone || '' : 'owner',
          to: msg.actorType === 'client' ? 'owner' : participantPhone || '',
          body: msg.body,
          status: msg.deliveryStatus,
          bookingId: bookingId || null,
          createdAt: msg.createdAt,
          wasBlocked: msg.wasBlocked,
          antiPoachingFlagged: msg.antiPoachingFlagged,
          antiPoachingAttempt: msg.antiPoachingAttempt,
          redactedBody: msg.redactedBody,
        }));
        setMessages(transformedMessages);
        // Gate 2 & Phase 4.1: Update assignment state and metadata
        if (data.thread) {
          setAssignedSitterId(data.thread.assignedSitterId || null);
          setAssignedSitterName(data.thread.assignedSitterName || null);
          setAssignmentHistory(data.thread.assignmentHistory || []);
          setActiveWindow(data.thread.activeWindow);
          setSitterHasActiveWindow(data.thread.sitterHasActiveWindow ?? true);
          setNextUpcomingWindow(data.thread.nextUpcomingWindow || null);
          setNumberClass(data.thread.numberClass || '');
        }
        setError(null);
        setLoading(false);
        return;
      }

      // Fallback to legacy endpoint if threadId not available
      const params = new URLSearchParams({ role });
      if (bookingId) {
        params.append('bookingId', bookingId);
      }

      const response = await fetch(`/api/conversations/${encodeURIComponent(participantPhone || '')}?${params}`);
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
    if (!messageText.trim() || sending || !threadId) return;
    if (role === 'sitter' && !sitterHasActiveWindow) return;

    setSending(true);
    setError(null);

    try {
      const endpoint = `/api/messages/send`;
      const payload = { threadId, text: messageText };
      console.log('[ConversationView] Sending message to:', endpoint, payload);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data.error) {
          setError(data.error);
          setSending(false);
          return;
        }
        if (participantPhone && role === 'owner') {
          const legacyResponse = await fetch(`/api/conversations/${encodeURIComponent(participantPhone)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: messageText,
              bookingId,
              role,
            }),
          });
          if (!legacyResponse.ok) {
            throw new Error('Failed to send message');
          }
          setMessageText('');
          await fetchMessages();
          setSending(false);
          return;
        }
        throw new Error('Failed to send message');
      }

      setMessageText('');
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

  const handleAssign = async () => {
    if (!threadId || !selectedSitterId || assigning) return;

    setAssigning(true);
    setError(null);

    try {
      const response = await fetch(`/api/messages/threads/${threadId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sitterId: selectedSitterId || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign sitter');
      }

      // Refresh thread data
      await fetchMessages();
      setShowAssignModal(false);
      setSelectedSitterId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign sitter');
    } finally {
      setAssigning(false);
    }
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
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing[2],
              flexWrap: 'wrap',
            }}
          >
            <span>{participantPhone}</span>
            {/* Phase 4.1: Number class badge */}
            {numberClass && (
              <Badge 
                variant={
                  numberClass === 'front_desk' ? 'default' :
                  numberClass === 'sitter' ? 'info' :
                  'default'
                }
              >
                {numberClass === 'front_desk' ? 'Front Desk' :
                 numberClass === 'sitter' ? 'Sitter' :
                 'Pool'}
              </Badge>
            )}
            {/* Phase 4.1: Assignment status */}
            {assignedSitterName && (
              <Badge variant="info">
                Assigned: {assignedSitterName}
              </Badge>
            )}
            {/* Phase 4.1: Active window indicator */}
            {activeWindow && (
              <Badge variant="info">
                Active Window: {new Date(activeWindow.startAt).toLocaleTimeString()} - {new Date(activeWindow.endAt).toLocaleTimeString()}
              </Badge>
            )}
            {/* Phase 4.2: Sitter window status - show next upcoming when no active */}
            {role === 'sitter' && !activeWindow && nextUpcomingWindow && (
              <Badge variant="warning">
                Next window: {new Date(nextUpcomingWindow.startAt).toLocaleString()} – {new Date(nextUpcomingWindow.endAt).toLocaleTimeString()}
              </Badge>
            )}
            {role === 'sitter' && !activeWindow && !nextUpcomingWindow && (
              <Badge variant="warning">
                No active window – messaging disabled
              </Badge>
            )}
          </div>
        </div>
        {/* Gate 2: Assign button (owner only) */}
        {role === 'owner' && threadId && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSelectedSitterId(assignedSitterId || '');
              setShowAssignModal(true);
            }}
            leftIcon={<i className="fas fa-user-plus" />}
          >
            {assignedSitterId ? 'Reassign' : 'Assign'}
          </Button>
        )}
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
            const isBlocked = message.wasBlocked === true;
            const hasAntiPoaching = message.antiPoachingFlagged === true;
            
            return (
              <div
                key={message.id}
                style={{
                  display: 'flex',
                  justifyContent: isOutbound ? 'flex-end' : 'flex-start',
                  marginBottom: tokens.spacing[2],
                }}
              >
                <div
                  style={{
                    maxWidth: '70%',
                    padding: tokens.spacing[3],
                    borderRadius: tokens.borderRadius.md,
                    backgroundColor: isBlocked
                      ? tokens.colors.error[50]
                      : isOutbound
                      ? tokens.colors.primary.DEFAULT
                      : tokens.colors.background.tertiary,
                    color: isOutbound && !isBlocked ? 'white' : tokens.colors.text.primary,
                    border: isBlocked ? `2px solid ${tokens.colors.error[300]}` : 'none',
                  }}
                >
                  {/* Phase 4.1: Blocked message indicator */}
                  {isBlocked && (
                    <div style={{ 
                      marginBottom: tokens.spacing[2],
                      padding: tokens.spacing[2],
                      backgroundColor: tokens.colors.error[100],
                      borderRadius: tokens.borderRadius.sm,
                      fontSize: tokens.typography.fontSize.sm[0],
                    }}>
                      {role === 'sitter' ? (
                        <div style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
                          Your message could not be sent. Please avoid sharing phone numbers, emails, external links, or social handles. Use the app for all client communication.
                        </div>
                      ) : (
                        <>
                          <div style={{ fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[1] }}>
                            ⚠️ Message Blocked - Anti-Poaching Violation
                          </div>
                          {message.antiPoachingAttempt && (
                            <div style={{ fontSize: tokens.typography.fontSize.xs[0], marginBottom: tokens.spacing[1] }}>
                              Violation: {message.antiPoachingAttempt.violationType}
                            </div>
                          )}
                          {message.id && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setSelectedBlockedEvent(message);
                                setShowForceSendModal(true);
                              }}
                              style={{ marginTop: tokens.spacing[2] }}
                            >
                              Force Send
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  <div style={{ marginBottom: tokens.spacing[1] }}>
                    {isBlocked && role === 'sitter'
                      ? 'Message blocked'
                      : isBlocked && message.redactedBody
                        ? message.redactedBody
                        : message.body}
                  </div>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.xs[0],
                      opacity: 0.7,
                      textAlign: 'right',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>{formatTime(message.createdAt)}</span>
                    {hasAntiPoaching && !isBlocked && (
                      <Badge variant="warning" style={{ fontSize: tokens.typography.fontSize.xs[0] }}>
                        ⚠️
                      </Badge>
                    )}
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
        {/* Phase 4.2: Sitter send gating - friendly UX when outside window */}
        {role === 'sitter' && !sitterHasActiveWindow && (
          <div
            style={{
              marginBottom: tokens.spacing[2],
              padding: tokens.spacing[3],
              backgroundColor: tokens.colors.warning[50],
              border: `1px solid ${tokens.colors.warning[200]}`,
              borderRadius: tokens.borderRadius.md,
              fontSize: tokens.typography.fontSize.sm[0],
              color: tokens.colors.warning[800],
            }}
          >
            Messages can only be sent during your active booking windows.
            {nextUpcomingWindow && (
              <span> Your next window for this client is {new Date(nextUpcomingWindow.startAt).toLocaleString()} – {new Date(nextUpcomingWindow.endAt).toLocaleTimeString()}.</span>
            )}
          </div>
        )}
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
            placeholder={role === 'sitter' && !sitterHasActiveWindow ? 'Messaging disabled outside booking window' : 'Type a message...'}
            style={{ flex: 1 }}
            disabled={role === 'sitter' && !sitterHasActiveWindow}
          />
          <Button
            variant="primary"
            onClick={handleSend}
            disabled={!messageText.trim() || sending || (role === 'sitter' && !sitterHasActiveWindow)}
            leftIcon={<i className="fas fa-paper-plane" />}
          >
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </div>

      {/* Gate 2: Assignment Modal */}
      {showAssignModal && (
        <Modal
          isOpen={showAssignModal}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedSitterId('');
          }}
          title={assignedSitterId ? "Reassign Sitter" : "Assign Sitter"}
          size="sm"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            <Select
              label="Select Sitter"
              value={selectedSitterId}
              onChange={(e) => setSelectedSitterId(e.target.value)}
              options={[
                { value: '', label: 'Unassign (no sitter)' },
                ...sitters.map(s => ({
                  value: s.id,
                  label: `${s.firstName} ${s.lastName}`,
                })),
              ]}
            />
            {assignmentHistory.length > 0 && (
              <div>
                <div style={{ fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[2] }}>
                  Assignment History
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2], maxHeight: '200px', overflowY: 'auto' }}>
                  {assignmentHistory.slice(0, 5).map((audit) => (
                    <div key={audit.id} style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary }}>
                      {new Date(audit.createdAt).toLocaleDateString()}: {audit.fromSitterName || 'Unassigned'} → {audit.toSitterName || 'Unassigned'}
                      {audit.reason && (
                        <div style={{ fontSize: tokens.typography.fontSize.xs[0], fontStyle: 'italic', marginTop: tokens.spacing[1] }}>
                          Reason: {audit.reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: tokens.spacing[3] }}>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedSitterId('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleAssign}
                disabled={assigning}
                isLoading={assigning}
              >
                {assignedSitterId ? 'Reassign' : 'Assign'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Phase 4.1: Force Send Modal */}
      {showForceSendModal && selectedBlockedEvent && (
        <Modal
          isOpen={showForceSendModal}
          onClose={() => {
            setShowForceSendModal(false);
            setSelectedBlockedEvent(null);
            setForceSendReason('');
          }}
          title="Force Send Blocked Message"
          size="md"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            {/* Blocked content preview (redacted) */}
            <div>
              <div style={{ 
                fontSize: tokens.typography.fontSize.sm[0], 
                fontWeight: tokens.typography.fontWeight.semibold,
                marginBottom: tokens.spacing[2],
              }}>
                Blocked Content Preview (Redacted):
              </div>
              <Card style={{ 
                padding: tokens.spacing[3],
                backgroundColor: tokens.colors.error[50],
                borderColor: tokens.colors.error[200],
              }}>
                <div style={{ 
                  fontSize: tokens.typography.fontSize.sm[0],
                  color: tokens.colors.text.secondary,
                  fontStyle: 'italic',
                }}>
                  {selectedBlockedEvent.redactedBody || selectedBlockedEvent.body}
                </div>
              </Card>
            </div>

            {/* Violation reasons list */}
            {selectedBlockedEvent.antiPoachingAttempt && (
              <div>
                <div style={{ 
                  fontSize: tokens.typography.fontSize.sm[0], 
                  fontWeight: tokens.typography.fontWeight.semibold,
                  marginBottom: tokens.spacing[2],
                }}>
                  Violation Reasons:
                </div>
                <div style={{ 
                  padding: tokens.spacing[3],
                  backgroundColor: tokens.colors.background.tertiary,
                  borderRadius: tokens.borderRadius.md,
                }}>
                  <div style={{ marginBottom: tokens.spacing[2] }}>
                    <strong>Type:</strong> {selectedBlockedEvent.antiPoachingAttempt.violationType}
                  </div>
                  <div style={{ marginBottom: tokens.spacing[2] }}>
                    <strong>Detected Content:</strong> {selectedBlockedEvent.antiPoachingAttempt.detectedContent}
                  </div>
                  <div>
                    <strong>Action:</strong> {selectedBlockedEvent.antiPoachingAttempt.action}
                  </div>
                </div>
              </div>
            )}

            {/* Explicit reason input (required) */}
            <div>
              <label style={{ 
                display: 'block',
                fontSize: tokens.typography.fontSize.sm[0],
                fontWeight: tokens.typography.fontWeight.semibold,
                marginBottom: tokens.spacing[2],
              }}>
                Reason for Force Send <span style={{ color: tokens.colors.error.DEFAULT }}>*</span>
              </label>
              <Textarea
                value={forceSendReason}
                onChange={(e) => setForceSendReason(e.target.value)}
                placeholder="Explain why this message should be sent despite the anti-poaching violation..."
                rows={4}
                required
              />
              <div style={{ 
                fontSize: tokens.typography.fontSize.xs[0],
                color: tokens.colors.text.secondary,
                marginTop: tokens.spacing[1],
              }}>
                This action will be logged and audited.
              </div>
            </div>

            {/* Confirmation message */}
            <div style={{ 
              padding: tokens.spacing[3],
              backgroundColor: tokens.colors.warning[50],
              borderRadius: tokens.borderRadius.md,
              border: `1px solid ${tokens.colors.warning[200]}`,
            }}>
              <div style={{ 
                fontSize: tokens.typography.fontSize.sm[0],
                fontWeight: tokens.typography.fontWeight.semibold,
                marginBottom: tokens.spacing[1],
              }}>
                ⚠️ Confirmation Required
              </div>
              <div style={{ fontSize: tokens.typography.fontSize.sm[0] }}>
                This action will override the anti-poaching block and send the message. 
                Your reason will be logged for audit purposes.
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: tokens.spacing[3], justifyContent: 'flex-end' }}>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowForceSendModal(false);
                  setSelectedBlockedEvent(null);
                  setForceSendReason('');
                }}
                disabled={forceSending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={async () => {
                  if (!forceSendReason.trim() || !selectedBlockedEvent.id) return;
                  
                  setForceSending(true);
                  try {
                    const response = await fetch(`/api/messages/events/${selectedBlockedEvent.id}/force-send`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ reason: forceSendReason }),
                    });

                    if (!response.ok) {
                      throw new Error('Failed to force send message');
                    }

                    // Refresh messages
                    await fetchMessages();
                    setShowForceSendModal(false);
                    setSelectedBlockedEvent(null);
                    setForceSendReason('');
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to force send message');
                  } finally {
                    setForceSending(false);
                  }
                }}
                disabled={!forceSendReason.trim() || forceSending}
              >
                {forceSending ? 'Sending...' : 'Force Send'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
}


