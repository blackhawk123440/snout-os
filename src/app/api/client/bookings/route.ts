import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/request-context';
import { ForbiddenError, requireRole, requireClientContext } from '@/lib/rbac';
import { whereOrg } from '@/lib/org-scope';
import { calculateBookingPrice } from '@/lib/rates';
import { emitBookingCreated } from '@/lib/event-emitter';
import { ensureEventQueueBridge } from '@/lib/event-queue-bridge-init';
import { emitAndEnqueueBookingEvent } from '@/lib/booking/booking-events';
import { parseCsv, parseDate, parsePage, parsePageSize } from '@/lib/pagination';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function GET(request: NextRequest) {
  let ctx;
  try {
    ctx = await getRequestContext();
    requireRole(ctx, 'client');
    requireClientContext(ctx);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = (request as NextRequest).nextUrl ?? new URL(request.url);
    const params = url.searchParams;
    const page = parsePage(params.get('page'), 1);
    const pageSize = parsePageSize(params.get('pageSize'), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const statusList = parseCsv(params.get('status'));
    const paymentStatusList = parseCsv(params.get('paymentStatus'));
    const from = parseDate(params.get('from'));
    const to = parseDate(params.get('to'));

    const where: Record<string, any> = whereOrg(ctx.orgId, { clientId: ctx.clientId });
    if (statusList) where.status = { in: statusList };
    if (paymentStatusList) where.paymentStatus = { in: paymentStatusList };
    if (from || to) {
      where.startAt = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      };
    }

    const total = await (prisma as any).booking.count({ where });
    const bookings = await (prisma as any).booking.findMany({
      where,
      select: {
        id: true,
        service: true,
        startAt: true,
        endAt: true,
        status: true,
        address: true,
        sitterId: true,
        sitter: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ startAt: 'desc' }, { id: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const toIso = (d: Date) => (d instanceof Date ? d.toISOString() : String(d));
    const items = bookings.map((b: any) => ({
      id: b.id,
      service: b.service,
      startAt: toIso(b.startAt),
      endAt: toIso(b.endAt),
      status: b.status,
      address: b.address,
      sitter: b.sitter
        ? { id: b.sitter.id, name: [b.sitter.firstName, b.sitter.lastName].filter(Boolean).join(' ').trim() || 'Sitter' }
        : null,
    }));

    return NextResponse.json({
      items,
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
      sort: { field: 'startAt', direction: 'desc' },
      filters: {
        status: statusList,
        paymentStatus: paymentStatusList,
        from: from?.toISOString() ?? null,
        to: to?.toISOString() ?? null,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to load bookings', message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let ctx;
  try {
    ctx = await getRequestContext();
    requireRole(ctx, 'client');
    requireClientContext(ctx);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      firstName?: string;
      lastName?: string;
      phone?: string;
      email?: string;
      address?: string | null;
      pickupAddress?: string | null;
      dropoffAddress?: string | null;
      service?: string;
      startAt?: string;
      endAt?: string;
      quantity?: number;
      pets?: Array<{ name?: string; species?: string }>;
      notes?: string | null;
      afterHours?: boolean;
      holiday?: boolean;
    };

    const service = typeof body.service === 'string' ? body.service.trim() : '';
    const startAt = body.startAt ? new Date(body.startAt) : null;
    const endAt = body.endAt ? new Date(body.endAt) : null;
    if (!service || !startAt || !endAt || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      return NextResponse.json(
        { error: 'Missing required fields: service, startAt, endAt' },
        { status: 400 }
      );
    }
    if (endAt <= startAt) {
      return NextResponse.json({ error: 'endAt must be after startAt' }, { status: 400 });
    }

    const client = await (prisma as any).client.findFirst({
      where: whereOrg(ctx.orgId, { id: ctx.clientId }),
      select: { id: true, firstName: true, lastName: true, phone: true, email: true, orgId: true },
    });
    if (!client) {
      return NextResponse.json({ error: 'Client profile not found' }, { status: 404 });
    }

    const petsInput = Array.isArray(body.pets) ? body.pets : [];
    const pets = petsInput
      .map((p) => ({
        name: (p?.name || '').trim(),
        species: (p?.species || '').trim(),
      }))
      .filter((p) => p.name && p.species);

    const quantity = typeof body.quantity === 'number' && body.quantity > 0 ? body.quantity : 1;
    const afterHours = Boolean(body.afterHours);

    const pricing = await calculateBookingPrice(
      service,
      startAt,
      endAt,
      pets.length || 1,
      quantity,
      afterHours
    );

    const booking = await (prisma as any).booking.create({
      data: {
        orgId: ctx.orgId,
        clientId: client.id,
        firstName: body.firstName?.trim() || client.firstName || 'Client',
        lastName: body.lastName?.trim() || client.lastName || 'User',
        phone: body.phone?.trim() || client.phone,
        email: body.email?.trim() || client.email || null,
        address: body.address?.trim() || null,
        pickupAddress: body.pickupAddress?.trim() || null,
        dropoffAddress: body.dropoffAddress?.trim() || null,
        service,
        startAt,
        endAt,
        totalPrice: pricing.total,
        status: 'pending',
        paymentStatus: 'unpaid',
        notes: body.notes?.trim() || null,
        quantity,
        afterHours,
        holiday: Boolean(body.holiday),
        pets: {
          create: (pets.length > 0 ? pets : [{ name: 'Pet', species: 'Dog' }]).map((p) => ({
            orgId: ctx.orgId,
            name: p.name,
            species: p.species,
          })),
        },
      },
      include: { pets: true, timeSlots: true },
    });

    await ensureEventQueueBridge();
    try {
      await emitBookingCreated(booking);
    } catch (eventError) {
      console.error('[api/client/bookings] emitBookingCreated failed (non-blocking):', eventError);
    }
    emitAndEnqueueBookingEvent('booking.created', {
      orgId: ctx.orgId,
      bookingId: booking.id,
      clientId: booking.clientId ?? undefined,
      sitterId: booking.sitterId ?? undefined,
      occurredAt: new Date().toISOString(),
      metadata: {
        service: booking.service,
        status: booking.status,
        firstName: booking.firstName,
        lastName: booking.lastName,
        phone: booking.phone,
      },
    }).catch((err) => console.error('[api/client/bookings] emitAndEnqueueBookingEvent failed:', err));

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        totalPrice: Number(booking.totalPrice),
        status: booking.status,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create booking', message },
      { status: 500 }
    );
  }
}
