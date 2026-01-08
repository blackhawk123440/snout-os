/**
 * Pay Period Details API
 * 
 * GET /api/payroll/[id] - Get detailed breakdown of a pay period
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  calculateSitterEarnings,
  type BookingEarning,
} from "@/lib/payroll-engine";

/**
 * GET /api/payroll/[id]
 * Get detailed breakdown of a pay period including all bookings
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Parse pay period ID format: sitterId-startDateISO
    const [sitterId, ...dateParts] = id.split('-');
    if (!sitterId) {
      return NextResponse.json(
        { error: "Invalid pay period ID" },
        { status: 400 }
      );
    }

    // Reconstruct start date (ISO string may contain dashes)
    const startDateStr = dateParts.join('-');
    const startDate = new Date(startDateStr);
    
    // Calculate end date (assuming biweekly for now)
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 13);
    endDate.setHours(23, 59, 59, 999);

    const earnings = await calculateSitterEarnings(sitterId, startDate, endDate);

    return NextResponse.json({
      payPeriodId: id,
      sitterId,
      startDate,
      endDate,
      bookings: earnings.bookings,
      totalEarnings: earnings.totalEarnings,
      totalCommission: earnings.totalCommission,
      bookingCount: earnings.bookingCount,
    });
  } catch (error) {
    console.error("[GET /api/payroll/[id]] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pay period details" },
      { status: 500 }
    );
  }
}

