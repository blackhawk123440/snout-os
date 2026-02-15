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

export async function POST(request: NextRequest) {
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

  // Check if user is owner
  if (user.role !== 'owner') {
    return NextResponse.json(
      { error: 'Owner access required' },
      { status: 403 }
    );
  }

  let body: { phoneNumber: string; initialMessage?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const { phoneNumber, initialMessage } = body;

  if (!phoneNumber) {
    return NextResponse.json(
      { error: 'Phone number is required' },
      { status: 400 }
    );
  }

  // Normalize phone number to E.164
  const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

  // If API_BASE_URL is set, proxy to NestJS API
  if (API_BASE_URL) {
    let apiToken: string;
    try {
      apiToken = await mintApiJWT({
        userId: user.id || user.email || '',
        orgId,
        role: 'owner',
        sitterId: null,
      });
    } catch (error: any) {
      console.error('[BFF Proxy] Failed to mint API JWT:', error);
      return NextResponse.json(
        { error: 'Failed to authenticate with API' },
        { status: 500 }
      );
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/messages/threads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          phoneNumber: normalizedPhone,
          initialMessage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        return NextResponse.json(
          { error: errorData.error || 'Failed to create thread' },
          { status: response.status }
        );
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (error: any) {
      console.error('[BFF Proxy] Failed to create thread:', error);
      return NextResponse.json(
        { error: 'Failed to reach API server', message: error.message },
        { status: 502 }
      );
    }
  }

  // Fallback: Direct Prisma implementation
  try {
    // Find or create client by phone number
    let client = await (prisma as any).client.findFirst({
      where: {
        orgId,
        contacts: {
          some: {
            e164: normalizedPhone,
          },
        },
      },
      include: {
        contacts: true,
      },
    });

    if (!client) {
      // Create guest client
      client = await (prisma as any).client.create({
        data: {
          orgId,
          name: `Guest (${normalizedPhone})`,
          contacts: {
            create: {
              e164: normalizedPhone,
              label: 'Mobile',
              verified: false,
            },
          },
        },
        include: {
          contacts: true,
        },
      });
    }

    // Find or create thread (one thread per client per org)
    let thread = await (prisma as any).thread.findUnique({
      where: {
        orgId_clientId: {
          orgId,
          clientId: client.id,
        },
      },
    });

    if (!thread) {
      // Get front desk number (business/master number for owner sends)
      const frontDeskNumber = await (prisma as any).messageNumber.findFirst({
        where: {
          orgId,
          class: 'front_desk',
          status: 'active',
        },
      });

      if (!frontDeskNumber) {
        return NextResponse.json(
          { error: 'Front desk number not configured. Please set up messaging numbers first.' },
          { status: 400 }
        );
      }

      // Create thread with front_desk number
      thread = await (prisma as any).thread.create({
        data: {
          orgId,
          clientId: client.id,
          numberId: frontDeskNumber.id,
          threadType: 'front_desk',
          status: 'active',
          participants: {
            create: [
              { participantType: 'client', participantId: client.id },
              { participantType: 'owner', participantId: user.id },
            ],
          },
        },
      });
    }

    // Send initial message if provided
    if (initialMessage) {
      // Get front desk number for sending
      const frontDeskNumber = await (prisma as any).messageNumber.findFirst({
        where: {
          orgId,
          class: 'front_desk',
          status: 'active',
        },
      });

      if (frontDeskNumber) {
        // Create message record
        await (prisma as any).message.create({
          data: {
            orgId,
            threadId: thread.id,
            direction: 'outbound',
            senderType: 'owner',
            senderId: user.id,
            body: initialMessage,
            createdAt: new Date(),
          },
        });

        // Update thread activity
        await (prisma as any).thread.update({
          where: { id: thread.id },
          data: {
            lastActivityAt: new Date(),
            lastOutboundAt: new Date(),
          },
        });

        // TODO: Actually send via provider (Twilio)
        // This would call the messaging provider to send the SMS
      }
    }

    return NextResponse.json({
      threadId: thread.id,
      clientId: client.id,
      reused: !!thread,
    }, {
      status: 200,
      headers: {
        'X-Snout-Route': 'prisma-fallback',
        'X-Snout-OrgId': orgId,
      },
    });
  } catch (error: any) {
    console.error('[Direct Prisma] Error creating thread:', error);
    return NextResponse.json(
      { error: 'Failed to create thread', details: error.message },
      { status: 500 }
    );
  }
}
