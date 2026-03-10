import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSitterFindMany = vi.fn();
const mockMessageNumberFindMany = vi.fn();

vi.mock('@/lib/request-context', () => ({
  getRequestContext: vi.fn(),
}));

vi.mock('@/lib/rbac', () => ({
  requireAnyRole: vi.fn(),
  ForbiddenError: class ForbiddenError extends Error {},
}));

vi.mock('@/lib/api/jwt', () => ({
  mintApiJWT: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    sitter: {
      findMany: (...args: unknown[]) => mockSitterFindMany(...args),
    },
    messageNumber: {
      findMany: (...args: unknown[]) => mockMessageNumberFindMany(...args),
    },
  },
}));

import { GET } from '@/app/api/sitters/route';
import { getRequestContext } from '@/lib/request-context';

describe('sitters API contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRequestContext).mockResolvedValue({
      orgId: 'org-1',
      role: 'owner',
      userId: 'user-1',
      clientId: null,
      sitterId: null,
    } as never);
  });

  it('returns canonical { sitters: [...] } shape', async () => {
    mockSitterFindMany.mockResolvedValueOnce([
      {
        id: 's1',
        name: 'Sam Sitter',
        active: true,
        createdAt: new Date('2026-03-09T08:00:00.000Z'),
        updatedAt: new Date('2026-03-09T09:00:00.000Z'),
        deletedAt: null,
      },
    ]);
    mockMessageNumberFindMany.mockResolvedValueOnce([]);

    const req = new Request('http://localhost/api/sitters');
    const res = await GET(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Object.keys(body)).toEqual(['sitters']);
    expect(Array.isArray(body.sitters)).toBe(true);
    expect(body.sitters).toHaveLength(1);
    expect(body.sitters[0]).toMatchObject({
      id: 's1',
      firstName: 'Sam',
      lastName: 'Sitter',
      isActive: true,
    });
  });
});
