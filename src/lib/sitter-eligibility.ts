/**
 * Sitter Eligibility Helper
 * 
 * Determines if a sitter is eligible for a booking offer and selects the best sitter
 * from a pool of candidates.
 */

import { prisma } from '@/lib/db';

export interface BookingWindow {
  startAt: Date;
  endAt: Date;
}

export interface EligibilityCheckResult {
  eligible: boolean;
  reason?: string;
}

/**
 * Check if sitter is eligible for a booking offer
 */
export async function checkSitterEligibility(
  orgId: string,
  sitterId: string,
  bookingId: string,
  bookingWindow: BookingWindow
): Promise<EligibilityCheckResult> {
  // 1. Check sitter is active
  const sitter = await (prisma as any).sitter.findUnique({
    where: { id: sitterId },
    select: {
      active: true,
      currentTierId: true,
    },
  });

  if (!sitter) {
    return { eligible: false, reason: 'Sitter not found' };
  }

  if (!sitter.active) {
    return { eligible: false, reason: 'Sitter is not active' };
  }

  // 2. Check booking is not already assigned to another sitter
  const booking = await (prisma as any).booking.findUnique({
    where: { id: bookingId },
    select: {
      sitterId: true,
      status: true,
    },
  });

  if (!booking) {
    return { eligible: false, reason: 'Booking not found' };
  }

  if (booking.sitterId && booking.sitterId !== sitterId) {
    return { eligible: false, reason: 'Booking is already assigned to another sitter' };
  }

  // 3. Check for overlapping confirmed bookings
  const overlappingBookings = await (prisma as any).booking.findMany({
    where: {
      sitterId: sitterId,
      status: { in: ['confirmed', 'pending'] },
      OR: [
        // Booking starts during this window
        {
          startAt: { gte: bookingWindow.startAt, lt: bookingWindow.endAt },
        },
        // Booking ends during this window
        {
          endAt: { gt: bookingWindow.startAt, lte: bookingWindow.endAt },
        },
        // Booking completely contains this window
        {
          startAt: { lte: bookingWindow.startAt },
          endAt: { gte: bookingWindow.endAt },
        },
      ],
    },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      service: true,
    },
  });

  if (overlappingBookings.length > 0) {
    const conflict = overlappingBookings[0];
    return {
      eligible: false,
      reason: `Sitter has overlapping booking (${conflict.service} from ${conflict.startAt.toISOString()} to ${conflict.endAt.toISOString()})`,
    };
  }

  return { eligible: true };
}

/**
 * Select the best eligible sitter for a booking
 * 
 * Priority:
 * 1. Active + available
 * 2. No conflicts
 * 3. Highest tier first (if tier exists)
 * 4. Fallback to any eligible sitter
 */
export async function selectEligibleSitter(
  orgId: string,
  bookingId: string,
  bookingWindow: BookingWindow,
  excludeSitterIds: string[] = []
): Promise<{ sitterId: string | null; reason: string }> {
  // Get booking details
  const booking = await (prisma as any).booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      service: true,
    },
  });

  if (!booking) {
    return { sitterId: null, reason: 'Booking not found' };
  }

  // Get all active sitters (excluding the ones we're excluding)
  const allSitters = await (prisma as any).sitter.findMany({
    where: {
      active: true,
      id: { notIn: excludeSitterIds },
    },
    include: {
      currentTier: {
        select: {
          priorityLevel: true,
        },
      },
    },
  });

  // Check each sitter for eligibility
  const eligibleSitters: Array<{
    sitterId: string;
    priorityLevel: number;
    tierName: string | null;
  }> = [];

  for (const sitter of allSitters) {
    const eligibility = await checkSitterEligibility(
      orgId,
      sitter.id,
      bookingId,
      bookingWindow
    );

    if (eligibility.eligible) {
      eligibleSitters.push({
        sitterId: sitter.id,
        priorityLevel: sitter.currentTier?.priorityLevel ?? 999, // Lower is better
        tierName: sitter.currentTier?.name ?? null,
      });
    }
  }

  if (eligibleSitters.length === 0) {
    return { sitterId: null, reason: 'No eligible sitters found' };
  }

  // Sort by priority level (lower is better), then by sitterId for consistency
  eligibleSitters.sort((a, b) => {
    if (a.priorityLevel !== b.priorityLevel) {
      return a.priorityLevel - b.priorityLevel;
    }
    return a.sitterId.localeCompare(b.sitterId);
  });

  const selected = eligibleSitters[0];
  return {
    sitterId: selected.sitterId,
    reason: `Selected sitter with tier ${selected.tierName || 'Unknown'} (priority ${selected.priorityLevel})`,
  };
}
