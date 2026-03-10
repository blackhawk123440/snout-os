import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/env', () => ({
  env: {
    ENABLE_AUTH_PROTECTION: true,
    ENABLE_SITTER_AUTH: false,
    ENABLE_PERMISSION_CHECKS: true,
  },
}));

vi.mock('@/lib/public-routes', () => ({
  isPublicRoute: (pathname: string) => pathname === '/api/health',
}));

vi.mock('@/lib/protected-routes', () => ({
  isProtectedRoute: (pathname: string) => pathname.startsWith('/api/bookings') || pathname === '/settings',
}));

vi.mock('@/lib/sitter-routes', () => ({
  isSitterRoute: () => false,
  isSitterRestrictedRoute: () => false,
}));

vi.mock('@/lib/client-routes', () => ({
  isClientRoute: () => false,
}));

const sessionMock = vi.fn();
vi.mock('@/lib/auth-helpers', () => ({
  getSessionSafe: (...args: unknown[]) => sessionMock(...args),
}));

vi.mock('@/lib/sitter-helpers', () => ({
  getCurrentSitterId: vi.fn(),
}));

import { middleware } from '@/middleware';

describe('middleware protection behavior', () => {
  it('returns 401 for protected API route without session', async () => {
    sessionMock.mockResolvedValueOnce(null);
    const request = new NextRequest('http://localhost/api/bookings');
    const response = await middleware(request);
    expect(response.status).toBe(401);
  });

  it('redirects page route to login without session', async () => {
    sessionMock.mockResolvedValueOnce(null);
    const request = new NextRequest('http://localhost/settings');
    const response = await middleware(request);
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login');
  });

  it('allows protected API route with a session', async () => {
    sessionMock.mockResolvedValue({ user: { id: 'u1' } });
    const request = new NextRequest('http://localhost/api/bookings');
    const response = await middleware(request);
    expect(response.status).toBe(200);
  });
});
