/**
 * Sitter Tier & Performance Engine
 * 
 * Calculates sitter tiers based on performance metrics
 */

import { prisma } from "@/lib/db";
import { emitSitterTierChanged } from "./event-emitter";

interface TierCalculationResult {
  sitterId: string;
  previousTierId: string | null;
  newTierId: string;
  points: number;
  completionRate: number;
  responseRate: number;
  tierName: string;
}

/**
 * Calculate points for a sitter based on completed bookings
 */
export async function calculateSitterPoints(
  sitterId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<number> {
  // Note: Booking model not available in messaging dashboard schema
  // Return 0 - tier points calculation not available
  return 0;
  
  /* Original code (commented out):
  const bookings = await prisma.booking.findMany({
    where: {
      sitterId,
      status: "completed",
      createdAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    include: {
      timeSlots: true,
    },
  });

  let totalPoints = 0;

  // Get service point weights
  const pointWeights = await prisma.servicePointWeight.findMany();

  for (const booking of bookings) {
    // Find matching point weight
    const weight = pointWeights.find(
      (w) => w.service === booking.service && (w.duration === null || w.duration === booking.quantity)
    ) || pointWeights.find((w) => w.service === booking.service && w.duration === null);

    const pointsPerBooking = weight?.points || 1;
    totalPoints += pointsPerBooking;
  }

  return totalPoints;
}

/**
 * Calculate completion rate for a sitter
 */
export async function calculateCompletionRate(
  sitterId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<number> {
  // Note: Booking model not available in messaging dashboard schema
  // Return 0 - completion rate calculation not available
  return 0;
  
  /* Original code (commented out):
  const [completed, assigned] = await Promise.all([
    prisma.booking.count({
      where: {
        sitterId,
        status: "completed",
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    }),
    prisma.booking.count({
      where: {
        sitterId,
        status: { in: ["confirmed", "completed"] },
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    }),
  ]);

  if (assigned === 0) {
    return 100; // No assignments = 100% completion
  }

  return (completed / assigned) * 100;
}

/**
 * Calculate response rate for a sitter
 * (Response to sitter pool offers, messages, etc.)
 */
export async function calculateResponseRate(
  sitterId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<number> {
  // Note: SitterPoolOffer model not available in messaging dashboard schema
  // Return 0 - response rate calculation not available
  return 0;
  
  /* Original code (commented out):
  const offers = await prisma.sitterPoolOffer.findMany({
    where: {
      OR: [
        { sitterId },
        {
          sitterIds: {
            contains: sitterId,
          },
        },
      ],
      createdAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
  });

  if (offers.length === 0) {
    return 100; // No offers = 100% response rate
  }

  // Count responses (accepted or declined)
  const responded = offers.filter((offer) => {
    const responses = JSON.parse(offer.responses || "[]");
    return responses.some((r: any) => r.sitterId === sitterId);
  }).length;

  return (responded / offers.length) * 100;
}

/**
 * Determine tier for a sitter based on metrics
 */
export async function determineSitterTier(
  points: number,
  completionRate: number,
  responseRate: number
): Promise<string | null> {
  // Note: SitterTier model not available in messaging dashboard schema
  // Return null - tier determination not available
  return null;
  
  /* Original code (commented out):
  const tiers = await prisma.sitterTier.findMany({
    orderBy: { priorityLevel: "desc" },
  });

  // Find the highest tier the sitter qualifies for
  for (const tier of tiers) {
    // Check point target
    if (points < tier.pointTarget) {
      continue;
    }

    // Check completion rate
    if (tier.minCompletionRate !== null && completionRate < tier.minCompletionRate) {
      continue;
    }

    // Check response rate
    if (tier.minResponseRate !== null && responseRate < tier.minResponseRate) {
      continue;
    }

    // Sitter qualifies for this tier
    return tier.id;
  }

  // If no tier matches, return default tier
  const defaultTier = tiers.find((t) => t.isDefault);
  return defaultTier?.id || null;
}

/**
 * Calculate and assign tier for a single sitter
 */
export async function calculateSitterTier(
  sitterId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<TierCalculationResult | null> {
  // Note: API schema Sitter model doesn't have currentTier relation
  const sitter = await prisma.sitter.findUnique({
    where: { id: sitterId },
  });

  if (!sitter) {
    return null;
  }

  // Note: Tier system not available in messaging dashboard schema
  // Return null - tier calculation not available
  return null;
  
  /* Original code (commented out):
  const [points, completionRate, responseRate] = await Promise.all([
    calculateSitterPoints(sitterId, periodStart, periodEnd),
    calculateCompletionRate(sitterId, periodStart, periodEnd),
    calculateResponseRate(sitterId, periodStart, periodEnd),
  ]);

  const newTierId = await determineSitterTier(points, completionRate, responseRate);

  if (!newTierId) {
    return null;
  }
  
  /* Original code (commented out):
  const previousTierId = sitter.currentTierId;

  if (previousTierId !== newTierId) {
    await prisma.sitter.update({
      where: { id: sitterId },
      data: { currentTierId: newTierId },
    });

    await prisma.sitterTierHistory.create({
      data: {
        sitterId,
        tierId: newTierId,
        points,
        completionRate,
        responseRate,
        periodStart,
        periodEnd,
      },
    });

    // Emit tier changed event
    await emitSitterTierChanged(sitter, previousTierId, newTierId);
  }

  const newTier = await prisma.sitterTier.findUnique({
    where: { id: newTierId },
  });

  return {
    sitterId,
    previousTierId,
    newTierId,
    points,
    completionRate,
    responseRate,
    tierName: newTier?.name || "Unknown",
  };
}

/**
 * Calculate tiers for all sitters (monthly job)
 */
export async function calculateAllSitterTiers(
  periodStart?: Date,
  periodEnd?: Date
): Promise<TierCalculationResult[]> {
  // Default to last month if not specified
  const end = periodEnd || new Date();
  const start = periodStart || new Date(end.getFullYear(), end.getMonth() - 1, 1);

  const sitters = await prisma.sitter.findMany({
    where: { active: true },
  });

  const results: TierCalculationResult[] = [];

  for (const sitter of sitters) {
    try {
      const result = await calculateSitterTier(sitter.id, start, end);
      if (result) {
        results.push(result);
      }
    } catch (error) {
      console.error(`Failed to calculate tier for sitter ${sitter.id}:`, error);
    }
  }

  return results;
}



