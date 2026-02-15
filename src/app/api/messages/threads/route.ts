/**
 * Messages Threads List Route
 * 
 * Specific route for GET /api/messages/threads to avoid conflict with [id] route.
 * This proxies to the NestJS API.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { mintApiJWT } from '@/lib/api/jwt';
import { prisma } from '@/lib/db';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function GET(request: NextRequest) {
  // Get NextAuth session
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const user = session.user as any;
  const orgId = user.orgId || 'default';

  // If API_BASE_URL is set, proxy to NestJS API
  if (API_BASE_URL) {

    // Mint API JWT token from session
    let apiToken: string;
    try {
      apiToken = await mintApiJWT({
        userId: user.id || user.email || '',
        orgId,
        role: user.role || (user.sitterId ? 'sitter' : 'owner'),
        sitterId: user.sitterId || null,
      });
    } catch (error: any) {
      console.error('[BFF Proxy] Failed to mint API JWT:', error);
      return NextResponse.json(
        { error: 'Failed to authenticate with API' },
        { status: 500 }
      );
    }

  // Preserve query string
  const searchParams = request.nextUrl.searchParams.toString();
  const apiUrl = `${API_BASE_URL}/api/messages/threads${searchParams ? `?${searchParams}` : ''}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      },
    });

    const contentType = response.headers.get('content-type');
    let responseData: any;
    
    if (contentType?.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      console.error('[BFF Proxy] API error response:', responseData);
      return NextResponse.json(responseData, {
        status: response.status,
        headers: {
          'Content-Type': contentType || 'application/json',
        },
      });
    }

    // Transform API response to match frontend expectations
    // API returns array directly, but frontend expects { threads: Thread[] }
    const transformedResponse = Array.isArray(responseData)
      ? { threads: responseData }
      : responseData;

    return NextResponse.json(transformedResponse, {
      status: response.status,
      headers: {
        'Content-Type': contentType || 'application/json',
      },
    });
    } catch (error: any) {
      console.error('[BFF Proxy] Failed to forward threads request:', error);
      return NextResponse.json(
        { error: 'Failed to reach API server', message: error.message },
        { status: 502 }
      );
    }
  }

  // Fallback: Direct Prisma implementation
  try {
    const searchParams = request.nextUrl.searchParams;
    const filters: any = {
      orgId,
    };

    // Apply filters from query params
    if (searchParams.get('sitterId')) {
      filters.sitterId = searchParams.get('sitterId');
    }
    if (searchParams.get('clientId')) {
      filters.clientId = searchParams.get('clientId');
    }
    if (searchParams.get('status')) {
      filters.status = searchParams.get('status');
    }
    if (searchParams.get('unreadOnly') === 'true') {
      filters.ownerUnreadCount = { gt: 0 };
    }

    const threads = await (prisma as any).thread.findMany({
      where: filters,
      include: {
        client: {
          include: {
            contacts: true,
          },
        },
        sitter: true,
        messageNumber: true,
        assignmentWindows: {
          where: {
            endsAt: { gte: new Date() },
          },
          orderBy: { startsAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastActivityAt: 'desc' },
    });

    return NextResponse.json({ threads }, {
      status: 200,
      headers: {
        'X-Snout-Route': 'prisma-fallback',
        'X-Snout-OrgId': orgId,
      },
    });
  } catch (error: any) {
    console.error('[Direct Prisma] Error fetching threads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch threads', details: error.message },
      { status: 500 }
    );
  }
}
