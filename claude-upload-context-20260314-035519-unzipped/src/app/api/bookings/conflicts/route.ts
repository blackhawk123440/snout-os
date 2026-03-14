/**
 * Canonical booking conflict list for calendar and command center.
 * Returns booking IDs that have at least one same-sitter, overlapping booking (schedule conflict).
 * Org-scoped.
 */

import { NextResponse } from 'next/server';
import { getRequestContext } from '@/lib/request-context';
import { ForbiddenError, requireAnyRole } from '@/lib/rbac';
import { getScopedDb } from '@/lib/tenancy';

function timeRangesOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return startA < endB && startB < endA;
}

export async function GET() {
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

  const db = getScopedDb(ctx);
  try {
    const bookings = await db.booking.findMany({
      where: {
        status: { not: 'cancelled' },
        sitterId: { not: null },
      },
      select: {
        id: true,
        sitterId: true,
        startAt: true,
        endAt: true,
      },
      orderBy: { startAt: 'asc' },
    });

    const conflictIds = new Set<string>();
    for (let i = 0; i < bookings.length; i++) {
      const a = bookings[i];
      const sitterA = a.sitterId!;
      const startA = a.startAt instanceof Date ? a.startAt : new Date(a.startAt);
      const endA = a.endAt instanceof Date ? a.endAt : new Date(a.endAt);

      for (let j = i + 1; j < bookings.length; j++) {
        const b = bookings[j];
        if (b.sitterId !== sitterA) continue;
        const startB = b.startAt instanceof Date ? b.startAt : new Date(b.startAt);
        const endB = b.endAt instanceof Date ? b.endAt : new Date(b.endAt);
        if (!timeRangesOverlap(startA, endA, startB, endB)) continue;
        conflictIds.add(a.id);
        conflictIds.add(b.id);
      }
    }

    return NextResponse.json(
      { conflictBookingIds: Array.from(conflictIds) },
      { status: 200, headers: { 'X-Snout-Route': 'bookings-conflicts', 'X-Snout-OrgId': ctx.orgId } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to load conflicts', message },
      { status: 500 }
    );
  }
}
