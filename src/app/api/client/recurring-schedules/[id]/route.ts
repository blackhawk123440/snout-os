/**
 * GET /api/client/recurring-schedules/[id] — get schedule details
 * PATCH /api/client/recurring-schedules/[id] — modify schedule (pause, resume, update)
 * DELETE /api/client/recurring-schedules/[id] — cancel schedule
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@/lib/request-context';
import { getScopedDb } from '@/lib/tenancy';
import { logEvent } from '@/lib/log-event';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  let ctx;
  try { ctx = await getRequestContext(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  if (!ctx.clientId) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  const { id } = await context.params;
  const db = getScopedDb(ctx);

  const schedule = await db.recurringSchedule.findFirst({
    where: { id, orgId: ctx.orgId, clientId: ctx.clientId },
  });
  if (!schedule) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });

  // Get upcoming bookings for this schedule
  const bookings = await db.booking.findMany({
    where: {
      orgId: ctx.orgId,
      recurringScheduleId: id,
      startAt: { gte: new Date() },
      status: { notIn: ['cancelled'] },
    },
    orderBy: { startAt: 'asc' },
    take: 20,
    select: { id: true, startAt: true, endAt: true, status: true, sitter: { select: { firstName: true } } },
  });

  return NextResponse.json({
    schedule: {
      ...schedule,
      daysOfWeek: schedule.daysOfWeek ? JSON.parse(schedule.daysOfWeek) : [],
      petIds: schedule.petIds ? JSON.parse(schedule.petIds) : [],
    },
    upcomingBookings: bookings.map((b: any) => ({
      ...b,
      startAt: b.startAt?.toISOString(),
      endAt: b.endAt?.toISOString(),
      sitterName: b.sitter?.firstName || null,
    })),
  });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  let ctx;
  try { ctx = await getRequestContext(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  if (!ctx.clientId) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  const { id } = await context.params;
  const db = getScopedDb(ctx);

  const schedule = await db.recurringSchedule.findFirst({
    where: { id, orgId: ctx.orgId, clientId: ctx.clientId },
    select: { id: true, status: true, startTime: true, endTime: true },
  });
  if (!schedule) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });

  const body = await request.json();
  const { action, skipDate, ...updates } = body;

  // Handle specific actions
  if (action === 'pause') {
    await db.recurringSchedule.update({ where: { id }, data: { status: 'paused' } });
    await logEvent({ orgId: ctx.orgId, action: 'recurring.paused', entityId: id, status: 'success' }).catch(() => {});
    return NextResponse.json({ success: true, status: 'paused' });
  }

  if (action === 'resume') {
    await db.recurringSchedule.update({ where: { id }, data: { status: 'active' } });
    await logEvent({ orgId: ctx.orgId, action: 'recurring.resumed', entityId: id, status: 'success' }).catch(() => {});
    return NextResponse.json({ success: true, status: 'active' });
  }

  if (action === 'skip' && skipDate) {
    // Cancel the specific booking on that date
    const dayStart = new Date(skipDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(skipDate);
    dayEnd.setHours(23, 59, 59, 999);

    const booking = await db.booking.findFirst({
      where: {
        orgId: ctx.orgId,
        recurringScheduleId: id,
        startAt: { gte: dayStart, lte: dayEnd },
        status: { notIn: ['cancelled', 'completed'] },
      },
    });

    if (booking) {
      await db.booking.update({ where: { id: booking.id }, data: { status: 'cancelled' } });
      await logEvent({ orgId: ctx.orgId, action: 'recurring.occurrence_skipped', entityId: id, bookingId: booking.id, status: 'success' }).catch(() => {});
      return NextResponse.json({ success: true, skippedBookingId: booking.id });
    }
    return NextResponse.json({ error: 'No booking found for that date' }, { status: 404 });
  }

  // General updates (time, days, etc.)
  const updateData: Record<string, any> = {};
  if (updates.startTime) updateData.startTime = updates.startTime;
  if (updates.endTime) updateData.endTime = updates.endTime;
  if (updates.daysOfWeek) updateData.daysOfWeek = JSON.stringify(updates.daysOfWeek);
  if (updates.effectiveUntil !== undefined) updateData.effectiveUntil = updates.effectiveUntil ? new Date(updates.effectiveUntil) : null;

  if (Object.keys(updateData).length > 0) {
    await db.recurringSchedule.update({ where: { id }, data: updateData });

    // Propagate time changes to existing future bookings
    if (updateData.startTime || updateData.endTime) {
      const futureBookings = await db.booking.findMany({
        where: {
          orgId: ctx.orgId,
          recurringScheduleId: id,
          startAt: { gte: new Date() },
          status: { notIn: ['completed', 'cancelled'] },
        },
        select: { id: true, startAt: true, endAt: true },
      });

      const [newStartH, newStartM] = (updateData.startTime || schedule.startTime || '09:00').split(':').map(Number);
      const [newEndH, newEndM] = (updateData.endTime || schedule.endTime || '10:00').split(':').map(Number);

      let updatedCount = 0;
      for (const booking of futureBookings) {
        const bookingDate = new Date(booking.startAt);
        const newStart = new Date(bookingDate);
        newStart.setHours(newStartH, newStartM, 0, 0);
        const newEnd = new Date(bookingDate);
        newEnd.setHours(newEndH, newEndM, 0, 0);

        await db.booking.update({
          where: { id: booking.id },
          data: { startAt: newStart, endAt: newEnd },
        });
        updatedCount++;
      }

      await logEvent({
        orgId: ctx.orgId,
        action: 'recurring.bookings_updated',
        entityId: id,
        status: 'success',
        metadata: { ...updateData, futureBookingsUpdated: updatedCount },
      }).catch(() => {});

      return NextResponse.json({ success: true, futureBookingsUpdated: updatedCount });
    }

    await logEvent({ orgId: ctx.orgId, action: 'recurring.updated', entityId: id, status: 'success', metadata: updateData }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  let ctx;
  try { ctx = await getRequestContext(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  if (!ctx.clientId) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  const { id } = await context.params;
  const db = getScopedDb(ctx);

  const schedule = await db.recurringSchedule.findFirst({
    where: { id, orgId: ctx.orgId, clientId: ctx.clientId },
  });
  if (!schedule) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });

  // Cancel the schedule
  await db.recurringSchedule.update({ where: { id }, data: { status: 'cancelled' } });

  // Cancel all future bookings for this schedule
  const cancelled = await db.booking.updateMany({
    where: {
      orgId: ctx.orgId,
      recurringScheduleId: id,
      startAt: { gte: new Date() },
      status: { notIn: ['completed', 'cancelled'] },
    },
    data: { status: 'cancelled' },
  });

  await logEvent({
    orgId: ctx.orgId,
    action: 'recurring.cancelled',
    entityId: id,
    status: 'success',
    metadata: { futureBookingsCancelled: cancelled.count },
  }).catch(() => {});

  return NextResponse.json({ success: true, futureBookingsCancelled: cancelled.count });
}
