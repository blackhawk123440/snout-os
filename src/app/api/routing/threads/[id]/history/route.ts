/**
 * Routing History API Endpoint
 * 
 * GET /api/routing/threads/[id]/history
 * Returns routing evaluation history for a thread.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserSafe } from "@/lib/auth-helpers";
import { getOrgIdFromContext } from "@/lib/messaging/org-helpers";
import { env } from "@/lib/env";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: threadId } = await params;
  
  try {
    if (!env.ENABLE_MESSAGING_V1) {
      return NextResponse.json(
        { error: "Messaging V1 not enabled" },
        { status: 404 }
      );
    }

    const currentUser = await getCurrentUserSafe(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const orgId = await getOrgIdFromContext(currentUser.id);

    // Verify thread exists and belongs to org
    const thread = await prisma.messageThread.findUnique({
      where: { id: threadId },
      select: { id: true, orgId: true },
    });

    if (!thread) {
      return NextResponse.json(
        { error: "Thread not found" },
        { status: 404 }
      );
    }

    if (thread.orgId !== orgId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Fetch routing events (audit events with routing decisions)
    const routingEvents = await prisma.auditEvent.findMany({
      where: {
        entityType: 'thread',
        entityId: threadId,
        eventType: {
          in: ['routing.evaluated', 'routing.override.created', 'routing.override.removed'],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Format events to match expected schema
    const formattedEvents = routingEvents.map((event) => {
      const payload = event.payload as any;
      const decision = payload?.decision || {
        target: payload?.target || 'owner_inbox',
        targetId: payload?.targetId,
        reason: payload?.reason || 'No routing history available',
        evaluationTrace: payload?.evaluationTrace || [],
        rulesetVersion: payload?.rulesetVersion || '1.0',
        evaluatedAt: event.createdAt.toISOString(),
        inputsSnapshot: payload?.inputsSnapshot || {},
      };

      return {
        decision: {
          target: decision.target,
          targetId: decision.targetId,
          reason: decision.reason,
          evaluationTrace: Array.isArray(decision.evaluationTrace) 
            ? decision.evaluationTrace.map((step: any, idx: number) => ({
                step: idx + 1,
                rule: step.rule || step.name || `Rule ${idx + 1}`,
                condition: step.condition || step.description || '',
                result: step.result !== false,
                explanation: step.explanation || step.reason || '',
              }))
            : [],
          rulesetVersion: decision.rulesetVersion || '1.0',
          evaluatedAt: decision.evaluatedAt || event.createdAt.toISOString(),
          inputsSnapshot: decision.inputsSnapshot || {},
        },
        timestamp: event.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      events: formattedEvents,
    });
  } catch (error) {
    console.error("[routing/threads/[id]/history] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch routing history" },
      { status: 500 }
    );
  }
}
