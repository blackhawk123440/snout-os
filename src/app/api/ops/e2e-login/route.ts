/**
 * E2E Authentication Route
 * 
 * Test-only endpoint that mints NextAuth JWT session cookies for Playwright tests.
 * Hard-gated to prevent use in production.
 * 
 * Security:
 * - Only enabled when NODE_ENV === 'test' OR ENABLE_E2E_AUTH === 'true'
 * - Requires x-e2e-key header matching E2E_AUTH_KEY env var
 * - Returns 404 (not 403) if gate fails to prevent discovery
 */

import { NextRequest, NextResponse } from 'next/server';
import { encode } from 'next-auth/jwt';
import { prisma } from '@/lib/db';
import { getDefaultOrgId } from '@/lib/messaging/org-helpers';

/**
 * Check if E2E auth is enabled
 */
function isE2EAuthEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'test' ||
    process.env.ENABLE_E2E_AUTH === 'true'
  );
}

/**
 * Verify E2E auth key
 */
function verifyE2EKey(request: NextRequest): boolean {
  const key = request.headers.get('x-e2e-key');
  const expectedKey = process.env.E2E_AUTH_KEY;
  return !!expectedKey && key === expectedKey;
}

/**
 * Get NextAuth secret
 */
function getNextAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is required for E2E auth');
  }
  return secret;
}

/**
 * Get cookie name based on environment
 */
function getCookieName(): string {
  const isSecure = process.env.NODE_ENV === 'production' || 
                   process.env.NEXTAUTH_URL?.startsWith('https');
  return isSecure 
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token';
}

export async function POST(request: NextRequest) {
  // Security gate: return 404 if not enabled or key doesn't match
  if (!isE2EAuthEnabled() || !verifyE2EKey(request)) {
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    const { role, email } = body;

    if (!role || !email) {
      return NextResponse.json(
        { error: 'Missing role or email' },
        { status: 400 }
      );
    }

    if (role !== 'owner' && role !== 'sitter') {
      return NextResponse.json(
        { error: 'Invalid role. Must be "owner" or "sitter"' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        sitterId: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify role matches
    if (role === 'sitter' && !user.sitterId) {
      return NextResponse.json(
        { error: 'User is not a sitter' },
        { status: 400 }
      );
    }
    if (role === 'owner' && user.sitterId) {
      return NextResponse.json(
        { error: 'User is a sitter, not an owner' },
        { status: 400 }
      );
    }

    // Get orgId (required for JWT)
    const orgId = getDefaultOrgId();

    // Create JWT token payload matching NextAuth v5 structure
    // NextAuth v5 expects: sub (user ID), and custom fields from jwt callback
    // The jwt callback sets: id, email, name, sitterId
    const now = Math.floor(Date.now() / 1000);
    const tokenPayload: any = {
      sub: user.id, // Required: subject (user ID)
      id: user.id,
      email: user.email,
      name: user.name,
      sitterId: user.sitterId || null,
      orgId: orgId,
      iat: now, // Issued at
      exp: now + (30 * 24 * 60 * 60), // Expires in 30 days
    };

    // Encode JWT using NextAuth's encoder
    const secret = getNextAuthSecret();
    const token = await encode({
      token: tokenPayload,
      secret: secret,
    });

    // Set cookie
    const cookieName = getCookieName();
    const isSecure = process.env.NODE_ENV === 'production' || 
                     process.env.NEXTAUTH_URL?.startsWith('https');
    
    const cookieOptions = [
      `${cookieName}=${token}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      `Max-Age=${30 * 24 * 60 * 60}`, // 30 days
    ];

    if (isSecure) {
      cookieOptions.push('Secure');
    }

    // Emit audit event (console log for now)
    console.log('[E2E Auth] Session issued', {
      eventType: 'e2e.auth.issued',
      userId: user.id,
      email: user.email,
      role: role,
      orgId: orgId,
      timestamp: new Date().toISOString(),
    });

    // Return success with Set-Cookie header
    const response = NextResponse.json({ ok: true });
    response.headers.set('Set-Cookie', cookieOptions.join('; '));
    
    return response;
  } catch (error: any) {
    console.error('[E2E Auth] Error:', error);
    console.error('[E2E Auth] Error stack:', error.stack);
    console.error('[E2E Auth] Error message:', error.message);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
