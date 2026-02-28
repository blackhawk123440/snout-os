import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/request-context';
import { ForbiddenError, requireRole } from '@/lib/rbac';
import { whereOrg } from '@/lib/org-scope';

export async function GET() {
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

  try {
    const threads = await (prisma as any).messageThread.findMany({
      where: whereOrg(ctx.orgId, { clientId: ctx.clientId }),
      select: {
        id: true,
        status: true,
        lastMessageAt: true,
        createdAt: true,
        bookingId: true,
        sitter: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 50,
    });

    const bookingIds = [...new Set(threads.map((t: any) => t.bookingId).filter(Boolean))];
    const bookings = bookingIds.length > 0
      ? await (prisma as any).booking.findMany({
          where: whereOrg(ctx.orgId, { id: { in: bookingIds } }),
          select: { id: true, service: true, startAt: true },
        })
      : [];
    const bookingMap = Object.fromEntries(bookings.map((b: any) => [b.id, b]));

    const toIso = (d: Date | null) => (d instanceof Date ? d.toISOString() : null);
    const payload = threads.map((t: any) => ({
      id: t.id,
      status: t.status,
      lastActivityAt: toIso(t.lastMessageAt) ?? toIso(t.createdAt),
      sitter: t.sitter
        ? { id: t.sitter.id, name: [t.sitter.firstName, t.sitter.lastName].filter(Boolean).join(' ').trim() || 'Sitter' }
        : null,
      booking: t.bookingId && bookingMap[t.bookingId]
        ? { id: bookingMap[t.bookingId].id, service: bookingMap[t.bookingId].service, startAt: toIso(bookingMap[t.bookingId].startAt) }
        : null,
      preview: null,
    }));

    return NextResponse.json({ threads: payload });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to load messages', message },
      { status: 500 }
    );
  }
}
