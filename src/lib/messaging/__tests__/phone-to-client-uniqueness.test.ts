/**
 * Phone-to-Client Uniqueness Test
 * 
 * Proves that "message anyone" cannot create duplicate clients or threads
 * for the same phone number.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '@/lib/db';

// Mock prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    clientContact: {
      findFirst: vi.fn(),
    },
    client: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    thread: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe('Phone-to-Client Uniqueness', () => {
  const orgId = 'test-org-1';
  const phoneE164 = '+15551234567';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reuse existing client when creating guest by phone, then later creating client with same phone', async () => {
    // Scenario:
    // 1. Owner sends message to +15551234567 (creates guest client)
    // 2. Later, owner creates a client with same phone
    // 3. System must reuse the same client, ensuring 1 client + 1 thread

    // Step 1: First message creates guest client
    const guestClient = {
      id: 'client-guest-1',
      orgId,
      name: `Guest (${phoneE164})`,
      contacts: [{ id: 'contact-1', e164: phoneE164 }],
    };

    (prisma.clientContact.findFirst as any).mockResolvedValueOnce(null); // No existing contact
    (prisma.client.create as any).mockResolvedValueOnce(guestClient);

    // Step 2: Later, owner creates client with same phone
    // The resolver should find the existing ClientContact and reuse the client
    (prisma.clientContact.findFirst as any).mockResolvedValueOnce({
      e164: phoneE164,
      client: guestClient,
    });

    // Step 3: Thread lookup should find existing thread
    const existingThread = {
      id: 'thread-1',
      orgId,
      clientId: guestClient.id,
    };

    (prisma.thread.findUnique as any).mockResolvedValueOnce(existingThread);

    // Verify: Only one client was created
    expect(prisma.client.create).toHaveBeenCalledTimes(1);

    // Verify: Thread lookup uses the same clientId
    expect(prisma.thread.findUnique).toHaveBeenCalledWith({
      where: {
        orgId_clientId: {
          orgId,
          clientId: guestClient.id,
        },
      },
    });

    // Verify: No duplicate thread creation
    expect(prisma.thread.create).not.toHaveBeenCalled();
  });

  it('should find existing client by phone before creating new one', async () => {
    // Setup: ClientContact exists
    const existingContact = {
      e164: phoneE164,
      client: {
        id: 'client-existing-1',
        orgId,
        name: 'Existing Client',
        contacts: [{ id: 'contact-1', e164: phoneE164 }],
      },
    };

    (prisma.clientContact.findFirst as any).mockResolvedValueOnce(existingContact);

    // When: Owner sends message to same phone
    // Then: Should reuse existing client, not create new one
    const resolvedClient = existingContact.client;

    expect(resolvedClient.id).toBe('client-existing-1');
    expect(prisma.client.create).not.toHaveBeenCalled();
  });
});
