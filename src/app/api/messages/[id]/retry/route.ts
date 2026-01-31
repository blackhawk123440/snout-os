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

    // Find message and verify it belongs to org
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        thread: {
          select: { id: true, orgId: true, messageNumberId: true },
          include: {
            participants: {
              where: { role: 'client' },
              take: 1,
            },
            messageNumber: {
              select: { e164: true, providerNumberSid: true },
            },
          },
        },
        deliveries: {
          orderBy: { attemptNo: 'desc' },
          take: 1,
        },
      },
    });

    if (!message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    if (message.orgId !== orgId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Only retry failed outbound messages
    if (message.direction !== 'outbound') {
      return NextResponse.json(
        { error: "Can only retry outbound messages" },
        { status: 400 }
      );
    }

    const latestDelivery = message.deliveries[0];
    if (!latestDelivery || latestDelivery.status !== 'failed') {
      return NextResponse.json(
        { error: "Message does not have a failed delivery to retry" },
        { status: 400 }
      );
    }

    // Get client participant for sending
    const clientParticipant = message.thread.participants[0];
    if (!clientParticipant) {
      return NextResponse.json(
        { error: "No client participant found" },
        { status: 400 }
      );
    }

    // Create new delivery attempt
    const newAttemptNo = latestDelivery.attemptNo + 1;

    // Send message via provider
    let sendResult;
    try {
      if (message.thread.messageNumber?.providerNumberSid) {
        sendResult = await twilioProvider.sendMessage({
          to: clientParticipant.realE164 || clientParticipant.displayName,
          from: message.thread.messageNumber.e164,
          body: message.body,
        });
      } else {
        return NextResponse.json(
          { error: "Thread does not have a valid message number" },
          { status: 400 }
        );
      }
    } catch (error: any) {
      // Create failed delivery record
      await prisma.messageDelivery.create({
        data: {
          messageId: message.id,
          attemptNo: newAttemptNo,
          status: 'failed',
          providerErrorCode: error.code || 'UNKNOWN',
          providerErrorMessage: error.message || 'Failed to send message',
        },
      });

      return NextResponse.json(
        { error: "Failed to retry message", details: error.message },
        { status: 500 }
      );
    }

    // Create successful delivery record
    const newDelivery = await prisma.messageDelivery.create({
      data: {
        messageId: message.id,
        attemptNo: newAttemptNo,
        status: 'sent',
        providerErrorCode: null,
        providerErrorMessage: null,
      },
    });

    // Update message provider SID if this is the first successful attempt
    if (!message.providerMessageSid && sendResult.messageSid) {
      await prisma.message.update({
        where: { id: message.id },
        data: { providerMessageSid: sendResult.messageSid },
      });
    }

    return NextResponse.json({
      success: true,
      attemptNo: newAttemptNo,
      deliveryId: newDelivery.id,
    });
  } catch (error) {
    console.error("[messages/[id]/retry] Error:", error);
    return NextResponse.json(
      { error: "Failed to retry message" },
      { status: 500 }
    );
  }
}
