/**
 * Number Assignment Helpers
 * 
 * Phase 1.2: Number Infrastructure
 * 
 * Manages assignment of Front Desk, Sitter Masked, and Pool Numbers
 * according to Messaging Master Spec V1.
 */

import { prisma } from '@/lib/db';
import { getOrgIdFromContext } from './org-helpers';
import type { MessagingProvider } from './provider';

export type NumberClass = 'front_desk' | 'sitter' | 'pool';

/**
 * Get or create Front Desk number
 * 
 * There is exactly one Front Desk number per org.
 * Used for:
 * - Booking inquiries and general questions
 * - Scheduling and changes outside active booking windows
 * - Billing and payment links
 * - Meet and greet coordination before approval
 */
export async function getOrCreateFrontDeskNumber(
  orgId: string,
  provider: MessagingProvider
): Promise<{ numberId: string; e164: string }> {
  // Check for existing Front Desk number
  const existing = await prisma.messageNumber.findFirst({
    where: {
      orgId,
      numberClass: 'front_desk',
      status: 'active',
    },
  });

  if (existing) {
    return {
      numberId: existing.id,
      e164: existing.e164,
    };
  }

  // If no Front Desk number exists, we need to create one
  // In production, this would purchase/provision a number via the provider
  // For now, we'll throw an error requiring manual setup
  throw new Error(
    'Front Desk number not configured. Please create a MessageNumber record with numberClass="front_desk"'
  );
}

/**
 * Assign masked number to sitter
 * 
 * Creates a SitterMaskedNumber linking sitter to a dedicated MessageNumber.
 * Used for all service communication during active assignment windows.
 * 
 * Guardrails:
 * - Must not reassign to another sitter after offboarding (90-day cooldown)
 * - Number is deactivated on sitter offboarding
 */
export async function assignSitterMaskedNumber(
  orgId: string,
  sitterId: string,
  provider: MessagingProvider
): Promise<{ numberId: string; sitterMaskedNumberId: string; e164: string }> {
  // Check if sitter already has an active masked number
  const existing = await prisma.sitterMaskedNumber.findUnique({
    where: { sitterId },
    include: {
      messageNumber: true,
    },
  });

  if (existing && existing.status === 'active') {
    return {
      numberId: existing.messageNumberId,
      sitterMaskedNumberId: existing.id,
      e164: existing.messageNumber.e164,
    };
  }

  // Find or create a sitter-class number for this sitter
  // In production, this would purchase/provision a number via the provider
  // For now, we'll look for an available sitter number or create one
  let messageNumber = await prisma.messageNumber.findFirst({
    where: {
      orgId,
      numberClass: 'sitter',
      assignedSitterId: sitterId,
      status: 'active',
    },
  });

  if (!messageNumber) {
    // Check if there's a deactivated sitter number we can reuse (after cooldown)
    const deactivatedNumber = await prisma.sitterMaskedNumber.findFirst({
      where: {
        orgId,
        status: 'deactivated',
        deactivatedAt: {
          // 90-day cooldown: deactivated more than 90 days ago
          lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        messageNumber: true,
      },
      orderBy: {
        deactivatedAt: 'desc',
      },
    });

    if (deactivatedNumber) {
      // Reuse this number but convert it to pool (never reuse as sitter number)
      await prisma.messageNumber.update({
        where: { id: deactivatedNumber.messageNumberId },
        data: {
          numberClass: 'pool',
          assignedSitterId: null,
          isRotating: true,
        },
      });

      // Create a new sitter number instead
      // In production, this would provision via provider
      throw new Error(
        `No available sitter number for sitter ${sitterId}. Please create a MessageNumber with numberClass="sitter" and assign it manually.`
      );
    } else {
      // Create new sitter number
      // In production, this would provision via provider
      throw new Error(
        `No sitter number configured. Please create a MessageNumber with numberClass="sitter" for sitter ${sitterId}.`
      );
    }
  }

  // Create or update SitterMaskedNumber record
  const sitterMaskedNumber = await prisma.sitterMaskedNumber.upsert({
    where: { sitterId },
    create: {
      orgId,
      sitterId,
      messageNumberId: messageNumber.id,
      status: 'active',
      assignedAt: new Date(),
    },
    update: {
      status: 'active',
      deactivatedAt: null,
    },
  });

  return {
    numberId: messageNumber.id,
    sitterMaskedNumberId: sitterMaskedNumber.id,
    e164: messageNumber.e164,
  };
}

/**
 * Get pool number for assignment
 * 
 * Selects a pool number from the rotating pool.
 * Used for:
 * - One-time bookings or overflow before sitter assignment
 * - Temporary coverage for short jobs
 * 
 * Pool number rotation:
 * - Prefer numbers not recently assigned (30-day preference)
 * - If pool is tight, can reuse immediately (routing safeguard prevents leakage)
 */
export async function getPoolNumber(
  orgId: string,
  excludeNumberIds?: string[]
): Promise<{ numberId: string; e164: string } | null> {
  // Find available pool numbers
  const whereClause: any = {
    orgId,
    numberClass: 'pool',
    status: 'active',
  };

  if (excludeNumberIds && excludeNumberIds.length > 0) {
    whereClause.id = {
      notIn: excludeNumberIds,
    };
  }

  // Prefer numbers not recently assigned (30-day preference)
  const poolNumbers = await prisma.messageNumber.findMany({
    where: whereClause,
    orderBy: [
      { lastAssignedAt: 'asc' }, // Least recently assigned first
      { createdAt: 'asc' }, // Fallback to oldest first
    ],
    take: 1,
  });

  if (poolNumbers.length === 0) {
    // No pool numbers available
    return null;
  }

  const selected = poolNumbers[0];

  // Update lastAssignedAt for rotation tracking
  await prisma.messageNumber.update({
    where: { id: selected.id },
    data: {
      lastAssignedAt: new Date(),
    },
  });

  return {
    numberId: selected.id,
    e164: selected.e164,
  };
}

/**
 * Determine number class for a thread based on context
 * 
 * Rules:
 * - If thread has assignedSitterId and isMeetAndGreet=false: use sitter masked number
 * - If thread isMeetAndGreet=true: use front desk number
 * - If thread isOneTimeClient=true: use pool number
 * - Otherwise: use front desk number
 */
export async function determineThreadNumberClass(
  thread: {
    assignedSitterId?: string | null;
    isMeetAndGreet?: boolean;
    isOneTimeClient?: boolean;
  }
): Promise<NumberClass> {
  // Meet and greet threads use Front Desk
  if (thread.isMeetAndGreet) {
    return 'front_desk';
  }

  // One-time clients use Pool
  if (thread.isOneTimeClient) {
    return 'pool';
  }

  // Threads with assigned sitter use Sitter masked number
  if (thread.assignedSitterId) {
    return 'sitter';
  }

  // Default: Front Desk for general inquiries
  return 'front_desk';
}

/**
 * Assign number to thread based on number class
 * 
 * This ensures MessageThread.numberClass always derives from its assigned MessageNumber.
 * 
 * Guardrails:
 * - Thread.numberClass must match MessageNumber.numberClass
 * - Pool number inbound routing must validate sender identity
 */
export async function assignNumberToThread(
  threadId: string,
  numberClass: NumberClass,
  orgId: string,
  provider: MessagingProvider,
  context?: {
    sitterId?: string;
    isOneTimeClient?: boolean;
    isMeetAndGreet?: boolean;
  }
): Promise<{ numberId: string; e164: string; numberClass: NumberClass }> {
  let numberId: string;
  let e164: string;

  switch (numberClass) {
    case 'front_desk':
      const frontDesk = await getOrCreateFrontDeskNumber(orgId, provider);
      numberId = frontDesk.numberId;
      e164 = frontDesk.e164;
      break;

    case 'sitter':
      if (!context?.sitterId) {
        throw new Error('Sitter ID required for sitter number assignment');
      }
      const sitterNumber = await assignSitterMaskedNumber(orgId, context.sitterId, provider);
      numberId = sitterNumber.numberId;
      e164 = sitterNumber.e164;
      break;

    case 'pool':
      const poolNumber = await getPoolNumber(orgId);
      if (!poolNumber) {
        throw new Error('No pool numbers available');
      }
      numberId = poolNumber.numberId;
      e164 = poolNumber.e164;
      break;

    default:
      throw new Error(`Invalid number class: ${numberClass}`);
  }

  // Update thread with number assignment
  // Ensure thread.numberClass matches MessageNumber.numberClass
  const messageNumber = await prisma.messageNumber.findUnique({
    where: { id: numberId },
  });

  if (!messageNumber) {
    throw new Error(`MessageNumber ${numberId} not found`);
  }

  // Validate number class matches
  if (messageNumber.numberClass !== numberClass) {
    throw new Error(
      `Number class mismatch: MessageNumber has ${messageNumber.numberClass}, expected ${numberClass}`
    );
  }

  // Update thread
  await prisma.messageThread.update({
    where: { id: threadId },
    data: {
      messageNumberId: numberId,
      numberClass: messageNumber.numberClass, // Always derive from MessageNumber
      maskedNumberE164: e164, // Store for quick access
    },
  });

  return {
    numberId,
    e164,
    numberClass: messageNumber.numberClass,
  };
}

/**
 * Validate pool number inbound routing
 * 
 * Pool number routing safeguard:
 * - If sender is not mapped to an active thread on this number, route to owner + auto-response
 * - Prevents leakage between different clients using the same pool number
 */
export async function validatePoolNumberRouting(
  numberId: string,
  senderE164: string,
  orgId: string
): Promise<{
  isValid: boolean;
  threadId?: string;
  reason?: string;
}> {
  const messageNumber = await prisma.messageNumber.findUnique({
    where: { id: numberId },
  });

  if (!messageNumber || messageNumber.numberClass !== 'pool') {
    return {
      isValid: false,
      reason: 'Number is not a pool number',
    };
  }

  // Find active threads using this pool number
  const activeThreads = await prisma.messageThread.findMany({
    where: {
      orgId,
      messageNumberId: numberId,
      status: {
        not: 'archived',
      },
    },
    include: {
      participants: {
        where: {
          role: 'client',
          realE164: senderE164,
        },
      },
    },
  });

  // Check if sender is a participant in any active thread
  const matchingThread = activeThreads.find(
    (thread) => thread.participants.length > 0
  );

  if (matchingThread) {
    return {
      isValid: true,
      threadId: matchingThread.id,
    };
  }

  // Sender is not mapped to an active thread
  // Must route to owner + auto-response
  return {
    isValid: false,
    reason: 'Sender not mapped to active thread on this pool number',
  };
}
