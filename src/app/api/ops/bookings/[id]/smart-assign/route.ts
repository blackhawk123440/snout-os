/**
 * GET /api/ops/bookings/[id]/smart-assign
 * Returns top 5 AI-ranked sitter matches for a booking.
 */

import { NextResponse } from 'next/server';
import { getRequestContext } from '@/lib/request-context';
import { requireAnyRole, ForbiddenError } from '@/lib/rbac';
import { getScopedDb } from '@/lib/tenancy';
import { rankSittersForBooking } from '@/lib/matching/sitter-matcher';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let ctx;
  try {
    ctx = await getRequestContext();
    requireAnyRole(ctx, ['owner', 'admin']);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: bookingId } = await params;

  try {
    const db = getScopedDb(ctx);

    // Load the booking to get service, time, clientId
    const booking = await db.booking.findFirst({
      where: { id: bookingId },
      select: {
        id: true,
        service: true,
        startAt: true,
        endAt: true,
        clientId: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (!booking.clientId) {
      return NextResponse.json(
        { error: 'Booking has no associated client' },
        { status: 400 },
      );
    }

    const allMatches = await rankSittersForBooking({
      orgId: ctx.orgId,
      service: booking.service,
      startAt: booking.startAt,
      endAt: booking.endAt,
      clientId: booking.clientId,
    });

    // Return top 5 matches
    const matches = allMatches.slice(0, 5);

    return NextResponse.json({ matches });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to get sitter matches', message },
      { status: 500 },
    );
  }
}
