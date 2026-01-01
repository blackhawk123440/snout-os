/**
 * Capacity Planning API
 * 
 * Master Spec Reference: Section 8.2
 * 
 * Provides capacity planning data for the next 7 days:
 * - Sitter utilization
 * - Overbook risk
 * - Hiring triggers
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface SitterUtilization {
  sitterId: string;
  sitterName: string;
  date: string; // YYYY-MM-DD
  bookingsCount: number;
  totalMinutes: number;
  utilizationPercent: number;
  isOverbooked: boolean;
}

interface CapacitySummary {
  date: string; // YYYY-MM-DD
  totalBookings: number;
  totalAssignedBookings: number;
  unassignedBookings: number;
  activeSitters: number;
  totalCapacity: number; // Total minutes available from all sitters
  usedCapacity: number; // Total minutes assigned
  utilizationPercent: number;
  overbookRisk: "low" | "medium" | "high";
  sitterUtilizations: SitterUtilization[];
}

interface HiringTrigger {
  date: string;
  reason: "high_utilization" | "unassigned_bookings" | "overbook_risk";
  severity: "low" | "medium" | "high";
  details: string;
  recommendation?: string;
}

/**
 * GET /api/capacity
 * 
 * Get capacity planning data for the next 7 days
 * Query params:
 * - days: Number of days to look ahead (default: 7)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "7", 10);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days);

    // Fetch all bookings in the date range
    const bookings = await prisma.booking.findMany({
      where: {
        status: { not: "cancelled" },
        startAt: {
          gte: today,
          lt: endDate,
        },
      },
      include: {
        sitter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        timeSlots: {
          orderBy: {
            startAt: "asc",
          },
        },
      },
    });

    // Fetch all active sitters
    const activeSitters = await prisma.sitter.findMany({
      where: {
        active: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    // Initialize date-based summaries
    const dateSummaries: Map<string, CapacitySummary> = new Map();

    // Process bookings by date
    for (const booking of bookings) {
      const bookingStart = new Date(booking.startAt);
      bookingStart.setHours(0, 0, 0, 0);
      const dateKey = bookingStart.toISOString().split("T")[0];

      if (!dateSummaries.has(dateKey)) {
        dateSummaries.set(dateKey, {
          date: dateKey,
          totalBookings: 0,
          totalAssignedBookings: 0,
          unassignedBookings: 0,
          activeSitters: activeSitters.length,
          totalCapacity: 0, // Will be calculated
          usedCapacity: 0,
          utilizationPercent: 0,
          overbookRisk: "low",
          sitterUtilizations: [],
        });
      }

      const summary = dateSummaries.get(dateKey)!;
      summary.totalBookings++;

      // Calculate total minutes from time slots
      let bookingMinutes = 0;
      if (booking.timeSlots && booking.timeSlots.length > 0) {
        bookingMinutes = booking.timeSlots.reduce((total, slot) => total + (slot.duration || 0), 0);
      } else {
        // Fallback: calculate from startAt and endAt
        const start = new Date(booking.startAt);
        const end = new Date(booking.endAt);
        bookingMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      }

      if (booking.sitterId) {
        summary.totalAssignedBookings++;
        summary.usedCapacity += bookingMinutes;

        // Track sitter utilization
        const sitterKey = `${dateKey}-${booking.sitterId}`;
        let sitterUtil = summary.sitterUtilizations.find(
          (u) => u.sitterId === booking.sitterId
        );

        if (!sitterUtil) {
          sitterUtil = {
            sitterId: booking.sitterId,
            sitterName: booking.sitter
              ? `${booking.sitter.firstName} ${booking.sitter.lastName}`
              : "Unknown",
            date: dateKey,
            bookingsCount: 0,
            totalMinutes: 0,
            utilizationPercent: 0,
            isOverbooked: false,
          };
          summary.sitterUtilizations.push(sitterUtil);
        }

        sitterUtil.bookingsCount++;
        sitterUtil.totalMinutes += bookingMinutes;
      } else {
        summary.unassignedBookings++;
      }
    }

    // Calculate utilization and overbook risk for each date
    const hiringTriggers: HiringTrigger[] = [];
    
    for (const [dateKey, summary] of dateSummaries.entries()) {
      // Estimate total capacity (assume 8 hours per sitter per day = 480 minutes)
      const estimatedCapacityPerSitter = 480;
      summary.totalCapacity = activeSitters.length * estimatedCapacityPerSitter;

      // Calculate overall utilization
      if (summary.totalCapacity > 0) {
        summary.utilizationPercent = Math.round((summary.usedCapacity / summary.totalCapacity) * 100);
      }

      // Calculate per-sitter utilization and overbook detection
      for (const sitterUtil of summary.sitterUtilizations) {
        // Assume 8-hour workday capacity per sitter
        const sitterCapacity = estimatedCapacityPerSitter;
        sitterUtil.utilizationPercent = Math.round((sitterUtil.totalMinutes / sitterCapacity) * 100);
        sitterUtil.isOverbooked = sitterUtil.totalMinutes > sitterCapacity;
      }

      // Determine overbook risk
      const overbookedSitters = summary.sitterUtilizations.filter((u) => u.isOverbooked).length;
      if (overbookedSitters > 0) {
        summary.overbookRisk = "high";
      } else if (summary.utilizationPercent > 85) {
        summary.overbookRisk = "medium";
      } else {
        summary.overbookRisk = "low";
      }

      // Generate hiring triggers
      if (summary.unassignedBookings > 0) {
        hiringTriggers.push({
          date: dateKey,
          reason: "unassigned_bookings",
          severity: summary.unassignedBookings > 3 ? "high" : summary.unassignedBookings > 1 ? "medium" : "low",
          details: `${summary.unassignedBookings} unassigned booking(s)`,
          recommendation: `Assign sitters to ${summary.unassignedBookings} booking(s) or hire additional sitters`,
        });
      }

      if (summary.overbookRisk === "high") {
        hiringTriggers.push({
          date: dateKey,
          reason: "overbook_risk",
          severity: "high",
          details: `${overbookedSitters} sitter(s) overbooked`,
          recommendation: `Hire additional sitters or redistribute bookings`,
        });
      }

      if (summary.utilizationPercent > 90) {
        hiringTriggers.push({
          date: dateKey,
          reason: "high_utilization",
          severity: summary.utilizationPercent > 95 ? "high" : "medium",
          details: `${summary.utilizationPercent}% capacity utilization`,
          recommendation: `Consider hiring additional sitters for capacity buffer`,
        });
      }
    }

    // Sort summaries by date
    const summaries = Array.from(dateSummaries.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    return NextResponse.json({
      summaries,
      hiringTriggers: hiringTriggers.sort((a, b) => {
        // Sort by severity (high -> medium -> low) then by date
        const severityOrder = { high: 0, medium: 1, low: 2 };
        const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
        if (severityDiff !== 0) return severityDiff;
        return a.date.localeCompare(b.date);
      }),
      summary: {
        totalDays: days,
        totalBookings: summaries.reduce((sum, s) => sum + s.totalBookings, 0),
        totalUnassigned: summaries.reduce((sum, s) => sum + s.unassignedBookings, 0),
        averageUtilization: summaries.length > 0
          ? Math.round(
              summaries.reduce((sum, s) => sum + s.utilizationPercent, 0) / summaries.length
            )
          : 0,
        highRiskDays: summaries.filter((s) => s.overbookRisk === "high").length,
        hiringTriggerCount: hiringTriggers.length,
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch capacity data:", error);
    return NextResponse.json(
      { error: "Failed to fetch capacity data" },
      { status: 500 }
    );
  }
}

