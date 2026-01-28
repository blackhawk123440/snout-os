'use client';

import { useState, useEffect } from 'react';
import { RequireAuth, useAuth } from '@/lib/auth';
import {
  useSitterThreads,
  useSitterThread,
  useSitterMessages,
  useSitterSendMessage,
  useSitterMarkThreadAsRead,
} from '@/lib/api/sitter-hooks';
import { format, formatDistanceToNow, isWithinInterval } from 'date-fns';

/**
 * Sitter Inbox Page
 * 
 * Minimal sitter-facing experience:
 * - Only shows threads with active assignment windows
 * - Only allows messaging during active windows
 * - Never shows real client phone numbers
 * - Policy enforcement with clear explanations
 */
function SitterInboxContent() {
  const { isSitter, user } = useAuth();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messageBody, setMessageBody] = useState('');
  const [isPageVisible, setIsPageVisible] = useState(true);

  // Stop polling when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Conditional polling based on page visibility
  const shouldPoll = isPageVisible;

  const { data: threads = [] } = useSitterThreads(shouldPoll);
  const selectedThread = useSitterThread(selectedThreadId);
  const { data: messages = [] } = useSitterMessages(selectedThreadId, shouldPoll);
  const sendMessage = useSitterSendMessage();
  const markThreadAsRead = useSitterMarkThreadAsRead();

  // Mark thread as read when selected
  useEffect(() => {
    if (selectedThreadId && selectedThread.data) {
      markThreadAsRead.mutate(selectedThreadId);
    }
  }, [selectedThreadId, selectedThread.data, markThreadAsRead]);

  // Check if window is active
  const isWindowActive = selectedThread.data?.window
    ? isWithinInterval(new Date(), {
        start: selectedThread.data.window.startsAt,
        end: selectedThread.data.window.endsAt,
      })
    : false;

  const handleSendMessage = async () => {
    if (!selectedThreadId || !messageBody.trim() || !isWindowActive) return;

    try {
      await sendMessage.mutateAsync({
        threadId: selectedThreadId,
        body: messageBody,
      });
      setMessageBody('');
    } catch (error: any) {
      alert(`Failed to send message: ${error.message}`);
    }
  };

  if (!isSitter) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Access denied. Sitter access required.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Panel - Threads List */}
      <div className="w-80 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-xl font-semibold">Messages</h1>
          <p className="text-sm text-gray-600 mt-1">
            {threads.length} active conversation{threads.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No active conversations
            </div>
          ) : (
            threads.map((thread) => (
              <div
                key={thread.id}
                onClick={() => setSelectedThreadId(thread.id)}
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                  selectedThreadId === thread.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="font-medium">{thread.client.name}</div>
                  {thread.unreadCount > 0 && (
                    <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                      {thread.unreadCount}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {formatDistanceToNow(thread.lastActivityAt, { addSuffix: true })}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Window: {format(thread.window.startsAt, 'MMM d, h:mm a')} -{' '}
                  {format(thread.window.endsAt, 'MMM d, h:mm a')}
                </div>
                {thread.window.isActive && (
                  <div className="text-xs text-green-600 mt-1 font-medium">Active now</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Panel - Messages */}
      <div className="flex-1 flex flex-col">
        {selectedThreadId && selectedThread.data ? (
          <>
            {/* Thread Header */}
            <div className="bg-white border-b p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-lg font-semibold">{selectedThread.data.client.name}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Assignment window: {format(selectedThread.data.window.startsAt, 'PPp')} -{' '}
                    {format(selectedThread.data.window.endsAt, 'PPp')}
                  </div>
                  {isWindowActive ? (
                    <div className="text-sm text-green-600 font-medium mt-1">Active now</div>
                  ) : (
                    <div className="text-sm text-gray-500 mt-1">Window not active</div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    Business number: {selectedThread.data.messageNumber.e164}
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-md rounded-lg p-3 ${
                      message.direction === 'outbound'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border'
                    }`}
                  >
                    <div className="text-xs mb-1 opacity-75">{message.senderLabel}</div>
                    <div className="text-sm whitespace-pre-wrap">{message.body}</div>
                    <div className="text-xs mt-1 opacity-75">
                      {format(message.createdAt, 'h:mm a')}
                    </div>
                    {message.hasPolicyViolation && (
                      <div className="text-xs mt-2 italic opacity-75">
                        This message contains content that was redacted.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Compose Box */}
            <div className="bg-white border-t p-4">
              {isWindowActive ? (
                <div className="space-y-2">
                  <textarea
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type a message..."
                    className="w-full border rounded px-3 py-2 resize-none"
                    rows={3}
                  />
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                      Press Enter to send, Shift+Enter for new line
                    </div>
                    <button
                      onClick={handleSendMessage}
                      disabled={!messageBody.trim() || sendMessage.isPending}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {sendMessage.isPending ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border rounded p-4 text-center text-gray-600">
                  <div className="font-medium mb-1">Window Not Active</div>
                  <div className="text-sm">
                    You can message during your assignment window. Messages outside the window are
                    blocked.
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a conversation to view messages
          </div>
        )}
      </div>
    </div>
  );
}

export default function SitterInboxPage() {
  return (
    <RequireAuth>
      <SitterInboxContent />
    </RequireAuth>
  );
}
