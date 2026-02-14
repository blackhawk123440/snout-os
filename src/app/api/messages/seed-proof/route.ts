/**
 * API Route: Seed Messaging Proof Scenarios
 * 
 * Creates demo data for proof pack. Only available in dev/staging.
 * 
 * IMPORTANT: This endpoint must work in serverless environments (Render, Vercel).
 * It directly calls the seed logic rather than executing a script.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  // Only allow in dev/staging
  if (process.env.NODE_ENV === 'production' && !process.env.ENABLE_OPS_SEED) {
    return NextResponse.json(
      { error: 'Seed endpoint disabled in production' },
      { status: 403 }
    );
  }

  // Require owner authentication
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Check if user is owner
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== 'OWNER') {
    return NextResponse.json(
      { error: 'Owner access required' },
      { status: 403 }
    );
  }

  try {
    // Import and run seed logic directly (works in serverless)
    const seedResult = await seedMessagingProof();

    return NextResponse.json({
      success: true,
      message: 'Proof scenarios seeded successfully',
      summary: seedResult,
    });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json(
      {
        error: 'Failed to seed proof scenarios',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * Seed messaging proof scenarios
 * This is the same logic as scripts/seed-messaging-proof.ts but callable from API route
 */
async function seedMessagingProof() {
  console.log('🌱 Seeding messaging proof scenarios...');

  // Get or create org
  let org = await prisma.organization.findFirst({
    where: { name: 'Demo Pet Care Business' },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: { name: 'Demo Pet Care Business' },
    });
  }

  // Get owner user
  const owner = await prisma.user.findFirst({
    where: { email: 'leah2maria@gmail.com', orgId: org.id },
  });

  if (!owner) {
    throw new Error('Owner user not found. Please create owner user first.');
  }

  // Get or create sitter
  let sitter = await prisma.sitter.findFirst({
    where: { orgId: org.id },
  });

  if (!sitter) {
    sitter = await prisma.sitter.create({
      data: {
        orgId: org.id,
        firstName: 'Sarah',
        lastName: 'Johnson',
        phone: '+15551234567',
        email: 'sarah@example.com',
        active: true,
      },
    });
  }

  // Get or create clients
  const client1 = await prisma.client.findFirst({
    where: { orgId: org.id, name: 'Demo Client 1' },
  }) || await prisma.client.create({
    data: {
      orgId: org.id,
      name: 'Demo Client 1',
    },
  });

  const client2 = await prisma.client.findFirst({
    where: { orgId: org.id, name: 'Demo Client 2' },
  }) || await prisma.client.create({
    data: {
      orgId: org.id,
      name: 'Demo Client 2',
    },
  });

  const client3 = await prisma.client.findFirst({
    where: { orgId: org.id, name: 'Demo Client 3' },
  }) || await prisma.client.create({
    data: {
      orgId: org.id,
      name: 'Demo Client 3',
    },
  });

  // Get or create front desk number
  let frontDeskNumber = await prisma.messageNumber.findFirst({
    where: { orgId: org.id, numberClass: 'front_desk', status: 'active' },
  });

  if (!frontDeskNumber) {
    frontDeskNumber = await prisma.messageNumber.create({
      data: {
        orgId: org.id,
        e164: '+15559876543',
        numberClass: 'front_desk',
        status: 'active',
        provider: 'twilio',
        providerNumberSid: 'PN_DEMO_FRONT_DESK',
      },
    });
  }

  // Get or create pool number
  let poolNumber = await prisma.messageNumber.findFirst({
    where: { orgId: org.id, numberClass: 'pool', status: 'active' },
  });

  if (!poolNumber) {
    poolNumber = await prisma.messageNumber.create({
      data: {
        orgId: org.id,
        e164: '+15559876544',
        numberClass: 'pool',
        status: 'active',
        provider: 'twilio',
        providerNumberSid: 'PN_DEMO_POOL',
      },
    });
  }

  // Create quarantined number
  let quarantinedNumber = await prisma.messageNumber.findFirst({
    where: { orgId: org.id, status: 'quarantined' },
  });

  if (!quarantinedNumber) {
    quarantinedNumber = await prisma.messageNumber.create({
      data: {
        orgId: org.id,
        e164: '+15559876545',
        numberClass: 'pool',
        status: 'quarantined',
        provider: 'twilio',
        providerNumberSid: 'PN_DEMO_QUARANTINED',
      },
    });
  }

  // Scenario 1: Unread Thread
  let unreadThread = await prisma.messageThread.findFirst({
    where: { orgId: org.id, clientId: client1.id },
  });

  if (!unreadThread) {
    unreadThread = await prisma.messageThread.create({
      data: {
        orgId: org.id,
        scope: 'client_booking',
        clientId: client1.id,
        messageNumberId: poolNumber.id,
        numberClass: 'pool',
        status: 'open',
        ownerUnreadCount: 2,
        lastMessageAt: new Date(),
      },
    });

    await prisma.messageParticipant.create({
      data: {
        orgId: org.id,
        threadId: unreadThread.id,
        role: 'client',
        clientId: client1.id,
        displayName: 'Demo Client 1',
        realE164: '+15551234567',
      },
    });

    await prisma.messageParticipant.create({
      data: {
        orgId: org.id,
        threadId: unreadThread.id,
        role: 'owner',
        userId: owner.id,
        displayName: 'Owner',
        realE164: '+15559876543',
      },
    });

    await prisma.messageEvent.create({
      data: {
        orgId: org.id,
        threadId: unreadThread.id,
        direction: 'inbound',
        actorType: 'client',
        actorClientId: client1.id,
        body: 'Hello, I need help with my pet.',
        deliveryStatus: 'delivered',
        createdAt: new Date(Date.now() - 3600000),
      },
    });

    await prisma.messageEvent.create({
      data: {
        orgId: org.id,
        threadId: unreadThread.id,
        direction: 'inbound',
        actorType: 'client',
        actorClientId: client1.id,
        body: 'Can someone call me back?',
        deliveryStatus: 'delivered',
        createdAt: new Date(Date.now() - 1800000),
      },
    });
  } else {
    await prisma.messageThread.update({
      where: { id: unreadThread.id },
      data: { ownerUnreadCount: 2 },
    });
  }

  // Scenario 2: Failed Delivery Message
  let failedDeliveryThread = await prisma.messageThread.findFirst({
    where: { orgId: org.id, clientId: client2.id },
  });

  if (!failedDeliveryThread) {
    failedDeliveryThread = await prisma.messageThread.create({
      data: {
        orgId: org.id,
        scope: 'client_booking',
        clientId: client2.id,
        messageNumberId: frontDeskNumber.id,
        numberClass: 'front_desk',
        status: 'open',
        ownerUnreadCount: 0,
        lastMessageAt: new Date(),
      },
    });

    await prisma.messageParticipant.create({
      data: {
        orgId: org.id,
        threadId: failedDeliveryThread.id,
        role: 'client',
        clientId: client2.id,
        displayName: 'Demo Client 2',
        realE164: '+15551234568',
      },
    });

    await prisma.messageParticipant.create({
      data: {
        orgId: org.id,
        threadId: failedDeliveryThread.id,
        role: 'owner',
        userId: owner.id,
        displayName: 'Owner',
        realE164: '+15559876543',
      },
    });
  }

  const failedMessage = await prisma.messageEvent.create({
    data: {
      orgId: org.id,
      threadId: failedDeliveryThread.id,
      direction: 'outbound',
      actorType: 'owner',
      actorUserId: owner.id,
      body: 'This message failed to deliver',
      deliveryStatus: 'failed',
      failureCode: '21211',
      failureDetail: 'Invalid phone number',
      createdAt: new Date(Date.now() - 7200000),
    },
  });

  // Scenario 3: Policy Violation Message
  let policyViolationThread = await prisma.messageThread.findFirst({
    where: { orgId: org.id, clientId: client3.id },
  });

  if (!policyViolationThread) {
    policyViolationThread = await prisma.messageThread.create({
      data: {
        orgId: org.id,
        scope: 'client_booking',
        clientId: client3.id,
        messageNumberId: poolNumber.id,
        numberClass: 'pool',
        status: 'open',
        ownerUnreadCount: 1,
        lastMessageAt: new Date(),
      },
    });

    await prisma.messageParticipant.create({
      data: {
        orgId: org.id,
        threadId: policyViolationThread.id,
        role: 'client',
        clientId: client3.id,
        displayName: 'Demo Client 3',
        realE164: '+15551234569',
      },
    });

    await prisma.messageParticipant.create({
      data: {
        orgId: org.id,
        threadId: policyViolationThread.id,
        role: 'owner',
        userId: owner.id,
        displayName: 'Owner',
        realE164: '+15559876543',
      },
    });
  }

  const violationMessage = await prisma.messageEvent.create({
    data: {
      orgId: org.id,
      threadId: policyViolationThread.id,
      direction: 'inbound',
      actorType: 'client',
      actorClientId: client3.id,
      body: 'Call me at 555-123-4567 or email me at test@example.com',
      deliveryStatus: 'delivered',
      metadataJson: JSON.stringify({
        hasPolicyViolation: true,
        violationType: 'other',
        detectedSummary: 'Message contains phone number and email address',
        actionTaken: 'redacted',
        redactedBody: 'Call me at [REDACTED] or email me at [REDACTED]',
      }),
      createdAt: new Date(Date.now() - 5400000),
    },
  });

  // Scenario 4: Active Assignment Window
  const now = new Date();
  const startsAt = new Date(now.getTime() - 86400000);
  const endsAt = new Date(now.getTime() + 86400000);

  const existingWindow = await prisma.assignmentWindow.findFirst({
    where: {
      orgId: org.id,
      threadId: unreadThread.id,
      sitterId: sitter.id,
    },
  });

  if (!existingWindow) {
    await prisma.assignmentWindow.create({
      data: {
        orgId: org.id,
        threadId: unreadThread.id,
        sitterId: sitter.id,
        startsAt,
        endsAt,
        status: 'active',
      },
    });

    await prisma.messageThread.update({
      where: { id: unreadThread.id },
      data: { assignedSitterId: sitter.id },
    });
  } else {
    await prisma.assignmentWindow.update({
      where: { id: existingWindow.id },
      data: { startsAt, endsAt, status: 'active' },
    });
  }

  return {
    unreadThreadId: unreadThread.id,
    failedDeliveryThreadId: failedDeliveryThread.id,
    failedMessageId: failedMessage.id,
    policyViolationThreadId: policyViolationThread.id,
    violationMessageId: violationMessage.id,
    quarantinedNumberE164: quarantinedNumber.e164,
    sitterName: `${sitter.firstName} ${sitter.lastName}`,
  };
}
