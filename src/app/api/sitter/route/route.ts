/**
 * GET /api/sitter/route?date=YYYY-MM-DD
 * Returns Google Maps deep link for today's itinerary (MVP: waypoints as addresses)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/request-context';
import { requireRole, ForbiddenError } from '@/lib/rbac';
import { whereOrg } from '@/lib/org-scope';

export async function GET(request: NextRequest) {
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
    return NextResponse.json({ error: 'Sitter profile missing' }, { status: 403 });
  }

  const dateStr = request.nextUrl.searchParams.get('date');
  const date = dateStr ? new Date(dateStr) : new Date();
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  try {
    const bookings = await prisma.booking.findMany({
      where: whereOrg(ctx.orgId, {
        sitterId: ctx.sitterId,
        status: { in: ['pending', 'confirmed', 'in_progress'] },
        startAt: { gte: dayStart, lt: dayEnd },
      }),
      orderBy: { startAt: 'asc' },
      select: { id: true, address: true, pickupAddress: true, service: true, startAt: true },
    });

    const waypoints = bookings
      .map((b) => (b.service === 'Pet Taxi' ? b.pickupAddress : b.address))
      .filter((a): a is string => !!a && a.trim().length > 0);

    if (waypoints.length === 0) {
      return NextResponse.json({
        googleMapsUrl: null,
        waypoints: [],
        message: 'No addresses for today',
      });
    }

    const origin = encodeURIComponent(waypoints[0]);
    const destination = encodeURIComponent(waypoints[waypoints.length - 1]);
    const middle = waypoints.slice(1, -1).map((w) => encodeURIComponent(w));
    const waypointsParam = middle.length > 0 ? `&waypoints=${middle.join('|')}` : '';
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypointsParam}&travelmode=driving`;

    return NextResponse.json({
      googleMapsUrl,
      waypoints,
      bookingIds: bookings.map((b) => b.id),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to build route', message },
      { status: 500 }
    );
  }
}
