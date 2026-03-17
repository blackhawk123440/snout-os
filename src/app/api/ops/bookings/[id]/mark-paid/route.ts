/**
 * POST /api/ops/bookings/[id]/mark-paid
 * Mark a booking as paid (for cash/check payments outside Stripe).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getScopedDb } from '@/lib/tenancy';
import { getRequestContext } from '@/lib/request-context';
import { requireOwnerOrAdmin, ForbiddenError } from '@/lib/rbac';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let ctx;
  try {
    ctx = await getRequestContext();
    requireOwnerOrAdmin(ctx);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const db = getScopedDb(ctx);

  try {
    const booking = await db.booking.findFirst({
      where: { id },
      select: { id: true, paymentStatus: true, status: true },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.paymentStatus === 'paid') {
      return NextResponse.json({ success: true, message: 'Already paid' });
    }

    await db.booking.update({
      where: { id },
      data: {
        paymentStatus: 'paid',
        status: booking.status === 'pending' ? 'confirmed' : booking.status,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to mark as paid', message },
      { status: 500 }
    );
  }
}
