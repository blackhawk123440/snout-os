/**
 * Dynamic Number Routing
 * 
 * ONE THREAD PER CLIENT PER ORG
 * 
 * Computes the effective "from number" for a thread based on current operational state.
 * This is called at send-time to ensure correct number selection.
 * 
 * Rules (priority order):
 * 1. If there is an active assignment window for a sitter → use that sitter's dedicated number
 * 2. Else if client is "one-time / unassigned" → use pool number
 * 3. Else → front desk
 */

import { prisma } from '@/lib/db';

export interface EffectiveNumberResult {
  numberId: string;
  e164: string;
  numberClass: 'front_desk' | 'sitter' | 'pool';
  reason: string; // For routing trace
  routingTrace: Array<{
    step: number;
    rule: string;
    condition: string;
    result: boolean;
    explanation: string;
  }>;
}

/**
 * Compute effective number for a thread at send-time
 * 
 * This is the source of truth for "which number should this message send from"
 */
export async function getEffectiveNumberForThread(
  orgId: string,
  threadId: string,
  atTime?: Date
): Promise<EffectiveNumberResult> {
  const now = atTime || new Date();
  const trace: EffectiveNumberResult['routingTrace'] = [];

  // Load thread with relationships
  const thread = await (prisma as any).thread.findUnique({
    where: { id: threadId },
    include: {
      messageNumber: true,
      assignmentWindows: {
        where: {
          startsAt: { lte: now },
          endsAt: { gte: now },
        },
        include: {
          sitter: {
            include: {
              assignedNumbers: {
                where: {
                  status: 'active',
                  class: 'sitter',
                },
              },
            },
          },
        },
        orderBy: { startsAt: 'desc' },
        take: 1, // Get most recent active window
      },
    },
  });

  if (!thread) {
    throw new Error(`Thread ${threadId} not found`);
  }

  // Step 1: Check for active assignment window with sitter
  if (thread.assignmentWindows && thread.assignmentWindows.length > 0) {
    const activeWindow = thread.assignmentWindows[0];
    if (activeWindow.sitter && activeWindow.sitter.assignedNumbers && activeWindow.sitter.assignedNumbers.length > 0) {
      const sitterNumber = activeWindow.sitter.assignedNumbers[0];
      trace.push({
        step: 1,
        rule: 'Active assignment window with sitter',
        condition: `Window active: ${activeWindow.startsAt} <= ${now} <= ${activeWindow.endsAt}`,
        result: true,
        explanation: `Active window for sitter ${activeWindow.sitter.name} - using sitter's dedicated number`,
      });

      return {
        numberId: sitterNumber.id,
        e164: sitterNumber.e164,
        numberClass: 'sitter',
        reason: `Active assignment window for sitter ${activeWindow.sitter.name}`,
        routingTrace: trace,
      };
    }
  }

  trace.push({
    step: 1,
    rule: 'Active assignment window with sitter',
    condition: 'No active window or no sitter number',
    result: false,
    explanation: 'No active assignment window found',
  });

  // Step 2: Check if client is one-time / unassigned → use pool
  // Note: We'd need to check client classification here
  // For now, default to pool if no active window
  const poolNumber = await (prisma as any).messageNumber.findFirst({
    where: {
      orgId,
      class: 'pool',
      status: 'active',
    },
    orderBy: { lastUsedAt: 'asc' },
  });

  if (poolNumber) {
    trace.push({
      step: 2,
      rule: 'Pool number for one-time/unassigned',
      condition: 'No active window, pool number available',
      result: true,
      explanation: 'Using pool number for unassigned client',
    });

    return {
      numberId: poolNumber.id,
      e164: poolNumber.e164,
      numberClass: 'pool',
      reason: 'No active assignment window - using pool number',
      routingTrace: trace,
    };
  }

  trace.push({
    step: 2,
    rule: 'Pool number for one-time/unassigned',
    condition: 'Pool exhausted',
    result: false,
    explanation: 'No pool numbers available',
  });

  // Step 3: Fallback to front desk
  const frontDeskNumber = await (prisma as any).messageNumber.findFirst({
    where: {
      orgId,
      class: 'front_desk',
      status: 'active',
    },
  });

  if (frontDeskNumber) {
    trace.push({
      step: 3,
      rule: 'Front desk fallback',
      condition: 'No active window, pool exhausted',
      result: true,
      explanation: 'Using front desk number as fallback',
    });

    return {
      numberId: frontDeskNumber.id,
      e164: frontDeskNumber.e164,
      numberClass: 'front_desk',
      reason: 'No active window and pool exhausted - using front desk',
      routingTrace: trace,
    };
  }

  throw new Error(`No available messaging numbers for org ${orgId}. Please configure numbers in Messages → Numbers.`);
}
