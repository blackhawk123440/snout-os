/**
 * Offer Reassignment Helper
 * 
 * Production-safe offer reassignment with attempt tracking, cooldowns, and escalation.
 */

import { prisma } from '@/lib/db';

// Configuration constants
export const MAX_REASSIGNMENT_ATTEMPTS = 5; // Max attempts per booking
export const SITTER_COOLDOWN_HOURS = 24; // Hours before re-offering to a sitter who declined/expired

/**
 * Get attempt count for a booking (count of all offers for this booking)
 */
export async function getBookingAttemptCount(
  orgId: string,
  bookingId: string
): Promise<number> {
  const offers = await (prisma as any).offerEvent.findMany({
    where: {
      orgId,
      bookingId,
      excluded: false,
    },
    select: { id: true },
  });
  return offers.length;
}

/**
 * Get sitter IDs that should be excluded due to cooldown
 * (sitters who declined/expired an offer for this booking within cooldown period)
 */
export async function getSittersInCooldown(
  orgId: string,
  bookingId: string,
  cooldownHours: number = SITTER_COOLDOWN_HOURS
): Promise<string[]> {
  const cooldownThreshold = new Date();
  cooldownThreshold.setHours(cooldownThreshold.getHours() - cooldownHours);

  const recentOffers = await (prisma as any).offerEvent.findMany({
    where: {
      orgId,
      bookingId,
      status: { in: ['declined', 'expired'] },
      OR: [
        { declinedAt: { gte: cooldownThreshold } },
        { updatedAt: { gte: cooldownThreshold } }, // For expired offers
      ],
      excluded: false,
    },
    select: { sitterId: true },
    distinct: ['sitterId'],
  });

  return recentOffers.map((o: any) => o.sitterId);
}

/**
 * Mark booking as requiring manual dispatch
 */
export async function markBookingForManualDispatch(
  orgId: string,
  bookingId: string,
  reason: string
): Promise<void> {
  // Use notes field to flag for manual dispatch (since there's no dedicated field)
  // Format: "[MANUAL_DISPATCH] reason"
  const booking = await (prisma as any).booking.findUnique({
    where: { id: bookingId },
    select: { notes: true },
  });

  const existingNotes = booking?.notes || '';
  const manualDispatchFlag = `[MANUAL_DISPATCH] ${reason}`;
  
  // Only add flag if not already present
  if (!existingNotes.includes('[MANUAL_DISPATCH]')) {
    const updatedNotes = existingNotes
      ? `${existingNotes}\n${manualDispatchFlag}`
      : manualDispatchFlag;

    await (prisma as any).booking.update({
      where: { id: bookingId },
      data: {
        notes: updatedNotes,
        status: 'pending', // Ensure it's in pool
        sitterId: null, // Ensure unassigned
      },
    });
  }
}

/**
 * Check if booking is flagged for manual dispatch
 */
export async function isBookingFlaggedForManualDispatch(
  bookingId: string
): Promise<boolean> {
  const booking = await (prisma as any).booking.findUnique({
    where: { id: bookingId },
    select: { notes: true },
  });

  return booking?.notes?.includes('[MANUAL_DISPATCH]') || false;
}
