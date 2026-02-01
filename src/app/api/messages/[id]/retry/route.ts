/**
 * Retry Message Delivery Endpoint
 * 
 * POST /api/messages/[id]/retry
 * Retries a failed message delivery.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserSafe } from "@/lib/auth-helpers";
import { getOrgIdFromContext } from "@/lib/messaging/org-helpers";
import { env } from "@/lib/env";
import { TwilioProvider } from "@/lib/messaging/providers/twilio";

const twilioProvider = new TwilioProvider();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: messageId } = await params;
  
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

    // Find MessageEvent and verify it belongs to org
    const messageEvent = await prisma.messageEvent.findUnique({
      where: { id: messageId },
      include: {
        thread: {
          include: {
            participants: {
              where: { role: 'client' },
              take: 1,
            },
            messageNumber: {
              select: {
                e164: true,
                providerNumberSid: true,
              },
            },
          },
        },
      },
    });

    if (!messageEvent) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    if (messageEvent.orgId !== orgId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Only retry failed outbound messages
    if (messageEvent.direction !== 'outbound') {
      return NextResponse.json(
        { error: "Can only retry outbound messages" },
        { status: 400 }
      );
    }

    if (messageEvent.deliveryStatus !== 'failed') {
      return NextResponse.json(
        { error: "Message does not have a failed delivery to retry" },
        { status: 400 }
      );
    }

    // Get client participant for sending
    const clientParticipant = messageEvent.thread.participants[0];
    if (!clientParticipant) {
      return NextResponse.json(
        { error: "No client participant found" },
        { status: 400 }
      );
    }

    // Calculate new attempt number
    const newAttemptNo = (messageEvent.attemptCount || 1) + 1;

    // Send message via provider
    let sendResult;
    try {
      if (messageEvent.thread.messageNumber?.providerNumberSid) {
        sendResult = await twilioProvider.sendMessage({
          to: clientParticipant.realE164 || clientParticipant.displayName,
          from: messageEvent.thread.messageNumber.e164,
          body: messageEvent.body,
        });
      } else {
        return NextResponse.json(
          { error: "Thread does not have a valid message number" },
          { status: 400 }
        );
      }
    } catch (error: any) {
      // Update MessageEvent with failed retry attempt
      await prisma.messageEvent.update({
        where: { id: messageEvent.id },
        data: {
          attemptCount: newAttemptNo,
          lastAttemptAt: new Date(),
          deliveryStatus: 'failed',
          providerErrorCode: error.code || 'UNKNOWN',
          providerErrorMessage: error.message || 'Failed to send message',
          failureCode: error.code || 'UNKNOWN',
          failureDetail: error.message || 'Failed to send message',
        },
      });

      return NextResponse.json(
        { error: "Failed to retry message", details: error.message },
        { status: 500 }
      );
    }

    // Update MessageEvent with successful retry
    await prisma.messageEvent.update({
      where: { id: messageEvent.id },
      data: {
        attemptCount: newAttemptNo,
        lastAttemptAt: new Date(),
        deliveryStatus: 'sent',
        providerErrorCode: null,
        providerErrorMessage: null,
        failureCode: null,
        failureDetail: null,
        // Update provider SID if this is the first successful attempt
        providerMessageSid: messageEvent.providerMessageSid || sendResult.messageSid || null,
      },
    });

    return NextResponse.json({
      success: true,
      attemptNo: newAttemptNo,
      messageId: messageEvent.id,
    });
  } catch (error) {
    console.error("[messages/[id]/retry] Error:", error);
    return NextResponse.json(
      { error: "Failed to retry message" },
      { status: 500 }
    );
  }
}
