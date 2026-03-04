import { NextResponse } from 'next/server';
import { getScopedDb } from '@/lib/tenancy';
import { getRequestContext } from '@/lib/request-context';
import { requireRole, ForbiddenError } from '@/lib/rbac';

const CHECKLIST_TYPES = new Set(['arrived', 'leash', 'fed', 'water', 'meds', 'locked_door']);

/**
 * PATCH /api/sitter/bookings/[id]/checklist
 * Body: { type: string, checked: boolean }
 */
export async function PATCH(
  request: Request,
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
  const db = getScopedDb(ctx);

  const body = await request.json().catch(() => ({} as { type?: string; checked?: boolean }));
  const type = typeof body.type === 'string' ? body.type : '';
  const checked = body.checked === true;

  if (!CHECKLIST_TYPES.has(type)) {
    return NextResponse.json({ error: 'Invalid checklist type' }, { status: 400 });
  }

  const booking = await db.booking.findFirst({
    where: { id, sitterId: ctx.sitterId },
    select: { id: true, orgId: true },
  });
  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  await db.bookingChecklistItem.upsert({
    where: { bookingId_type: { bookingId: id, type } },
    create: {
      orgId: ctx.orgId,
      bookingId: id,
      type,
      checkedAt: checked ? new Date() : null,
    },
    update: {
      checkedAt: checked ? new Date() : null,
    },
  });

  return NextResponse.json({ ok: true });
}
