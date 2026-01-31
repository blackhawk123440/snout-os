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

    // Fetch messages (using MessageEvent in root schema)
    const messages = await prisma.messageEvent.findMany({
      where: { threadId },
      include: {
        AntiPoachingAttempt: {
          select: {
            id: true,
            violationType: true,
            detectedContent: true,
            action: true,
            resolvedAt: true,
            resolvedByUserId: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Format messages to match Zod schema
    // MessageEvent has deliveryStatus directly, not in a deliveries table
    // We create a delivery object from the MessageEvent fields
    const formattedMessages = messages.map((msg) => {
      const metadata = msg.metadataJson ? JSON.parse(msg.metadataJson) : {};
      const hasPolicyViolation = !!msg.AntiPoachingAttempt || metadata.antiPoachingFlagged === true;
      
      // Create delivery object from MessageEvent fields
      const delivery = {
        id: msg.id, // Use message ID as delivery ID (single delivery per message in MessageEvent)
        attemptNo: msg.attemptCount || 1,
        status: (msg.deliveryStatus === 'delivered' ? 'delivered' :
                 msg.deliveryStatus === 'sent' ? 'sent' :
                 msg.deliveryStatus === 'failed' ? 'failed' :
                 'queued') as 'queued' | 'sent' | 'delivered' | 'failed',
        providerErrorCode: msg.providerErrorCode || msg.failureCode,
        providerErrorMessage: msg.providerErrorMessage || msg.failureDetail,
        createdAt: msg.createdAt.toISOString(),
      };

      // Map actorType to senderType
      const senderType = msg.actorType === 'client' ? 'client' :
                        msg.actorType === 'sitter' ? 'sitter' :
                        msg.actorType === 'owner' ? 'owner' :
                        msg.actorType === 'system' ? 'system' :
                        'automation' as 'client' | 'sitter' | 'owner' | 'system' | 'automation';

      return {
        id: msg.id,
        threadId: msg.threadId,
        direction: msg.direction === 'inbound' ? 'inbound' as const : 'outbound' as const,
        senderType,
        senderId: msg.actorUserId || msg.actorClientId || null,
        body: msg.body,
        redactedBody: metadata.wasBlocked ? (metadata.redactedContent || msg.body) : null,
        hasPolicyViolation,
        createdAt: msg.createdAt.toISOString(),
        deliveries: [delivery], // Single delivery object from MessageEvent
        policyViolations: msg.AntiPoachingAttempt ? [{
          id: msg.AntiPoachingAttempt.id,
          violationType: msg.AntiPoachingAttempt.violationType,
          detectedSummary: msg.AntiPoachingAttempt.detectedContent || '',
          actionTaken: msg.AntiPoachingAttempt.action || '',
        }] : [],
      };
    });

    return NextResponse.json(formattedMessages);
  } catch (error) {
    console.error("[messages/threads/[id]/messages] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
