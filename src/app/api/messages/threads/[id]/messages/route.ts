/**
 * Messages API Endpoint for a Thread
 * 
 * GET /api/messages/threads/[id]/messages
 * Returns messages for a thread with delivery status and policy violations.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserSafe } from "@/lib/auth-helpers";
import { getOrgIdFromContext } from "@/lib/messaging/org-helpers";
import { getCurrentSitterId } from "@/lib/sitter-helpers";
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

    const currentSitterId = await getCurrentSitterId(request);
    const isSitter = !!currentSitterId;

    if (isSitter && !env.ENABLE_SITTER_MESSAGES_V1) {
      return NextResponse.json(
        { error: "Sitter messages not enabled" },
        { status: 404 }
      );
    }

    const orgId = await getOrgIdFromContext(currentUser.id);

    // Verify thread exists and belongs to org
    const thread = await prisma.messageThread.findUnique({
      where: { id: threadId },
      select: { id: true, orgId: true, assignedSitterId: true, scope: true },
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

    // Sitter access control
    if (isSitter) {
      if (thread.assignedSitterId !== currentSitterId) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }
      if (thread.scope === 'internal' || thread.scope === 'owner_sitter') {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }
    }

    // Fetch messages with deliveries and policy violations
    const messages = await prisma.message.findMany({
      where: { threadId },
      include: {
        deliveries: {
          orderBy: { attemptNo: 'desc' },
        },
        policyViolations: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Format messages to match Zod schema
    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      threadId: msg.threadId,
      direction: msg.direction === 'inbound' ? 'inbound' as const : 'outbound' as const,
      senderType: msg.senderType as 'client' | 'sitter' | 'owner' | 'system' | 'automation',
      senderId: msg.senderId,
      body: msg.body,
      redactedBody: msg.redactedBody,
      hasPolicyViolation: msg.hasPolicyViolation,
      createdAt: msg.createdAt.toISOString(),
      deliveries: msg.deliveries.map((delivery) => ({
        id: delivery.id,
        attemptNo: delivery.attemptNo,
        status: delivery.status as 'queued' | 'sent' | 'delivered' | 'failed',
        providerErrorCode: delivery.providerErrorCode,
        providerErrorMessage: delivery.providerErrorMessage,
        createdAt: delivery.createdAt.toISOString(),
      })),
      policyViolations: msg.policyViolations.map((pv) => ({
        id: pv.id,
        violationType: pv.violationType,
        detectedSummary: pv.detectedSummary || '',
        actionTaken: pv.actionTaken || '',
      })),
    }));

    return NextResponse.json(formattedMessages);
  } catch (error) {
    console.error("[messages/threads/[id]/messages] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
