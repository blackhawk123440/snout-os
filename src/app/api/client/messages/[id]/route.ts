import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/request-context';
import { ForbiddenError, requireRole } from '@/lib/rbac';
import { whereOrg } from '@/lib/org-scope';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let ctx;
  try {
    ctx = await getRequestContext();
    requireRole(ctx, 'client');
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!ctx.clientId) {
    return NextResponse.json({ error: 'Client profile missing on session' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const thread = await (prisma as any).messageThread.findFirst({
      where: whereOrg(ctx.orgId, { id, clientId: ctx.clientId }),
      include: {
        sitter: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    let booking = null;
    if (thread?.bookingId) {
      const b = await (prisma as any).booking.findFirst({
        where: whereOrg(ctx.orgId, { id: thread.bookingId }),
        select: { id: true, service: true, startAt: true },
      });
      booking = b;
    }

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    const events = await (prisma as any).messageEvent.findMany({
      where: { threadId: id, orgId: ctx.orgId },
      select: { id: true, body: true, direction: true, actorType: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    const toIso = (d: Date) => (d instanceof Date ? d.toISOString() : String(d));
    const messages = events.map((e: any) => ({
      id: e.id,
      body: e.body,
      direction: e.direction,
      actorType: e.actorType,
      createdAt: toIso(e.createdAt),
      isFromClient: e.actorType === 'client' || e.direction === 'inbound',
    }));

    return NextResponse.json({
      id: thread.id,
      status: thread.status,
      sitter: thread.sitter
        ? { id: thread.sitter.id, name: [thread.sitter.firstName, thread.sitter.lastName].filter(Boolean).join(' ').trim() || 'Sitter' }
        : null,
      booking: booking
        ? { id: booking.id, service: booking.service, startAt: toIso(booking.startAt) }
        : null,
      messages,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to load thread', message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let ctx;
  try {
    ctx = await getRequestContext();
    requireRole(ctx, 'client');
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!ctx.clientId) {
    return NextResponse.json({ error: 'Client profile missing on session' }, { status: 403 });
  }

  const { id } = await params;

  let body: { body?: string };
  try {
    body = await request.json().catch(() => ({}));
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const messageBody = typeof body?.body === 'string' ? body.body.trim() : '';
  if (!messageBody) {
    return NextResponse.json({ error: 'Message body cannot be empty' }, { status: 400 });
  }

  try {
    const thread = await (prisma as any).messageThread.findFirst({
      where: whereOrg(ctx.orgId, { id, clientId: ctx.clientId }),
    });

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    const event = await (prisma as any).messageEvent.create({
      data: {
        threadId: id,
        orgId: ctx.orgId,
        direction: 'outbound',
        actorType: 'client',
        actorClientId: ctx.clientId,
        body: messageBody,
        deliveryStatus: 'sent',
      },
    });

    await (prisma as any).messageThread.update({
      where: { id },
      data: { lastMessageAt: new Date(), lastOutboundAt: new Date() },
    });

    const toIso = (d: Date) => (d instanceof Date ? d.toISOString() : String(d));
    return NextResponse.json({
      id: event.id,
      body: event.body,
      direction: event.direction,
      actorType: event.actorType,
      createdAt: toIso(event.createdAt),
      isFromClient: true,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to send message', message },
      { status: 500 }
    );
  }
}
