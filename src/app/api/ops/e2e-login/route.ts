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
import { handlers } from '@/lib/auth';
import { prisma } from '@/lib/db';

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

    // Use NextAuth's handlers.POST to create session via credentials callback
    // This ensures NextAuth's internal JWT encoding logic is used
    const callbackUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/callback/credentials`;
    const formData = new URLSearchParams({
      email: user.email || '', // Handle null case
      password: 'password', // Value doesn't matter when E2E_AUTH is enabled (bypassed in authorize)
      redirect: 'false',
      json: 'true',
    });

    const authRequest = new NextRequest(callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const { POST } = handlers;
    const authResponse = await POST(authRequest);

    // NextAuth returns 302 on success - extract Set-Cookie from response
    const setCookieHeader = authResponse.headers.get('Set-Cookie');
    
    if (!setCookieHeader && authResponse.status !== 302) {
      // Check if there's an error
      try {
        const errorData = await authResponse.json();
        return NextResponse.json(
          { error: 'Authentication failed', details: errorData },
          { status: authResponse.status }
        );
      } catch {
        // Response might not be JSON
        return NextResponse.json(
          { error: 'Authentication failed' },
          { status: authResponse.status }
        );
      }
    }

    // Emit audit event
    console.log('[E2E Auth] Session issued', {
      eventType: 'e2e.auth.issued',
      userId: user.id,
      email: user.email,
      role: role,
      timestamp: new Date().toISOString(),
    });

    // Return success with Set-Cookie header
    const response = NextResponse.json({ ok: true });
    if (setCookieHeader) {
      // NextAuth may set multiple cookies - handle all of them
      const cookies = setCookieHeader.split(',').map(c => c.trim());
      for (const cookie of cookies) {
        response.headers.append('Set-Cookie', cookie);
      }
    }
    
    return response;
  } catch (error: any) {
    // Do NOT log secrets
    console.error('[E2E Auth] Error:', error.message);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
