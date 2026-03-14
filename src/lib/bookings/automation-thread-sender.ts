/**
 * Automation Thread Sender
 * 
 * Phase 3: Send automation messages using thread masking number
 * 
 * Replaces old sendMessage() calls in automation executor with
 * thread-aware messaging that uses the thread's assigned masking number.
 */

import { prisma } from '@/lib/db';
import { sendThreadMessage } from '@/lib/messaging/send';

interface SendAutomationMessageParams {
  bookingId: string;
  orgId: string;
  clientId: string;
  message: string;
  recipient: 'client' | 'sitter' | 'owner';
}

/**
 * Send automation message using thread masking number
 * 
 * Finds the thread for the booking and sends via thread routing.
 * For client/sitter delivery this fails closed when masking cannot be used.
 */
export async function sendAutomationMessageViaThread(
  params: SendAutomationMessageParams
): Promise<{ success: boolean; error?: string; usedThread?: boolean }> {
  const { bookingId, orgId, message, recipient } = params;

  const maskedOnlyEnforced =
    process.env.ENFORCE_MASKED_ONLY_MESSAGING === 'true' || process.env.NODE_ENV === 'production';
  const mustUseMaskedThread = recipient === 'client' || recipient === 'sitter';

  try {
    // Find thread for this booking (via assignment window bookingRef)
    const window = await (prisma as any).assignmentWindow.findFirst({
      where: {
        orgId,
        bookingRef: bookingId,
      },
      include: {
        thread: {
          include: {
            messageNumber: true,
          },
        },
      },
    });
    
    const thread = window?.thread;

    if (!thread || !thread.numberId || !thread.messageNumber) {
      const reason = `Masked delivery required: no thread/number mapping for booking ${bookingId}`;
      if (mustUseMaskedThread || maskedOnlyEnforced) {
        return { success: false, error: reason, usedThread: false };
      }
      return { success: false, error: reason, usedThread: false };
    }

    await sendThreadMessage({
      orgId,
      threadId: thread.id,
      actor: { role: 'automation', userId: null },
      body: message,
      forceSend: false,
      idempotencyKey: `automation:${recipient}:${bookingId}:${message.length}`,
    });

    return { success: true, usedThread: true };
  } catch (error: any) {
    console.error('[sendAutomationMessageViaThread] Error:', error);
    return { success: false, error: error.message, usedThread: false };
  }
}
