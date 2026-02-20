/**
 * Provider Status Route
 * 
 * GET /api/setup/provider/status
 * Returns provider connection status (connected/not connected)
 * Falls back to direct Prisma if NestJS API is not available
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { mintApiJWT } from '@/lib/api/jwt';
import { prisma } from '@/lib/db';
import { getProviderCredentials } from '@/lib/messaging/provider-credentials';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { connected: false, accountSid: null, hasAuthToken: false, lastTestedAt: null, testResult: null },
      { status: 401 }
    );
  }

  const user = session.user as any;
  const orgId = user.orgId || 'default';

  // Try NestJS API first if available
  if (API_BASE_URL) {
    try {
      const apiToken = await mintApiJWT({
        userId: user.id || user.email || '',
        orgId,
        role: user.role || (user.sitterId ? 'sitter' : 'owner'),
        sitterId: user.sitterId || null,
      });

      const apiUrl = `${API_BASE_URL}/api/setup/provider/status`;
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`,
        },
      });

      if (response.ok) {
        const responseData = await response.json();
        // Ensure response matches expected schema
        if (responseData.connected !== undefined) {
          return NextResponse.json(responseData, { status: 200 });
        }
      }
    } catch (error: any) {
      console.warn('[BFF Proxy] Failed to reach API, using fallback:', error.message);
      // Fall through to Prisma fallback
    }
  }

  // Fallback: Direct Prisma implementation
  const checkedAt = new Date().toISOString();
  try {
    const credentials = await getProviderCredentials(orgId);

    if (!credentials) {
      return NextResponse.json({
        connected: false,
        accountSid: null,
        hasAuthToken: false,
        lastTestedAt: null,
        testResult: null,
        checkedAt,
        verified: false,
      }, { status: 200 });
    }

    const maskedSid = credentials.accountSid
      ? `${credentials.accountSid.substring(0, 4)}...${credentials.accountSid.substring(credentials.accountSid.length - 4)}`
      : null;

    return NextResponse.json({
      connected: true,
      accountSid: maskedSid,
      hasAuthToken: !!credentials.authToken,
      lastTestedAt: null,
      testResult: null,
      checkedAt,
      verified: true,
    }, { status: 200 });
  } catch (error: any) {
    console.error('[Direct Prisma] Error fetching provider status:', error);
    return NextResponse.json({
      connected: false,
      accountSid: null,
      hasAuthToken: false,
      lastTestedAt: null,
      testResult: null,
      checkedAt,
      verified: false,
      errorDetail: error?.message || 'Failed to load credentials',
    }, { status: 200 });
  }
}
