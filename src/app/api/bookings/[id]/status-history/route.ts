/**
 * Booking Status History API (Phase 7.3)
 * 
 * Returns status history for a specific booking.
 * Per Master Spec 3.3.3: "Booking status history is immutable and stored."
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getBookingStatusHistory } from "@/lib/booking-status-history";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify booking exists
    const booking = await prisma.booking.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Get status history
    const history = await getBookingStatusHistory(id);

    // Format history entries
    const formattedHistory = history.map((entry: any) => ({
      id: entry.id,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      changedBy: entry.changedBy,
      reason: entry.reason,
      metadata: entry.metadata ? JSON.parse(entry.metadata) : null,
      createdAt: entry.createdAt,
    }));

    return NextResponse.json({
      bookingId: id,
      history: formattedHistory,
    });
  } catch (error: any) {
    console.error("Failed to fetch status history:", error);
    return NextResponse.json(
      { error: "Failed to fetch status history" },
      { status: 500 }
    );
  }
}

