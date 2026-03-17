/**
 * POST /api/ops/daily-board/quick-assign
 * Quick-assign a sitter to an unassigned booking from the daily board.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getScopedDb } from '@/lib/tenancy';
import { getRequestContext } from '@/lib/request-context';
import { requireOwnerOrAdmin, ForbiddenError } from '@/lib/rbac';

const QuickAssignSchema = z.object({
  bookingId: z.string().min(1),
  sitterId: z.string().min(1),
});

export async function POST(request: NextRequest) {
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

  try {
    const body = await request.json();
    const parsed = QuickAssignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { bookingId, sitterId } = parsed.data;
    const db = getScopedDb(ctx);

    // Verify booking exists
    const booking = await db.booking.findFirst({
      where: { id: bookingId },
      select: { id: true, status: true, sitterId: true },
    });
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Verify sitter exists and is active
    const sitter = await db.sitter.findFirst({
      where: { id: sitterId, active: true, deletedAt: null },
      select: { id: true },
    });
    if (!sitter) {
      return NextResponse.json({ error: 'Sitter not found or inactive' }, { status: 404 });
    }

    // Assign sitter and confirm
    const updated = await db.booking.update({
      where: { id: bookingId },
      data: {
        sitterId,
        status: booking.status === 'pending' ? 'confirmed' : booking.status,
      },
      select: { id: true, sitterId: true, status: true },
    });

    return NextResponse.json({ success: true, booking: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to assign sitter', message },
      { status: 500 }
    );
  }
}
