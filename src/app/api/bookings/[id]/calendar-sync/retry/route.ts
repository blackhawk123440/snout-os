import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getRequestContext } from '@/lib/request-context';
import { ForbiddenError, requireAnyRole } from '@/lib/rbac';
import { getScopedDb } from '@/lib/tenancy';
import { enqueueCalendarSync } from '@/lib/calendar-queue';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
  const db = getScopedDb(ctx);
  const booking = await db.booking.findFirst({
    where: { id: bookingId },
    select: { id: true, sitterId: true, status: true },
  });

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  if (!booking.sitterId) return NextResponse.json({ error: 'Booking has no sitter assignment' }, { status: 409 });
  if (booking.status === 'cancelled') {
    return NextResponse.json({ error: 'Cancelled bookings cannot be re-synced' }, { status: 409 });
  }

  const correlationId = randomUUID();
  const dedupeBucket = Math.floor(Date.now() / 30000);
  const jobId = await enqueueCalendarSync({
    type: 'upsert',
    bookingId: booking.id,
    orgId: ctx.orgId,
    action: 'retry',
    correlationId,
    idempotencyKey: `${ctx.orgId}:retry:${booking.id}:${dedupeBucket}`,
  });

  return NextResponse.json({ ok: true, jobId, correlationId });
}
