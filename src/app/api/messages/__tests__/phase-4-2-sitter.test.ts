import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeNextRequest } from '@/test/utils/nextRequest';

vi.mock('@/lib/db', () => ({
  prisma: {
    messageThread: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'user-1', role: 'owner', orgId: 'org-1' } }),
}));

vi.mock('@/lib/api/jwt', () => ({
  mintApiJWT: vi.fn().mockResolvedValue('mock-jwt-token'),
}));

describe('Messaging Routes Compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/messages/threads', () => {
    it('uses a real NextRequest and returns 200', async () => {
      const { GET } = await import('@/app/api/messages/threads/route');
      const req = makeNextRequest('http://localhost/api/messages/threads?limit=10', {
        method: 'GET',
      });
      const res = await GET(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.threads)).toBe(true);
    });
  });

  describe('GET /api/messages/threads/[id]', () => {
    it('returns 500 when API server is not configured', async () => {
      const { GET } = await import('@/app/api/messages/threads/[id]/route');
      const req = makeNextRequest('http://localhost/api/messages/threads/thread-1', {
        method: 'GET',
      });
      const res = await GET(req, { params: Promise.resolve({ id: 'thread-1' }) });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toContain('API server not configured');
    });
  });

  describe('POST /api/messages/send', () => {
    it('uses a real NextRequest and returns 500 when API server is not configured', async () => {
      const { POST } = await import('@/app/api/messages/send/route');
      const req = makeNextRequest('http://localhost/api/messages/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ threadId: 'thread-1', text: 'Hello' }),
      });
      const res = await POST(req);

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toContain('API server not configured');
    });
  });
});
