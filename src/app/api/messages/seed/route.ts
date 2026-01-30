/**
 * Seed Messaging Data API Route
 * 
 * Dev-only endpoint to seed messaging data for local development.
 * POST /api/messages/seed
 * 
 * NOTE: This route requires messaging schema models that may not exist
 * in the root Prisma schema. It's only functional when using the
 * enterprise-messaging-dashboard schema.
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // Return early if messaging schema is not available
  // This prevents TypeScript errors during build
  return NextResponse.json(
    { 
      error: "Messaging seed endpoint is not available in this build. Use the messaging dashboard API instead.",
      available: false 
    },
    { status: 503 }
  );

  // The code below is unreachable but kept for reference
  // It requires messaging schema models (Organization, MessageThread, etc.)
  // that exist in enterprise-messaging-dashboard/apps/api/prisma/schema.prisma
  /*
  import { prisma } from "@/lib/db";
  import { getCurrentUserSafe } from "@/lib/auth-helpers";
  import { getOrgIdFromContext } from "@/lib/messaging/org-helpers";

  // Only allow in development OR if ALLOW_DEV_SEED=true
  const allowSeed = 
    process.env.NODE_ENV === 'development' || 
    process.env.ALLOW_DEV_SEED === 'true';

  if (!allowSeed) {
    return NextResponse.json(
      { error: "This endpoint is only available in development or when ALLOW_DEV_SEED=true" },
      { status: 403 }
    );
  }

  try {
    // Authenticate user
    const currentUser = await getCurrentUserSafe(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only allow owners to seed
    if (currentUser.role !== 'owner') {
      return NextResponse.json(
        { error: "Only owners can seed data" },
        { status: 403 }
      );
    }

    // Get orgId
    const orgId = await getOrgIdFromContext(currentUser.id);

    // Check if threads already exist
    const existingThreads = await prisma.messageThread.count({
      where: { orgId },
    });

    if (existingThreads > 0) {
      return NextResponse.json({
        success: false,
        message: `Database already has ${existingThreads} threads. Use the manual seed command if you want to add more.`,
      });
    }

    // ... rest of seed logic ...
  } catch (error) {
    console.error('[api/messages/seed] Error:', error);
    return NextResponse.json(
      { error: "Failed to seed data", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
  */
}
  // Only allow in development OR if ALLOW_DEV_SEED=true
  const allowSeed = 
    process.env.NODE_ENV === 'development' || 
    process.env.ALLOW_DEV_SEED === 'true';

  if (!allowSeed) {
    return NextResponse.json(
      { error: "This endpoint is only available in development or when ALLOW_DEV_SEED=true" },
      { status: 403 }
    );
  }

  try {
    // Authenticate user
    const currentUser = await getCurrentUserSafe(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only allow owners to seed
    if (currentUser.role !== 'owner') {
      return NextResponse.json(
        { error: "Only owners can seed data" },
        { status: 403 }
      );
    }

    // Get orgId
    const orgId = await getOrgIdFromContext(currentUser.id);

    // Check if threads already exist
    const existingThreads = await prisma.messageThread.count({
      where: { orgId },
    });

    if (existingThreads > 0) {
      return NextResponse.json({
        success: false,
        message: `Database already has ${existingThreads} threads. Use the manual seed command if you want to add more.`,
      });
    }

    // Get or create org
    let org = await prisma.organization.findFirst({
      where: { id: orgId },
    });

    if (!org) {
      org = await prisma.organization.create({
        data: {
          id: orgId,
          name: 'Demo Pet Care Business',
        },
      });
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
        orgId_name: {
          orgId: org.id,
          name: 'John Smith',
        },
      },
      update: {},
      create: {
        orgId: org.id,
        name: 'John Smith',
        contacts: {
          create: {
            e164: '+15551234567',
            label: 'Mobile',
            verified: true,
          },
        },
      },
    });

    const client2 = await prisma.client.upsert({
      where: {
        orgId_name: {
          orgId: org.id,
          name: 'Jane Doe',
        },
      },
      update: {},
      create: {
        orgId: org.id,
        name: 'Jane Doe',
        contacts: {
          create: {
            e164: '+15559876543',
            label: 'Mobile',
            verified: true,
          },
        },
      },
    });

    // Create threads
    const thread1 = await prisma.messageThread.create({
      data: {
        orgId: org.id,
        clientId: client1.id,
        scope: 'client_general',
        messageNumberId: frontDeskNumber.id,
        numberClass: 'front_desk',
        status: 'open',
        isOneTimeClient: false,
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

    const thread2 = await prisma.messageThread.create({
      data: {
        orgId: org.id,
        clientId: client2.id,
        scope: 'client_general',
        messageNumberId: frontDeskNumber.id,
        numberClass: 'front_desk',
        status: 'open',
        isOneTimeClient: false,
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

    // Create messages for thread1
    const now = new Date();
    const msg1 = await prisma.messageEvent.create({
      data: {
        orgId: org.id,
        threadId: thread1.id,
        direction: 'inbound',
        actorType: 'client',
        body: 'Hello, when will you arrive?',
        providerMessageSid: 'mock-msg-1',
        deliveryStatus: 'delivered',
      },
    });

    const msg2 = await prisma.messageEvent.create({
      data: {
        orgId: org.id,
        threadId: thread1.id,
        direction: 'outbound',
        actorType: 'owner',
        body: 'Hi John! We\'ll be there at 2 PM.',
        providerMessageSid: 'mock-msg-2',
        deliveryStatus: 'delivered',
      },
    });

    const msg3 = await prisma.messageEvent.create({
      data: {
        orgId: org.id,
        threadId: thread1.id,
        direction: 'inbound',
        actorType: 'client',
        body: 'Perfect, thank you!',
        providerMessageSid: 'mock-msg-3',
        deliveryStatus: 'delivered',
      },
    });

    // Create a failed delivery message
    const msg4 = await prisma.messageEvent.create({
      data: {
        orgId: org.id,
        threadId: thread1.id,
        direction: 'outbound',
        actorType: 'owner',
        body: 'This message failed to deliver',
        providerMessageSid: 'mock-msg-4',
        deliveryStatus: 'failed',
        failureCode: '30008',
        failureDetail: 'Unknown destination number',
      },
    });

    // Create messages for thread2
    const msg5 = await prisma.messageEvent.create({
      data: {
        orgId: org.id,
        threadId: thread2.id,
        direction: 'inbound',
        actorType: 'client',
        body: 'This message routes to owner inbox',
        providerMessageSid: 'mock-msg-5',
        deliveryStatus: 'delivered',
      },
    });

    // Update thread timestamps
    await prisma.messageThread.update({
      where: { id: thread1.id },
      data: {
        lastInboundAt: msg3.createdAt,
        lastOutboundAt: msg2.createdAt,
        lastMessageAt: msg3.createdAt,
        ownerUnreadCount: 1,
      },
    });

    await prisma.messageThread.update({
      where: { id: thread2.id },
      data: {
        lastInboundAt: msg5.createdAt,
        lastMessageAt: msg5.createdAt,
        ownerUnreadCount: 1,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Demo data created successfully',
      threads: 2,
      messages: 5,
    });
  } catch (error) {
    console.error('[api/messages/seed] Error:', error);
    return NextResponse.json(
      { error: "Failed to seed data", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
