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
import { isOwnerMailbox } from '@/lib/messaging/mailbox-helpers';

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
    
    // Handle scope filter: 'internal' means owner inbox (front_desk threads)
    // Owner inbox should NOT include sitter mailbox threads
    // Sitter mailbox = assignedSitterId IS NOT NULL AND scope IN ('client_booking', 'client_general')
    // Owner mailbox = scope = 'internal' OR (assignedSitterId IS NULL AND scope = 'owner_sitter')
    if (searchParams.get('scope') === 'internal' || searchParams.get('inbox') === 'owner') {
      filters.threadType = 'front_desk';
      // Explicitly exclude sitter mailbox threads from owner inbox
      filters.assignedSitterId = null;
      // Also exclude client_booking/client_general threads (sitter mailbox)
      filters.scope = { notIn: ['client_booking', 'client_general'] };
    }

    // Use try-catch for each relation to handle missing models gracefully
    let threads: any[];
    try {
      threads = await (prisma as any).thread.findMany({
        where: filters,
        include: {
          client: {
            include: {
              contacts: {
                where: {
                  orgId, // Ensure contacts are scoped to org
                },
              },
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
    } catch (relationError: any) {
      // If relation fails, try without relations
      console.warn('[Direct Prisma] Relation error, trying without relations:', relationError.message);
      threads = await (prisma as any).thread.findMany({
        where: filters,
        orderBy: { lastActivityAt: 'desc' },
      });
    }

    return NextResponse.json({ threads }, {
      status: 200,
      headers: {
        'X-Snout-Route': 'prisma-fallback',
        'X-Snout-OrgId': orgId,
      },
    });
  } catch (error: any) {
    console.error('[Direct Prisma] Error fetching threads:', error);
    console.error('[Direct Prisma] Error stack:', error.stack);
    console.error('[Direct Prisma] Error name:', error.name);
    console.error('[Direct Prisma] Error code:', error.code);
    console.error('[Direct Prisma] Prisma client available:', !!prisma);
    console.error('[Direct Prisma] Thread model available:', !!(prisma as any).thread);
    
    // Check if it's a Prisma model not found error
    if (error.message?.includes('model') || error.message?.includes('undefined')) {
      console.error('[Direct Prisma] Prisma model may not be available. Check schema generation.');
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch threads', 
        details: error.message,
        errorName: error.name,
        errorCode: error.code,
        // Only include stack in development
        ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {}),
      },
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
    // CRITICAL: Use upsert to enforce one phone per org at DB level
    // This prevents duplicates even under concurrent requests.
    // The UNIQUE constraint on ClientContact(orgId, e164) ensures atomicity.
    const contact = await (prisma as any).clientContact.upsert({
      where: {
        orgId_e164: {
          orgId,
          e164: normalizedPhone,
        },
      },
      update: {
        // Contact exists, no update needed
      },
      create: {
        orgId,
        e164: normalizedPhone,
        label: 'Mobile',
        verified: false,
        client: {
          create: {
            orgId,
            name: `Guest (${normalizedPhone})`,
          },
        },
      },
      include: {
        client: {
          include: {
            contacts: true,
          },
        },
      },
    });

    const client = contact.client;

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
      // Use the same send endpoint internally
      // This ensures consistent routing and number selection
      try {
        const sendResponse = await fetch(`${request.nextUrl.origin}/api/messages/threads/${thread.id}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('Cookie') || '',
          },
          body: JSON.stringify({
            body: initialMessage,
            forceSend: false,
          }),
        });

        if (!sendResponse.ok) {
          console.error('[Thread Creation] Failed to send initial message:', await sendResponse.text());
          // Don't fail thread creation if message send fails
        }
      } catch (error: any) {
        console.error('[Thread Creation] Error sending initial message:', error);
        // Don't fail thread creation if message send fails
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
