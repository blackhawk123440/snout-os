import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/request-context';
import { requireRole, ForbiddenError } from '@/lib/rbac';
import { whereOrg } from '@/lib/org-scope';

/**
 * GET /api/sitter/bookings/[id]
 * Returns a single booking for the current sitter. Requires SITTER role.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let ctx;
  try {
    ctx = await getRequestContext();
    requireRole(ctx, 'sitter');
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!ctx.sitterId) {
    return NextResponse.json({ error: 'Sitter profile missing on session' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const booking = await prisma.booking.findFirst({
      where: whereOrg(ctx.orgId, {
        id,
        sitterId: ctx.sitterId,
      }),
      include: {
        pets: { select: { id: true, name: true, species: true, breed: true, notes: true } },
        client: { select: { firstName: true, lastName: true, phone: true, email: true } },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const thread = await prisma.messageThread.findFirst({
      where: whereOrg(ctx.orgId, {
        bookingId: booking.id,
        assignedSitterId: ctx.sitterId,
      }),
      select: { id: true },
    });

    const toIso = (d: Date | string) => (d instanceof Date ? d.toISOString() : d);

    return NextResponse.json({
      id: booking.id,
      status: booking.status,
      service: booking.service,
      startAt: toIso(booking.startAt),
      endAt: toIso(booking.endAt),
      address: booking.address,
      pickupAddress: booking.pickupAddress,
      dropoffAddress: booking.dropoffAddress,
      notes: booking.notes,
      totalPrice: booking.totalPrice,
      clientName:
        `${booking.client?.firstName || ''} ${booking.client?.lastName || ''}`.trim() || 'Client',
      client: booking.client,
      pets: booking.pets,
      threadId: thread?.id ?? null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to load booking', message },
      { status: 500 }
    );
  }
}
