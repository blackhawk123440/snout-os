import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Find or create organization
  let org = await prisma.organization.findFirst({
    where: { name: 'Demo Pet Care Business' },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'Demo Pet Care Business',
      },
    });
    console.log('✅ Created organization:', org.id);
  } else {
    console.log('✅ Using existing organization:', org.id);
  }

  // Find or create owner user
  let owner = await prisma.user.findUnique({
    where: { email: 'leah2maria@gmail.com' },
  });

  if (!owner) {
    const ownerPasswordHash = await bcrypt.hash('Saint214!', 10);
    owner = await prisma.user.create({
      data: {
        orgId: org.id,
        role: 'owner',
        name: 'Business Owner',
        email: 'leah2maria@gmail.com',
        passwordHash: ownerPasswordHash,
        active: true,
      },
    });
    console.log('✅ Created owner user:', owner.email);
  } else {
    // Update password if user exists
    const ownerPasswordHash = await bcrypt.hash('Saint214!', 10);
    owner = await prisma.user.update({
      where: { email: 'leah2maria@gmail.com' },
      data: { passwordHash: ownerPasswordHash },
    });
    console.log('✅ Updated owner user password:', owner.email);
  }

  // Create sitters first
  const sitter1 = await prisma.sitter.create({
    data: {
      orgId: org.id,
      name: 'Sarah Johnson',
      active: true,
    },
  });

  const sitter2 = await prisma.sitter.create({
    data: {
      orgId: org.id,
      name: 'Mike Chen',
      active: true,
    },
  });

  console.log('✅ Created sitters');

  // Find or create sitter user (linked to sitter1)
  let sitterUser = await prisma.user.findUnique({
    where: { email: 'sitter@example.com' },
  });

  if (!sitterUser) {
    const sitterPasswordHash = await bcrypt.hash('password', 10);
    sitterUser = await prisma.user.create({
      data: {
        orgId: org.id,
        role: 'sitter',
        name: 'Sarah Johnson',
        email: 'sitter@example.com',
        passwordHash: sitterPasswordHash,
        active: true,
      },
    });
    console.log('✅ Created sitter user:', sitterUser.email);
  } else {
    console.log('✅ Using existing sitter user:', sitterUser.email);
  }

  // Link sitter user to sitter record
  if (!sitter1.userId) {
    await prisma.sitter.update({
      where: { id: sitter1.id },
      data: { userId: sitterUser.id },
    });
  }

  // Create clients
  const client1 = await prisma.client.create({
    data: {
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

  const client2 = await prisma.client.create({
    data: {
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

  console.log('✅ Created clients');

  // Create numbers
  const frontDeskNumber = await prisma.messageNumber.create({
    data: {
      orgId: org.id,
      e164: '+15551111111',
      class: 'front_desk',
      status: 'active',
      providerType: 'mock',
      providerNumberSid: 'mock-sid-frontdesk',
      purchaseDate: new Date(),
    },
  });

  const sitterNumber1 = await prisma.messageNumber.create({
    data: {
      orgId: org.id,
      e164: '+15552222222',
      class: 'sitter',
      status: 'active',
      assignedSitterId: sitter1.id,
      providerType: 'mock',
      providerNumberSid: 'mock-sid-sitter1',
      purchaseDate: new Date(),
    },
  });

  const poolNumber1 = await prisma.messageNumber.create({
    data: {
      orgId: org.id,
      e164: '+15553333333',
      class: 'pool',
      status: 'active',
      providerType: 'mock',
      providerNumberSid: 'mock-sid-pool1',
      purchaseDate: new Date(),
    },
  });

  console.log('✅ Created numbers');

  // Create threads
  const thread1 = await prisma.thread.create({
    data: {
      orgId: org.id,
      clientId: client1.id,
      sitterId: sitter1.id,
      numberId: sitterNumber1.id,
      threadType: 'assignment',
      status: 'active',
      participants: {
        create: [
          { participantType: 'client', participantId: client1.id },
          { participantType: 'sitter', participantId: sitter1.id },
        ],
      },
    },
  });

  const thread2 = await prisma.thread.create({
    data: {
      orgId: org.id,
      clientId: client2.id,
      numberId: poolNumber1.id,
      threadType: 'pool',
      status: 'active',
      participants: {
        create: [{ participantType: 'client', participantId: client2.id }],
      },
    },
  });

  console.log('✅ Created threads');

  // Create assignment window (active now for testing)
  const startsAt = new Date();
  startsAt.setHours(startsAt.getHours() - 1); // Started 1 hour ago
  const endsAt = new Date();
  endsAt.setDate(endsAt.getDate() + 7); // 7 days from now

  await prisma.assignmentWindow.create({
    data: {
      orgId: org.id,
      threadId: thread1.id,
      sitterId: sitter1.id,
      startsAt,
      endsAt,
    },
  });

  console.log('✅ Created assignment window');

  // Create sample messages
  await prisma.message.create({
    data: {
      orgId: org.id,
      threadId: thread1.id,
      direction: 'inbound',
      senderType: 'client',
      senderId: client1.id,
      body: 'Hello, when will you arrive?',
      providerMessageSid: 'mock-msg-1',
      deliveries: {
        create: {
          attemptNo: 1,
          status: 'delivered',
        },
      },
    },
  });

  console.log('✅ Created sample messages');

  // Create sample automation
  await prisma.automation.create({
    data: {
      orgId: org.id,
      name: 'Welcome New Client',
      description: 'Sends welcome message to new clients',
      lane: 'front_desk',
      status: 'active',
      trigger: { type: 'client.created' },
      conditions: [],
      actions: [{ type: 'sendSMS', to: 'client' }],
      templates: [
        {
          type: 'sms',
          body: 'Welcome to our pet care service! We\'re excited to help.',
        },
      ],
    },
  });

  console.log('✅ Created sample automation');

  // Create sample alert
  await prisma.alert.create({
    data: {
      orgId: org.id,
      severity: 'info',
      type: 'system.ready',
      title: 'System Ready',
      description: 'Messaging system is configured and ready',
      status: 'open',
    },
  });

  console.log('✅ Created sample alert');

  // Create policy violation example
  await prisma.policyViolation.create({
    data: {
      orgId: org.id,
      threadId: thread1.id,
      messageId: null,
      violationType: 'phone',
      detectedSummary: 'Phone number detected: 555-123-4567',
      detectedRedacted: 'Phone number detected: [REDACTED]',
      actionTaken: 'blocked',
      status: 'open',
    },
  });

  console.log('✅ Created policy violation example');

  // Create failed delivery example (for DLQ demo)
  const failedMessage = await prisma.message.create({
    data: {
      orgId: org.id,
      threadId: thread1.id,
      direction: 'outbound',
      senderType: 'owner',
      senderId: owner.id,
      body: 'This message will fail delivery',
      providerMessageSid: null,
    },
  });

  await prisma.messageDelivery.create({
    data: {
      messageId: failedMessage.id,
      attemptNo: 1,
      status: 'failed',
      providerErrorCode: 'SEND_FAILED',
      providerErrorMessage: 'Simulated failure for demo',
    },
  });

  // Note: DLQ jobs are created by workers, not seed script
  // To create DLQ job in dev, manually trigger a retry that will fail

  console.log('✅ Created failed delivery example');

  // Create thread that routes to owner (no assignment window)
  const ownerThread = await prisma.thread.create({
    data: {
      orgId: org.id,
      clientId: client2.id,
      numberId: frontDeskNumber.id,
      threadType: 'front_desk',
      status: 'active',
      participants: {
        create: [{ participantType: 'client', participantId: client2.id }],
      },
    },
  });

  await prisma.message.create({
    data: {
      orgId: org.id,
      threadId: ownerThread.id,
      direction: 'inbound',
      senderType: 'client',
      senderId: client2.id,
      body: 'This message routes to owner inbox',
      providerMessageSid: 'mock-msg-owner',
    },
  });

  console.log('✅ Created owner-routed thread example');

  console.log('\n🎉 Seeding complete!');
  console.log('\n📝 Login credentials:');
  console.log('   Owner:');
  console.log('     Email: owner@example.com');
  console.log('     Password: password123');
  console.log('   Sitter:');
  console.log('     Email: sitter@example.com');
  console.log('     Password: password');
  console.log('\n📋 Demo Scenarios:');
  console.log('   - Thread 1: Routes to sitter (has active assignment window)');
  console.log('   - Thread 2: Routes to owner (no assignment window)');
  console.log('   - Policy violation: Open violation on thread 1');
  console.log('   - Failed delivery: Message with failed delivery on thread 1');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
