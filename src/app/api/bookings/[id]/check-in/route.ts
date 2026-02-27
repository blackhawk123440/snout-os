import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/request-context';
import { requireRole, ForbiddenError } from '@/lib/rbac';
import { whereOrg } from '@/lib/org-scope';

/**
 * POST /api/bookings/[id]/check-in
 * Updates booking status to in_progress for sitter check-in. Requires SITTER role.
 */
export async function POST(
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
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (!['pending', 'confirmed'].includes(booking.status)) {
      return NextResponse.json(
        { error: `Cannot check in: booking is ${booking.status}` },
        { status: 400 }
      );
    }

    await prisma.booking.update({
      where: { id },
      data: { status: 'in_progress' },
    });

    return NextResponse.json({ ok: true, status: 'in_progress' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Check-in failed', message },
      { status: 500 }
    );
  }
}
