/**
 * GET /api/client/recurring-schedules — list client's recurring schedules
 * POST /api/client/recurring-schedules — create a new recurring booking request
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@/lib/request-context';
import { getScopedDb } from '@/lib/tenancy';
import { generateRecurringBookings } from '@/lib/recurring/generate';
import { logEvent } from '@/lib/log-event';

export async function GET() {
  let ctx;
  try { ctx = await getRequestContext(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  if (!ctx.clientId) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  try {
    const db = getScopedDb(ctx);
    const schedules = await db.recurringSchedule.findMany({
      where: { orgId: ctx.orgId, clientId: ctx.clientId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, service: true, frequency: true, daysOfWeek: true,
        startTime: true, endTime: true, effectiveFrom: true, effectiveUntil: true,
        status: true, totalPrice: true, address: true, notes: true,
        lastGeneratedAt: true, createdAt: true,
      },
    });

    return NextResponse.json({
      schedules: schedules.map((s: any) => ({
        ...s,
        daysOfWeek: s.daysOfWeek ? JSON.parse(s.daysOfWeek) : [],
        effectiveFrom: s.effectiveFrom?.toISOString(),
        effectiveUntil: s.effectiveUntil?.toISOString(),
        lastGeneratedAt: s.lastGeneratedAt?.toISOString(),
        createdAt: s.createdAt?.toISOString(),
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load schedules' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let ctx;
  try { ctx = await getRequestContext(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  if (!ctx.clientId) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  try {
    const body = await request.json();
    const {
      service, frequency, daysOfWeek, startTime, endTime,
      effectiveFrom, effectiveUntil, address, notes, totalPrice, petIds,
    } = body;

    if (!service || !frequency || !startTime || !endTime || !effectiveFrom) {
      return NextResponse.json({ error: 'Missing required fields: service, frequency, startTime, endTime, effectiveFrom' }, { status: 400 });
    }

    if (!['daily', 'weekly', 'biweekly', 'monthly'].includes(frequency)) {
      return NextResponse.json({ error: 'Invalid frequency. Must be daily, weekly, biweekly, or monthly.' }, { status: 400 });
    }

    const db = getScopedDb(ctx);

    // Get client info for pricing
    const client = await db.client.findUnique({
      where: { id: ctx.clientId },
      select: { address: true },
    });

    const schedule = await db.recurringSchedule.create({
      data: {
        orgId: ctx.orgId,
        clientId: ctx.clientId,
        service,
        frequency,
        daysOfWeek: daysOfWeek ? JSON.stringify(daysOfWeek) : null,
        startTime,
        endTime,
        effectiveFrom: new Date(effectiveFrom),
        effectiveUntil: effectiveUntil ? new Date(effectiveUntil) : null,
        address: address || client?.address || null,
        notes: notes || null,
        totalPrice: totalPrice || 0,
        petIds: petIds ? JSON.stringify(petIds) : null,
        status: 'active',
      },
    });

    // Generate first batch of bookings (next 28 days)
    const result = await generateRecurringBookings({
      scheduleId: schedule.id,
      orgId: ctx.orgId,
      daysAhead: 28,
    });

    await logEvent({
      orgId: ctx.orgId,
      action: 'recurring.client_created',
      entityType: 'recurring_schedule',
      entityId: schedule.id,
      status: 'success',
      metadata: { service, frequency, bookingsCreated: result.created },
    }).catch(() => {});

    return NextResponse.json({
      schedule: { id: schedule.id, status: schedule.status },
      bookingsCreated: result.created,
    }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
