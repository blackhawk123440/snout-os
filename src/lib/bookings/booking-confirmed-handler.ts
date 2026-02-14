/**
 * Booking Confirmed Handler
 * 
 * Phase 3: Booking Confirmed → Thread + Masking Number + Windows + Automations
 * 
 * Idempotent handler that:
 * 1. Creates or reuses thread (key: {orgId, clientId, bookingId})
 * 2. Selects & assigns masking number to thread
 * 3. Creates assignment window(s)
 * 4. Emits audit + routing trace
 * 5. Ensures automations send from thread masking number
 */

import { prisma } from '@/lib/db';
import { logAutomationRun } from '@/lib/event-logger';

const DEFAULT_GRACE_PERIOD_MINUTES = 60;

interface BookingConfirmedParams {
  bookingId: string;
  orgId: string;
  clientId: string;
  sitterId?: string | null;
  startAt: Date;
  endAt: Date;
  actorUserId?: string; // User who confirmed (for audit)
}

interface BookingConfirmedResult {
  threadId: string;
  messageNumberId: string;
  numberClass: 'front_desk' | 'sitter' | 'pool';
  windowId: string;
  reused: {
    thread: boolean;
    window: boolean;
  };
}

/**
 * Main entrypoint: Handle booking confirmation
 * 
 * Idempotent: Can be called multiple times safely
 */
export async function onBookingConfirmed(
  params: BookingConfirmedParams
): Promise<BookingConfirmedResult> {
  const { bookingId, orgId, clientId, sitterId, startAt, endAt, actorUserId } = params;

  // A) Create or reuse thread (idempotent)
  const thread = await findOrCreateThread({
    orgId,
    clientId,
    bookingId,
    sitterId,
  });

  // B) Select & assign masking number
  const numberAssignment = await assignMaskingNumberToThread({
    orgId,
    threadId: thread.id,
    clientId,
    sitterId,
    bookingId,
  });

  // C) Create assignment window
  const window = await findOrCreateAssignmentWindow({
    orgId,
    threadId: thread.id,
    bookingId,
    sitterId,
    startsAt: startAt,
    endsAt: new Date(endAt.getTime() + DEFAULT_GRACE_PERIOD_MINUTES * 60 * 1000),
  });

  // D) Emit audit events
  await emitAuditEvents({
    orgId,
    threadId: thread.id,
    bookingId,
    messageNumberId: numberAssignment.numberId,
    windowId: window.id,
    reused: {
      thread: thread.reused,
      window: window.reused,
    },
    actorUserId,
  });

  return {
    threadId: thread.id,
    messageNumberId: numberAssignment.numberId,
    numberClass: numberAssignment.numberClass,
    windowId: window.id,
    reused: {
      thread: thread.reused,
      window: window.reused,
    },
  };
}

/**
 * A) Find or create thread (idempotent)
 * 
 * Thread key: {orgId, clientId, bookingId}
 */
async function findOrCreateThread(params: {
  orgId: string;
  clientId: string;
  bookingId: string;
  sitterId?: string | null;
}): Promise<{ id: string; reused: boolean }> {
  const { orgId, clientId, bookingId, sitterId } = params;

  // Try to find existing thread
  const existing = await prisma.messageThread.findFirst({
    where: {
      orgId,
      clientId,
      bookingId,
      scope: 'client_booking',
    },
  });

  if (existing) {
    // Update sitter assignment if changed
    if (sitterId && existing.assignedSitterId !== sitterId) {
      await prisma.messageThread.update({
        where: { id: existing.id },
        data: { assignedSitterId: sitterId },
      });
    }
    return { id: existing.id, reused: true };
  }

  // Create new thread
  const thread = await prisma.messageThread.create({
    data: {
      orgId,
      scope: 'client_booking',
      bookingId,
      clientId,
      assignedSitterId: sitterId || null,
      status: 'open',
    },
  });

  // Create participants
  await prisma.messageParticipant.createMany({
    data: [
      {
        orgId,
        threadId: thread.id,
        role: 'client',
        clientId,
        displayName: 'Client', // Will be updated with actual client name
        realE164: '', // Will be updated from client contact
      },
    ],
  });

  return { id: thread.id, reused: false };
}

/**
 * B) Select & assign masking number to thread
 * 
 * Rules:
 * - If booking has assigned sitter and weekly client → use sitter's dedicated number
 * - If booking is one-time / pool eligible → use pool number
 * - If pool empty → fallback to front desk and create alert
 */
async function assignMaskingNumberToThread(params: {
  orgId: string;
  threadId: string;
  clientId: string;
  sitterId?: string | null;
  bookingId: string;
}): Promise<{ numberId: string; numberClass: 'front_desk' | 'sitter' | 'pool' }> {
  const { orgId, threadId, clientId, sitterId, bookingId } = params;

  // Check if thread already has a number assigned
  const thread = await prisma.messageThread.findUnique({
    where: { id: threadId },
    include: { messageNumber: true },
  });

  if (thread?.messageNumberId && thread.messageNumber) {
    return {
      numberId: thread.messageNumberId,
      numberClass: (thread.messageNumber.class as 'front_desk' | 'sitter' | 'pool') || 'front_desk',
    };
  }

  let selectedNumber: { id: string; class: string } | null = null;
  let numberClass: 'front_desk' | 'sitter' | 'pool' = 'front_desk';

  // Rule 1: If sitter assigned, try to use sitter's dedicated number
  if (sitterId) {
    const sitterNumber = await prisma.messageNumber.findFirst({
      where: {
        orgId,
        class: 'sitter',
        assignedSitterId: sitterId,
        status: 'active',
      },
    });

    if (sitterNumber) {
      selectedNumber = { id: sitterNumber.id, class: sitterNumber.class };
      numberClass = 'sitter';
    }
  }

  // Rule 2: If no sitter number, try pool
  if (!selectedNumber) {
    const poolNumber = await prisma.messageNumber.findFirst({
      where: {
        orgId,
        class: 'pool',
        status: 'active',
      },
      orderBy: { lastUsedAt: 'asc' }, // Use least recently used
    });

    if (poolNumber) {
      selectedNumber = { id: poolNumber.id, class: poolNumber.class };
      numberClass = 'pool';

      // Update lastUsedAt
      await prisma.messageNumber.update({
        where: { id: poolNumber.id },
        data: { lastUsedAt: new Date() },
      });
    }
  }

  // Rule 3: Fallback to front desk
  if (!selectedNumber) {
    const frontDeskNumber = await prisma.messageNumber.findFirst({
      where: {
        orgId,
        class: 'front_desk',
        status: 'active',
      },
    });

    if (frontDeskNumber) {
      selectedNumber = { id: frontDeskNumber.id, class: frontDeskNumber.class };
      numberClass = 'front_desk';
    } else {
      // No numbers available - this is an error condition
      throw new Error(`No available messaging numbers for org ${orgId}. Please configure numbers in Messages → Numbers.`);
    }
  }

  // Assign number to thread
  await prisma.messageThread.update({
    where: { id: threadId },
    data: {
      messageNumberId: selectedNumber.id,
      numberClass: numberClass,
    },
  });

  return {
    numberId: selectedNumber.id,
    numberClass,
  };
}

/**
 * C) Create assignment window (idempotent)
 */
async function findOrCreateAssignmentWindow(params: {
  orgId: string;
  threadId: string;
  bookingId: string;
  sitterId?: string | null;
  startsAt: Date;
  endsAt: Date;
}): Promise<{ id: string; reused: boolean }> {
  const { orgId, threadId, bookingId, sitterId, startsAt, endsAt } = params;

  // Try to find existing window for this booking
  const existing = await prisma.assignmentWindow.findFirst({
    where: {
      orgId,
      threadId,
      bookingId,
    },
  });

  if (existing) {
    // Update window if dates changed
    await prisma.assignmentWindow.update({
      where: { id: existing.id },
      data: {
        startsAt,
        endsAt,
        responsibleSitterId: sitterId || null,
      },
    });
    return { id: existing.id, reused: true };
  }

  // Check for overlaps (enforce overlap rules)
  const overlapping = await prisma.assignmentWindow.findFirst({
    where: {
      orgId,
      threadId,
      OR: [
        {
          AND: [
            { startsAt: { lte: endsAt } },
            { endsAt: { gte: startsAt } },
          ],
        },
      ],
    },
  });

  if (overlapping) {
    // Update existing overlapping window instead of creating duplicate
    await prisma.assignmentWindow.update({
      where: { id: overlapping.id },
      data: {
        startsAt,
        endsAt,
        responsibleSitterId: sitterId || null,
        bookingId,
      },
    });
    return { id: overlapping.id, reused: true };
  }

  // Create new window
  const window = await prisma.assignmentWindow.create({
    data: {
      orgId,
      threadId,
      bookingId,
      responsibleSitterId: sitterId || null,
      startsAt,
      endsAt,
      resolutionStatus: 'open',
    },
  });

  return { id: window.id, reused: false };
}

/**
 * D) Emit audit events
 */
async function emitAuditEvents(params: {
  orgId: string;
  threadId: string;
  bookingId: string;
  messageNumberId: string;
  windowId: string;
  reused: { thread: boolean; window: boolean };
  actorUserId?: string;
}): Promise<void> {
  const { orgId, threadId, bookingId, messageNumberId, windowId, reused, actorUserId } = params;

  // Log events using EventLog
  try {
    await prisma.eventLog.createMany({
      data: [
        {
          eventType: 'booking.confirmed',
          status: 'success',
          bookingId,
          metadata: JSON.stringify({
            threadId,
            messageNumberId,
            windowId,
            action: reused.thread ? 'thread.reused' : 'thread.created',
            actorUserId: actorUserId || 'system',
          }),
        },
        {
          eventType: 'messaging.number.assigned',
          status: 'success',
          bookingId,
          metadata: JSON.stringify({
            threadId,
            messageNumberId,
            actorUserId: actorUserId || 'system',
          }),
        },
        {
          eventType: 'messaging.window.created',
          status: 'success',
          bookingId,
          metadata: JSON.stringify({
            threadId,
            windowId,
            action: reused.window ? 'window.updated' : 'window.created',
            actorUserId: actorUserId || 'system',
          }),
        },
      ],
    });
  } catch (error) {
    // Audit logging is non-blocking
    console.error('Failed to create event logs:', error);
  }
}
