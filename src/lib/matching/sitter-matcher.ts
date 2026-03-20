/**
 * Sitter Matching Engine (Phase 3.1)
 *
 * Weighted scoring algorithm that ranks sitters for a booking based on:
 * - Availability (0-30)
 * - Pet familiarity (0-20)
 * - SRS score (0-20)
 * - Workload balance (0-15)
 * - Client history (0-15)
 */

import { prisma } from '@/lib/db';

export interface MatchInput {
  orgId: string;
  service: string;
  startAt: Date;
  endAt: Date;
  clientId: string;
  lat?: number | null;
  lng?: number | null;
}

export interface SitterMatch {
  sitterId: string;
  sitterName: string;
  score: number; // 0-100
  breakdown: {
    availability: number;   // 0-30 points
    petFamiliarity: number; // 0-20 points
    srsScore: number;       // 0-20 points
    workloadBalance: number;// 0-15 points
    clientHistory: number;  // 0-15 points
  };
}

/**
 * Score availability: 0 if conflicting booking exists, 30 if available.
 */
async function scoreAvailability(
  sitterId: string,
  orgId: string,
  startAt: Date,
  endAt: Date,
): Promise<number> {
  const conflicting = await prisma.booking.findFirst({
    where: {
      orgId,
      sitterId,
      status: { notIn: ['cancelled', 'canceled'] },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: { id: true },
  });

  return conflicting ? 0 : 30;
}

/**
 * Score pet familiarity based on how many times this sitter has served this client.
 * 0 visits = 0, 1-3 = 10, 4+ = 20
 */
async function scorePetFamiliarity(
  sitterId: string,
  orgId: string,
  clientId: string,
): Promise<number> {
  const pastVisits = await prisma.booking.count({
    where: {
      orgId,
      sitterId,
      clientId,
      status: { in: ['completed', 'confirmed'] },
    },
  });

  if (pastVisits >= 4) return 20;
  if (pastVisits >= 1) return 10;
  return 0;
}

/**
 * Score based on SRS (Sitter Reliability Score).
 * Uses the latest SitterTierSnapshot's rolling30dScore, normalized to 0-20.
 * If no snapshot exists, defaults to 10.
 */
async function scoreSrs(
  sitterId: string,
  orgId: string,
): Promise<number> {
  const snapshot = await prisma.sitterTierSnapshot.findFirst({
    where: { orgId, sitterId },
    orderBy: { asOfDate: 'desc' },
    select: { rolling30dScore: true },
  });

  if (!snapshot) return 10;

  // rolling30dScore is 0-100, normalize to 0-20
  return Math.round((snapshot.rolling30dScore / 100) * 20);
}

/**
 * Score workload balance based on bookings today.
 * 0 bookings = 15, 1-3 = 10, 4-6 = 5, 7+ = 0
 */
async function scoreWorkloadBalance(
  sitterId: string,
  orgId: string,
): Promise<number> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todayBookings = await prisma.booking.count({
    where: {
      orgId,
      sitterId,
      status: { notIn: ['cancelled', 'canceled'] },
      startAt: { gte: todayStart, lte: todayEnd },
    },
  });

  if (todayBookings === 0) return 15;
  if (todayBookings <= 3) return 10;
  if (todayBookings <= 6) return 5;
  return 0;
}

/**
 * Score client history based on past visit report ratings.
 * Positive rating (4-5) = 15, neutral (3) = 7, no reports or low = 0
 */
async function scoreClientHistory(
  sitterId: string,
  orgId: string,
  clientId: string,
): Promise<number> {
  const reports = await prisma.report.findMany({
    where: {
      orgId,
      sitterId,
      clientId,
      clientRating: { not: null },
    },
    select: { clientRating: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  if (reports.length === 0) return 0;

  const avgRating =
    reports.reduce((sum, r) => sum + (r.clientRating ?? 0), 0) / reports.length;

  if (avgRating >= 4) return 15;
  if (avgRating >= 3) return 7;
  return 0;
}

/**
 * Rank all active sitters in an org for a given booking.
 * Returns scored matches sorted by total score descending.
 */
export async function rankSittersForBooking(
  input: MatchInput,
): Promise<SitterMatch[]> {
  const { orgId, startAt, endAt, clientId, lat, lng } = input;

  // 1. Query all active sitters for the org
  let sitters = await prisma.sitter.findMany({
    where: {
      orgId,
      active: true,
      deletedAt: null,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  });

  // 1b. Zone filtering: if lat/lng provided, prefer sitters in matching zones
  let zoneNames: string[] = [];
  if (lat != null && lng != null) {
    try {
      const { filterSittersByZone } = await import('@/lib/zones/point-in-polygon');
      const zoneResult = await filterSittersByZone(orgId, lat, lng);
      zoneNames = zoneResult.matchedZones;
      if (zoneResult.filteredSitterIds && zoneResult.filteredSitterIds.length > 0) {
        const zoneSet = new Set(zoneResult.filteredSitterIds);
        sitters = sitters.filter(s => zoneSet.has(s.id));
      }
    } catch { /* zone filtering is optional */ }
  }

  // 2. Score each sitter in parallel
  const matches: SitterMatch[] = await Promise.all(
    sitters.map(async (sitter) => {
      const [availability, petFamiliarity, srsScore, workloadBalance, clientHistory] =
        await Promise.all([
          scoreAvailability(sitter.id, orgId, startAt, endAt),
          scorePetFamiliarity(sitter.id, orgId, clientId),
          scoreSrs(sitter.id, orgId),
          scoreWorkloadBalance(sitter.id, orgId),
          scoreClientHistory(sitter.id, orgId, clientId),
        ]);

      const breakdown = {
        availability,
        petFamiliarity,
        srsScore,
        workloadBalance,
        clientHistory,
      };

      const score =
        breakdown.availability +
        breakdown.petFamiliarity +
        breakdown.srsScore +
        breakdown.workloadBalance +
        breakdown.clientHistory;

      return {
        sitterId: sitter.id,
        sitterName: `${sitter.firstName} ${sitter.lastName}`.trim(),
        score,
        breakdown,
      };
    }),
  );

  // 3. Sort by total score descending
  matches.sort((a, b) => b.score - a.score);

  return matches;
}
