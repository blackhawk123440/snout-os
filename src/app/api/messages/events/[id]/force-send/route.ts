/**
 * Force Send Blocked Message Endpoint
 * 
 * Phase 3.2: Owner Override
 * 
 * Allows owner to force send a blocked message with explicit reason logged.
 * Used for owner override of anti-poaching blocks.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserSafe } from "@/lib/auth-helpers";
import { getOrgIdFromContext } from "@/lib/messaging/org-helpers";
import { TwilioProvider } from "@/lib/messaging/providers/twilio";
import { ensureThreadSession } from "@/lib/messaging/session-helpers";
import { env } from "@/lib/env";

const twilioProvider = new TwilioProvider();

/**
 * POST /api/messages/events/[id]/force-send
 * 
 * Force send a blocked message with owner override.
 * Body: { reason: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user (owner only)
    const currentUser = await getCurrentUserSafe(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Phase 3.1: Verify user is owner (not sitter)
    // Sitters cannot force send blocked messages
    if (currentUser.sitterId) {
      return NextResponse.json(
        { error: "Forbidden: Only owners can force send blocked messages" },
        { status: 403 }
      );
    }

    // Get orgId from context
    const orgId = await getOrgIdFromContext(currentUser.id);

    const { id: eventId } = await params;
    const body = await request.json();
    const { reason } = body;

    // Validate required fields
    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: "Missing required field: reason is required for force send" },
        { status: 400 }
      );
    }

    // Find the blocked message event
    const blockedEvent = await prisma.messageEvent.findUnique({
      where: { id: eventId },
      include: {
        thread: {
          include: {
            participants: true,
            messageNumber: true,
          },
        },
        AntiPoachingAttempt: true,
      },
    });

    if (!blockedEvent) {
      return NextResponse.json(
        { error: "Message event not found" },
        { status: 404 }
      );
    }

    // Verify org isolation
    if (blockedEvent.orgId !== orgId) {
      return NextResponse.json(
        { error: "Unauthorized: Event belongs to different organization" },
        { status: 403 }
      );
    }

    // Verify message was blocked
    const metadata = blockedEvent.metadataJson ? JSON.parse(blockedEvent.metadataJson) : {};
    if (!metadata.wasBlocked || !metadata.antiPoachingFlagged) {
      return NextResponse.json(
        { error: "Message was not blocked. Cannot force send non-blocked message." },
        { status: 400 }
      );
    }

    // Find client participant
    const clientParticipant = blockedEvent.thread.participants.find(p => p.role === 'client');
    if (!clientParticipant) {
      return NextResponse.json(
        { error: "No client participant found in thread" },
        { status: 400 }
      );
    }

    // Ensure thread has provider session
    await ensureThreadSession(blockedEvent.thread.id, twilioProvider, clientParticipant.realE164);

    // Send the message
    let sendResult;
    let messageSid: string | null = null;

    if (blockedEvent.thread.providerSessionSid) {
      // Send via Proxy if session exists
      const ownerParticipant = blockedEvent.thread.participants.find(
        p => p.role === 'owner' && p.userId === currentUser.id
      );

      if (ownerParticipant?.providerParticipantSid) {
        sendResult = await twilioProvider.sendViaProxy({
          sessionSid: blockedEvent.thread.providerSessionSid,
          fromParticipantSid: ownerParticipant.providerParticipantSid,
          body: blockedEvent.body,
        });
        messageSid = sendResult.interactionSid || null;
      }
    } else {
      // Fallback to direct send
      // Note: fromNumberSid is optional - Twilio provider will use default if not provided
      sendResult = await twilioProvider.sendMessage({
        to: clientParticipant.realE164,
        body: blockedEvent.body,
      });
      messageSid = sendResult.messageSid || null;
    }

    // Update the blocked event to mark as force-sent
    await prisma.messageEvent.update({
      where: { id: eventId },
      data: {
        deliveryStatus: 'sent',
        providerMessageSid: messageSid,
        metadataJson: JSON.stringify({
          ...metadata,
          wasBlocked: false, // Override flag
          forceSent: true,
          forceSentBy: currentUser.id,
          forceSentReason: reason,
          forceSentAt: new Date().toISOString(),
        }),
      },
    });

    // Update AntiPoachingAttempt if exists
    if (blockedEvent.AntiPoachingAttempt) {
      await prisma.antiPoachingAttempt.update({
        where: { id: blockedEvent.AntiPoachingAttempt.id },
        data: {
          action: 'warned', // Changed from 'blocked' to 'warned'
          resolvedAt: new Date(),
          resolvedByUserId: currentUser.id,
        },
      });
    }

    // Log audit event
    const { logEvent } = await import('@/lib/event-logger');
    await logEvent('messaging.antiPoachingForceSent', 'success', {
      threadId: blockedEvent.threadId,
      forceSentBy: currentUser.id,
      reason,
      eventId, // Store in metadata
    } as any);

    return NextResponse.json({
      success: true,
      messageSid,
      eventId,
    });
  } catch (error) {
    console.error("[messages/events/force-send] Error:", error);
    return NextResponse.json(
      { error: "Failed to force send message" },
      { status: 500 }
    );
  }
}
