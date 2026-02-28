/**
 * E2E Login Route
 * Creates a session for Playwright E2E tests without password verification.
 *
 * SECURITY: This endpoint is DISABLED in production. It is only enabled when:
 * - NODE_ENV !== "production" AND
 * - (ENABLE_E2E_AUTH=true OR ENABLE_E2E_LOGIN=true) AND
 * - Valid x-e2e-key header matches E2E_AUTH_KEY
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const E2E_PASSWORD = 'e2e-test-password';

function isE2eLoginAllowed(): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  const enabled =
    process.env.ENABLE_E2E_AUTH === 'true' || process.env.ENABLE_E2E_LOGIN === 'true';
  return enabled;
}

export async function POST(req: NextRequest) {
  if (!isE2eLoginAllowed()) {
    return NextResponse.json({ error: 'E2E login disabled' }, { status: 403 });
  }

  const key = req.headers.get('x-e2e-key');
  const expected = process.env.E2E_AUTH_KEY || 'test-e2e-key-change-in-production';
  if (!key || key !== expected) {
    return NextResponse.json({ error: 'Invalid or missing x-e2e-key' }, { status: 401 });
  }

  let body: { role?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const role = (body.role || 'owner').toLowerCase();
  const email = body.email || (role === 'owner' ? 'owner@example.com' : role === 'sitter' ? 'sitter@example.com' : 'client@example.com');

  const user = await (prisma as any).user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      orgId: true,
      role: true,
      sitter: { select: { id: true } },
      client: { select: { id: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: `User not found: ${email}` }, { status: 404 });
  }

  const roleMatch = role === (user.role || '').toLowerCase() ||
    (role === 'sitter' && user.sitter?.id) ||
    (role === 'client' && user.client?.id);
  if (!roleMatch) {
    return NextResponse.json({ error: `User ${email} does not have role ${role}` }, { status: 403 });
  }

  const base = req.nextUrl.origin;
  const csrfRes = await fetch(`${base}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json().catch(() => ({}));
  if (!csrfToken) {
    return NextResponse.json({ error: 'Failed to get CSRF token' }, { status: 500 });
  }

  const signInRes = await fetch(`${base}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      email: user.email,
      password: E2E_PASSWORD,
      csrfToken,
      callbackUrl: `${base}/`,
      json: 'true',
    }),
    redirect: 'manual',
  });

  const setCookie = signInRes.headers.get('set-cookie');
  const res = NextResponse.json({ ok: signInRes.ok });
  if (setCookie) {
    res.headers.set('Set-Cookie', setCookie);
  }
  if (!signInRes.ok) {
    return NextResponse.json({ error: 'Sign-in failed', status: signInRes.status }, { status: 500 });
  }
  return res;
}
