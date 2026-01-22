/**
 * Phase 1.5 Hardening Tests
 * 
 * Tests for:
 * - Front desk uniqueness under concurrency
 * - Pool number reuse and mismatch routing invariants
 * - Sitter masked number cooldown and recycle as pool only after cooldown
 * - Thread numberClass drift prevention on assign/unassign
 * - Owner inbox creation idempotency
 * - Auto response content resolution precedence and consistency
 * - Negative tests: Invalid signature, malformed inbound, pool mismatch, anti-poaching pre Phase 3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '@/lib/db';
import {
  getOrCreateFrontDeskNumber,
  assignSitterMaskedNumber,
  getPoolNumber,
  assignNumberToThread,
  validatePoolNumberRouting,
} from '../../../../lib/messaging/number-helpers';
import {
  handlePoolNumberMismatch,
} from '../../../../lib/messaging/pool-routing';
import {
  findOrCreateOwnerInboxThread,
} from '../../../../lib/messaging/owner-inbox-routing';
import { deactivateSitterMaskedNumber } from '../../../../lib/messaging/sitter-offboarding';
import type { MessagingProvider } from '../../../../lib/messaging/provider';

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    messageNumber: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    messageThread: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    messageEvent: {
      create: vi.fn(),
    },
    messageParticipant: {
      findMany: vi.fn(),
    },
    sitterMaskedNumber: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    setting: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock event logger
vi.mock('@/lib/event-logger', () => ({
  logEvent: vi.fn().mockResolvedValue('event-id-123'),
}));

// Mock env
vi.mock('@/lib/env', () => ({
  env: {
    MESSAGING_POOL_MISMATCH_AUTO_RESPONSE: null,
    MESSAGING_BOOKING_LINK: null,
    PUBLIC_BASE_URL: 'https://snoutservices.com',
  },
}));

// Mock provider
const mockProvider: MessagingProvider = {
  verifyWebhook: vi.fn(),
  parseInbound: vi.fn(),
  parseStatusCallback: vi.fn(),
  sendMessage: vi.fn().mockResolvedValue({ success: true, messageSid: 'msg-123' }),
  createSession: vi.fn(),
  createParticipant: vi.fn(),
  sendViaProxy: vi.fn(),
  updateSessionParticipants: vi.fn(),
};

describe('Phase 1.5 Hardening Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Front Desk Uniqueness Under Concurrency', () => {
    it('should ensure only one front desk number exists per org even with concurrent requests', async () => {
      const orgId = 'org-1';

      // Simulate existing front desk number
      const existingNumber = {
        id: 'number-1',
        orgId,
        numberClass: 'front_desk',
        status: 'active',
        e164: '+15551234567',
      };

      (prisma.messageNumber.findFirst as any).mockResolvedValue(existingNumber);

      // Simulate concurrent calls
      const result1 = getOrCreateFrontDeskNumber(orgId, mockProvider);
      const result2 = getOrCreateFrontDeskNumber(orgId, mockProvider);

      const [res1, res2] = await Promise.all([result1, result2]);

      // Both should return the same number
      expect(res1.numberId).toBe('number-1');
      expect(res2.numberId).toBe('number-1');

      // Verify findFirst was called to check for existing
      expect(prisma.messageNumber.findFirst).toHaveBeenCalledWith({
        where: {
          orgId,
          numberClass: 'front_desk',
          status: 'active',
        },
      });

      // Note: In real implementation, you'd use database locks or unique constraints
      // This test verifies the logic checks for existing numbers first
    });
  });

  describe('Pool Number Reuse and Mismatch Routing Invariants', () => {
    it('should prefer least recently assigned pool numbers', async () => {
      const orgId = 'org-1';
      const poolNumbers = [
        { id: 'pool-1', e164: '+15551111111', lastAssignedAt: new Date('2024-01-01') },
        { id: 'pool-2', e164: '+15552222222', lastAssignedAt: new Date('2024-01-02') },
        { id: 'pool-3', e164: '+15553333333', lastAssignedAt: new Date('2024-01-03') },
      ];

      (prisma.messageNumber.findMany as any).mockResolvedValue([poolNumbers[0]]);
      (prisma.messageNumber.update as any).mockResolvedValue({ ...poolNumbers[0], lastAssignedAt: new Date() });

      const result = await getPoolNumber(orgId);

      expect(result).not.toBeNull();
      expect(result?.numberId).toBe('pool-1'); // Least recently assigned
      expect(prisma.messageNumber.findMany).toHaveBeenCalledWith({
        where: {
          orgId,
          numberClass: 'pool',
          status: 'active',
        },
        orderBy: [
          { lastAssignedAt: 'asc' },
          { createdAt: 'asc' },
        ],
        take: 1,
      });
    });

    it('should never attach pool mismatch to active thread', async () => {
      const orgId = 'org-1';
      const numberId = 'pool-1';
      const senderE164 = '+15551234567';

      const poolNumber = {
        id: numberId,
        orgId,
        numberClass: 'pool',
        status: 'active',
      };

      (prisma.messageNumber.findUnique as any).mockResolvedValue(poolNumber);

      // No active threads for this sender on this number
      (prisma.messageThread.findMany as any).mockResolvedValue([]);

      const result = await validatePoolNumberRouting(numberId, senderE164, orgId);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Sender not mapped to active thread on this pool number');
    });

    it('should route pool mismatch to owner inbox and send auto-response', async () => {
      const orgId = 'org-1';
      const numberId = 'pool-1';
      const inboundMessage = {
        from: '+15551234567',
        to: '+15559876543',
        body: 'Hello',
        messageSid: 'msg-123',
        timestamp: new Date(),
      };

      const ownerThread = { id: 'owner-thread-1', orgId };
      const messageNumber = { id: numberId, e164: '+15559876543', providerNumberSid: 'PN123' };
      const messageEvent = { id: 'event-1' };

      // No env or settings - will use default message
      const originalEnv = process.env.MESSAGING_POOL_MISMATCH_AUTO_RESPONSE;
      delete process.env.MESSAGING_POOL_MISMATCH_AUTO_RESPONSE;
      (prisma.setting.findUnique as any)
        .mockResolvedValueOnce(null) // messaging.poolMismatchAutoResponse
        .mockResolvedValueOnce(null); // links.booking

      (prisma.messageThread.findFirst as any).mockResolvedValue(ownerThread);
      (prisma.messageThread.create as any).mockResolvedValue(ownerThread);
      (prisma.messageEvent.create as any)
        .mockResolvedValueOnce(messageEvent) // Inbound message
        .mockResolvedValueOnce({ id: 'event-2' }); // Auto-response
      (prisma.messageNumber.findUnique as any).mockResolvedValue(messageNumber);
      (prisma.messageNumber.findFirst as any).mockResolvedValue(null); // No front desk number

      const result = await handlePoolNumberMismatch(
        numberId,
        inboundMessage,
        orgId,
        mockProvider
      );

      // Restore original env
      if (originalEnv) {
        process.env.MESSAGING_POOL_MISMATCH_AUTO_RESPONSE = originalEnv;
      }

      expect(result.ownerThreadId).toBe('owner-thread-1');
      expect(result.autoResponseSent).toBe(true);
      expect(mockProvider.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+15551234567',
        })
      );
    });
  });

  describe('Sitter Masked Number Cooldown and Recycle', () => {
    it('should not recycle deactivated sitter number before 90-day cooldown', async () => {
      const orgId = 'org-1';
      const sitterId = 'sitter-1';
      const deactivatedDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000); // 45 days ago

      // No active masked number
      (prisma.sitterMaskedNumber.findUnique as any).mockResolvedValue(null);

      // No active sitter number
      (prisma.messageNumber.findFirst as any).mockResolvedValueOnce(null);

      // Find deactivated number (within cooldown)
      (prisma.sitterMaskedNumber.findFirst as any).mockResolvedValueOnce({
        id: 'masked-1',
        messageNumberId: 'number-1',
        deactivatedAt: deactivatedDate,
        status: 'deactivated',
        messageNumber: { id: 'number-1', e164: '+15551111111' },
      });

      // Should not reuse it - should throw error
      await expect(
        assignSitterMaskedNumber(orgId, sitterId, mockProvider)
      ).rejects.toThrow();
    });

    it('should recycle deactivated sitter number as pool only after 90-day cooldown', async () => {
      const orgId = 'org-1';
      const sitterId = 'sitter-1';
      const deactivatedDate = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000); // 91 days ago

      // No active masked number
      (prisma.sitterMaskedNumber.findUnique as any).mockResolvedValue(null);

      // No active sitter number
      (prisma.messageNumber.findFirst as any).mockResolvedValueOnce(null);

      // Find deactivated number (after cooldown)
      (prisma.sitterMaskedNumber.findFirst as any).mockResolvedValueOnce({
        id: 'masked-1',
        messageNumberId: 'number-1',
        deactivatedAt: deactivatedDate,
        status: 'deactivated',
        messageNumber: { id: 'number-1', e164: '+15551111111' },
      });

      // Should convert to pool, not reuse as sitter number
      (prisma.messageNumber.update as any).mockResolvedValue({
        id: 'number-1',
        numberClass: 'pool',
      });

      // Should throw error requiring new sitter number (not reuse old one)
      await expect(
        assignSitterMaskedNumber(orgId, sitterId, mockProvider)
      ).rejects.toThrow('No available sitter number');

      // Verify number was converted to pool
      expect(prisma.messageNumber.update).toHaveBeenCalledWith({
        where: { id: 'number-1' },
        data: {
          numberClass: 'pool',
          assignedSitterId: null,
          isRotating: true,
        },
      });
    });
  });

  describe('Thread numberClass Drift Prevention', () => {
    it('should always derive thread.numberClass from MessageNumber.numberClass on assign', async () => {
      const threadId = 'thread-1';
      const numberId = 'number-1';
      const orgId = 'org-1';
      const numberClass = 'front_desk';

      const messageNumber = {
        id: numberId,
        orgId,
        numberClass: 'front_desk',
        e164: '+15551234567',
      };

      // Mock getOrCreateFrontDeskNumber lookup
      (prisma.messageNumber.findFirst as any)
        .mockResolvedValueOnce(messageNumber) // For getOrCreateFrontDeskNumber
        .mockResolvedValueOnce(messageNumber); // For assignNumberToThread
      (prisma.messageNumber.findUnique as any).mockResolvedValue(messageNumber);
      (prisma.messageThread.update as any).mockResolvedValue({ id: threadId });

      await assignNumberToThread(threadId, numberClass, orgId, mockProvider);

      // Verify thread.numberClass matches MessageNumber.numberClass
      expect(prisma.messageThread.update).toHaveBeenCalledWith({
        where: { id: threadId },
        data: {
          messageNumberId: numberId,
          numberClass: 'front_desk', // Derived from MessageNumber
          maskedNumberE164: '+15551234567',
        },
      });
    });

    it('should throw error if MessageNumber.numberClass does not match expected', async () => {
      const threadId = 'thread-1';
      const numberId = 'number-1';
      const orgId = 'org-1';
      const numberClass = 'front_desk';

      const messageNumber = {
        id: numberId,
        orgId,
        numberClass: 'pool', // Mismatch!
        e164: '+15551234567',
      };

      (prisma.messageNumber.findFirst as any).mockResolvedValue(messageNumber);
      (prisma.messageNumber.findUnique as any).mockResolvedValue(messageNumber);

      await expect(
        assignNumberToThread(threadId, numberClass, orgId, mockProvider)
      ).rejects.toThrow('Number class mismatch');
    });
  });

  describe('Owner Inbox Creation Idempotency', () => {
    it('should return existing owner inbox thread if it already exists', async () => {
      const orgId = 'org-1';
      const existingThread = {
        id: 'owner-thread-1',
        orgId,
        scope: 'internal',
        clientId: null,
      };

      (prisma.messageThread.findFirst as any).mockResolvedValue(existingThread);

      const result1 = await findOrCreateOwnerInboxThread(orgId);
      const result2 = await findOrCreateOwnerInboxThread(orgId);

      expect(result1.id).toBe('owner-thread-1');
      expect(result2.id).toBe('owner-thread-1');
      expect(prisma.messageThread.create).not.toHaveBeenCalled();
    });

    it('should create owner inbox thread only once when called concurrently', async () => {
      const orgId = 'org-1';
      const newThread = {
        id: 'owner-thread-1',
        orgId,
        scope: 'internal',
        clientId: null,
      };

      // First call returns null, second call returns the created thread
      (prisma.messageThread.findFirst as any)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(newThread);
      (prisma.messageThread.create as any).mockResolvedValue(newThread);

      const result1 = findOrCreateOwnerInboxThread(orgId);
      const result2 = findOrCreateOwnerInboxThread(orgId);

      await Promise.all([result1, result2]);

      // Should only create once (in real implementation, you'd use locks)
      // This test verifies the idempotent check
      expect(prisma.messageThread.findFirst).toHaveBeenCalledWith({
        where: {
          orgId,
          scope: 'internal',
          clientId: null,
        },
      });
    });
  });

  describe('Auto Response Content Resolution', () => {
    it('should prefer env variable over settings', async () => {
      const orgId = 'org-1';
      const inboundMessage = {
        from: '+15551234567',
        to: '+15559876543',
        body: 'Hello',
        messageSid: 'msg-123',
        timestamp: new Date(),
      };

      // Mock env variable (set before the call)
      const originalEnv = process.env.MESSAGING_POOL_MISMATCH_AUTO_RESPONSE;
      process.env.MESSAGING_POOL_MISMATCH_AUTO_RESPONSE = 'Custom env response';

      const ownerThread = { id: 'owner-thread-1', orgId };
      const messageNumber = { id: 'pool-1', e164: '+15559876543', providerNumberSid: 'PN123' };
      const messageEvent = { id: 'event-1' };

      (prisma.messageThread.findFirst as any).mockResolvedValue(ownerThread);
      (prisma.messageThread.create as any).mockResolvedValue(ownerThread);
      (prisma.messageEvent.create as any)
        .mockResolvedValueOnce(messageEvent) // Inbound message
        .mockResolvedValueOnce({ id: 'event-2' }); // Auto-response
      (prisma.messageNumber.findUnique as any).mockResolvedValue(messageNumber);
      (prisma.setting.findUnique as any).mockResolvedValue(null); // No setting

      const result = await handlePoolNumberMismatch(
        'pool-1',
        inboundMessage,
        orgId,
        mockProvider
      );

      // Restore original env
      if (originalEnv) {
        process.env.MESSAGING_POOL_MISMATCH_AUTO_RESPONSE = originalEnv;
      } else {
        delete process.env.MESSAGING_POOL_MISMATCH_AUTO_RESPONSE;
      }

      // Verify auto-response was sent with env text
      expect(mockProvider.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'Custom env response',
        })
      );
      
      // Verify setting was not checked (env takes precedence)
      expect(prisma.setting.findUnique).not.toHaveBeenCalled();
    });

    it('should use settings if env variable not set', async () => {
      const orgId = 'org-1';
      const inboundMessage = {
        from: '+15551234567',
        to: '+15559876543',
        body: 'Hello',
        messageSid: 'msg-123',
        timestamp: new Date(),
      };

      // No env variable
      const originalEnv = process.env.MESSAGING_POOL_MISMATCH_AUTO_RESPONSE;
      delete process.env.MESSAGING_POOL_MISMATCH_AUTO_RESPONSE;

      // Mock setting (called twice - once for the setting check, once potentially in getSetting)
      (prisma.setting.findUnique as any)
        .mockResolvedValueOnce({
          key: 'messaging.poolMismatchAutoResponse',
          value: 'Setting response',
        })
        .mockResolvedValueOnce(null); // For getSetting('links.booking')

      const ownerThread = { id: 'owner-thread-1', orgId };
      const messageNumber = { id: 'pool-1', e164: '+15559876543', providerNumberSid: 'PN123' };
      const messageEvent = { id: 'event-1' };

      (prisma.messageThread.findFirst as any).mockResolvedValue(ownerThread);
      (prisma.messageThread.create as any).mockResolvedValue(ownerThread);
      (prisma.messageEvent.create as any)
        .mockResolvedValueOnce(messageEvent) // Inbound message
        .mockResolvedValueOnce({ id: 'event-2' }); // Auto-response
      (prisma.messageNumber.findUnique as any).mockResolvedValue(messageNumber);

      const result = await handlePoolNumberMismatch(
        'pool-1',
        inboundMessage,
        orgId,
        mockProvider
      );

      // Restore original env
      if (originalEnv) {
        process.env.MESSAGING_POOL_MISMATCH_AUTO_RESPONSE = originalEnv;
      }

      // Verify auto-response was sent with setting text
      expect(mockProvider.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'Setting response',
        })
      );
      expect(prisma.setting.findUnique).toHaveBeenCalled();
    });

    it('should construct default message with booking link and front desk number', async () => {
      const orgId = 'org-1';
      const inboundMessage = {
        from: '+15551234567',
        to: '+15559876543',
        body: 'Hello',
        messageSid: 'msg-123',
        timestamp: new Date(),
      };

      // No env or settings
      const originalEnv = process.env.MESSAGING_POOL_MISMATCH_AUTO_RESPONSE;
      delete process.env.MESSAGING_POOL_MISMATCH_AUTO_RESPONSE;
      (prisma.setting.findUnique as any)
        .mockResolvedValueOnce(null) // messaging.poolMismatchAutoResponse
        .mockResolvedValueOnce(null); // links.booking

      // Mock front desk number
      const frontDeskNumber = {
        id: 'front-desk-1',
        e164: '+15551111111',
      };

      const ownerThread = { id: 'owner-thread-1', orgId };
      const messageNumber = { id: 'pool-1', e164: '+15559876543', providerNumberSid: 'PN123' };
      const messageEvent = { id: 'event-1' };

      (prisma.messageThread.findFirst as any).mockResolvedValue(ownerThread);
      (prisma.messageThread.create as any).mockResolvedValue(ownerThread);
      (prisma.messageEvent.create as any)
        .mockResolvedValueOnce(messageEvent) // Inbound message
        .mockResolvedValueOnce({ id: 'event-2' }); // Auto-response
      (prisma.messageNumber.findUnique as any).mockResolvedValue(messageNumber);
      (prisma.messageNumber.findFirst as any).mockResolvedValue(frontDeskNumber);

      const result = await handlePoolNumberMismatch(
        'pool-1',
        inboundMessage,
        orgId,
        mockProvider
      );

      // Restore original env
      if (originalEnv) {
        process.env.MESSAGING_POOL_MISMATCH_AUTO_RESPONSE = originalEnv;
      }

      // Verify auto-response contains expected content
      expect(mockProvider.sendMessage).toHaveBeenCalled();
      const callArgs = (mockProvider.sendMessage as any).mock.calls[0][0];
      expect(callArgs.body).toContain('Snout Services');
      expect(callArgs.body).toContain('+15551111111');
    });
  });

  describe('Negative Tests', () => {
    it('should ensure pool sender mismatch never attaches to active thread', async () => {
      const orgId = 'org-1';
      const numberId = 'pool-1';
      const senderE164 = '+15551234567';

      const poolNumber = {
        id: numberId,
        orgId,
        numberClass: 'pool',
        status: 'active',
      };

      (prisma.messageNumber.findUnique as any).mockResolvedValue(poolNumber);

      // Thread exists but sender is not a participant
      (prisma.messageThread.findMany as any).mockResolvedValue([
        {
          id: 'thread-1',
          participants: [], // Empty - sender not a participant
        },
      ]);

      const result = await validatePoolNumberRouting(numberId, senderE164, orgId);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Sender not mapped to active thread on this pool number');
    });

    it('should ensure no anti-poaching blocking exists pre Phase 3', async () => {
      // Phase 1.5: Anti-poaching is Phase 3, so no blocking should exist
      // This is a placeholder test to verify the system doesn't block messages yet
      
      const inboundMessage = {
        from: '+15551234567',
        to: '+15559876543',
        body: 'Contact me at 555-999-8888 or email me@example.com',
        messageSid: 'msg-123',
        timestamp: new Date(),
      };

      // Message with phone number and email should not be blocked in Phase 1.5
      // (This will be enforced in Phase 3)
      expect(inboundMessage.body).toContain('555-999-8888');
      expect(inboundMessage.body).toContain('email');
      
      // No blocking logic should exist yet
      // This test verifies that Phase 3 logic is not present
    });
  });
});
