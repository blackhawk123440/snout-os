/**
 * Tier Permissions Engine
 * 
 * Centralized rule engine for sitter tier permissions.
 * Enterprise Rule: All tier checks must go through this engine - no page-specific checks.
 * 
 * This is the single source of truth for what each tier can do.
 */

import { prisma } from "@/lib/db";

export interface TierPermissions {
  // Pool & Assignment
  canJoinPools: boolean;
  canAutoAssign: boolean;
  canLeadPool: boolean;
  
  // Booking Types
  canOvernight: boolean;
  canSameDay: boolean;
  canHighValue: boolean;
  canRecurring: boolean;
  canHouseSits: boolean;
  canTwentyFourHourCare: boolean;
  
  // Special Privileges
  canOverrideDecline: boolean;
  
  // Earnings
  commissionSplit: number; // Percentage (0-100)
}

export interface TierInfo {
  id: string;
  name: string;
  priorityLevel: number;
  permissions: TierPermissions;
  badgeColor?: string;
  badgeStyle?: string;
}

/**
 * Get tier permissions for a sitter
 */
export async function getSitterTierPermissions(sitterId: string): Promise<TierPermissions | null> {
  // Note: API schema Sitter model doesn't have currentTier relation
  // Tier system not available in messaging dashboard schema
  const sitter = await prisma.sitter.findUnique({
    where: { id: sitterId },
  });

  if (!sitter?.currentTier) {
    return null;
  }

  return tierToPermissions(sitter.currentTier);
}

/**
 * Convert tier model to permissions object
 */
export function tierToPermissions(tier: any): TierPermissions {
  return {
    canJoinPools: tier.canJoinPools ?? false,
    canAutoAssign: tier.canAutoAssign ?? false,
    canLeadPool: tier.canLeadPool ?? false,
    canOvernight: tier.canOvernight ?? false,
    canSameDay: tier.canSameDay ?? false,
    canHighValue: tier.canHighValue ?? false,
    canRecurring: tier.canRecurring ?? false,
    canHouseSits: tier.canTakeHouseSits ?? false,
    canTwentyFourHourCare: tier.canTakeTwentyFourHourCare ?? false,
    canOverrideDecline: tier.canOverrideDecline ?? false,
    commissionSplit: tier.commissionSplit ?? 70.0,
  };
}

/**
 * Check if sitter can be assigned to a booking
 */
export async function canSitterTakeBooking(
  sitterId: string,
  booking: {
    service: string;
    startAt: Date;
    createdAt: Date;
    totalPrice: number;
    clientId?: string | null;
  }
): Promise<{ allowed: boolean; reason?: string }> {
  const permissions = await getSitterTierPermissions(sitterId);
  
  if (!permissions) {
    return { allowed: false, reason: "Sitter has no tier assigned" };
  }

  // Check overnight/extended care
  const isOvernight = booking.service === "Housesitting" || booking.service === "24/7 Care";
  if (isOvernight && !permissions.canOvernight) {
    return { allowed: false, reason: "Tier does not allow overnight bookings" };
  }

  // Check same-day bookings
  const bookingDate = new Date(booking.startAt);
  const now = new Date();
  const hoursUntilBooking = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  const isSameDay = hoursUntilBooking < 24 && hoursUntilBooking > 0;
  
  if (isSameDay && !permissions.canSameDay) {
    return { allowed: false, reason: "Tier does not allow same-day bookings" };
  }

  // Check high-value clients (threshold: $500+ bookings)
  const isHighValue = booking.totalPrice >= 500;
  if (isHighValue && !permissions.canHighValue) {
    return { allowed: false, reason: "Tier does not allow high-value bookings" };
  }

  return { allowed: true };
}

/**
 * Check if sitter can join a sitter pool
 */
export async function canSitterJoinPool(sitterId: string): Promise<boolean> {
  const permissions = await getSitterTierPermissions(sitterId);
  return permissions?.canJoinPools ?? false;
}

/**
 * Check if sitter can be auto-assigned (without owner approval)
 */
export async function canSitterAutoAssign(sitterId: string): Promise<boolean> {
  const permissions = await getSitterTierPermissions(sitterId);
  return permissions?.canAutoAssign ?? false;
}

/**
 * Get tier ranking weight for sitter pool selection
 * Higher tier = higher weight
 */
export async function getTierRankingWeight(sitterId: string): Promise<number> {
  // Note: API schema Sitter model doesn't have currentTier relation
  // Return default weight
  const sitter = await prisma.sitter.findUnique({
    where: { id: sitterId },
  });

  if (!sitter) {
    return 0;
  }

  // No tier system in messaging dashboard - return default weight
  return 1;
}

/**
 * Get all eligible sitters for a booking, ranked by tier
 */
export async function getEligibleSittersForBooking(
  booking: {
    service: string;
    startAt: Date;
    createdAt: Date;
    totalPrice: number;
    clientId?: string | null;
  },
  options?: {
    includeInactive?: boolean;
    maxResults?: number;
  }
): Promise<Array<{ sitterId: string; tierWeight: number; canAutoAssign: boolean }>> {
  // Note: Tier system not available in messaging dashboard schema
  // Return empty array - tier-based selection not supported
  return [];
  
  /* Original code (commented out - tier system not in API schema):
  const allSitters = await prisma.sitter.findMany({
    where: {
      active: options?.includeInactive ? undefined : true,
    },
    include: {
      currentTier: true,
    },
  });

  const eligible: Array<{ sitterId: string; tierWeight: number; canAutoAssign: boolean }> = [];

  for (const sitter of allSitters) {
    const check = await canSitterTakeBooking(sitter.id, booking);
    if (check.allowed) {
      const weight = await getTierRankingWeight(sitter.id);
      const permissions = sitter.currentTier ? tierToPermissions(sitter.currentTier) : null;
      
      eligible.push({
        sitterId: sitter.id,
        tierWeight: weight,
        canAutoAssign: permissions?.canAutoAssign ?? false,
      });
    }
  }

  // Sort by tier weight (descending), then by availability/distance (secondary rules)
  eligible.sort((a, b) => b.tierWeight - a.tierWeight);

  if (options?.maxResults) {
    return eligible.slice(0, options.maxResults);
  }

  return eligible;
}

/**
 * Log tier change for audit trail
 */
export async function logTierChange(
  sitterId: string,
  fromTierId: string | null,
  toTierId: string,
  reason: string,
  changedBy?: string,
  metadata?: Record<string, any>
): Promise<void> {
  // Note: sitterTierHistory and eventLog models not available in API schema
  // Use AuditEvent instead
  try {
    const sitter = await prisma.sitter.findUnique({ where: { id: sitterId }, select: { orgId: true } });
    if (sitter) {
      await prisma.auditEvent.create({
        data: {
          orgId: sitter.orgId,
          actorType: 'system',
          eventType: 'sitter.tier.changed',
          entityType: 'sitter',
          entityId: sitterId,
          payload: {
            fromTierId,
            toTierId,
            reason,
            changedBy,
            ...metadata,
          },
        },
      });
    }
  } catch (error) {
    console.error('[tier-permissions] Failed to log tier change:', error);
  }
  
  /* Original code (commented out - models don't exist in API schema):
  await prisma.sitterTierHistory.create({
    data: {
      sitterId,
      tierId: toTierId,
      points: 0,
      periodStart: new Date(),
      changedBy: changedBy || null,
      reason,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });

  await prisma.eventLog.create({
    data: {
      eventType: "sitter.tier.changed",
      status: "success",
      metadata: JSON.stringify({
        sitterId,
        fromTierId,
        toTierId,
        reason,
        changedBy,
        ...metadata,
      }),
    },
  });
}
