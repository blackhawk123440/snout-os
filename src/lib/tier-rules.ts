/**
 * Tier Rules (Phase 5.2)
 * 
 * Implements tier-based rules for pay split and eligibility.
 * Per Master Spec 7.2: Tier rules, pay split, eligibility for complex routines, service types.
 */

import { prisma } from "./db";

/**
 * Get commission percentage for a sitter
 * Per Master Spec 7.2.2: Tier rules override sitter-level commission
 * Returns tier commission if available, otherwise falls back to sitter.commissionPercentage
 */
export async function getSitterCommissionPercentage(sitterId: string): Promise<number> {
  const sitter = await prisma.sitter.findUnique({
    where: { id: sitterId },
    include: {
      currentTier: true,
    },
  });

  if (!sitter) {
    return 80.0; // Default fallback
  }

  // Phase 5.2: Check if tier has commission override
  // For now, use sitter.commissionPercentage (tier-based commission can be added to tier model later)
  // TODO: Add commissionPercentage field to SitterTier model if tier-based pay split is needed
  
  return sitter.commissionPercentage || 80.0;
}

/**
 * Check if sitter is eligible for a service type
 * Per Master Spec 7.2.2: Eligibility for complex routines, service types
 */
export async function isSitterEligibleForService(
  sitterId: string,
  service: string
): Promise<{ eligible: boolean; reason?: string }> {
  const sitter = await prisma.sitter.findUnique({
    where: { id: sitterId },
    include: {
      currentTier: true,
    },
  });

  if (!sitter) {
    return { eligible: false, reason: "Sitter not found" };
  }

  // Phase 5.2: Check tier eligibility for complex services
  if (service === "Housesitting" || service === "House Sitting") {
    if (sitter.currentTier && !sitter.currentTier.canTakeHouseSits) {
      return {
        eligible: false,
        reason: `Sitter tier "${sitter.currentTier.name}" does not allow house sitting assignments`,
      };
    }
  }

  if (service === "24/7 Care" || service === "24/7") {
    if (sitter.currentTier && !sitter.currentTier.canTakeTwentyFourHourCare) {
      return {
        eligible: false,
        reason: `Sitter tier "${sitter.currentTier.name}" does not allow 24/7 care assignments`,
      };
    }
  }

  return { eligible: true };
}

/**
 * Get all eligible sitters for a service type
 * Filters sitters based on tier eligibility
 */
export async function getEligibleSittersForService(service: string): Promise<string[]> {
  const sitters = await prisma.sitter.findMany({
    where: { active: true },
    include: {
      currentTier: true,
    },
  });

  const eligibleSitterIds: string[] = [];

  for (const sitter of sitters) {
    const eligibility = await isSitterEligibleForService(sitter.id, service);
    if (eligibility.eligible) {
      eligibleSitterIds.push(sitter.id);
    }
  }

  return eligibleSitterIds;
}

