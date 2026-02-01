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

    // Fetch MessageEvent records with AntiPoachingAttempt (policy violations)
    const messageEvents = await prisma.messageEvent.findMany({
      where: { threadId },
      include: {
        AntiPoachingAttempt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Format MessageEvent to match UI Zod schema
    const formattedMessages = messageEvents.map((event) => {
      // Parse metadataJson for redactedBody
      let redactedBody: string | null = null;
      let hasPolicyViolation = false;
      try {
        if (event.metadataJson) {
          const metadata = JSON.parse(event.metadataJson);
          redactedBody = metadata.redactedBody || null;
          hasPolicyViolation = metadata.hasPolicyViolation === true || !!event.AntiPoachingAttempt;
        }
      } catch (e) {
        // Invalid JSON, ignore
      }

      // Map actorType to senderType
      const senderTypeMap: Record<string, 'client' | 'sitter' | 'owner' | 'system' | 'automation'> = {
        'client': 'client',
        'sitter': 'sitter',
        'owner': 'owner',
        'system': 'system',
        'automation': 'automation',
      };
      const senderType = senderTypeMap[event.actorType] || 'system';

      // Create delivery object from MessageEvent fields (no separate Delivery table)
      // Use attemptCount or default to 1
      const attemptNo = event.attemptCount || 1;
      const delivery = {
        id: `${event.id}-delivery`,
        attemptNo,
        status: (event.deliveryStatus === 'delivered' ? 'delivered' :
                 event.deliveryStatus === 'sent' ? 'sent' :
                 event.deliveryStatus === 'failed' ? 'failed' :
                 'queued') as 'queued' | 'sent' | 'delivered' | 'failed',
        providerErrorCode: event.providerErrorCode || event.failureCode || null,
        providerErrorMessage: event.providerErrorMessage || event.failureDetail || null,
        createdAt: (event.lastAttemptAt || event.createdAt).toISOString(),
      };

      // Map AntiPoachingAttempt to policyViolations format
      const policyViolations = event.AntiPoachingAttempt ? [{
        id: event.AntiPoachingAttempt.id,
        violationType: event.AntiPoachingAttempt.violationType,
        detectedSummary: event.AntiPoachingAttempt.detectedContent || '',
        actionTaken: event.AntiPoachingAttempt.action || '',
      }] : [];

      return {
        id: event.id,
        threadId: event.threadId,
        direction: event.direction === 'inbound' ? 'inbound' as const : 'outbound' as const,
        senderType,
        senderId: event.actorUserId || event.actorClientId || null,
        body: event.body,
        redactedBody,
        hasPolicyViolation: hasPolicyViolation || policyViolations.length > 0,
        createdAt: event.createdAt.toISOString(),
        deliveries: [delivery], // Single delivery object from MessageEvent
        policyViolations,
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
