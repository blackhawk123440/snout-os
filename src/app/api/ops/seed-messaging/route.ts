/**
 * Ops Seed Messaging Data Endpoint
 * 
 * POST /api/ops/seed-messaging
 * Creates deterministic demo data that guarantees visible features.
 * 
 * Gated by: ENABLE_OPS_SEED=true AND owner role
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserSafe } from "@/lib/auth-helpers";
import { getOrgIdFromContext } from "@/lib/messaging/org-helpers";
import { env } from "@/lib/env";

export async function POST(request: NextRequest) {
  try {
    // Gate: Only allow if ENABLE_OPS_SEED is true
    if (process.env.ENABLE_OPS_SEED !== 'true' && process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: "Ops seed not enabled. Set ENABLE_OPS_SEED=true to enable." },
        { status: 403 }
      );
    }

    const currentUser = await getCurrentUserSafe(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify user is owner (check if they have sitterId - if yes, they're a sitter)
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { sitterId: true },
    });

    if (user?.sitterId) {
      return NextResponse.json(
        { error: "Only owners can seed demo data" },
        { status: 403 }
      );
    }

    const orgId = await getOrgIdFromContext(currentUser.id);

    // Get or create org
    let org = await prisma.organization.findFirst({
      where: { id: orgId },
    });
    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Get or create front desk number
    let frontDeskNumber = await prisma.messageNumber.findFirst({
      where: {
        orgId: org.id,
        numberClass: 'front_desk',
      },
    });

    if (!frontDeskNumber) {
      frontDeskNumber = await prisma.messageNumber.create({
        data: {
          orgId: org.id,
          numberClass: 'front_desk',
          e164: '+12562039373',
          provider: 'twilio',
          providerNumberSid: 'test-front-desk-sid',
          status: 'active',
        },
      });
    }

    // Get or create clients
    const client1 = await prisma.client.upsert({
      where: {
        id: `client-1-${org.id}`,
      },
      update: {},
      create: {
        id: `client-1-${org.id}`,
        orgId: org.id,
        firstName: 'John',
        lastName: 'Smith',
        phone: '+15551234567',
      },
    });

    const client2 = await prisma.client.upsert({
      where: {
        id: `client-2-${org.id}`,
      },
      update: {},
      create: {
        id: `client-2-${org.id}`,
        orgId: org.id,
        firstName: 'Jane',
        lastName: 'Doe',
        phone: '+15559876543',
      },
    });

    // Get or create sitter
    let sitter = await prisma.sitter.findFirst({
      where: { orgId: org.id },
    });
    if (!sitter) {
      sitter = await prisma.sitter.create({
        data: {
          orgId: org.id,
          firstName: 'Demo',
          lastName: 'Sitter',
          email: 'sitter@example.com',
          phone: '+15551111111',
        },
      });
    }

    // Get or create booking
    let booking = await prisma.booking.findFirst({
      where: { orgId: org.id, sitterId: sitter.id },
    });
    if (!booking) {
      booking = await prisma.booking.create({
        data: {
          orgId: org.id,
          clientId: client1.id,
          sitterId: sitter.id,
          status: 'confirmed',
          startDate: new Date(),
          endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    }

    // THREAD A: Failed delivery + unread + active window
    let threadA = await prisma.messageThread.findFirst({
      where: {
        orgId: org.id,
        clientId: client1.id,
      },
    });
    if (!threadA) {
      threadA = await prisma.messageThread.create({
        data: {
          orgId: org.id,
          clientId: client1.id,
          scope: 'client_general',
          messageNumberId: frontDeskNumber.id,
          threadType: 'assignment',
          status: 'open',
          ownerUnreadCount: 2,
          lastMessageAt: new Date(),
          assignedSitterId: sitter.id,
          participants: {
            create: {
              orgId: org.id,
              role: 'client',
              realE164: '+15551234567',
              displayName: 'John Smith',
              clientId: client1.id,
            },
          },
        },
      });
    } else {
      // Update existing thread
      threadA = await prisma.messageThread.update({
        where: { id: threadA.id },
        data: {
          ownerUnreadCount: 2,
          lastMessageAt: new Date(),
          assignedSitterId: sitter.id,
        },
      });
    }

    // Create active assignment window for thread A
    const windowStart = new Date();
    const windowEnd = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
    let windowA = await prisma.assignmentWindow.findFirst({
      where: {
        orgId: org.id,
        threadId: threadA.id,
        sitterId: sitter.id,
      },
    });
    if (!windowA) {
      windowA = await prisma.assignmentWindow.create({
        data: {
          orgId: org.id,
          threadId: threadA.id,
          bookingId: booking.id,
          sitterId: sitter.id,
          startAt: windowStart,
          endAt: windowEnd,
          status: 'active',
        },
      });
    } else {
      windowA = await prisma.assignmentWindow.update({
        where: { id: windowA.id },
        data: {
          startAt: windowStart,
          endAt: windowEnd,
          status: 'active',
        },
      });
    }

    // Create messages for thread A (only if they don't exist)
    const existingMsgs = await prisma.messageEvent.findMany({
      where: { threadId: threadA.id },
    });
    if (existingMsgs.length === 0) {
      await prisma.messageEvent.createMany({
        data: [
          {
            orgId: org.id,
            threadId: threadA.id,
            direction: 'inbound',
            actorType: 'client',
            actorClientId: client1.id,
            body: 'Hello, when will you arrive?',
            providerMessageSid: 'msg-a-1',
            deliveryStatus: 'delivered',
            createdAt: new Date(Date.now() - 3600000),
          },
          {
            orgId: org.id,
            threadId: threadA.id,
            direction: 'outbound',
            actorType: 'owner',
            body: 'We\'ll be there at 2 PM.',
            providerMessageSid: 'msg-a-2',
            deliveryStatus: 'delivered',
            createdAt: new Date(Date.now() - 1800000),
          },
          // FAILED DELIVERY MESSAGE (Retry button will be visible)
          {
            orgId: org.id,
            threadId: threadA.id,
            direction: 'outbound',
            actorType: 'owner',
            body: 'This message failed to deliver',
            providerMessageSid: 'msg-a-3-failed',
            deliveryStatus: 'failed',
            failureCode: '30008',
            failureDetail: 'Unknown destination number',
            providerErrorCode: '30008',
            providerErrorMessage: 'Unknown destination number',
            attemptCount: 1,
            lastAttemptAt: new Date(Date.now() - 600000),
            createdAt: new Date(Date.now() - 600000),
          },
        ],
      });
    }

    // THREAD B: Policy violation + unread
    let threadB = await prisma.messageThread.findFirst({
      where: {
        orgId: org.id,
        clientId: client2.id,
      },
    });
    if (!threadB) {
      threadB = await prisma.messageThread.create({
        data: {
          orgId: org.id,
          clientId: client2.id,
          scope: 'client_general',
          messageNumberId: frontDeskNumber.id,
          threadType: 'front_desk',
          status: 'open',
          ownerUnreadCount: 1,
          lastMessageAt: new Date(),
          participants: {
            create: {
              orgId: org.id,
              role: 'client',
              realE164: '+15559876543',
              displayName: 'Jane Doe',
              clientId: client2.id,
            },
          },
        },
      });
    } else {
      threadB = await prisma.messageThread.update({
        where: { id: threadB.id },
        data: {
          ownerUnreadCount: 1,
          lastMessageAt: new Date(),
        },
      });
    }

    // Create message with policy violation for thread B (only if it doesn't exist)
    let policyMessage = await prisma.messageEvent.findFirst({
      where: {
        threadId: threadB.id,
        providerMessageSid: 'msg-b-1',
      },
    });
    if (!policyMessage) {
      policyMessage = await prisma.messageEvent.create({
        data: {
          orgId: org.id,
          threadId: threadB.id,
          direction: 'inbound',
          actorType: 'client',
          actorClientId: client2.id,
          body: 'Call me at 555-123-4567 for more info', // Contains phone number - policy violation
          providerMessageSid: 'msg-b-1',
          deliveryStatus: 'delivered',
          metadataJson: JSON.stringify({
            wasBlocked: true,
            redactedContent: 'Call me at [REDACTED] for more info',
            antiPoachingFlagged: true,
          }),
          createdAt: new Date(Date.now() - 300000),
        },
      });

      // Create AntiPoachingAttempt record (policy violation)
      await prisma.antiPoachingAttempt.create({
        data: {
          orgId: org.id,
          threadId: threadB.id,
          eventId: policyMessage.id,
          actorType: 'client',
          violationType: 'phone_number_detected',
          detectedContent: '555-123-4567',
          action: 'redacted',
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Demo data created successfully",
      threads: {
        threadA: {
          id: threadA.id,
          features: ['failed_delivery', 'unread', 'active_window'],
        },
        threadB: {
          id: threadB.id,
          features: ['policy_violation', 'unread'],
        },
      },
    });
  } catch (error: any) {
    console.error("[api/ops/seed-messaging] Error:", error);
    return NextResponse.json(
      { error: "Failed to seed data", details: error.message },
      { status: 500 }
    );
  }
}
