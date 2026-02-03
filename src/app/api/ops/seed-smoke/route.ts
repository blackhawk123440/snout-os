/**
 * Smoke Test Seed Endpoint
 * 
 * POST /api/ops/seed-smoke
 * Creates guaranteed test data for smoke tests:
 * - Thread A: unread + failed delivery (retry visible) + active assignment window
 * - Thread B: unread + policy violation banner
 * - Pool numbers that can be exhausted deterministically
 * 
 * Gated by: ENABLE_OPS_SEED=true AND owner auth
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserSafe } from "@/lib/auth-helpers";
import { getOrgIdFromContext } from "@/lib/messaging/org-helpers";

export async function POST(request: NextRequest) {
  try {
    // Gate: Only allow if ENABLE_OPS_SEED is true
    if (process.env.ENABLE_OPS_SEED !== 'true') {
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

    // Verify user is owner
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { sitterId: true },
    });

    if (user?.sitterId) {
      return NextResponse.json(
        { error: "Only owners can seed smoke test data" },
        { status: 403 }
      );
    }

    const orgId = await getOrgIdFromContext(currentUser.id);

    // Get or create front desk number
    let frontDeskNumber = await prisma.messageNumber.findFirst({
      where: {
        orgId,
        numberClass: 'front_desk',
      },
    });

    if (!frontDeskNumber) {
      frontDeskNumber = await prisma.messageNumber.create({
        data: {
          orgId,
          numberClass: 'front_desk',
          e164: '+15550000001',
          provider: 'twilio',
          providerNumberSid: 'test-front-desk-smoke',
          status: 'active',
        },
      });
    }

    // Create pool numbers (at least 2 for exhaustion testing)
    const poolNumbers = [];
    for (let i = 1; i <= 3; i++) {
      const e164 = `+15550000${100 + i}`;
      const existing = await prisma.messageNumber.findFirst({
        where: {
          orgId,
          e164,
        },
      });
      
      const poolNumber = existing
        ? await prisma.messageNumber.update({
            where: { id: existing.id },
            data: {
              status: 'active',
              numberClass: 'pool',
            },
          })
        : await prisma.messageNumber.create({
            data: {
              orgId,
              numberClass: 'pool',
              e164,
              provider: 'twilio',
              providerNumberSid: `test-pool-${i}-smoke`,
              status: 'active',
            },
          });
      poolNumbers.push(poolNumber);
    }

    // Get or create clients
    const client1 = await prisma.client.upsert({
      where: {
        id: `smoke-client-1-${orgId}`,
      },
      update: {},
      create: {
        id: `smoke-client-1-${orgId}`,
        firstName: 'Smoke',
        lastName: 'Client1',
        phone: '+15551111111',
      },
    });

    const client2 = await prisma.client.upsert({
      where: {
        id: `smoke-client-2-${orgId}`,
      },
      update: {},
      create: {
        id: `smoke-client-2-${orgId}`,
        firstName: 'Smoke',
        lastName: 'Client2',
        phone: '+15552222222',
      },
    });

    // Get or create sitter
    let sitter = await prisma.sitter.findFirst({
      where: {},
    });
    if (!sitter) {
      sitter = await prisma.sitter.create({
        data: {
          firstName: 'Smoke',
          lastName: 'Sitter',
          email: 'smoke-sitter@example.com',
          phone: '+15553333333',
        },
      });
    }

    // Get or create booking
    let booking = await prisma.booking.findFirst({
      where: { sitterId: sitter.id },
    });
    if (!booking) {
      booking = await prisma.booking.create({
        data: {
          firstName: client1.firstName,
          lastName: client1.lastName,
          phone: client1.phone,
          service: 'Pet Sitting',
          startAt: new Date(),
          endAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          totalPrice: 100.0,
          status: 'confirmed',
        },
      });
    }

    // THREAD A: Failed delivery + unread + active window
    let threadA = await prisma.messageThread.findFirst({
      where: {
        orgId,
        clientId: client1.id,
      },
    });

    if (!threadA) {
      threadA = await prisma.messageThread.create({
        data: {
          orgId,
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
              orgId,
              role: 'client',
              realE164: client1.phone!,
              displayName: `${client1.firstName} ${client1.lastName}`,
              clientId: client1.id,
            },
          },
        },
      });
    } else {
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
    const windowEnd = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const existingWindow = await prisma.assignmentWindow.findFirst({
      where: {
        orgId,
        threadId: threadA.id,
        sitterId: sitter.id,
      },
    });
    
    if (existingWindow) {
      await prisma.assignmentWindow.update({
        where: { id: existingWindow.id },
        data: {
          startAt: windowStart,
          endAt: windowEnd,
          status: 'active',
        },
      });
    } else {
      await prisma.assignmentWindow.create({
        data: {
          orgId,
          threadId: threadA.id,
          bookingId: booking.id,
          sitterId: sitter.id,
          startAt: windowStart,
          endAt: windowEnd,
          status: 'active',
        },
      });
    }

    // Create messages for thread A (with failed delivery)
    const existingMsgsA = await prisma.messageEvent.findMany({
      where: { threadId: threadA.id },
    });
    if (existingMsgsA.length === 0) {
      await prisma.messageEvent.createMany({
        data: [
          {
            orgId,
            threadId: threadA.id,
            direction: 'inbound',
            actorType: 'client',
            actorClientId: client1.id,
            body: 'Hello, when will you arrive?',
            providerMessageSid: 'smoke-msg-a-1',
            deliveryStatus: 'delivered',
            createdAt: new Date(Date.now() - 3600000),
          },
          {
            orgId,
            threadId: threadA.id,
            direction: 'outbound',
            actorType: 'owner',
            body: 'We\'ll be there at 2 PM.',
            providerMessageSid: 'smoke-msg-a-2',
            deliveryStatus: 'delivered',
            createdAt: new Date(Date.now() - 1800000),
          },
          // FAILED DELIVERY MESSAGE (Retry button will be visible)
          {
            orgId,
            threadId: threadA.id,
            direction: 'outbound',
            actorType: 'owner',
            body: 'This message failed to deliver',
            providerMessageSid: 'smoke-msg-a-3-failed',
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
        orgId,
        clientId: client2.id,
      },
    });

    if (!threadB) {
      threadB = await prisma.messageThread.create({
        data: {
          orgId,
          clientId: client2.id,
          scope: 'client_general',
          messageNumberId: frontDeskNumber.id,
          threadType: 'front_desk',
          status: 'open',
          ownerUnreadCount: 1,
          lastMessageAt: new Date(),
          participants: {
            create: {
              orgId,
              role: 'client',
              realE164: client2.phone!,
              displayName: `${client2.firstName} ${client2.lastName}`,
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

    // Create message with policy violation for thread B
    let policyMessage = await prisma.messageEvent.findFirst({
      where: {
        threadId: threadB.id,
        providerMessageSid: 'smoke-msg-b-1',
      },
    });

    if (!policyMessage) {
      policyMessage = await prisma.messageEvent.create({
        data: {
          orgId,
          threadId: threadB.id,
          direction: 'inbound',
          actorType: 'client',
          actorClientId: client2.id,
          body: 'Call me at 555-123-4567 for more info',
          providerMessageSid: 'smoke-msg-b-1',
          deliveryStatus: 'delivered',
          metadataJson: JSON.stringify({
            wasBlocked: true,
            redactedContent: 'Call me at [REDACTED] for more info',
            antiPoachingFlagged: true,
          }),
          createdAt: new Date(Date.now() - 300000),
        },
      });

      // Create AntiPoachingAttempt record
      const existingAttempt = await prisma.antiPoachingAttempt.findFirst({
        where: {
          orgId,
          threadId: threadB.id,
          eventId: policyMessage.id,
        },
      });
      
      if (!existingAttempt) {
        await prisma.antiPoachingAttempt.create({
          data: {
            orgId,
            threadId: threadB.id,
            eventId: policyMessage.id,
            actorType: 'client',
            violationType: 'phone_number_detected',
            detectedContent: '555-123-4567',
            action: 'redacted',
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Smoke test data created successfully",
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
      poolNumbers: poolNumbers.map(n => ({ id: n.id, e164: n.e164 })),
    });
  } catch (error: any) {
    console.error("[api/ops/seed-smoke] Error:", error);
    return NextResponse.json(
      { error: "Failed to seed smoke test data", details: error.message },
      { status: 500 }
    );
  }
}
