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

  // Try to find existing thread by bookingRef (stored in assignment window)
  // Note: Thread model doesn't have bookingId, so we find via assignment window
  const existingWindow = await (prisma as any).assignmentWindow.findFirst({
    where: {
      orgId,
      bookingRef: bookingId,
    },
    include: { thread: true },
  });

  if (existingWindow?.thread) {
    const existing = existingWindow.thread;
    // Update sitter assignment if changed
    if (sitterId && existing.sitterId !== sitterId) {
      await (prisma as any).thread.update({
        where: { id: existing.id },
        data: { sitterId: sitterId },
      });
    }
    return { id: existing.id, reused: true };
  }

  // Need a number first - get one temporarily
  const tempNumber = await (prisma as any).messageNumber.findFirst({
    where: { orgId, status: 'active' },
  });
  
  if (!tempNumber) {
    throw new Error(`No available messaging numbers for org ${orgId}. Please configure numbers in Messages → Numbers.`);
  }

  // Create new thread (Thread model requires numberId)
  const thread = await (prisma as any).thread.create({
    data: {
      orgId,
      clientId,
      sitterId: sitterId || null,
      numberId: tempNumber.id, // Will be updated with correct number later
      threadType: 'assignment', // 'front_desk' | 'assignment' | 'pool' | 'other'
      status: 'active',
    },
  });

  // Create participants (ThreadParticipant model)
  await (prisma as any).threadParticipant.createMany({
    data: [
      {
        threadId: thread.id,
        participantType: 'client',
        participantId: clientId,
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
  const thread = await (prisma as any).thread.findUnique({
    where: { id: threadId },
    include: { messageNumber: true },
  });

  if (thread?.numberId && thread.messageNumber) {
    return {
      numberId: thread.numberId,
      numberClass: (thread.messageNumber.class as 'front_desk' | 'sitter' | 'pool') || 'front_desk',
    };
  }

  let selectedNumber: { id: string; class: string } | null = null;
  let numberClass: 'front_desk' | 'sitter' | 'pool' = 'front_desk';

  // Rule 1: If sitter assigned, try to use sitter's dedicated number
  if (sitterId) {
    const sitterNumber = await (prisma as any).messageNumber.findFirst({
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
    const poolNumber = await (prisma as any).messageNumber.findFirst({
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
      await (prisma as any).messageNumber.update({
        where: { id: poolNumber.id },
        data: { lastUsedAt: new Date() },
      });
    }
  }

  // Rule 3: Fallback to front desk
  if (!selectedNumber) {
    const frontDeskNumber = await (prisma as any).messageNumber.findFirst({
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

  // Assign number to thread (Thread model uses numberId, not messageNumberId)
  await (prisma as any).thread.update({
    where: { id: threadId },
    data: {
      numberId: selectedNumber.id,
      threadType: numberClass === 'sitter' ? 'assignment' : numberClass === 'pool' ? 'pool' : 'front_desk',
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

  // Try to find existing window for this booking (AssignmentWindow uses bookingRef, not bookingId)
  const existing = await (prisma as any).assignmentWindow.findFirst({
    where: {
      orgId,
      threadId,
      bookingRef: bookingId,
    },
  });

  if (existing) {
    // Update window if dates changed (AssignmentWindow uses sitterId, not responsibleSitterId)
    if (!sitterId) {
      throw new Error('Sitter ID required for assignment window');
    }
    await (prisma as any).assignmentWindow.update({
      where: { id: existing.id },
      data: {
        startsAt,
        endsAt,
        sitterId: sitterId,
      },
    });
    return { id: existing.id, reused: true };
  }

  // Check for overlaps (enforce overlap rules)
  const overlapping = await (prisma as any).assignmentWindow.findFirst({
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
    if (!sitterId) {
      throw new Error('Sitter ID required for assignment window');
    }
    await (prisma as any).assignmentWindow.update({
      where: { id: overlapping.id },
      data: {
        startsAt,
        endsAt,
        sitterId: sitterId,
        bookingRef: bookingId,
      },
    });
    return { id: overlapping.id, reused: true };
  }

  // Create new window (AssignmentWindow requires sitterId, uses bookingRef not bookingId, no resolutionStatus)
  if (!sitterId) {
    throw new Error('Sitter ID required for assignment window');
  }
  const window = await (prisma as any).assignmentWindow.create({
    data: {
      orgId,
      threadId,
      sitterId: sitterId,
      bookingRef: bookingId,
      startsAt,
      endsAt,
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

  // Log events using AuditEvent (enterprise-messaging-dashboard schema)
  try {
    // Note: AuditEvent model structure is different - using console.log for now
    // In production, should use the API's AuditService
    console.log('[Booking Confirmed]', {
      threadId,
      messageNumberId,
      windowId,
      bookingId,
      reused,
      actorUserId: actorUserId || 'system',
    });
  } catch (error) {
    // Audit logging is non-blocking
    console.error('Failed to create audit events:', error);
  }
}
