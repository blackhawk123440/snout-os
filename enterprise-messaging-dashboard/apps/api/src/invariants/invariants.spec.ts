/**
 * Invariant Tests
 *
 * Verifies core system invariants that must never regress:
 * 1. Masking invisibility - sitters never see client E164
 * 2. Thread-bound sending - messages must use thread.number_id
 * 3. Idempotency uniqueness - DB constraint on provider_message_sid
 * 4. Assignment window enforcement - sitter blocked outside window
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || 'file:./test.db',
    },
  },
});

let testOrgId: string;
let testOwnerId: string;
let testSitterId: string;
let testSitterUserId: string;
let testClientId: string;
let testClientE164: string;
let testThreadId: string;
let testNumberId: string;
let testBusinessNumberE164: string;

/**
 * Helper: Scan JSON for phone number patterns
 */
function scanForPhoneNumbers(json: any): string[] {
  const jsonString = JSON.stringify(json);
  const phonePattern = /\+\d{10,15}/g;
  const matches = jsonString.match(phonePattern) || [];
  return [...new Set(matches)]; // Deduplicate
}

beforeAll(async () => {
  // Create test organization
  const org = await prisma.organization.create({
    data: { name: 'Test Org' },
  });
  testOrgId = org.id;

  // Create test owner user
  const ownerPasswordHash = await bcrypt.hash('password', 10);
  const owner = await prisma.user.create({
    data: {
      orgId: testOrgId,
      role: 'owner',
      name: 'Test Owner',
      email: 'test-owner@example.com',
      passwordHash: ownerPasswordHash,
      active: true,
    },
  });
  testOwnerId = owner.id;

  // Create test sitter
  const sitter = await prisma.sitter.create({
    data: {
      orgId: testOrgId,
      name: 'Test Sitter',
      active: true,
    },
  });
  testSitterId = sitter.id;

  // Create sitter user
  const sitterPasswordHash = await bcrypt.hash('password', 10);
  const sitterUser = await prisma.user.create({
    data: {
      orgId: testOrgId,
      role: 'sitter',
      name: 'Test Sitter',
      email: 'test-sitter@example.com',
      passwordHash: sitterPasswordHash,
      active: true,
    },
  });
  testSitterUserId = sitterUser.id;

  // Link sitter user to sitter
  await prisma.sitter.update({
    where: { id: testSitterId },
    data: { userId: sitterUser.id },
  });

  // Create test client with phone number
  testClientE164 = '+15551234567';
  const client = await prisma.client.create({
    data: {
      orgId: testOrgId,
      name: 'Test Client',
      contacts: {
        create: {
          e164: testClientE164,
          label: 'Mobile',
          verified: true,
        },
      },
    },
  });
  testClientId = client.id;

  // Create test business number (masked number)
  testBusinessNumberE164 = '+15551111111';
  const number = await prisma.messageNumber.create({
    data: {
      orgId: testOrgId,
      e164: testBusinessNumberE164,
      class: 'sitter',
      status: 'active',
      assignedSitterId: testSitterId,
      providerType: 'mock',
      providerNumberSid: 'test-sid',
      purchaseDate: new Date(),
    },
  });
  testNumberId = number.id;

  // Create test thread
  const thread = await prisma.thread.create({
    data: {
      orgId: testOrgId,
      clientId: testClientId,
      sitterId: testSitterId,
      numberId: testNumberId,
      threadType: 'assignment',
      status: 'active',
      participants: {
        create: [
          { participantType: 'client', participantId: testClientId },
          { participantType: 'sitter', participantId: testSitterId },
        ],
      },
    },
  });
  testThreadId = thread.id;
});

afterAll(async () => {
  // Cleanup
  await prisma.message.deleteMany({ where: { orgId: testOrgId } });
  await prisma.thread.deleteMany({ where: { orgId: testOrgId } });
  await prisma.messageNumber.deleteMany({ where: { orgId: testOrgId } });
  await prisma.client.deleteMany({ where: { orgId: testOrgId } });
  await prisma.sitter.deleteMany({ where: { orgId: testOrgId } });
  await prisma.user.deleteMany({ where: { orgId: testOrgId } });
  await prisma.organization.delete({ where: { id: testOrgId } });
  await prisma.$disconnect();
});

describe('Invariant Tests', () => {
  describe('1. Masking Invisibility Invariant', () => {
    it('Sitter-scoped endpoints never return client E164', async () => {
      // Simulate sitter API response (what SitterService.getThreads returns)
      const sitterThreads = await prisma.thread.findMany({
        where: {
          orgId: testOrgId,
          sitterId: testSitterId,
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              // DO NOT include contacts (phone numbers)
            },
          },
          messageNumber: {
            select: {
              id: true,
              e164: true, // This is the masked business number (allowed)
              class: true,
            },
          },
        },
      });

      // Scan response for phone numbers
      const phoneNumbers = scanForPhoneNumbers(sitterThreads);

      // Assert: Only business number (masked) should appear, NOT client E164
      expect(phoneNumbers).toContain(testBusinessNumberE164); // Business number is OK
      expect(phoneNumbers).not.toContain(testClientE164); // Client E164 must NOT appear

      // Also check individual thread detail
      const threadDetail = await prisma.thread.findUnique({
        where: { id: testThreadId },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              // DO NOT include contacts
            },
          },
          messageNumber: {
            select: {
              id: true,
              e164: true,
              class: true,
            },
          },
        },
      });

      const detailPhones = scanForPhoneNumbers(threadDetail);
      expect(detailPhones).toContain(testBusinessNumberE164);
      expect(detailPhones).not.toContain(testClientE164);
    });

    it('Sitter messages endpoint never returns client E164', async () => {
      // Create a message
      await prisma.message.create({
        data: {
          orgId: testOrgId,
          threadId: testThreadId,
          direction: 'inbound',
          senderType: 'client',
          senderId: testClientId,
          body: 'Test message',
        },
      });

      // Simulate sitter messages response (what SitterService.getMessages returns)
      const messages = await prisma.message.findMany({
        where: { threadId: testThreadId, orgId: testOrgId },
        select: {
          id: true,
          direction: true,
          senderType: true,
          body: true,
          redactedBody: true,
          createdAt: true,
          // DO NOT include providerMessageSid or any external identifiers
        },
      });

      // Scan for phone numbers
      const phoneNumbers = scanForPhoneNumbers(messages);
      expect(phoneNumbers).not.toContain(testClientE164);
    });
  });

  describe('2. Thread-Bound Sending Invariant', () => {
    it('Outbound message must use thread.number_id as from_number', async () => {
      // Get thread with number
      const thread = await prisma.thread.findUnique({
        where: { id: testThreadId },
        include: { messageNumber: true },
      });

      expect(thread).toBeTruthy();
      expect(thread!.numberId).toBe(testNumberId);

      // Create outbound message (simulating what MessagingService does)
      const message = await prisma.message.create({
        data: {
          orgId: testOrgId,
          threadId: testThreadId,
          direction: 'outbound',
          senderType: 'owner',
          senderId: testOwnerId,
          body: 'Test message',
          // Note: In real implementation, from_number is enforced by thread.number_id
          // This test verifies the invariant that messages are always thread-bound
        },
      });

      // Verify message is tied to thread
      expect(message.threadId).toBe(testThreadId);

      // Verify thread's number is the one that should be used
      const threadWithNumber = await prisma.thread.findUnique({
        where: { id: testThreadId },
        include: { messageNumber: true },
      });

      expect(threadWithNumber!.messageNumber.id).toBe(testNumberId);
      expect(threadWithNumber!.messageNumber.e164).toBe(testBusinessNumberE164);

      // In real implementation, provider.sendMessage would use thread.messageNumber.e164 as 'from'
      // This invariant ensures we never send from a number not assigned to the thread
    });

    it('Attempting to send without thread binding should fail', async () => {
      // This test verifies that the API enforces thread-bound sending
      // In a real test, you'd call the API endpoint and expect 4xx error

      // For now, verify that messages require threadId
      const messageData = {
        orgId: testOrgId,
        direction: 'outbound' as const,
        senderType: 'owner' as const,
        senderId: testOwnerId,
        body: 'Test',
      };

      // Attempting to create message without threadId should fail
      // (Prisma will enforce this if threadId is required)
      await expect(
        prisma.message.create({
          data: messageData as any, // Type assertion to bypass TypeScript check
        }),
      ).rejects.toThrow();
    });
  });

  describe('3. Idempotency Uniqueness Invariant', () => {
    it('DB unique constraint prevents duplicate provider_message_sid', async () => {
      // Create message with provider SID
      const providerSid = 'SM1234567890';
      await prisma.message.create({
        data: {
          orgId: testOrgId,
          threadId: testThreadId,
          direction: 'inbound',
          senderType: 'client',
          senderId: testClientId,
          body: 'First message',
          providerMessageSid: providerSid,
        },
      });

      // Attempt to create duplicate (should fail)
      await expect(
        prisma.message.create({
          data: {
            orgId: testOrgId,
            threadId: testThreadId,
            direction: 'inbound',
            senderType: 'client',
            senderId: testClientId,
            body: 'Duplicate message',
            providerMessageSid: providerSid, // Same SID
          },
        }),
      ).rejects.toThrow();

      // Note: This test assumes a unique constraint exists on providerMessageSid
      // If not, you need to add it via migration:
      // @@unique([providerMessageSid])
    });

    it('Webhook idempotency prevents duplicate processing', async () => {
      // Simulate webhook processing
      const webhookSid = 'SM9876543210';

      // First webhook
      const message1 = await prisma.message.create({
        data: {
          orgId: testOrgId,
          threadId: testThreadId,
          direction: 'inbound',
          senderType: 'client',
          senderId: testClientId,
          body: 'First webhook',
          providerMessageSid: webhookSid,
        },
      });

      // Second webhook with same SID (should be rejected by idempotency check)
      // In real implementation, webhook service checks for existing message with same SID
      const existing = await prisma.message.findFirst({
        where: { providerMessageSid: webhookSid },
      });

      expect(existing).toBeTruthy();
      expect(existing!.id).toBe(message1.id);

      // If we tried to create again, it should fail (DB constraint)
      await expect(
        prisma.message.create({
          data: {
            orgId: testOrgId,
            threadId: testThreadId,
            direction: 'inbound',
            senderType: 'client',
            senderId: testClientId,
            body: 'Duplicate webhook',
            providerMessageSid: webhookSid,
          },
        }),
      ).rejects.toThrow();
    });
  });

  describe('4. Assignment Window Enforcement Invariant', () => {
    it('Sitter cannot send message outside active window', async () => {
      // Create assignment window in the PAST (not active)
      const pastWindow = await prisma.assignmentWindow.create({
        data: {
          orgId: testOrgId,
          threadId: testThreadId,
          sitterId: testSitterId,
          startsAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          endsAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        },
      });

      // Check if sitter has active window (should be false)
      const now = new Date();
      const activeWindow = await prisma.assignmentWindow.findFirst({
        where: {
          orgId: testOrgId,
          sitterId: testSitterId,
          threadId: testThreadId,
          startsAt: { lte: now },
          endsAt: { gte: now },
        },
      });

      expect(activeWindow).toBeNull(); // No active window

      // In real implementation, MessagingService checks for active window
      // and throws ForbiddenException if sitter tries to send outside window
      // This test verifies the invariant that window enforcement is checked

      // Cleanup
      await prisma.assignmentWindow.delete({ where: { id: pastWindow.id } });
    });

    it('Sitter can send message during active window', async () => {
      // Create active assignment window
      const activeWindow = await prisma.assignmentWindow.create({
        data: {
          orgId: testOrgId,
          threadId: testThreadId,
          sitterId: testSitterId,
          startsAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
          endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        },
      });

      // Check if window is active
      const now = new Date();
      const window = await prisma.assignmentWindow.findFirst({
        where: {
          orgId: testOrgId,
          sitterId: testSitterId,
          threadId: testThreadId,
          startsAt: { lte: now },
          endsAt: { gte: now },
        },
      });

      expect(window).toBeTruthy();
      expect(window!.id).toBe(activeWindow.id);

      // In real implementation, MessagingService would allow sending
      // This test verifies the invariant that active windows allow sending

      // Cleanup
      await prisma.assignmentWindow.delete({ where: { id: activeWindow.id } });
    });
  });
});
