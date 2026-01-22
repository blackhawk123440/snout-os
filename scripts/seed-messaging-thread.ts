/**
 * Seed Messaging Thread - Local Dev Only
 * 
 * Creates a test thread with participants and messages for local development.
 * Run with: npx tsx scripts/seed-messaging-thread.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedMessagingThread() {
  try {
    console.log('🌱 Seeding messaging thread...');

    // Get or create org (using default org for now)
    const orgId = 'default';

    // Get or create front desk number
    let frontDeskNumber = await prisma.messageNumber.findFirst({
      where: {
        orgId,
        numberClass: 'front_desk',
      },
    });

    if (!frontDeskNumber) {
      console.log('Creating front desk number...');
      frontDeskNumber = await prisma.messageNumber.create({
        data: {
          orgId,
          numberClass: 'front_desk',
          e164: '+12562039373', // Your Twilio number
          provider: 'twilio',
          providerNumberSid: 'test-front-desk-sid',
          isActive: true,
        },
      });
    }

    // Create test client participant
    const clientPhone = '+15551234567';
    const clientParticipant = await prisma.messageParticipant.upsert({
      where: {
        orgId_realE164_role: {
          orgId,
          realE164: clientPhone,
          role: 'client',
        },
      },
      create: {
        orgId,
        realE164: clientPhone,
        role: 'client',
        displayName: 'Test Client',
      },
      update: {},
    });

    // Create thread
    const thread = await prisma.messageThread.create({
      data: {
        orgId,
        scope: 'client',
        messageNumberId: frontDeskNumber.id,
        numberClass: 'front_desk',
        status: 'open',
        isOneTimeClient: true,
        isMeetAndGreet: false,
      },
    });

    // Link client participant to thread
    await prisma.messageParticipant.update({
      where: { id: clientParticipant.id },
      data: {
        threadId: thread.id,
      },
    });

    // Create inbound message event
    const inboundEvent = await prisma.messageEvent.create({
      data: {
        orgId,
        threadId: thread.id,
        direction: 'inbound',
        actorType: 'client',
        content: 'Hello, this is a test message from the client.',
        providerMessageId: 'test-inbound-msg-1',
        providerStatus: 'delivered',
        responsibleSitterIdSnapshot: null,
      },
    });

    // Create outbound message event
    const outboundEvent = await prisma.messageEvent.create({
      data: {
        orgId,
        threadId: thread.id,
        direction: 'outbound',
        actorType: 'owner',
        content: 'Hi! Thanks for reaching out. How can I help you today?',
        providerMessageId: 'test-outbound-msg-1',
        providerStatus: 'delivered',
        responsibleSitterIdSnapshot: null,
      },
    });

    // Update thread timestamps
    await prisma.messageThread.update({
      where: { id: thread.id },
      data: {
        lastInboundAt: inboundEvent.createdAt,
        lastOutboundAt: outboundEvent.createdAt,
        lastMessageAt: outboundEvent.createdAt,
      },
    });

    console.log('✅ Seeding complete!');
    console.log('');
    console.log('Created:');
    console.log(`  Thread ID: ${thread.id}`);
    console.log(`  Client: ${clientPhone}`);
    console.log(`  Inbound message: ${inboundEvent.id}`);
    console.log(`  Outbound message: ${outboundEvent.id}`);
    console.log('');
    console.log('Refresh /messages to see the thread.');

  } catch (error) {
    console.error('❌ Error seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedMessagingThread();
