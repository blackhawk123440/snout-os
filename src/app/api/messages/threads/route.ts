/**
 * Messages Threads List Route
 * 
 * Specific route for GET /api/messages/threads to avoid conflict with [id] route.
 * This proxies to the NestJS API.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { auth } from '@/lib/auth';
import { mintApiJWT } from '@/lib/api/jwt';
import { prisma } from '@/lib/db';
import { createClientContact, findClientContactByPhone } from '@/lib/messaging/client-contact-lookup';

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

  const searchParams = request.nextUrl.searchParams;

  // Try NestJS proxy when API_BASE_URL is set; on 5xx or network error, fall through to Prisma
  if (API_BASE_URL) {
    try {
      const apiToken = await mintApiJWT({
        userId: user.id || user.email || '',
        orgId,
        role: user.role || (user.sitterId ? 'sitter' : 'owner'),
        sitterId: user.sitterId || null,
      });
      const qs = searchParams.toString();
      const apiUrl = `${API_BASE_URL}/api/messages/threads${qs ? `?${qs}` : ''}`;
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiToken}` },
      });
      const contentType = response.headers.get('content-type');
      const responseData = contentType?.includes('application/json')
        ? await response.json()
        : await response.text();
      if (response.ok) {
        const transformed = Array.isArray(responseData) ? { threads: responseData } : responseData;
        return NextResponse.json(transformed, { status: response.status });
      }
      if (response.status >= 500) {
        console.warn('[BFF Proxy] API returned', response.status, '- using Prisma fallback');
      } else {
        return NextResponse.json(responseData, { status: response.status });
      }
    } catch (error: any) {
      console.warn('[BFF Proxy] Threads request failed, using Prisma fallback:', error?.message);
    }
  }

  // Direct Prisma (enterprise schema: Thread)
  try {
    const filters: any = { orgId };
    if (searchParams.get('sitterId')) filters.sitterId = searchParams.get('sitterId');
    if (searchParams.get('clientId')) filters.clientId = searchParams.get('clientId');
    if (searchParams.get('status')) filters.status = searchParams.get('status');
    if (searchParams.get('unreadOnly') === 'true') filters.ownerUnreadCount = { gt: 0 };
    if (searchParams.get('scope') === 'internal' || searchParams.get('inbox') === 'owner') {
      filters.threadType = 'front_desk';
      filters.sitterId = null;
    }

    let rows: any[];
    try {
      rows = await (prisma as any).thread.findMany({
        where: filters,
        include: {
          client: {
            include: { contacts: { select: { e164: true } } },
          },
          sitter: { select: { id: true, name: true } },
          messageNumber: { select: { id: true, e164: true, class: true, status: true } },
          assignmentWindows: {
            where: { endsAt: { gte: new Date() } },
            orderBy: { startsAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { lastActivityAt: 'desc' },
      });
    } catch (relErr: any) {
      console.warn('[Threads] Full include failed:', relErr?.message);
      rows = await (prisma as any).thread.findMany({
        where: filters,
        orderBy: { lastActivityAt: 'desc' },
      });
    }

    // Normalize to match frontend threadSchema (required fields + ISO dates)
    const threads = rows.map((t: any) => ({
      id: t.id,
      orgId: t.orgId,
      clientId: t.clientId,
      sitterId: t.sitterId ?? null,
      numberId: t.numberId,
      threadType: t.threadType ?? 'other',
      status: t.status ?? 'active',
      ownerUnreadCount: t.ownerUnreadCount ?? 0,
      lastActivityAt: t.lastActivityAt?.toISOString?.() ?? t.createdAt?.toISOString?.() ?? new Date().toISOString(),
      client: {
        id: t.client?.id ?? '',
        name: t.client?.name ?? 'Unknown',
        contacts: Array.isArray(t.client?.contacts) ? t.client.contacts.map((c: any) => ({ e164: c.e164 ?? '' })) : [],
      },
      sitter: t.sitter ? { id: t.sitter.id, name: t.sitter.name } : null,
      messageNumber: t.messageNumber
        ? {
            id: t.messageNumber.id,
            e164: t.messageNumber.e164 ?? '',
            class: t.messageNumber.class ?? 'front_desk',
            status: t.messageNumber.status ?? 'active',
          }
        : { id: '', e164: '', class: 'front_desk', status: 'active' },
      assignmentWindows: (t.assignmentWindows ?? []).map((w: any) => ({
        id: w.id,
        startsAt: w.startsAt?.toISOString?.() ?? '',
        endsAt: w.endsAt?.toISOString?.() ?? '',
      })),
    }));

    return NextResponse.json(
      { threads },
      { status: 200, headers: { 'X-Snout-Route': 'prisma-fallback', 'X-Snout-OrgId': orgId } }
    );
  } catch (error: any) {
    console.error('[Threads] Prisma error:', error?.message);
    return NextResponse.json(
      { error: 'Failed to fetch threads', details: error?.message },
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

  // Fallback: Direct Prisma implementation (ClientContact via raw SQL to avoid orgld bug)
  try {
    const existingContact = await findClientContactByPhone(orgId, normalizedPhone);
    let client: { id: string };

    if (existingContact) {
      const fetched = await (prisma as any).client.findUnique({
        where: { id: existingContact.clientId },
      });
      if (!fetched) {
        return NextResponse.json({ error: 'Client not found for contact' }, { status: 500 });
      }
      client = fetched;
    } else {
      const guestClient = await (prisma as any).client.create({
        data: { orgId, name: `Guest (${normalizedPhone})` },
      });
      await createClientContact({
        id: randomUUID(),
        orgId,
        clientId: guestClient.id,
        e164: normalizedPhone,
        label: 'Mobile',
        verified: false,
      });
      client = guestClient;
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
