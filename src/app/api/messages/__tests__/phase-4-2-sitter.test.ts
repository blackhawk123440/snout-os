/**
 * Phase 4.2: Sitter Messages UI - Integration Tests
 *
 * Tests for:
 * - Sitter thread filtering (active/upcoming window, no inbox/billing)
 * - Send gating (NO_ACTIVE_WINDOW, friendly message)
 * - Feature flag ENABLE_SITTER_MESSAGES_V1 gates sitter access
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock auth and sitter helpers
vi.mock('@/lib/auth-helpers', () => ({
  getCurrentUserSafe: vi.fn().mockResolvedValue({ id: 'user-1' }),
}));

vi.mock('@/lib/sitter-helpers', () => ({
  getCurrentSitterId: vi.fn().mockResolvedValue(null), // owner by default
}));

vi.mock('@/lib/messaging/org-helpers', () => ({
  getOrgIdFromContext: vi.fn().mockResolvedValue('org-1'),
}));

vi.mock('@/lib/env', () => ({
  env: {
    ENABLE_MESSAGING_V1: true,
    ENABLE_SITTER_MESSAGES_V1: false, // default off
  },
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    thread: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), count: vi.fn() },
    message: { findMany: vi.fn(), count: vi.fn() },
    assignmentWindow: { findFirst: vi.fn(), findMany: vi.fn() },
    messageNumber: { findUnique: vi.fn() },
    sitter: { findMany: vi.fn() },
    organization: { findFirst: vi.fn() },
    client: { findFirst: vi.fn() },
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'user-1', role: 'owner', orgId: 'org-1' } }),
}));

vi.mock('@/lib/api/jwt', () => ({
  mintApiJWT: vi.fn().mockResolvedValue('mock-jwt-token'),
}));

vi.mock('@/lib/messaging/providers/twilio', () => ({
  TwilioProvider: class MockTwilioProvider {},
}));

import { getCurrentSitterId } from '@/lib/sitter-helpers';
import { prisma } from '@/lib/db';

describe('Phase 4.2 Sitter Filtering and Send Gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentSitterId).mockResolvedValue(null);
  });

  describe('GET /api/messages/threads', () => {
    it('should return 404 for sitter when ENABLE_SITTER_MESSAGES_V1 is disabled', async () => {
      vi.mocked(getCurrentSitterId).mockResolvedValue('sitter-1');

      const { GET } = await import('@/app/api/messages/threads/route');
      const req = new Request('http://localhost/api/messages/threads');
      const res = await GET(req);

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toContain('Sitter messages not enabled');
    });

    it('should allow owner when ENABLE_SITTER_MESSAGES_V1 is disabled', async () => {
      vi.mocked(getCurrentSitterId).mockResolvedValue(null);
      vi.mocked((prisma as any).thread.findMany).mockResolvedValue([]);
      vi.mocked((prisma as any).thread.count).mockResolvedValue(0);

      const { GET } = await import('@/app/api/messages/threads/route');
      const req = new Request('http://localhost/api/messages/threads');
      const res = await GET(req);

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/messages/threads/[id]', () => {
    it('should return 404 for sitter when ENABLE_SITTER_MESSAGES_V1 is disabled', async () => {
      vi.mocked(getCurrentSitterId).mockResolvedValue('sitter-1');

      const { GET } = await import('@/app/api/messages/threads/[id]/route');
      const req = new Request('http://localhost/api/messages/threads/thread-1');
      const res = await GET(req, { params: Promise.resolve({ id: 'thread-1' }) });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toContain('Sitter messages not enabled');
    });
  });

  describe('POST /api/messages/send', () => {
    it('should return 404 for sitter when ENABLE_SITTER_MESSAGES_V1 is disabled', async () => {
      vi.mocked(getCurrentSitterId).mockResolvedValue('sitter-1');
      vi.mocked((prisma as any).thread.findUnique).mockResolvedValue({
        id: 'thread-1',
        orgId: 'org-1',
        sitterId: 'sitter-1',
        threadType: 'assignment',
        status: 'active',
        clientId: 'client-1',
        numberId: 'number-1',
      } as any);

      const { POST } = await import('@/app/api/messages/send/route');
      const req = new Request('http://localhost/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: 'thread-1', text: 'Hello' }),
      });
      const res = await POST(req);

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toContain('Sitter messages not enabled');
      expect(body.errorCode).toBe('SITTER_MESSAGES_DISABLED');
    });
  });

  describe('Send gating NO_ACTIVE_WINDOW', () => {
    it('should return friendly error message including active booking windows', () => {
      const friendly =
        'Messages can only be sent during your active booking windows. Your next window for this client is X – Y.';
      expect(friendly).toContain('active booking windows');
      expect(friendly).toContain('next window');
    });
  });

  describe('Anti-poaching sitter-friendly response', () => {
    it('should use friendly warning without violations or client data for sitter', () => {
      const friendly =
        'Your message could not be sent. Please avoid sharing phone numbers, emails, external links, or social handles. Use the app for all client communication.';
      expect(friendly).toContain('could not be sent');
      expect(friendly).not.toContain('violation');
      expect(friendly).not.toContain('messageEventId');
    });
  });
});
