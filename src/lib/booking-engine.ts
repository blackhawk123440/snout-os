/**
 * Booking Engine Extensions
 * 
 * Provides overlap detection, travel time calculation, and sitter recommendations
 */

import { prisma } from "@/lib/db";

interface TimeSlot {
  startAt: Date;
  endAt: Date;
  duration?: number;
}

interface BookingConflict {
  bookingId: string;
  conflictType: "overlap" | "travel_time" | "both";
  overlapMinutes: number;
  travelTimeMinutes: number;
  message: string;
}

interface SitterRecommendation {
  sitterId: string;
  sitter: {
    id: string;
    firstName: string;
    lastName: string;
    active: boolean;
    currentTier?: {
      priorityLevel: number;
    };
  };
  score: number;
  reasons: string[];
  conflicts: BookingConflict[];
}

/**
 * Calculate travel time between two addresses (in minutes)
 * This is a simplified version - in production, use a real geocoding/distance API
 */
export function calculateTravelTime(
  address1: string,
  address2: string,
  averageSpeedMph: number = 30
): number {
  // Simplified: assume 1 mile per minute at 30mph average
  // In production, use Google Maps API or similar
  // For now, return a default travel time based on address similarity
  if (!address1 || !address2) {
    return 15; // Default 15 minutes if addresses missing
  }

  // If addresses are very similar (same street), assume 5 minutes
  const addr1Normalized = address1.toLowerCase().trim();
  const addr2Normalized = address2.toLowerCase().trim();
  
  if (addr1Normalized === addr2Normalized) {
    return 5;
  }

  // Extract zip codes if available
  const zip1 = addr1Normalized.match(/\b\d{5}\b/)?.[0];
  const zip2 = addr2Normalized.match(/\b\d{5}\b/)?.[0];
  
  if (zip1 && zip2 && zip1 === zip2) {
    return 10; // Same zip code = 10 minutes
  }

  // Default travel time
  return 15;
}

/**
 * Check if two time slots overlap
 */
export function timeSlotsOverlap(
  slot1: TimeSlot,
  slot2: TimeSlot
): { overlaps: boolean; overlapMinutes: number } {
  const start1 = new Date(slot1.startAt).getTime();
  const end1 = new Date(slot1.endAt).getTime();
  const start2 = new Date(slot2.startAt).getTime();
  const end2 = new Date(slot2.endAt).getTime();

  // Check for overlap
  const overlaps = start1 < end2 && start2 < end1;

  if (!overlaps) {
    return { overlaps: false, overlapMinutes: 0 };
  }

  // Calculate overlap duration
  const overlapStart = Math.max(start1, start2);
  const overlapEnd = Math.min(end1, end2);
  const overlapMinutes = Math.round((overlapEnd - overlapStart) / (1000 * 60));

  return { overlaps: true, overlapMinutes };
}

/**
 * Check if there's enough travel time between two bookings
 */
export function hasEnoughTravelTime(
  booking1End: Date,
  booking2Start: Date,
  requiredTravelMinutes: number
): boolean {
  const timeBetween = (new Date(booking2Start).getTime() - new Date(booking1End).getTime()) / (1000 * 60);
  return timeBetween >= requiredTravelMinutes;
}

/**
 * Detect conflicts for a booking with existing bookings
 */
export async function detectBookingConflicts(
  bookingId: string,
  timeSlots: TimeSlot[],
  address: string,
  sitterId?: string
): Promise<BookingConflict[]> {
  const conflicts: BookingConflict[] = [];

  // Get existing bookings for the same sitter (or all bookings if no sitter specified)
  const where: any = {
    status: { in: ["pending", "confirmed"] },
    id: { not: bookingId },
  };

  if (sitterId) {
    where.sitterId = sitterId;
  }

  const existingBookings = await prisma.booking.findMany({
    where,
    include: {
      timeSlots: {
        orderBy: { startAt: "asc" },
      },
    },
  });

  // Check each time slot for conflicts
  for (const newSlot of timeSlots) {
    for (const existingBooking of existingBookings) {
      for (const existingSlot of existingBooking.timeSlots) {
        // Check for overlap
        const overlap = timeSlotsOverlap(newSlot, {
          startAt: existingSlot.startAt,
          endAt: existingSlot.endAt,
        });

        if (overlap.overlaps) {
          conflicts.push({
            bookingId: existingBooking.id,
            conflictType: "overlap",
            overlapMinutes: overlap.overlapMinutes,
            travelTimeMinutes: 0,
            message: `Overlaps with booking ${existingBooking.id} by ${overlap.overlapMinutes} minutes`,
          });
        } else {
          // Check travel time
          const travelTime = calculateTravelTime(
            address || "",
            existingBooking.address || ""
          );

          // Check if there's enough time between bookings
          const booking1End = new Date(existingSlot.endAt);
          const booking2Start = new Date(newSlot.startAt);
          const timeBetween = (booking2Start.getTime() - booking1End.getTime()) / (1000 * 60);

          if (timeBetween > 0 && timeBetween < travelTime) {
            conflicts.push({
              bookingId: existingBooking.id,
              conflictType: "travel_time",
              overlapMinutes: 0,
              travelTimeMinutes: travelTime - timeBetween,
              message: `Insufficient travel time (${Math.round(timeBetween)} min available, ${travelTime} min needed)`,
            });
          }
        }
      }
    }
  }

  return conflicts;
}

/**
 * Get sitter recommendations for a booking
 */
export async function getSitterRecommendations(
  bookingId: string,
  service: string,
  timeSlots: TimeSlot[],
  address: string,
  petCount: number
): Promise<SitterRecommendation[]> {
  // Get all active sitters
  const sitters = await prisma.sitter.findMany({
    where: { active: true },
    include: {
      currentTier: true,
      bookings: {
        where: {
          status: { in: ["pending", "confirmed"] },
        },
        include: {
          timeSlots: {
            orderBy: { startAt: "asc" },
          },
        },
      },
    },
  });

  const recommendations: SitterRecommendation[] = [];

  for (const sitter of sitters) {
    // Phase 5.2: Check tier eligibility for service type
    const { isSitterEligibleForService } = await import("./tier-rules");
    const eligibility = await isSitterEligibleForService(sitter.id, service);
    
    if (!eligibility.eligible) {
      // Skip sitters who are not eligible for this service type
      continue;
    }

    // Check conflicts
    const conflicts = await detectBookingConflicts(
      bookingId,
      timeSlots,
      address,
      sitter.id
    );

    // Calculate recommendation score
    let score = 100;
    const reasons: string[] = [];

    // Deduct points for conflicts
    for (const conflict of conflicts) {
      if (conflict.conflictType === "overlap") {
        score -= 50; // Major penalty for overlaps
        reasons.push(`Has overlapping booking (${conflict.overlapMinutes} min)`);
      } else if (conflict.conflictType === "travel_time") {
        score -= 20; // Penalty for travel time issues
        reasons.push(`Insufficient travel time (${conflict.travelTimeMinutes} min short)`);
      }
    }

    // Bonus for tier priority
    if (sitter.currentTier) {
      score += sitter.currentTier.priorityLevel * 5;
      reasons.push(`Tier: ${sitter.currentTier.priorityLevel}`);
    }

    // Bonus for fewer existing bookings (less busy)
    const existingBookingCount = sitter.bookings.length;
    score += Math.max(0, 20 - existingBookingCount * 2);
    if (existingBookingCount === 0) {
      reasons.push("No existing bookings");
    }

    // Only include sitters with score > 0 and no critical conflicts
    const hasCriticalConflict = conflicts.some(c => c.conflictType === "overlap");
    
    if (!hasCriticalConflict) {
      recommendations.push({
        sitterId: sitter.id,
        sitter: {
          id: sitter.id,
          firstName: sitter.firstName,
          lastName: sitter.lastName,
          active: sitter.active,
          currentTier: sitter.currentTier || undefined,
        },
        score: Math.max(0, score),
        reasons: reasons.length > 0 ? reasons : ["Available"],
        conflicts,
      });
    }
  }

  // Sort by score (highest first), then by tier priority
  recommendations.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const tierA = a.sitter.currentTier?.priorityLevel || 0;
    const tierB = b.sitter.currentTier?.priorityLevel || 0;
    return tierB - tierA;
  });

  return recommendations;
}

/**
 * Check if a booking can be assigned to a sitter
 */
export async function canAssignSitter(
  bookingId: string,
  sitterId: string,
  timeSlots: TimeSlot[],
  address: string
): Promise<{ canAssign: boolean; conflicts: BookingConflict[]; message: string }> {
  const conflicts = await detectBookingConflicts(
    bookingId,
    timeSlots,
    address,
    sitterId
  );

  const hasOverlap = conflicts.some(c => c.conflictType === "overlap");
  const hasTravelTimeIssue = conflicts.some(c => c.conflictType === "travel_time");

  if (hasOverlap) {
    return {
      canAssign: false,
      conflicts,
      message: "Cannot assign: booking overlaps with existing bookings",
    };
  }

  if (hasTravelTimeIssue) {
    return {
      canAssign: false,
      conflicts,
      message: "Cannot assign: insufficient travel time between bookings",
    };
  }

  return {
    canAssign: true,
    conflicts: [],
    message: "Sitter can be assigned",
  };
}



