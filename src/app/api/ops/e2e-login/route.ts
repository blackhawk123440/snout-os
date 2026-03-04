/**
 * E2E Login Route
 * Creates a session for Playwright E2E tests without password verification.
 *
 * SECURITY: This endpoint is DISABLED in production except in CI. It is only enabled when:
 * - (NODE_ENV !== "production" OR CI === "true") AND
 * - (ENABLE_E2E_AUTH=true OR ENABLE_E2E_LOGIN=true) AND
 * - Valid x-e2e-key header matches E2E_AUTH_KEY
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const E2E_PASSWORD = 'e2e-test-password';

function getSetCookies(res: Response): string[] {
  const maybe = res.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof maybe.getSetCookie === 'function') {
    return maybe.getSetCookie();
  }
  const single = res.headers.get('set-cookie');
  return single ? [single] : [];
}

function parseCookiePair(setCookie: string): { name: string; value: string } | null {
  const first = setCookie.split(';')[0];
  const eq = first.indexOf('=');
  if (eq <= 0) return null;
  return { name: first.slice(0, eq), value: first.slice(eq + 1) };
}

function mergeCookies(target: Map<string, string>, setCookies: string[]) {
  for (const raw of setCookies) {
    const parsed = parseCookiePair(raw);
    if (parsed) target.set(parsed.name, parsed.value);
  }
}

function cookieHeader(cookies: Map<string, string>): string {
  return Array.from(cookies.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

function isE2eLoginAllowed(): boolean {
  const envName = (process.env.ENV_NAME || process.env.NEXT_PUBLIC_ENV || '').toLowerCase();
  const isStagingEnv = envName === 'staging';
  // In production, allow only in CI. Staging can opt-in via env flags + key.
  if (process.env.NODE_ENV === 'production' && process.env.CI !== 'true' && !isStagingEnv) return false;
  const enabled =
    process.env.ENABLE_E2E_AUTH === 'true' || process.env.ENABLE_E2E_LOGIN === 'true';
  return enabled;
}

export async function POST(req: NextRequest) {
  try {
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

    if (!user.email) {
      return NextResponse.json({ error: `User ${email} has no email` }, { status: 500 });
    }

    const roleMatch = role === (user.role || '').toLowerCase() ||
      (role === 'sitter' && user.sitter?.id) ||
      (role === 'client' && user.client?.id);
    if (!roleMatch) {
      return NextResponse.json({ error: `User ${email} does not have role ${role}` }, { status: 403 });
    }

    const base = req.nextUrl.origin;
    const jar = new Map<string, string>();
    const csrfRes = await fetch(new URL('/api/auth/csrf', base), { redirect: 'manual' });
    mergeCookies(jar, getSetCookies(csrfRes));
    const { csrfToken } = await csrfRes.json().catch(() => ({}));
    if (!csrfToken) {
      return NextResponse.json({ error: 'Failed to get CSRF token' }, { status: 500 });
    }

    const signInRes = await fetch(new URL('/api/auth/callback/credentials', base), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookieHeader(jar),
      },
      body: new URLSearchParams({
        email: user.email,
        password: E2E_PASSWORD,
        csrfToken,
        callbackUrl: `${base}/`,
        json: 'true',
      }),
      redirect: 'manual',
    });

    const signInSetCookies = getSetCookies(signInRes);
    // NextAuth credentials callback returns 302 redirect on success; treat 302 + Set-Cookie as success
    const success = signInRes.ok || (signInRes.status === 302 && signInSetCookies.length > 0);
    if (!success) {
      return NextResponse.json({ error: 'Sign-in failed', status: signInRes.status }, { status: 500 });
    }

    const res = NextResponse.json({ ok: true });
    for (const cookie of signInSetCookies) {
      res.headers.append('Set-Cookie', cookie);
    }
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[api/ops/e2e-login] Unexpected failure:', message);
    return NextResponse.json({ error: 'E2E login internal error', message }, { status: 500 });
  }
}
