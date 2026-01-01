/**
 * Pricing Reconciliation
 * 
 * Master Spec Reference: Section 5.3, Epic 12.3.5
 * 
 * Detects pricing drift by comparing stored pricing snapshots with recomputed totals.
 * Per Master Spec 5.3.1: "A reconciliation job compares stored snapshot totals with recompute totals and flags drift."
 * Per Master Spec 5.3.2: "Drift never silently changes client charges, it produces an exception task."
 */

import { prisma } from "@/lib/db";
import { deserializePricingSnapshot } from "./pricing-snapshot-helpers";
import { calculateCanonicalPricing, type PricingEngineInput } from "./pricing-engine-v1";
import { logEvent } from "./event-logger";

export interface PricingDriftResult {
  bookingId: string;
  storedTotal: number;
  recomputedTotal: number;
  driftAmount: number;
  driftPercentage: number;
  hasDrift: boolean;
}

export interface ReconciliationResult {
  totalChecked: number;
  driftsFound: number;
  drifts: PricingDriftResult[];
}

/**
 * Check for pricing drift on a single booking
 * 
 * Compares the stored pricingSnapshot total with a recomputed total.
 * Returns drift information if the difference exceeds the threshold.
 */
export async function checkBookingPricingDrift(
  bookingId: string,
  driftThreshold: number = 0.01 // $0.01 default threshold
): Promise<PricingDriftResult | null> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      pets: true,
      timeSlots: {
        orderBy: {
          startAt: "asc",
        },
      },
    },
  });

  if (!booking) {
    return null;
  }

  // Skip if no pricing snapshot exists
  if (!booking.pricingSnapshot) {
    return null;
  }

  // Deserialize stored snapshot
  const storedSnapshot = deserializePricingSnapshot(booking.pricingSnapshot);
  if (!storedSnapshot || typeof storedSnapshot.total !== "number") {
    return null;
  }

  const storedTotal = storedSnapshot.total;

  // Recompute using pricing engine
  const input: PricingEngineInput = {
    service: booking.service,
    startAt: booking.startAt,
    endAt: booking.endAt,
    pets: booking.pets,
    quantity: booking.quantity || 1,
    afterHours: booking.afterHours || false,
    holiday: booking.holiday || false,
    timeSlots: booking.timeSlots,
  };

  const recomputedBreakdown = calculateCanonicalPricing(input);
  const recomputedTotal = recomputedBreakdown.total;

  // Calculate drift
  const driftAmount = Math.abs(recomputedTotal - storedTotal);
  const driftPercentage = storedTotal > 0 
    ? (driftAmount / storedTotal) * 100 
    : 0;
  const hasDrift = driftAmount > driftThreshold;

  return {
    bookingId,
    storedTotal,
    recomputedTotal,
    driftAmount,
    driftPercentage,
    hasDrift,
  };
}

/**
 * Run pricing reconciliation on all bookings with pricing snapshots
 * 
 * Per Master Spec 5.3.1: Compares stored snapshot totals with recompute totals and flags drift.
 * 
 * @param maxBookings - Maximum number of bookings to check (for performance)
 * @param driftThreshold - Minimum drift amount to flag (default $0.01)
 * @returns Reconciliation results with all detected drifts
 */
export async function runPricingReconciliation(
  maxBookings?: number,
  driftThreshold: number = 0.01
): Promise<ReconciliationResult> {
  // Get bookings with pricing snapshots (prioritize confirmed/completed bookings)
  const bookings = await prisma.booking.findMany({
    where: {
      pricingSnapshot: {
        not: null,
      },
      status: {
        in: ["confirmed", "completed"], // Only check confirmed/completed bookings
      },
    },
    select: {
      id: true,
      pricingSnapshot: true,
    },
    take: maxBookings || 1000, // Default to 1000 bookings per run
    orderBy: {
      updatedAt: "desc", // Check most recently updated first
    },
  });

  const drifts: PricingDriftResult[] = [];

  // Check each booking for drift
  for (const booking of bookings) {
    try {
      const driftResult = await checkBookingPricingDrift(booking.id, driftThreshold);
      if (driftResult && driftResult.hasDrift) {
        drifts.push(driftResult);

        // Log drift to EventLog
        await logEvent("pricing.reconciliation.drift", "failed", {
          bookingId: booking.id,
          error: `Pricing drift detected: $${driftResult.driftAmount.toFixed(2)} (${driftResult.driftPercentage.toFixed(2)}%)`,
          metadata: {
            storedTotal: driftResult.storedTotal,
            recomputedTotal: driftResult.recomputedTotal,
            driftAmount: driftResult.driftAmount,
            driftPercentage: driftResult.driftPercentage,
          },
        });
      }
    } catch (error: any) {
      console.error(`Failed to check drift for booking ${booking.id}:`, error);
      // Log error but continue processing other bookings
      await logEvent("pricing.reconciliation.error", "failed", {
        bookingId: booking.id,
        error: error?.message || String(error),
      });
    }
  }

  // Log summary to EventLog
  await logEvent("pricing.reconciliation.completed", drifts.length > 0 ? "failed" : "success", {
    metadata: {
      totalChecked: bookings.length,
      driftsFound: drifts.length,
      driftThreshold,
    },
  });

  return {
    totalChecked: bookings.length,
    driftsFound: drifts.length,
    drifts,
  };
}

