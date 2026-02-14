/**
 * Automation Thread Sender
 * 
 * Phase 3: Send automation messages using thread masking number
 * 
 * Replaces old sendMessage() calls in automation executor with
 * thread-aware messaging that uses the thread's assigned masking number.
 */

import { prisma } from '@/lib/db';

interface SendAutomationMessageParams {
  bookingId: string;
  orgId: string;
  clientId: string;
  message: string;
  recipient: 'client' | 'sitter' | 'owner';
  recipientPhone?: string; // Fallback if thread not found
}

/**
 * Send automation message using thread masking number
 * 
 * Finds the thread for the booking and sends via messaging API
 * Falls back to old sendMessage if thread not found (backward compatibility)
 */
export async function sendAutomationMessageViaThread(
  params: SendAutomationMessageParams
): Promise<{ success: boolean; error?: string; usedThread?: boolean }> {
  const { bookingId, orgId, clientId, message, recipient, recipientPhone } = params;

  try {
    // Find thread for this booking
    const thread = await prisma.messageThread.findFirst({
      where: {
        orgId,
        clientId,
        bookingId,
        scope: 'client_booking',
      },
      include: {
        messageNumber: true,
      },
    });

    if (!thread || !thread.messageNumberId || !thread.messageNumber) {
      // Thread not found or no number assigned - fallback to old method
      console.warn(`[sendAutomationMessageViaThread] Thread not found for booking ${bookingId}, falling back to old sendMessage`);
      
      if (recipientPhone) {
        const { sendMessage } = await import('@/lib/message-utils');
        const sent = await sendMessage(recipientPhone, message, bookingId);
        return { success: sent, usedThread: false };
      }
      
      return { success: false, error: 'Thread not found and no recipient phone provided', usedThread: false };
    }

    // Send via Next.js BFF proxy route (handles auth automatically)
    // The messaging API enforces that messages use the thread's assigned number
    const response = await fetch(`/api/messages/threads/${thread.id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        body: message,
        forceSend: false, // Automations should respect policy
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return { success: false, error: errorData.error || 'Failed to send message', usedThread: true };
    }

    return { success: true, usedThread: true };
  } catch (error: any) {
    console.error('[sendAutomationMessageViaThread] Error:', error);
    return { success: false, error: error.message, usedThread: false };
  }
}
