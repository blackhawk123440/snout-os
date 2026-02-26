/**
 * Sitter Dashboard Data API (Owner View)
 * 
 * GET: Fetch dashboard data for a specific sitter (owner viewing sitter)
 * Returns: pending requests, upcoming bookings, completed bookings, performance metrics, tier info
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestContext } from '@/lib/request-context';
import { requireAnyRole, ForbiddenError } from '@/lib/rbac';
import { whereOrg } from '@/lib/org-scope';

export async function GET(
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

  try {
    const resolvedParams = await params;
    const sitterId = resolvedParams.id;
    
    // Fetch sitter (enterprise schema: Sitter has no currentTier)
    const sitter = await prisma.sitter.findFirst({
      where: whereOrg(ctx.orgId, { id: sitterId }),
    });

    if (!sitter) {
      return NextResponse.json(
        { error: 'Sitter not found' },
        { status: 404 }
      );
    }

    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Enterprise schema has no OfferEvent or Booking — return empty
    const pendingRequests: any[] = [];
    let upcomingBookings: any[] = [];
    let completedBookings: any[] = [];
    let performance = {
      acceptanceRate: null as number | null,
      completionRate: null as number | null,
      onTimeRate: null as number | null,
      clientRating: null as number | null,
      totalEarnings: 0,
      completedBookingsCount: 0,
    };

    if (typeof (prisma as any).booking?.findMany === 'function') {
      try {
        const upcoming = await (prisma as any).booking.findMany({
          where: whereOrg(ctx.orgId, { sitterId, status: { in: ['confirmed', 'pending'] }, startAt: { gt: now } }),
          include: { pets: true, client: true },
          orderBy: { startAt: 'asc' },
        });
        upcomingBookings = upcoming.map((b: any) => ({
          id: b.id,
          firstName: b.firstName,
          lastName: b.lastName,
          service: b.service,
          startAt: b.startAt?.toISOString?.(),
          endAt: b.endAt?.toISOString?.(),
          address: b.address,
          notes: b.notes,
          totalPrice: b.totalPrice,
          status: b.status,
          pets: b.pets,
          client: b.client,
          offerEvent: null,
          threadId: null,
        }));
      } catch (_) {}
    }
    if (typeof (prisma as any).booking?.findMany === 'function') {
      try {
        const completed = await (prisma as any).booking.findMany({
          where: whereOrg(ctx.orgId, { sitterId, status: 'completed', endAt: { lt: now } }),
          include: { pets: true, client: true },
          orderBy: { endAt: 'desc' },
          take: 50,
        });
        completedBookings = completed.map((b: any) => ({
          id: b.id,
          firstName: b.firstName,
          lastName: b.lastName,
          service: b.service,
          startAt: b.startAt?.toISOString?.(),
          endAt: b.endAt?.toISOString?.(),
          address: b.address,
          notes: b.notes,
          totalPrice: b.totalPrice,
          status: b.status,
          pets: b.pets,
          client: b.client,
          offerEvent: null,
          threadId: null,
        }));
        const commission = (sitter as any).commissionPercentage ?? 80;
        performance = {
          ...performance,
          completedBookingsCount: completed.length,
          totalEarnings: completed.reduce((sum: number, b: any) => sum + (Number(b.totalPrice) * commission / 100), 0),
        };
      } catch (_) {}
    }

    // Inbox summary: use Thread (enterprise schema)
    let unreadCount = 0;
    let latestThread: { id: string; clientName: string; lastActivityAt: string | null } | null = null;
    try {
      const threads = await (prisma as any).thread.findMany({
        where: whereOrg(ctx.orgId, { sitterId, status: 'active' }),
        include: { client: { select: { id: true, name: true } } },
        orderBy: { lastActivityAt: 'desc' },
        take: 1,
      });
      unreadCount = await (prisma as any).thread.count({
        where: whereOrg(ctx.orgId, { sitterId, status: 'active', ownerUnreadCount: { gt: 0 } }),
      }).catch(() => 0);
      const t = threads[0];
      if (t) {
        latestThread = {
          id: t.id,
          clientName: (t as any).client?.name ?? 'Unknown',
          lastActivityAt: t.lastActivityAt?.toISOString() ?? null,
        };
      }
    } catch (_) {}

    // Tier summary: enterprise schema has no SitterTierHistory / SitterMetricsWindow
    let tierSummary: any = null;
    if (typeof (prisma as any).sitterTierHistory?.findFirst === 'function') {
      try {
        const latestTierHistory = await (prisma as any).sitterTierHistory.findFirst({
          where: whereOrg(ctx.orgId, { sitterId }),
          include: { tier: { select: { name: true } } },
          orderBy: { periodStart: 'desc' },
        });
        const latestMetrics = typeof (prisma as any).sitterMetricsWindow?.findFirst === 'function'
          ? await (prisma as any).sitterMetricsWindow.findFirst({
              where: whereOrg(ctx.orgId, { sitterId, windowEnd: { gte: sevenDaysAgo } }),
              orderBy: { windowEnd: 'desc' },
            })
          : null;
        if (latestTierHistory) {
          tierSummary = {
            currentTier: {
              name: (latestTierHistory as any).tier?.name ?? 'Unknown',
              assignedAt: (latestTierHistory as any).periodStart?.toISOString?.(),
            },
            metrics: latestMetrics ? {
              avgResponseSeconds: (latestMetrics as any).avgResponseSeconds,
              offerAcceptRate: (latestMetrics as any).offerAcceptRate,
              offerDeclineRate: (latestMetrics as any).offerDeclineRate,
              offerExpireRate: (latestMetrics as any).offerExpireRate,
            } : null,
          };
        }
      } catch (_) {}
    }

    return NextResponse.json({
      pendingRequests,
      upcomingBookings,
      completedBookings,
      performance,
      currentTier: null,
      isAvailable: (sitter as any).active ?? true,
      unreadMessageCount: unreadCount,
      inboxSummary: {
        unreadCount,
        latestThread,
      },
      tierSummary,
    });
  } catch (error: any) {
    console.error('[Sitter Dashboard API] Failed to fetch dashboard:', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', message: error.message },
      { status: 500 }
    );
  }
}
