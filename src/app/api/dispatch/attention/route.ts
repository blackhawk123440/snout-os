/**
 * Dispatch Attention API
 * 
 * GET: Fetch bookings requiring dispatch attention
 * Returns bookings that need manual dispatch or are unassigned in auto mode
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getBookingAttemptCount } from '@/lib/offer-reassignment';

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Owner/admin only
  const user = session.user as any;
  if (user.role !== 'owner' && user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  try {
    const orgId = user.orgId || (await import('@/lib/messaging/org-helpers')).getDefaultOrgId();

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 400 }
      );
    }

    // Fetch bookings requiring dispatch attention:
    // 1. dispatchStatus = manual_required
    // 2. OR unassigned bookings in auto mode (sitterId is null, dispatchStatus = auto or null)
    const manualRequiredBookings = await (prisma as any).booking.findMany({
      where: {
        dispatchStatus: 'manual_required',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        service: true,
        startAt: true,
        endAt: true,
        status: true,
        dispatchStatus: true,
        manualDispatchReason: true,
        manualDispatchAt: true,
        sitterId: true,
      },
      orderBy: {
        manualDispatchAt: 'desc', // Most recent first
      },
    });

    const unassignedAutoBookings = await (prisma as any).booking.findMany({
      where: {
        sitterId: null,
        status: 'pending',
        OR: [
          { dispatchStatus: 'auto' },
          { dispatchStatus: null },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        service: true,
        startAt: true,
        endAt: true,
        status: true,
        dispatchStatus: true,
        manualDispatchReason: true,
        manualDispatchAt: true,
        sitterId: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Combine and enrich with attempt count and last offer
    const allBookings = [...manualRequiredBookings, ...unassignedAutoBookings];
    const uniqueBookings = Array.from(
      new Map(allBookings.map((b: any) => [b.id, b])).values()
    );

    const enrichedBookings = await Promise.all(
      uniqueBookings.map(async (booking: any) => {
        // Get attempt count
        const attemptCount = await getBookingAttemptCount(orgId, booking.id);

        // Get last offer event
        const lastOffer = await (prisma as any).offerEvent.findFirst({
          where: {
            orgId,
            bookingId: booking.id,
            excluded: false,
          },
          orderBy: {
            offeredAt: 'desc',
          },
          select: {
            id: true,
            sitterId: true,
            status: true,
            expiresAt: true,
            offeredAt: true,
            acceptedAt: true,
            declinedAt: true,
          },
        });

        return {
          bookingId: booking.id,
          clientName: `${booking.firstName} ${booking.lastName}`,
          service: booking.service,
          startAt: booking.startAt.toISOString(),
          endAt: booking.endAt.toISOString(),
          status: booking.status,
          dispatchStatus: booking.dispatchStatus || 'auto',
          manualDispatchReason: booking.manualDispatchReason,
          manualDispatchAt: booking.manualDispatchAt?.toISOString() || null,
          attemptCount,
          lastOffer: lastOffer ? {
            id: lastOffer.id,
            sitterId: lastOffer.sitterId,
            status: lastOffer.status,
            expiresAt: lastOffer.expiresAt?.toISOString() || null,
            offeredAt: lastOffer.offeredAt.toISOString(),
            acceptedAt: lastOffer.acceptedAt?.toISOString() || null,
            declinedAt: lastOffer.declinedAt?.toISOString() || null,
          } : null,
        };
      })
    );

    // Sort by priority: manual_required first, then by manualDispatchAt/createdAt
    enrichedBookings.sort((a, b) => {
      if (a.dispatchStatus === 'manual_required' && b.dispatchStatus !== 'manual_required') {
        return -1;
      }
      if (a.dispatchStatus !== 'manual_required' && b.dispatchStatus === 'manual_required') {
        return 1;
      }
      // Both same priority, sort by date
      const aDate = a.manualDispatchAt || a.startAt;
      const bDate = b.manualDispatchAt || b.startAt;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });

    return NextResponse.json({
      bookings: enrichedBookings,
      count: enrichedBookings.length,
    });
  } catch (error: any) {
    console.error('[Dispatch Attention API] Failed to fetch bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dispatch attention bookings', message: error.message },
      { status: 500 }
    );
  }
}
