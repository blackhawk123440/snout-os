/**
 * Sitter Thread Messages API Endpoint
 * 
 * GET /api/sitter/threads/[id]/messages - Get messages for a thread
 * POST /api/sitter/threads/[id]/messages - Send a message (only during active assignment window)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserSafe } from "@/lib/auth-helpers";
import { getCurrentSitterId } from "@/lib/sitter-helpers";
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

    const sitterId = await getCurrentSitterId(request);
    if (!sitterId) {
      return NextResponse.json(
        { error: "Sitter access required" },
        { status: 403 }
      );
    }

    const orgId = await getOrgIdFromContext(currentUser.id);

    // Verify thread exists, belongs to org, and has active assignment window for this sitter
    const now = new Date();
    const thread = await prisma.messageThread.findFirst({
      where: {
        id: threadId,
        orgId,
        assignedSitterId: sitterId,
        assignmentWindows: {
          some: {
            sitterId: sitterId,
            startAt: { lte: now },
            endAt: { gte: now },
          },
        },
      },
    });

    if (!thread) {
      return NextResponse.json(
        { error: "Thread not found or not accessible" },
        { status: 404 }
      );
    }

    // Fetch messages (same as owner endpoint, but sitter can only see during active window)
    const messageEvents = await prisma.messageEvent.findMany({
      where: { threadId },
      include: {
        AntiPoachingAttempt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Format messages (same format as owner endpoint, but NEVER expose client E164)
    const formattedMessages = messageEvents.map((event) => {
      const metadata = event.metadataJson ? JSON.parse(event.metadataJson as string) : {};
      const hasPolicyViolation = !!event.AntiPoachingAttempt || metadata.antiPoachingFlagged === true;
      const redactedBody = metadata.wasBlocked ? metadata.redactedContent || event.body : null;

      const senderTypeMap: Record<string, 'client' | 'sitter' | 'owner' | 'system' | 'automation'> = {
        'client': 'client',
        'sitter': 'sitter',
        'owner': 'owner',
        'system': 'system',
        'automation': 'automation',
      };
      const senderType = senderTypeMap[event.actorType] || 'system';

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
        deliveries: [delivery],
        policyViolations,
      };
    });

    return NextResponse.json(formattedMessages);
  } catch (error) {
    console.error("[api/sitter/threads/[id]/messages] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

export async function POST(
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

    const sitterId = await getCurrentSitterId(request);
    if (!sitterId) {
      return NextResponse.json(
        { error: "Sitter access required" },
        { status: 403 }
      );
    }

    const orgId = await getOrgIdFromContext(currentUser.id);
    const body = await request.json();
    const messageBody = body.body;

    if (!messageBody || !messageBody.trim()) {
      return NextResponse.json(
        { error: "Message body is required" },
        { status: 400 }
      );
    }

    // Verify thread exists and has active assignment window
    const now = new Date();
    const thread = await prisma.messageThread.findFirst({
      where: {
        id: threadId,
        orgId,
        assignedSitterId: sitterId,
        assignmentWindows: {
          some: {
            sitterId: sitterId,
            startAt: { lte: now },
            endAt: { gte: now },
          },
        },
      },
      include: {
        messageNumber: {
          select: {
            e164: true,
            providerNumberSid: true,
          },
        },
        participants: {
          where: { role: 'client' },
          take: 1,
        },
      },
    });

    if (!thread) {
      return NextResponse.json(
        { error: "Thread not found or assignment window is not active" },
        { status: 404 }
      );
    }

    // Create message event
    const messageEvent = await prisma.messageEvent.create({
      data: {
        orgId,
        threadId: thread.id,
        direction: 'outbound',
        actorType: 'sitter',
        actorUserId: currentUser.id,
        body: messageBody.trim(),
        deliveryStatus: 'queued',
        attemptCount: 1,
        lastAttemptAt: new Date(),
      },
    });

    // TODO: Actually send via provider (TwilioProvider)
    // For now, mark as sent
    await prisma.messageEvent.update({
      where: { id: messageEvent.id },
      data: {
        deliveryStatus: 'sent',
        providerMessageSid: `sitter-msg-${messageEvent.id}`,
      },
    });

    // Update thread last activity
    await prisma.messageThread.update({
      where: { id: thread.id },
      data: {
        lastMessageAt: new Date(),
      },
    });

    return NextResponse.json({
      messageId: messageEvent.id,
      success: true,
    });
  } catch (error) {
    console.error("[api/sitter/threads/[id]/messages] Error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
