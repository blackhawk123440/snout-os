/**
 * Sitter Dashboard Data API (Owner View)
 * 
 * GET: Fetch dashboard data for a specific sitter (owner viewing sitter)
 * Returns: pending requests, upcoming bookings, completed bookings, performance metrics, tier info
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const resolvedParams = await params;
    const sitterId = resolvedParams.id;
    const orgId = user.orgId;

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 400 }
      );
    }

    // Fetch sitter
    const sitter = await (prisma as any).sitter.findUnique({
      where: { id: sitterId },
      include: {
        currentTier: true,
      },
    });

    if (!sitter) {
      return NextResponse.json(
        { error: 'Sitter not found' },
        { status: 404 }
      );
    }

    const now = new Date();

    // Fetch pending requests from OfferEvent
    const pendingOffers = await (prisma as any).offerEvent.findMany({
      where: {
        orgId,
        sitterId,
        status: 'sent',
        expiresAt: { gt: now },
        excluded: false,
      },
      include: {
        booking: {
          include: {
            pets: true,
            client: true,
          },
        },
      },
      orderBy: [
        { expiresAt: 'asc' },
        { offeredAt: 'desc' },
      ],
    });

    const pendingRequests = pendingOffers
      .filter((offer: any) => offer.booking)
      .map((offer: any) => ({
        id: offer.booking.id,
        firstName: offer.booking.firstName,
        lastName: offer.booking.lastName,
        service: offer.booking.service,
        startAt: offer.booking.startAt.toISOString(),
        endAt: offer.booking.endAt.toISOString(),
        address: offer.booking.address,
        notes: offer.booking.notes,
        totalPrice: offer.booking.totalPrice,
        status: offer.booking.status,
        pets: offer.booking.pets,
        client: offer.booking.client,
        offerEvent: {
          id: offer.id,
          expiresAt: offer.expiresAt?.toISOString() || null,
          offeredAt: offer.offeredAt.toISOString(),
          status: offer.status,
        },
        threadId: null, // Would need to fetch from MessageThread
      }));

    // Fetch upcoming bookings
    const upcoming = await (prisma as any).booking.findMany({
      where: {
        sitterId: sitterId,
        status: { in: ['confirmed', 'pending'] },
        startAt: { gt: now },
      },
      include: {
        pets: true,
        client: true,
      },
      orderBy: {
        startAt: 'asc',
      },
    });

    const upcomingBookings = upcoming.map((booking: any) => ({
      id: booking.id,
      firstName: booking.firstName,
      lastName: booking.lastName,
      service: booking.service,
      startAt: booking.startAt.toISOString(),
      endAt: booking.endAt.toISOString(),
      address: booking.address,
      notes: booking.notes,
      totalPrice: booking.totalPrice,
      status: booking.status,
      pets: booking.pets,
      client: booking.client,
      offerEvent: null,
      threadId: null,
    }));

    // Fetch completed bookings
    const completed = await (prisma as any).booking.findMany({
      where: {
        sitterId: sitterId,
        status: 'completed',
        endAt: { lt: now },
      },
      include: {
        pets: true,
        client: true,
      },
      orderBy: {
        endAt: 'desc',
      },
      take: 50,
    });

    const completedBookings = completed.map((booking: any) => ({
      id: booking.id,
      firstName: booking.firstName,
      lastName: booking.lastName,
      service: booking.service,
      startAt: booking.startAt.toISOString(),
      endAt: booking.endAt.toISOString(),
      address: booking.address,
      notes: booking.notes,
      totalPrice: booking.totalPrice,
      status: booking.status,
      pets: booking.pets,
      client: booking.client,
      offerEvent: null,
      threadId: null,
    }));

    // Calculate performance metrics
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentOffers = await (prisma as any).offerEvent.findMany({
      where: {
        orgId,
        sitterId,
        offeredAt: { gte: sevenDaysAgo },
        excluded: false,
      },
    });

    const totalOffers = recentOffers.length;
    const accepted = recentOffers.filter((o: any) => o.status === 'accepted' || o.acceptedAt).length;
    const acceptanceRate = totalOffers > 0 ? accepted / totalOffers : null;

    const totalBookings = await (prisma as any).booking.count({
      where: { sitterId: sitterId },
    });
    const completedCount = completed.length;
    const totalEarnings = completedBookings.reduce((sum: number, b: any) => {
      const commission = (sitter as any).commissionPercentage || 80;
      return sum + (b.totalPrice * commission / 100);
    }, 0);

    const performance = {
      acceptanceRate,
      completionRate: totalBookings > 0 ? completedCount / totalBookings : null,
      onTimeRate: null as number | null,
      clientRating: null as number | null,
      totalEarnings,
      completedBookingsCount: completedCount,
    };

    // Get unread message count
    const unreadThreads = await (prisma as any).messageThread.findMany({
      where: {
        assignedSitterId: sitterId,
        status: 'open',
      },
    });

    const unreadCount = unreadThreads.length;

    return NextResponse.json({
      pendingRequests,
      upcomingBookings,
      completedBookings,
      performance,
      currentTier: sitter.currentTier ? {
        id: sitter.currentTier.id,
        name: sitter.currentTier.name,
        priorityLevel: (sitter.currentTier as any).priorityLevel || null,
        badgeColor: (sitter.currentTier as any).badgeColor || null,
        badgeStyle: (sitter.currentTier as any).badgeStyle || null,
      } : null,
      isAvailable: (sitter as any).isActive ?? (sitter as any).active ?? false,
      unreadMessageCount: unreadCount,
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
