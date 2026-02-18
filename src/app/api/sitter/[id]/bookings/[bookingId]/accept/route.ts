/**
 * Accept Booking Request API Route
 * 
 * POST: Accept a booking request from an OfferEvent
 * Updates OfferEvent status, assigns booking to sitter, records response time
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { recordOfferAccepted } from '@/lib/audit-events';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bookingId: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const resolvedParams = await params;
    const sitterId = resolvedParams.id;
    const bookingId = resolvedParams.bookingId;
    const orgId = (session.user as any).orgId;

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 400 }
      );
    }

    // Verify sitter matches authenticated user
    if (sitterId !== (session.user as any).sitterId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const now = new Date();

    // Find the active offer for this booking and sitter (not expired)
    const offer = await (prisma as any).offerEvent.findFirst({
      where: {
        orgId,
        sitterId: sitterId,
        bookingId: bookingId,
        status: 'sent',
        excluded: false,
        expiresAt: { gt: now }, // Only non-expired offers
      },
    });

    if (!offer) {
      return NextResponse.json(
        { error: 'No active offer found for this booking. The offer may have expired or already been processed.' },
        { status: 404 }
      );
    }

    // Check if already accepted/declined (idempotency)
    if (offer.status === 'accepted' || offer.acceptedAt) {
      return NextResponse.json(
        { error: 'Offer already accepted' },
        { status: 400 }
      );
    }

    if (offer.status === 'declined' || offer.declinedAt) {
      return NextResponse.json(
        { error: 'Offer already declined' },
        { status: 400 }
      );
    }

    // Check if booking is already assigned to another sitter
    const booking = await (prisma as any).booking.findUnique({
      where: { id: bookingId },
      select: { sitterId: true, status: true },
    });

    if (booking?.sitterId && booking.sitterId !== sitterId) {
      return NextResponse.json(
        { error: 'Booking is already assigned to another sitter' },
        { status: 400 }
      );
    }

    const responseSeconds = Math.floor((now.getTime() - new Date(offer.offeredAt).getTime()) / 1000);

    // Update offer status
    await (prisma as any).offerEvent.update({
      where: { id: offer.id },
      data: {
        status: 'accepted',
        acceptedAt: now,
      },
    });

    // Assign booking to sitter
    await (prisma as any).booking.update({
      where: { id: bookingId },
      data: {
        sitterId: sitterId,
        status: 'confirmed',
      },
    });

    // Record audit event
    await recordOfferAccepted(
      orgId,
      sitterId,
      bookingId,
      offer.id,
      responseSeconds,
      (session.user as any).id
    );

    // Update metrics window with response time
    await updateMetricsWindow(orgId, sitterId, responseSeconds, 'accepted');

    // Trigger tier recomputation (async, don't wait)
    try {
      const { computeTierForSitter, recordTierChange } = await import('@/lib/tiers/tier-engine-twilio');
      const tierResult = await computeTierForSitter(orgId, sitterId, 7);
      
      // Get tier ID from tier name
      const tier = await (prisma as any).sitterTier.findFirst({
        where: { name: tierResult.tier },
      });

      if (tier) {
        await recordTierChange(
          orgId,
          sitterId,
          tierResult.tier,
          tier.id,
          tierResult.metrics,
          tierResult.reasons
        );
      }
    } catch (error) {
      console.error('[Tier Engine] Failed to recompute tier:', error);
      // Don't fail the request if tier computation fails
    }

    return NextResponse.json({ success: true, responseSeconds });
  } catch (error: any) {
    console.error('[Accept Booking API] Failed to accept booking:', error);
    return NextResponse.json(
      { error: 'Failed to accept booking', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Update metrics window with response time and acceptance
 */
async function updateMetricsWindow(
  orgId: string,
  sitterId: string,
  responseSeconds: number,
  action: 'accepted' | 'declined'
) {
  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

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

  // Get response times
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

  if (existing) {
    await (prisma as any).sitterMetricsWindow.update({
      where: { id: existing.id },
      data: {
        avgResponseSeconds,
        medianResponseSeconds,
        offerAcceptRate,
        offerDeclineRate,
        offerExpireRate,
        lastOfferRespondedAt: now,
        updatedAt: now,
      },
    });
  } else {
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
        lastOfferRespondedAt: now,
      },
    });
  }
}
