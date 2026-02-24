import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

const GetQuerySchema = z.object({
  orgId: z.string().min(1).optional(),
  sitterId: z.string().optional(),
  clientId: z.string().optional(),
  status: z.string().optional(),
  unreadOnly: z.coerce.boolean().optional(),
  scope: z.string().optional(),
  inbox: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orgId = (session.user as { orgId?: string }).orgId ?? 'default';

  const parsed = GetQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid query' }, { status: 400 });

  const { sitterId, clientId, status, unreadOnly, scope, inbox, limit, cursor } = parsed.data;

  const where: {
    orgId: string;
    assignedSitterId?: string | null;
    clientId?: string;
    status?: string;
    threadType?: string;
    ownerUnreadCount?: { gt: number };
  } = { orgId };
  if (sitterId) where.assignedSitterId = sitterId;
  if (clientId) where.clientId = clientId;
  if (status) where.status = status;
  if (unreadOnly) where.ownerUnreadCount = { gt: 0 };
  if (scope === 'internal' || inbox === 'owner') {
    where.threadType = 'front_desk';
    where.assignedSitterId = null;
  }

  const rows = await prisma.messageThread.findMany({
    where,
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { lastMessageAt: 'desc' },
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

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  const threads = items.map((t) => ({
    id: t.id,
    orgId: t.orgId,
    clientId: t.clientId ?? undefined,
    sitterId: t.assignedSitterId ?? null,
    numberId: t.messageNumberId ?? undefined,
    threadType: t.threadType ?? 'other',
    status: t.status ?? 'active',
    ownerUnreadCount: t.ownerUnreadCount ?? 0,
    lastActivityAt: (t.lastMessageAt ?? t.createdAt).toISOString(),
    client: {
      id: t.client?.id ?? '',
      name: t.client ? `${t.client.firstName} ${t.client.lastName}`.trim() || 'Unknown' : 'Unknown',
      contacts: [],
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
  }));

  return NextResponse.json(
    { threads, nextCursor, hasMore },
    { status: 200, headers: { 'X-Snout-Route': 'prisma', 'X-Snout-OrgId': orgId } }
  );
}

const PostBodySchema = z.object({
  phoneNumber: z.string().min(10),
  initialMessage: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== 'owner') {
    return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
  }

  const orgId = (session.user as { orgId?: string }).orgId ?? 'default';
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const parsed = PostBodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const { phoneNumber, initialMessage } = parsed.data;
  const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

  let client = await prisma.client.findUnique({
    where: { orgId_phone: { orgId, phone: normalizedPhone } },
  });

  if (!client) {
    client = await prisma.client.create({
      data: {
        orgId,
        firstName: 'Guest',
        lastName: normalizedPhone,
        phone: normalizedPhone,
      },
    });
  }

  let thread = await prisma.messageThread.findFirst({
    where: { orgId, clientId: client.id },
  });
  const reused = !!thread;

  if (!thread) {
    const frontDeskNumber = await prisma.messageNumber.findFirst({
      where: { orgId, numberClass: 'front_desk', status: 'active' },
    });

    if (!frontDeskNumber) {
      return NextResponse.json(
        { error: 'Front desk number not configured. Please set up messaging numbers first.' },
        { status: 400 }
      );
    }

    thread = await prisma.messageThread.create({
      data: {
        orgId,
        clientId: client.id,
        messageNumberId: frontDeskNumber.id,
        threadType: 'front_desk',
        numberClass: 'front_desk',
        scope: 'client_general',
        status: 'active',
      },
    });

    const clientName = `${client.firstName} ${client.lastName}`.trim() || 'Client';
    const userId = (session.user as { id?: string; email?: string }).id ?? (session.user as { email?: string }).email ?? '';
    await prisma.messageParticipant.createMany({
      data: [
        {
          threadId: thread.id,
          orgId,
          role: 'client',
          clientId: client.id,
          displayName: clientName,
          realE164: normalizedPhone,
        },
        {
          threadId: thread.id,
          orgId,
          role: 'owner',
          userId,
          displayName: 'Owner',
          realE164: frontDeskNumber.e164,
        },
      ],
    });
  }

  if (initialMessage) {
    try {
      const sendRes = await fetch(`${req.nextUrl.origin}/api/messages/threads/${thread.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': req.headers.get('Cookie') ?? '' },
        body: JSON.stringify({ body: initialMessage, forceSend: false }),
      });
      if (!sendRes.ok) console.error('[Thread Creation] Failed to send initial message:', await sendRes.text());
    } catch (err) {
      console.error('[Thread Creation] Error sending initial message:', err);
    }
  }

  return NextResponse.json(
    { threadId: thread.id, clientId: client.id, reused },
    { status: 200, headers: { 'X-Snout-Route': 'prisma', 'X-Snout-OrgId': orgId } }
  );
}
