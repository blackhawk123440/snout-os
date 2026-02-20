/**
 * Choose From Number
 * 
 * Single source of truth for selecting the "from" number when sending messages.
 * Used by owner sends, sitter sends, and automations.
 * 
 * Rules:
 * 1. If active AssignmentWindow exists for thread → use sitter's assigned masked number
 * 2. Else → use thread's default number (front_desk/pool)
 * 
 * This function MUST be used by all sending paths to ensure consistent routing.
 */

import { prisma } from '@/lib/db';
import { getEffectiveNumberForThread } from './dynamic-number-routing';

export interface ChooseFromNumberResult {
  numberId: string;
  e164: string;
  numberClass: 'front_desk' | 'sitter' | 'pool';
  reason: string;
  windowId?: string; // AssignmentWindow ID if used
  routingTrace: Array<{
    step: number;
    rule: string;
    condition: string;
    result: boolean;
    explanation: string;
  }>;
}

/**
 * Choose the "from" number for sending a message
 * 
 * @param threadId - Thread ID
 * @param orgId - Organization ID
 * @param atTime - Optional timestamp (defaults to now)
 * @returns Chosen number details with routing trace
 */
export async function chooseFromNumber(
  threadId: string,
  orgId: string,
  atTime?: Date
): Promise<ChooseFromNumberResult> {
  const now = atTime || new Date();
  
  // Use existing routing logic
  const routingResult = await getEffectiveNumberForThread(orgId, threadId, now);
  
  // Extract window ID if sitter number was chosen
  let windowId: string | undefined;
  if (routingResult.numberClass === 'sitter') {
    const thread = await (prisma as any).thread.findUnique({
      where: { id: threadId },
      include: {
        assignmentWindows: {
          where: {
            startsAt: { lte: now },
            endsAt: { gte: now },
          },
          orderBy: { startsAt: 'desc' },
          take: 1,
        },
      },
    });
    
    if (thread?.assignmentWindows?.[0]) {
      windowId = thread.assignmentWindows[0].id;
    }
  }
  
  // Log routing decision
  console.log('[chooseFromNumber]', {
    orgId,
    threadId,
    chosenNumberId: routingResult.numberId,
    chosenE164: routingResult.e164,
    numberClass: routingResult.numberClass,
    reason: routingResult.reason,
    windowId,
    timestamp: now.toISOString(),
  });
  
  return {
    numberId: routingResult.numberId,
    e164: routingResult.e164,
    numberClass: routingResult.numberClass,
    reason: routingResult.reason,
    windowId,
    routingTrace: routingResult.routingTrace,
  };
}
