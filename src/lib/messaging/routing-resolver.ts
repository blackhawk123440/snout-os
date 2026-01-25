/**
 * Routing Resolver
 * 
 * Centralized routing resolution for inbound and outbound messages.
 * Integrates number system, thread visibility, and assignment windows.
 */

import { prisma } from '@/lib/db';
import type { MessagingProvider } from './provider';
// Helper functions for booking/assignment queries
async function getActiveBookingForClient(
  orgId: string,
  clientId: string,
  now: Date
): Promise<{ id: string; sitterId: string | null } | null> {
  // First get client to find phone number
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { phone: true },
  });
  
  if (!client) return null;
  
  // Find booking by phone number (Booking model doesn't have clientId or orgId)
  const booking = await prisma.booking.findFirst({
    where: {
      phone: client.phone,
      startAt: { lte: now },
      endAt: { gte: now },
      status: { notIn: ['cancelled', 'completed'] },
    },
    select: { id: true, sitterId: true },
    orderBy: { startAt: 'desc' },
  });
  return booking;
}

async function getActiveAssignment(
  orgId: string,
  bookingId: string,
  sitterUserId: string,
  now: Date
): Promise<{ id: string } | null> {
  // Find sitter by user relation
  const user = await prisma.user.findFirst({
    where: { id: sitterUserId },
    select: { sitterId: true },
  });
  
  const sitterId = user?.sitterId || sitterUserId;
  
  const assignment = await prisma.assignmentWindow.findFirst({
    where: {
      orgId,
      bookingId,
      sitterId,
      startAt: { lte: now },
      endAt: { gte: now },
      status: 'active',
    },
    select: { id: true },
  });
  
  return assignment;
}
import { findOrCreateOwnerInboxThread } from './owner-inbox-routing';

export interface InboundRoutingResult {
  threadId: string;
  threadType: 'RELATIONSHIP' | 'JOB' | 'BROADCAST_INTERNAL';
  deliverTo: {
    owner: boolean;
    sitterUserIds: string[];
  };
  autoResponse?: string;
  fromNumberToUse?: string;
}

export interface OutboundRoutingResult {
  allowed: boolean;
  fromNumberToUse: string;
  reasonIfBlocked?: string;
}

/**
 * Resolve routing for inbound SMS message
 * 
 * Determines which thread the message should be delivered to and who should receive it.
 * 
 * @param params - Routing parameters
 * @param provider - Messaging provider instance
 * @returns Routing result with thread ID and delivery targets
 */
export async function resolveInboundSms(
  params: {
    orgId: string;
    toNumberE164: string;
    fromNumberE164: string;
    now: Date;
  },
  provider: MessagingProvider
): Promise<InboundRoutingResult> {
  const { orgId, toNumberE164, fromNumberE164, now } = params;

  // Find client by phone number
  const client = await prisma.client.findFirst({
    where: {
      phone: fromNumberE164,
    },
  });

  if (!client) {
    // No client found - route to owner inbox
    const ownerThread = await findOrCreateOwnerInboxThread(orgId);
    return {
      threadId: ownerThread.id,
      threadType: 'RELATIONSHIP',
      deliverTo: {
        owner: true,
        sitterUserIds: [],
      },
    };
  }

  // Check for active booking
  const activeBooking = await getActiveBookingForClient(orgId, client.id, now);

  if (!activeBooking || !activeBooking.sitterId) {
    // No active booking - route to relationship thread or owner inbox
    // Find or create relationship thread
    let thread = await prisma.messageThread.findFirst({
      where: {
        orgId,
        clientId: client.id,
        scope: 'internal',
      },
    });

    if (!thread) {
      thread = await prisma.messageThread.create({
        data: {
          orgId,
          clientId: client.id,
          scope: 'internal',
          status: 'open',
        },
      });
    }

    return {
      threadId: thread.id,
      threadType: 'RELATIONSHIP',
      deliverTo: {
        owner: true,
        sitterUserIds: [],
      },
    };
  }

  // Active booking exists - find or create JOB thread
  let jobThread = await prisma.messageThread.findFirst({
    where: {
      orgId,
      clientId: client.id,
      bookingId: activeBooking.id,
    },
  });

  if (!jobThread) {
    jobThread = await prisma.messageThread.create({
      data: {
        orgId,
        clientId: client.id,
        bookingId: activeBooking.id,
        scope: 'client_general',
        assignedSitterId: activeBooking.sitterId,
        status: 'open',
      },
    });
  }

  // Check for active assignment window
  const sitter = await prisma.sitter.findUnique({
    where: { id: activeBooking.sitterId },
    select: {
      userId: true,
    },
  });

  const sitterUserId = sitter?.userId || null;

  if (sitterUserId) {
    const activeAssignment = await getActiveAssignment(
      orgId,
      activeBooking.id,
      sitterUserId,
      now
    );

    if (activeAssignment) {
      // Active window - deliver to sitter
      return {
        threadId: jobThread.id,
        threadType: 'JOB',
        deliverTo: {
          owner: false,
          sitterUserIds: [sitterUserId],
        },
      };
    }
  }

  // No active window - route to owner inbox
  return {
    threadId: jobThread.id,
    threadType: 'JOB',
    deliverTo: {
      owner: true,
      sitterUserIds: [],
    },
  };
}

/**
 * Resolve routing for outbound message
 * 
 * Determines if the message can be sent and which number to use.
 * 
 * @param params - Outbound routing parameters
 * @returns Routing result with send permission and from number
 */
export async function resolveOutboundMessage(
  params: {
    orgId: string;
    senderUserId: string;
    threadId: string;
    now: Date;
  }
): Promise<OutboundRoutingResult> {
  const { orgId, senderUserId, threadId, now } = params;

  // Get thread
  const thread = await prisma.messageThread.findUnique({
    where: {
      id: threadId,
      orgId,
    },
    include: {
      messageNumber: true,
    },
  });

  if (!thread) {
    return {
      allowed: false,
      fromNumberToUse: '',
      reasonIfBlocked: 'Thread not found',
    };
  }

  // Get from number
  const fromNumber = thread.messageNumber?.e164 || '';

  // For now, allow all outbound messages
  // Window gating and other checks are handled elsewhere
  return {
    allowed: true,
    fromNumberToUse: fromNumber,
  };
}
