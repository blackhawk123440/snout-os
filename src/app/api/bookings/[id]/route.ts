import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@/lib/request-context';
import { ForbiddenError, requireAnyRole } from '@/lib/rbac';
import { getScopedDb } from '@/lib/tenancy';

export async function GET(
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
  const { id } = await params;
  const db = getScopedDb(ctx);

  try {
    const booking = await db.booking.findFirst({
      where: { id },
      include: {
        sitter: { select: { id: true, firstName: true, lastName: true } },
        client: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        pets: { select: { id: true, name: true, species: true, notes: true } },
        reports: { take: 1, orderBy: { createdAt: 'desc' }, select: { id: true, createdAt: true } },
      },
    });
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    return NextResponse.json({
      booking: {
        id: booking.id,
        firstName: booking.firstName,
        lastName: booking.lastName,
        phone: booking.phone,
        email: booking.email,
        address: booking.address,
        service: booking.service,
        startAt: booking.startAt,
        endAt: booking.endAt,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        totalPrice: Number(booking.totalPrice),
        notes: booking.notes,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
        sitter: booking.sitter,
        client: booking.client,
        pets: booking.pets,
        hasReport: booking.reports.length > 0,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to load booking', message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
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
  const { id } = await params;
  const db = getScopedDb(ctx);

  try {
    const body = (await request.json()) as { status?: string; sitterId?: string | null };
    const existing = await db.booking.findFirst({
      where: { id },
      select: { id: true, status: true },
    });
    if (!existing) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (typeof body.status === 'string' && body.status.trim()) data.status = body.status.trim();
    if (body.sitterId === null || typeof body.sitterId === 'string') data.sitterId = body.sitterId;
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No supported fields to update' }, { status: 400 });
    }

    const updated = await db.booking.update({
      where: { id: existing.id },
      data,
      select: { id: true, status: true, sitterId: true, updatedAt: true },
    });

    if (typeof body.status === 'string' && body.status.trim() && body.status.trim() !== existing.status) {
      await db.bookingStatusHistory.create({
        data: {
          orgId: ctx.orgId,
          bookingId: existing.id,
          fromStatus: existing.status,
          toStatus: body.status.trim(),
          changedBy: ctx.userId ?? null,
          reason: 'owner_operator_update',
        },
      });
    }

    return NextResponse.json({ booking: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to update booking', message }, { status: 500 });
  }
}

