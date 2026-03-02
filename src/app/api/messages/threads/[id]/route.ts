/**
 * Get Thread Details Route
 *
 * GET /api/messages/threads/[id]
 * When NEXT_PUBLIC_API_URL is set: proxies to NestJS API.
 * Otherwise: reads from Prisma MessageThread (source of truth).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { mintApiJWT } from '@/lib/api/jwt';
import { getScopedDb } from '@/lib/tenancy';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const threadId = params.id;

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orgId = (session.user as { orgId?: string }).orgId ?? 'default';

  if (API_BASE_URL) {
    let apiToken: string;
    try {
      const user = session.user as any;
      apiToken = await mintApiJWT({
        userId: user.id || user.email || '',
        orgId,
        role: user.role || (user.sitterId ? 'sitter' : 'owner'),
        sitterId: user.sitterId || null,
      });
    } catch (error: any) {
      console.error('[BFF Proxy] Failed to mint API JWT:', error);
      return NextResponse.json({ error: 'Failed to authenticate with API' }, { status: 500 });
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/threads/${threadId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        return NextResponse.json(
          { error: errorData.error || 'Failed to fetch thread' },
          { status: response.status }
        );
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (error: any) {
      console.error('[BFF Proxy] Error fetching thread:', error);
      return NextResponse.json(
        { error: 'Failed to fetch thread' },
        { status: 500 }
      );
    }
  }

  // Prisma source of truth (scoped by orgId)
  const db = getScopedDb({ orgId });
  const t = await db.messageThread.findUnique({
    where: { id: threadId },
    include: {
      messageNumber: { select: { id: true, e164: true, numberClass: true, status: true } },
      assignmentWindows: {
        where: { endAt: { gte: new Date() } },
        orderBy: { startAt: 'desc' },
        take: 1,
      },
      client: { select: { id: true, firstName: true, lastName: true } },
      sitter: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (!t) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
  }

  const thread = {
    id: t.id,
    orgId: t.orgId,
    clientId: t.clientId ?? '',
    sitterId: t.assignedSitterId ?? null,
    numberId: t.messageNumberId ?? '',
    threadType: (t.threadType ?? 'other') as 'front_desk' | 'assignment' | 'pool' | 'other',
    status: (t.status ?? 'active') as 'active' | 'inactive',
    ownerUnreadCount: t.ownerUnreadCount ?? 0,
    lastActivityAt: (t.lastMessageAt ?? t.createdAt).toISOString(),
    client: {
      id: t.client?.id ?? '',
      name: t.client ? `${t.client.firstName} ${t.client.lastName}`.trim() || 'Unknown' : 'Unknown',
      contacts: [] as { e164: string }[],
    },
    sitter: t.sitter
      ? { id: t.sitter.id, name: `${t.sitter.firstName} ${t.sitter.lastName}`.trim() }
      : null,
    messageNumber: t.messageNumber
      ? {
          id: t.messageNumber.id,
          e164: t.messageNumber.e164 ?? '',
          class: t.messageNumber.numberClass ?? 'front_desk',
          status: t.messageNumber.status ?? 'active',
        }
      : { id: '', e164: '', class: 'front_desk' as const, status: 'active' },
    assignmentWindows: t.assignmentWindows.map((w) => ({
      id: w.id,
      startsAt: w.startAt.toISOString(),
      endsAt: w.endAt.toISOString(),
    })),
  };

  return NextResponse.json(
    { thread },
    { status: 200, headers: { 'X-Snout-Route': 'prisma', 'X-Snout-OrgId': orgId } }
  );
}
