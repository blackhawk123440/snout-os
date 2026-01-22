/**
 * Anti-Poaching Enforcement
 * 
 * Phase 3.2: Enforcement Logic
 * 
 * Handles blocking, audit logging, owner notifications, and warning messages
 */

import { prisma } from '@/lib/db';
import type { MessagingProvider, InboundMessage } from './provider';
import {
  detectAntiPoachingViolations,
  redactViolationsForOwner,
  generateAntiPoachingWarning,
} from './anti-poaching-detection';
import { findOrCreateOwnerInboxThread, routeToOwnerInbox } from './owner-inbox-routing';
import { logEvent } from '../event-logger';
import { getDefaultOrgId } from './org-helpers';

export interface BlockedMessageResult {
  wasBlocked: boolean;
  messageEventId?: string;
  antiPoachingAttemptId?: string;
  warningSent: boolean;
  ownerNotified: boolean;
}

/**
 * Block a message due to anti-poaching violation
 * 
 * This function:
 * - Creates MessageEvent with blocked flags
 * - Creates AntiPoachingAttempt record
 * - Notifies owner via owner inbox
 * - Sends warning to sender
 * 
 * @param params - Blocking parameters
 * @returns Blocking result
 */
export async function blockAntiPoachingMessage(params: {
  threadId: string;
  orgId: string;
  direction: 'inbound' | 'outbound';
  actorType: 'client' | 'sitter';
  actorId?: string;
  body: string;
  violations: Array<{
    type: 'phone_number' | 'email' | 'url' | 'social_media';
    content: string;
    reason: string;
  }>;
  provider?: MessagingProvider;
  inboundMessage?: InboundMessage; // For inbound messages
  senderE164?: string; // For outbound messages (client phone)
}): Promise<BlockedMessageResult> {
  const { threadId, orgId, direction, actorType, actorId, body, violations } = params;

  // Create MessageEvent with blocked flags in metadata
  const metadataJson = JSON.stringify({
    wasBlocked: true,
    antiPoachingFlagged: true,
    antiPoachingReasons: violations.map(v => v.reason),
    violationTypes: violations.map(v => v.type),
  });

  const messageEvent = await prisma.messageEvent.create({
    data: {
      threadId,
      orgId,
      direction,
      actorType,
      actorUserId: actorType === 'sitter' ? actorId || null : null,
      actorClientId: actorType === 'client' ? actorId || null : null,
      body,
      deliveryStatus: 'failed',
      failureCode: 'ANTI_POACHING_BLOCKED',
      failureDetail: `Blocked due to anti-poaching violation: ${violations.map(v => v.type).join(', ')}`,
      metadataJson,
    },
  });

  // Create AntiPoachingAttempt record
  // For multiple violations, create one attempt with the primary violation type
  const primaryViolation = violations[0];
  const antiPoachingAttempt = await prisma.antiPoachingAttempt.create({
    data: {
      orgId,
      threadId,
      eventId: messageEvent.id,
      actorType,
      actorId: actorId || null,
      violationType: primaryViolation.type,
      detectedContent: violations.map(v => v.content).join(' | '),
      action: 'blocked',
      ownerNotifiedAt: null, // Will be set after owner notification
    },
  });

  // Notify owner via owner inbox
  const ownerThread = await findOrCreateOwnerInboxThread(orgId);
  const redactedContent = redactViolationsForOwner(body, violations);

  const ownerNotificationEvent = await prisma.messageEvent.create({
    data: {
      threadId: ownerThread.id,
      orgId,
      direction: 'inbound', // Owner receives it as inbound notification
      actorType: 'system',
      body: `[Anti-Poaching Alert] Message blocked from ${actorType === 'sitter' ? 'sitter' : 'client'}. Violations: ${violations.map(v => v.type).join(', ')}. Content preview: ${redactedContent.substring(0, 200)}${redactedContent.length > 200 ? '...' : ''}`,
      deliveryStatus: 'received',
      metadataJson: JSON.stringify({
        antiPoachingAlert: true,
        originalEventId: messageEvent.id,
        violationTypes: violations.map(v => v.type),
      }),
    },
  });

  // Update owner inbox thread
  await prisma.messageThread.update({
    where: { id: ownerThread.id },
    data: {
      lastInboundAt: new Date(),
      lastMessageAt: new Date(),
      ownerUnreadCount: {
        increment: 1,
      },
    },
  });

  // Update AntiPoachingAttempt with owner notification timestamp
  await prisma.antiPoachingAttempt.update({
    where: { id: antiPoachingAttempt.id },
    data: {
      ownerNotifiedAt: new Date(),
    },
  });

  // Send warning to sender
  let warningSent = false;
  if (params.provider) {
    const warningMessage = generateAntiPoachingWarning(violations.map(v => v.type));

    try {
      if (params.inboundMessage) {
        // For inbound: send auto-response
        // Note: Provider will use default from number (the number they sent to)
        const result = await params.provider.sendMessage({
          to: params.inboundMessage.from,
          body: warningMessage,
        });
        warningSent = result.success;
      } else if (params.senderE164) {
        // For outbound: send warning to sender
        // Find the thread's number to send from
        const thread = await prisma.messageThread.findUnique({
          where: { id: threadId },
          include: { messageNumber: true },
        });

        if (thread?.messageNumber?.e164) {
          // Note: Provider will use default from number
          const result = await params.provider.sendMessage({
            to: params.senderE164,
            body: warningMessage,
          });
          warningSent = result.success;
        }
      }
    } catch (error) {
      console.error('[anti-poaching] Failed to send warning:', error);
      // Don't fail the block - warning is best-effort
    }
  }

  // Log audit event
  await logEvent('messaging.antiPoachingBlocked', 'success', {
    metadata: {
      threadId,
      eventId: messageEvent.id,
      attemptId: antiPoachingAttempt.id,
      actorType,
      violationTypes: violations.map(v => v.type),
    },
  });

  return {
    wasBlocked: true,
    messageEventId: messageEvent.id,
    antiPoachingAttemptId: antiPoachingAttempt.id,
    warningSent,
    ownerNotified: true,
  };
}

/**
 * Check if message should be blocked due to anti-poaching
 * 
 * Returns detection result. Caller should handle blocking logic.
 * 
 * @param content - Message body text
 * @returns Detection result
 */
export function checkAntiPoaching(content: string): ReturnType<typeof detectAntiPoachingViolations> {
  return detectAntiPoachingViolations(content);
}
