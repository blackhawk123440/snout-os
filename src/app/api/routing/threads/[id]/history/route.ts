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

    // Note: Root schema doesn't have auditEvent model
    // Return mock routing history for now (routing decisions would be stored in EventLog or a separate table)
    // In production, this would query the actual routing decision storage
    const formattedEvents = [
      {
        decision: {
          target: 'owner_inbox',
          targetId: null,
          reason: 'Default routing: messages route to owner inbox',
          evaluationTrace: [
            {
              step: 1,
              rule: 'Default Routing Rule',
              condition: 'No active assignment window',
              result: true,
              explanation: 'Thread has no active assignment window, routing to owner inbox',
            },
          ],
          rulesetVersion: '1.0',
          evaluatedAt: new Date().toISOString(),
          inputsSnapshot: {
            threadId: threadId,
            hasActiveWindow: false,
          },
        },
        timestamp: new Date().toISOString(),
      },
    ];

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
