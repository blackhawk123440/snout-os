import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/request-context';
import { ForbiddenError, requireRole } from '@/lib/rbac';
import { whereOrg } from '@/lib/org-scope';
import { logEvent } from '@/lib/log-event';
import { publish, channels } from '@/lib/realtime/bus';

const CalloutSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.enum(['sick', 'personal', 'emergency', 'other']),
  notes: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  let ctx;
  try {
    ctx = await getRequestContext();
    requireRole(ctx, 'sitter');
  } catch (error) {
    if (error instanceof ForbiddenError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!ctx.sitterId || !ctx.userId) {
    return NextResponse.json({ error: 'Sitter profile missing' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = CalloutSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

    const { date, reason, notes } = parsed.data;
    const startsAt = new Date(date + 'T00:00:00');
    const endsAt = new Date(date + 'T23:59:59.999');

    // Create time off record
    await (prisma as any).sitterTimeOff.create({
      data: {
        orgId: ctx.orgId,
        sitterId: ctx.sitterId,
        type: reason === 'sick' ? 'medical' : 'pto',
        startsAt,
        endsAt,
        approvedByUserId: ctx.userId,
      },
    });

    // Find affected bookings
    const affected = await (prisma as any).booking.findMany({
      where: whereOrg(ctx.orgId, {
        sitterId: ctx.sitterId,
        status: { in: ['pending', 'confirmed'] },
        startAt: { gte: startsAt, lte: endsAt },
      }),
      select: { id: true, service: true, firstName: true, lastName: true, startAt: true },
    });

    // Get sitter name for notification
    const sitter = await (prisma as any).sitter.findUnique({
      where: { id: ctx.sitterId },
      select: { firstName: true, lastName: true },
    });
    const sitterName = sitter ? `${sitter.firstName} ${sitter.lastName}`.trim() : 'Sitter';

    // Notify owner
    publish(channels.ownerOps(ctx.orgId), {
      type: 'sitter.callout',
      sitterId: ctx.sitterId,
      sitterName,
      date,
      reason,
      affectedCount: affected.length,
      ts: Date.now(),
    }).catch(() => {});

    await logEvent({
      orgId: ctx.orgId,
      action: 'sitter.callout',
      status: 'success',
      metadata: { sitterId: ctx.sitterId, sitterName, date, reason, affectedBookings: affected.length },
    });

    return NextResponse.json({
      success: true,
      affectedBookings: affected.map((b: any) => ({
        id: b.id,
        service: b.service,
        clientName: `${b.firstName} ${b.lastName}`.trim(),
        startAt: b.startAt instanceof Date ? b.startAt.toISOString() : b.startAt,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed', message }, { status: 500 });
  }
}
