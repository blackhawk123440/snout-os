import { NextResponse } from 'next/server';
import { getRequestContext } from '@/lib/request-context';
import { ForbiddenError, requireOwnerOrAdmin } from '@/lib/rbac';
import { getScopedDb } from '@/lib/tenancy';
import { detectSitterOverlaps } from './helpers';

type ActionLabel = 'Fix' | 'Assign' | 'Retry' | 'Open';

interface AttentionItem {
  id: string;
  title: string;
  subtitle: string;
  count?: number;
  actionLabel: ActionLabel;
  href: string;
}

export async function GET() {
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

  const db = getScopedDb(ctx);
  const now = new Date();
  const in24h = new Date(now);
  in24h.setHours(in24h.getHours() + 24);
  const in7d = new Date(now);
  in7d.setDate(in7d.getDate() + 7);
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  try {
    const [failedEvents, payoutFailureCount, unassignedBookings, assignedBookings] = await Promise.all([
      db.eventLog.findMany({
        where: {
          createdAt: { gte: weekAgo },
          OR: [
            { eventType: 'automation.failed' },
            { eventType: 'automation.dead' },
            { status: 'failed' },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      db.payoutTransfer.count({
        where: { status: 'failed' },
      }),
      db.booking.findMany({
        where: {
          sitterId: null,
          status: { in: ['pending', 'confirmed'] },
          startAt: { gte: now, lte: in7d },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          service: true,
          startAt: true,
        },
        orderBy: { startAt: 'asc' },
        take: 30,
      }),
      db.booking.findMany({
        where: {
          sitterId: { not: null },
          status: { in: ['pending', 'confirmed', 'in_progress'] },
          startAt: { gte: now, lte: in7d },
        },
        select: {
          id: true,
          sitterId: true,
          service: true,
          startAt: true,
          endAt: true,
        },
        orderBy: { startAt: 'asc' },
        take: 300,
      }),
    ]);

    const calendarFailureCount = failedEvents.filter((event) => {
      const eventType = event.eventType?.toLowerCase() ?? '';
      const automationType = event.automationType?.toLowerCase() ?? '';
      const error = event.error?.toLowerCase() ?? '';
      return (
        eventType.includes('calendar') ||
        automationType.includes('calendar') ||
        error.includes('calendar')
      );
    }).length;
    const automationFailureCount = Math.max(0, failedEvents.length - calendarFailureCount);
    const coverageGapCount = unassignedBookings.filter(
      (booking) => new Date(booking.startAt).getTime() <= in24h.getTime()
    ).length;

    const overlaps = detectSitterOverlaps(
      assignedBookings.map((booking) => ({
        id: booking.id,
        sitterId: booking.sitterId,
        startAt: booking.startAt,
        endAt: booking.endAt,
      }))
    );

    const alerts: AttentionItem[] = [];
    if (automationFailureCount > 0) {
      alerts.push({
        id: 'automation-failures',
        title: 'Automation failures',
        subtitle: 'Recent failed automation runs need retry.',
        count: automationFailureCount,
        actionLabel: 'Retry',
        href: '/ops/automation-failures',
      });
    }
    if (payoutFailureCount > 0) {
      alerts.push({
        id: 'payout-failures',
        title: 'Payout failures',
        subtitle: 'Failed transfers are blocking sitter payouts.',
        count: payoutFailureCount,
        actionLabel: 'Fix',
        href: '/ops/payouts?status=failed',
      });
    }
    if (calendarFailureCount > 0) {
      alerts.push({
        id: 'calendar-repair',
        title: 'Calendar repair needed',
        subtitle: 'Calendar sync failures detected this week.',
        count: calendarFailureCount,
        actionLabel: 'Fix',
        href: '/ops/calendar-repair',
      });
    }

    const staffing: AttentionItem[] = [];
    if (coverageGapCount > 0) {
      staffing.push({
        id: 'coverage-gaps',
        title: 'Coverage gaps (next 24h)',
        subtitle: 'Unassigned near-term visits need immediate owner action.',
        count: coverageGapCount,
        actionLabel: 'Assign',
        href: '/bookings?status=pending',
      });
    }
    if (unassignedBookings.length - coverageGapCount > 0) {
      staffing.push({
        id: 'unassigned',
        title: 'Unassigned visits',
        subtitle: 'Upcoming visits are still missing sitter assignment.',
        count: unassignedBookings.length - coverageGapCount,
        actionLabel: 'Assign',
        href: '/bookings?status=pending',
      });
    }
    if (overlaps.length > 0) {
      staffing.push({
        id: 'overlaps',
        title: 'Overlapping assignments',
        subtitle: 'A sitter has overlapping visit windows.',
        count: overlaps.length,
        actionLabel: 'Open',
        href: '/finance',
      });
    }

    return NextResponse.json({
      alerts,
      staffing,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to load command center queues', message },
      { status: 500 }
    );
  }
}
