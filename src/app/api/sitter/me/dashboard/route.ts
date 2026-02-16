/**
 * Sitter Dashboard API Route (Self-Scoped)
 * 
 * GET: Fetch dashboard data for the authenticated sitter
 * Returns: pending requests, upcoming bookings, completed bookings, performance metrics, tier info
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCurrentSitterId } from '@/lib/sitter-helpers';

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const sitterId = await getCurrentSitterId(request);
    if (!sitterId) {
      return NextResponse.json(
        { error: 'Sitter not found' },
        { status: 404 }
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

    // Fetch pending requests (bookings with active pool offers for this sitter)
    const pendingOffers = await (prisma as any).sitterPoolOffer.findMany({
      where: {
        OR: [
          { sitterId: sitterId, status: 'active' },
          { 
            sitterIds: { contains: sitterId },
            status: 'active',
            expiresAt: { gt: now },
          },
        ],
      },
      include: {
        booking: {
          include: {
            pets: true,
            client: true,
            sitterPoolOffers: {
              where: {
                OR: [
                  { sitterId: sitterId },
                  { sitterIds: { contains: sitterId } },
                ],
                status: 'active',
              },
            },
          },
        },
      },
      orderBy: {
        expiresAt: 'asc',
      },
    });

    // Get thread IDs for pending bookings (for messaging links)
    const pendingBookingIds = pendingOffers.map((offer: any) => offer.bookingId).filter(Boolean);
    const pendingThreads = pendingBookingIds.length > 0 ? await (prisma as any).messageThread.findMany({
      where: {
        bookingId: { in: pendingBookingIds },
        assignedSitterId: sitterId,
      },
      select: {
        id: true,
        bookingId: true,
      },
    }) : [];
    const threadMap = new Map(pendingThreads.map((t: any) => [t.bookingId, t.id]));

    const pendingRequests = pendingOffers
      .filter((offer: any) => {
        // Check if sitter hasn't already responded
        try {
          const responses = JSON.parse(offer.responses || '[]') as Array<{ sitterId: string; response: string }>;
          return !responses.some(r => r.sitterId === sitterId);
        } catch {
          return true;
        }
      })
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
        sitterPoolOffer: {
          id: offer.id,
          expiresAt: offer.expiresAt.toISOString(),
          status: offer.status,
        },
        threadId: threadMap.get(offer.booking.id) || null,
      }));

    // Fetch upcoming bookings (confirmed, not completed, start date in future)
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

    const upcomingThreads = await (prisma as any).messageThread.findMany({
      where: {
        bookingId: { in: upcoming.map((b: any) => b.id) },
        assignedSitterId: sitterId,
      },
      select: {
        id: true,
        bookingId: true,
      },
    });
    const upcomingThreadMap = new Map(upcomingThreads.map((t: any) => [t.bookingId, t.id]));

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
      sitterPoolOffer: null,
      threadId: upcomingThreadMap.get(booking.id) || null,
    }));

    // Fetch completed bookings (status = completed, end date in past)
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
      take: 50, // Limit to most recent 50
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
      sitterPoolOffer: null,
      threadId: null,
    }));

    // Calculate performance metrics (placeholders for now)
    const allSitterBookings = await (prisma as any).booking.findMany({
      where: { sitterId: sitterId },
    });

    const totalBookings = allSitterBookings.length;
    const completedCount = allSitterBookings.filter((b: any) => b.status === 'completed').length;
    const totalEarnings = completedBookings.reduce((sum: number, b: any) => {
      const commission = (sitter as any).commissionPercentage || 80;
      return sum + (b.totalPrice * commission / 100);
    }, 0);

    // Calculate metrics (simplified - would need more data for accurate rates)
    const performance = {
      acceptanceRate: null as number | null, // Would need offer response data
      completionRate: totalBookings > 0 ? completedCount / totalBookings : null,
      onTimeRate: null as number | null, // Would need actual vs scheduled time data
      clientRating: null as number | null, // Would need rating system
      totalEarnings,
      completedBookingsCount: completedCount,
    };

    // Get unread message count
    // Note: This is a simplified placeholder - proper unread tracking would require
    // a sitterUnreadCount field on MessageThread or a separate tracking table
    const unreadThreads = await (prisma as any).messageThread.findMany({
      where: {
        assignedSitterId: sitterId,
        status: 'open',
      },
    });

    // Count threads with unread messages (simplified - would need proper unread tracking)
    const unreadCount = unreadThreads.length; // Placeholder

    return NextResponse.json({
      pendingRequests,
      upcomingBookings: upcomingBookings,
      completedBookings: completedBookings,
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
