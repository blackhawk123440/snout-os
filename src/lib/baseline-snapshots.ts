/**
 * Baseline Snapshots
 * 
 * Captures pricing totals across different views for comparison
 */

import { prisma } from "@/lib/db";
import { calculatePriceBreakdown } from "@/lib/booking-utils";

export interface BaselineSnapshot {
  id: string;
  bookingId: string;
  timestamp: Date;
  bookingFormTotal: number | null;
  calendarViewTotal: number | null;
  sitterDashboardTotal: number | null;
  ownerDashboardTotal: number | null;
  stripePaymentTotal: number | null;
  storedTotalPrice: number | null;
  calculatedBreakdown: any | null;
  notes: string | null;
}

/**
 * Capture a baseline snapshot for a booking
 */
export async function captureBaselineSnapshot(
  bookingId: string,
  options: {
    bookingFormTotal?: number;
    calendarViewTotal?: number;
    sitterDashboardTotal?: number;
    ownerDashboardTotal?: number;
    stripePaymentTotal?: number;
    notes?: string;
  } = {}
): Promise<BaselineSnapshot> {
  try {
    // Fetch the booking with all related data
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
      throw new Error(`Booking ${bookingId} not found`);
    }

    // Calculate price breakdown using the same method as display
    let calculatedBreakdown = null;
    try {
      calculatedBreakdown = calculatePriceBreakdown({
        service: booking.service,
        startAt: booking.startAt,
        endAt: booking.endAt,
        pets: booking.pets,
        quantity: booking.quantity || 1,
        afterHours: booking.afterHours || false,
        holiday: booking.holiday || false,
        timeSlots: booking.timeSlots,
      });
    } catch (error) {
      console.error(`Error calculating breakdown for booking ${bookingId}:`, error);
    }

    // Create snapshot
    const snapshot = await (prisma as any).baselineSnapshot.create({
      data: {
        bookingId,
        bookingFormTotal: options.bookingFormTotal ?? null,
        calendarViewTotal: options.calendarViewTotal ?? null,
        sitterDashboardTotal: options.sitterDashboardTotal ?? null,
        ownerDashboardTotal: options.ownerDashboardTotal ?? null,
        stripePaymentTotal: options.stripePaymentTotal ?? null,
        storedTotalPrice: booking.totalPrice,
        calculatedBreakdown: calculatedBreakdown ? JSON.stringify(calculatedBreakdown) : null,
        notes: options.notes || null,
      },
    });

    return {
      id: snapshot.id,
      bookingId: snapshot.bookingId,
      timestamp: snapshot.timestamp,
      bookingFormTotal: snapshot.bookingFormTotal,
      calendarViewTotal: snapshot.calendarViewTotal,
      sitterDashboardTotal: snapshot.sitterDashboardTotal,
      ownerDashboardTotal: snapshot.ownerDashboardTotal,
      stripePaymentTotal: snapshot.stripePaymentTotal,
      storedTotalPrice: snapshot.storedTotalPrice,
      calculatedBreakdown: snapshot.calculatedBreakdown
        ? JSON.parse(snapshot.calculatedBreakdown)
        : null,
      notes: snapshot.notes,
    };
  } catch (error) {
    console.error(`Error capturing baseline snapshot for booking ${bookingId}:`, error);
    throw error;
  }
}

/**
 * Get all snapshots for a booking
 */
export async function getBaselineSnapshots(bookingId: string): Promise<BaselineSnapshot[]> {
  try {
    const snapshots = await (prisma as any).baselineSnapshot.findMany({
      where: { bookingId },
      orderBy: { timestamp: "desc" },
    });

    return snapshots.map((snapshot: any) => ({
      id: snapshot.id,
      bookingId: snapshot.bookingId,
      timestamp: snapshot.timestamp,
      bookingFormTotal: snapshot.bookingFormTotal,
      calendarViewTotal: snapshot.calendarViewTotal,
      sitterDashboardTotal: snapshot.sitterDashboardTotal,
      ownerDashboardTotal: snapshot.ownerDashboardTotal,
      stripePaymentTotal: snapshot.stripePaymentTotal,
      storedTotalPrice: snapshot.storedTotalPrice,
      calculatedBreakdown: snapshot.calculatedBreakdown
        ? JSON.parse(snapshot.calculatedBreakdown)
        : null,
      notes: snapshot.notes,
    }));
  } catch (error) {
    console.error(`Error getting baseline snapshots for booking ${bookingId}:`, error);
    throw error;
  }
}

/**
 * Get all snapshots
 */
export async function getAllBaselineSnapshots(): Promise<BaselineSnapshot[]> {
  try {
    const snapshots = await (prisma as any).baselineSnapshot.findMany({
      orderBy: { timestamp: "desc" },
      take: 1000, // Limit to recent snapshots
    });

    return snapshots.map((snapshot: any) => ({
      id: snapshot.id,
      bookingId: snapshot.bookingId,
      timestamp: snapshot.timestamp,
      bookingFormTotal: snapshot.bookingFormTotal,
      calendarViewTotal: snapshot.calendarViewTotal,
      sitterDashboardTotal: snapshot.sitterDashboardTotal,
      ownerDashboardTotal: snapshot.ownerDashboardTotal,
      stripePaymentTotal: snapshot.stripePaymentTotal,
      storedTotalPrice: snapshot.storedTotalPrice,
      calculatedBreakdown: snapshot.calculatedBreakdown
        ? JSON.parse(snapshot.calculatedBreakdown)
        : null,
      notes: snapshot.notes,
    }));
  } catch (error) {
    console.error("Error getting all baseline snapshots:", error);
    throw error;
  }
}

/**
 * Compare snapshot values and identify mismatches
 */
export function findMismatches(snapshot: BaselineSnapshot): Array<{
  source: string;
  value: number;
  expected: number;
  difference: number;
}> {
  const mismatches: Array<{
    source: string;
    value: number;
    expected: number;
    difference: number;
  }> = [];

  // Use calculated breakdown total as the expected value
  const expectedTotal =
    snapshot.calculatedBreakdown?.total ?? snapshot.storedTotalPrice ?? null;

  if (expectedTotal === null) {
    return mismatches; // Can't compare if no expected value
  }

  const sources = [
    { name: "bookingFormTotal", value: snapshot.bookingFormTotal },
    { name: "calendarViewTotal", value: snapshot.calendarViewTotal },
    { name: "sitterDashboardTotal", value: snapshot.sitterDashboardTotal },
    { name: "ownerDashboardTotal", value: snapshot.ownerDashboardTotal },
    { name: "stripePaymentTotal", value: snapshot.stripePaymentTotal },
    { name: "storedTotalPrice", value: snapshot.storedTotalPrice },
  ];

  for (const source of sources) {
    if (source.value !== null && source.value !== undefined) {
      const difference = Math.abs(source.value - expectedTotal);
      // Allow small floating point differences (0.01)
      if (difference > 0.01) {
        mismatches.push({
          source: source.name,
          value: source.value,
          expected: expectedTotal,
          difference,
        });
      }
    }
  }

  return mismatches;
}

