/**
 * Offer Expiration API Route
 * 
 * POST: Expire offers that have passed their expiration time
 * Can be called periodically via cron job or scheduled task
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  // Optional: Require admin auth or API key for cron jobs
  // For now, allow unauthenticated (should be protected by API key in production)
  
  try {
    const now = new Date();

    // Find all offers that are still "sent" but have expired
    const expiredOffers = await (prisma as any).offerEvent.findMany({
      where: {
        status: 'sent',
        expiresAt: { lte: now },
        excluded: false,
      },
      include: {
        booking: {
          select: {
            id: true,
            sitterId: true,
            status: true,
          },
        },
      },
    });

    let expiredCount = 0;
    let bookingsReturnedToPool = 0;

    for (const offer of expiredOffers) {
      // Mark offer as expired
      await (prisma as any).offerEvent.update({
        where: { id: offer.id },
        data: {
          status: 'expired',
        },
      });

      expiredCount++;

      // If booking is not yet assigned, return it to pool
      if (offer.booking && !offer.booking.sitterId && offer.booking.status === 'pending') {
        // Booking remains in pool - no action needed
        // The booking system will handle re-offering to other sitters
        bookingsReturnedToPool++;
      }

      // Update metrics window for this sitter
      try {
        await updateMetricsWindowForExpired(offer.orgId, offer.sitterId);
      } catch (error) {
        console.error(`[Expire Offers] Failed to update metrics for sitter ${offer.sitterId}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      expiredCount,
      bookingsReturnedToPool,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error('[Expire Offers API] Failed to expire offers:', error);
    return NextResponse.json(
      { error: 'Failed to expire offers', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Update metrics window when an offer expires
 */
async function updateMetricsWindowForExpired(orgId: string, sitterId: string) {
  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Get all offers in this window to recalculate rates
  const offers = await (prisma as any).offerEvent.findMany({
    where: {
      orgId,
      sitterId,
      offeredAt: { gte: sevenDaysAgo, lte: now },
      excluded: false,
    },
  });

  const totalOffers = offers.length;
  const accepted = offers.filter((o: any) => o.status === 'accepted' || o.acceptedAt).length;
  const declined = offers.filter((o: any) => o.status === 'declined' || o.declinedAt).length;
  const expired = offers.filter((o: any) => o.status === 'expired' || (o.expiresAt && new Date(o.expiresAt) < now && !o.acceptedAt && !o.declinedAt)).length;

  // Get response times (only for accepted/declined, not expired)
  const responseTimes = offers
    .filter((o: any) => o.acceptedAt || o.declinedAt)
    .map((o: any) => {
      const respondedAt = o.acceptedAt || o.declinedAt;
      return Math.floor((new Date(respondedAt).getTime() - new Date(o.offeredAt).getTime()) / 1000);
    });

  const avgResponseSeconds = responseTimes.length > 0
    ? responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length
    : null;

  const sortedTimes = [...responseTimes].sort((a: number, b: number) => a - b);
  const medianResponseSeconds = sortedTimes.length > 0
    ? sortedTimes[Math.floor(sortedTimes.length / 2)]
    : null;

  const offerAcceptRate = totalOffers > 0 ? accepted / totalOffers : null;
  const offerDeclineRate = totalOffers > 0 ? declined / totalOffers : null;
  const offerExpireRate = totalOffers > 0 ? expired / totalOffers : null;

  // Get or create metrics window
  const existing = await (prisma as any).sitterMetricsWindow.findFirst({
    where: {
      orgId,
      sitterId,
      windowStart: { lte: sevenDaysAgo },
      windowEnd: { gte: now },
      windowType: 'weekly_7d',
    },
  });

  if (existing) {
    await (prisma as any).sitterMetricsWindow.update({
      where: { id: existing.id },
      data: {
        avgResponseSeconds,
        medianResponseSeconds,
        offerAcceptRate,
        offerDeclineRate,
        offerExpireRate,
        updatedAt: now,
      },
    });
  } else if (totalOffers > 0) {
    await (prisma as any).sitterMetricsWindow.create({
      data: {
        orgId,
        sitterId,
        windowStart: sevenDaysAgo,
        windowEnd: now,
        windowType: 'weekly_7d',
        avgResponseSeconds,
        medianResponseSeconds,
        offerAcceptRate,
        offerDeclineRate,
        offerExpireRate,
      },
    });
  }
}
