/**
 * Owner Inbox Routing Helpers
 * 
 * Phase 1.3.3: Owner Inbox Routing Scaffolding
 * 
 * Helper hooks for routing messages to owner inbox outside assignment windows.
 * Full window enforcement deferred to Phase 2.
 */

import { prisma } from '@/lib/db';
import type { InboundMessage } from './provider';
import { logEvent } from '../event-logger';

/**
 * Route message to owner inbox
 * 
 * Used when:
 * - Message arrives outside assignment window (Phase 2)
 * - Pool number mismatch detected (Phase 1.3.1)
 * - Manual routing required
 * 
 * @param inboundMessage - Inbound message to route
 * @param orgId - Organization ID
 * @param reason - Reason for routing to owner inbox
 * @returns Owner inbox thread ID and message event ID
 */
export async function routeToOwnerInbox(
  inboundMessage: InboundMessage,
  orgId: string,
  reason: string
): Promise<{
  ownerThreadId: string;
  messageEventId: string;
}> {
  // Find or create owner inbox thread
  const ownerThread = await findOrCreateOwnerInboxThread(orgId);

  // Create inbound message event in owner inbox
  const messageEvent = await prisma.messageEvent.create({
    data: {
      threadId: ownerThread.id,
      orgId,
      direction: 'inbound',
      actorType: 'client',
      providerMessageSid: inboundMessage.messageSid,
      body: inboundMessage.body,
      mediaJson: inboundMessage.mediaUrls ? JSON.stringify(inboundMessage.mediaUrls) : null,
      deliveryStatus: 'received',
      metadataJson: JSON.stringify({
        routedToOwner: true,
        reason,
        senderE164: inboundMessage.from,
      }),
      createdAt: inboundMessage.timestamp,
    },
  });

  // Update owner inbox thread timestamps
  await prisma.messageThread.update({
    where: { id: ownerThread.id },
    data: {
      lastInboundAt: inboundMessage.timestamp,
      lastMessageAt: inboundMessage.timestamp,
      ownerUnreadCount: {
        increment: 1,
      },
    },
  });

  // Log audit event
  try {
    await logEvent(
      'messaging.routedToOwnerInbox',
      'success',
      {
        metadata: {
          ownerThreadId: ownerThread.id,
          messageEventId: messageEvent.id,
          senderE164: inboundMessage.from,
          reason,
        },
      }
    );
  } catch (error) {
    console.error('[owner-inbox-routing] Failed to log event:', error);
    // Continue - logging failure shouldn't block routing
  }

  return {
    ownerThreadId: ownerThread.id,
    messageEventId: messageEvent.id,
  };
}

/**
 * Find or create owner inbox thread
 * 
 * Owner inbox is a special thread for routing messages that require owner attention.
 * There is exactly one owner inbox thread per org.
 */
export async function findOrCreateOwnerInboxThread(orgId: string) {
  // Look for existing owner inbox thread
  // Owner inbox uses scope='internal' and has no clientId
  const existing = await prisma.messageThread.findFirst({
    where: {
      orgId,
      scope: 'internal',
      clientId: null,
      // Owner inbox thread should have a specific identifier
      // For now, we'll use scope='internal' + clientId=null to identify it
    },
  });

  if (existing) {
    return existing;
  }

  // Create owner inbox thread
  // Owner inbox uses front desk number
  const ownerThread = await prisma.messageThread.create({
    data: {
      orgId,
      scope: 'internal', // Owner inbox is an internal thread
      status: 'open',
      // Don't set number class yet - it will be assigned when first message is routed
    },
  });

  return ownerThread;
}

/**
 * Check if message should be routed to owner inbox
 * 
 * Phase 2: Full window enforcement
 * Uses routing resolution engine to determine if message should route to owner inbox
 * 
 * @param threadId - Thread ID
 * @param timestamp - Message timestamp
 * @returns true if should route to owner inbox
 */
export async function shouldRouteToOwnerInbox(
  threadId: string,
  timestamp: Date
): Promise<{ shouldRoute: boolean; reason?: string }> {
  // Phase 2: Use routing resolution engine
  const { resolveRoutingForInboundMessage } = await import('./routing-resolution');
  
  const resolution = await resolveRoutingForInboundMessage(threadId, timestamp);
  
  return {
    shouldRoute: resolution.target === 'owner_inbox',
    reason: resolution.reason,
  };
}
