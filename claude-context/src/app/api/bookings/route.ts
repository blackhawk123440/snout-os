import { NextResponse } from 'next/server';
import { getRequestContext } from '@/lib/request-context';
import { ForbiddenError, requireAnyRole } from '@/lib/rbac';
import { getScopedDb } from '@/lib/tenancy';

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
      orderBy: { startAt: 'asc' },
      take: 200,
      include: {
        sitter: {
          select: { id: true, firstName: true, lastName: true },
        },
        client: {
          select: { id: true, firstName: true, lastName: true },
        },
        reports: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { id: true, createdAt: true },
        },
      },
    });

    return NextResponse.json({
      bookings: bookings.map((b) => ({
        id: b.id,
        firstName: b.firstName,
        lastName: b.lastName,
        phone: b.phone,
        email: b.email,
        address: b.address,
        service: b.service,
        startAt: b.startAt,
        endAt: b.endAt,
        status: b.status,
        paymentStatus: b.paymentStatus,
        totalPrice: Number(b.totalPrice),
        sitter: b.sitter,
        client: b.client,
        createdAt: b.createdAt,
        hasReport: b.reports.length > 0,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to load bookings', message }, { status: 500 });
  }
}

