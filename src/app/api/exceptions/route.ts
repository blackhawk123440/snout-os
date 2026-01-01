/**
 * Exceptions API (Phase 6.3)
 * 
 * Returns exception queue data for unpaid, unassigned, drift, and automation failures.
 * Per Master Spec Phase 6: "Add exception queue for unpaid, unassigned, drift, automation failures"
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status"); // "open" | "resolved" | "all"
    const type = searchParams.get("type"); // exception type filter

    // Get all active bookings
    const bookings = await prisma.booking.findMany({
      where: {
        status: { notIn: ["cancelled"] },
      },
      include: {
        pets: true,
        sitter: true,
        timeSlots: true,
        client: true,
      },
    });

    const exceptions: Array<{
      id: string;
      type: string;
      severity: "high" | "medium" | "low";
      title: string;
      description: string;
      bookingId?: string;
      booking?: any;
      createdAt: Date;
      resolvedAt?: Date;
      metadata?: any;
    }> = [];

    // 1. Unpaid bookings exceptions
    const unpaidBookings = bookings.filter(
      (b) => b.paymentStatus === "unpaid" && b.status !== "cancelled"
    );
    for (const booking of unpaidBookings) {
      exceptions.push({
        id: `unpaid-${booking.id}`,
        type: "unpaid",
        severity: "high",
        title: `Unpaid Booking: ${booking.firstName} ${booking.lastName}`,
        description: `${booking.service} booking ($${booking.totalPrice.toFixed(2)}) is unpaid`,
        bookingId: booking.id,
        booking: {
          id: booking.id,
          firstName: booking.firstName,
          lastName: booking.lastName,
          service: booking.service,
          totalPrice: booking.totalPrice,
          startAt: booking.startAt,
          paymentStatus: booking.paymentStatus,
        },
        createdAt: booking.createdAt,
        metadata: {
          amount: booking.totalPrice,
          service: booking.service,
        },
      });
    }

    // 2. Unassigned bookings exceptions
    const unassignedBookings = bookings.filter(
      (b) => !b.sitterId && (b.status === "pending" || b.status === "confirmed")
    );
    for (const booking of unassignedBookings) {
      const daysUntilStart = Math.floor(
        (new Date(booking.startAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      
      exceptions.push({
        id: `unassigned-${booking.id}`,
        type: "unassigned",
        severity: daysUntilStart < 1 ? "high" : daysUntilStart < 3 ? "medium" : "low",
        title: `Unassigned Booking: ${booking.firstName} ${booking.lastName}`,
        description: `${booking.service} booking starting ${daysUntilStart === 0 ? "today" : `in ${daysUntilStart} day${daysUntilStart > 1 ? "s" : ""}`} has no sitter assigned`,
        bookingId: booking.id,
        booking: {
          id: booking.id,
          firstName: booking.firstName,
          lastName: booking.lastName,
          service: booking.service,
          startAt: booking.startAt,
          sitterId: booking.sitterId,
        },
        createdAt: booking.createdAt,
        metadata: {
          daysUntilStart,
          service: booking.service,
        },
      });
    }

    // 3. Pricing drift exceptions (Phase 7.2)
    // Per Master Spec Section 5.3: Pricing drift detection creates exception tasks
    // Drift detection is run by the reconciliation worker, results are logged to EventLog
    const pricingDrifts = await prisma.eventLog.findMany({
      where: {
        eventType: "pricing.reconciliation.drift",
        status: "failed",
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      include: {
        booking: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            service: true,
            startAt: true,
            totalPrice: true,
            pricingSnapshot: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100, // Limit to recent drifts
    });

    for (const driftLog of pricingDrifts) {
      if (!driftLog.bookingId || !driftLog.booking) {
        continue; // Skip if no booking associated
      }

      let metadata: any = {};
      try {
        metadata = driftLog.metadata ? JSON.parse(driftLog.metadata) : {};
      } catch {
        // If metadata parse fails, continue with empty metadata
      }

      const driftAmount = metadata.driftAmount || 0;
      const driftPercentage = metadata.driftPercentage || 0;
      const storedTotal = metadata.storedTotal || driftLog.booking.totalPrice;
      const recomputedTotal = metadata.recomputedTotal || storedTotal;

      exceptions.push({
        id: `pricing_drift-${driftLog.bookingId}`,
        type: "pricing_drift",
        severity: driftAmount > 10 ? "high" : driftAmount > 1 ? "medium" : "low", // $10+ = high, $1-10 = medium, <$1 = low
        title: `Pricing Drift: ${driftLog.booking.firstName} ${driftLog.booking.lastName}`,
        description: `Pricing drift detected: $${driftAmount.toFixed(2)} (${driftPercentage.toFixed(2)}%). Stored: $${storedTotal.toFixed(2)}, Recomputed: $${recomputedTotal.toFixed(2)}`,
        bookingId: driftLog.bookingId,
        booking: {
          id: driftLog.booking.id,
          firstName: driftLog.booking.firstName,
          lastName: driftLog.booking.lastName,
          service: driftLog.booking.service,
          startAt: driftLog.booking.startAt,
          totalPrice: driftLog.booking.totalPrice,
        },
        createdAt: driftLog.createdAt,
        metadata: {
          driftAmount,
          driftPercentage,
          storedTotal,
          recomputedTotal,
          error: driftLog.error,
        },
      });
    }

    // 4. Automation failures (from EventLog)
    const failedAutomations = await prisma.eventLog.findMany({
      where: {
        eventType: "automation.run",
        status: "failed",
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      include: {
        booking: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            service: true,
            startAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100, // Limit to recent failures
    });

    for (const log of failedAutomations) {
      exceptions.push({
        id: `automation-failure-${log.id}`,
        type: "automation_failure",
        severity: "medium",
        title: `Automation Failed: ${log.automationType || "Unknown"}`,
        description: log.error || "Automation execution failed",
        bookingId: log.bookingId || undefined,
        booking: log.booking ? {
          id: log.booking.id,
          firstName: log.booking.firstName,
          lastName: log.booking.lastName,
          service: log.booking.service,
          startAt: log.booking.startAt,
        } : undefined,
        createdAt: log.createdAt,
        metadata: {
          automationType: log.automationType,
          error: log.error,
        },
      });
    }

    // 5. At risk bookings (missing instructions, payment failures, sitter issues)
    const atRiskBookings = bookings.filter((booking) => {
      const missingInstructions = !booking.address || (!booking.notes || booking.notes.trim() === "");
      const paymentFailed = booking.paymentStatus === "failed";
      const sitterIssue = booking.sitterId && (!booking.sitter || !booking.sitter.active);
      return missingInstructions || paymentFailed || sitterIssue;
    });

    for (const booking of atRiskBookings) {
      const issues: string[] = [];
      if (!booking.address || (!booking.notes || booking.notes.trim() === "")) {
        issues.push("Missing instructions");
      }
      if (booking.paymentStatus === "failed") {
        issues.push("Payment failed");
      }
      if (booking.sitterId && (!booking.sitter || !booking.sitter.active)) {
        issues.push("Inactive sitter assigned");
      }

      exceptions.push({
        id: `at-risk-${booking.id}`,
        type: "at_risk",
        severity: booking.paymentStatus === "failed" ? "high" : "medium",
        title: `At Risk Booking: ${booking.firstName} ${booking.lastName}`,
        description: `${booking.service} booking has: ${issues.join(", ")}`,
        bookingId: booking.id,
        booking: {
          id: booking.id,
          firstName: booking.firstName,
          lastName: booking.lastName,
          service: booking.service,
          startAt: booking.startAt,
          address: booking.address,
          notes: booking.notes,
          paymentStatus: booking.paymentStatus,
          sitter: booking.sitter,
        },
        createdAt: booking.createdAt,
        metadata: {
          issues,
        },
      });
    }

    // Filter by type if provided
    let filteredExceptions = exceptions;
    if (type) {
      filteredExceptions = exceptions.filter((e) => e.type === type);
    }

    // Sort by severity and date (high severity first, then by date)
    filteredExceptions.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // Group by type for summary
    const summary = {
      total: filteredExceptions.length,
      byType: {
        unpaid: filteredExceptions.filter((e) => e.type === "unpaid").length,
        unassigned: filteredExceptions.filter((e) => e.type === "unassigned").length,
        pricing_drift: filteredExceptions.filter((e) => e.type === "pricing_drift").length, // Phase 7.2
        automation_failure: filteredExceptions.filter((e) => e.type === "automation_failure").length,
        at_risk: filteredExceptions.filter((e) => e.type === "at_risk").length,
      },
      bySeverity: {
        high: filteredExceptions.filter((e) => e.severity === "high").length,
        medium: filteredExceptions.filter((e) => e.severity === "medium").length,
        low: filteredExceptions.filter((e) => e.severity === "low").length,
      },
    };

    return NextResponse.json({
      exceptions: filteredExceptions,
      summary,
    });
  } catch (error) {
    console.error("Failed to fetch exceptions:", error);
    return NextResponse.json(
      { error: "Failed to fetch exceptions" },
      { status: 500 }
    );
  }
}

