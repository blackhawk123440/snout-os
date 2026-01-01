/**
 * Sitter Earnings API (Phase 5.3)
 * 
 * Returns detailed earnings breakdown for a sitter.
 * Per Master Spec 7.3.3: Earnings and payouts view.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentSitterId } from "@/lib/sitter-helpers";
import { getSitterCommissionPercentage } from "@/lib/tier-rules";
import { env } from "@/lib/env";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Phase 5.1: If sitter auth is enabled, verify the authenticated sitter matches the requested ID
    const enableSitterAuth = env.ENABLE_SITTER_AUTH === true;
    
    if (enableSitterAuth) {
      const currentSitterId = await getCurrentSitterId(request);
      if (!currentSitterId || currentSitterId !== id) {
        return NextResponse.json(
          { error: "Unauthorized: You can only access your own earnings" },
          { status: 403 }
        );
      }
    }

    const sitter = await prisma.sitter.findUnique({
      where: { id },
      include: {
        currentTier: true,
      },
    });

    if (!sitter) {
      return NextResponse.json({ error: "Sitter not found" }, { status: 404 });
    }

    // Get all completed bookings for this sitter
    const completedBookings = await prisma.booking.findMany({
      where: {
        sitterId: id,
        status: "completed",
      },
      include: {
        pets: true,
      },
      orderBy: {
        startAt: "desc",
      },
    });

    // Phase 5.2: Get commission percentage (tier-based or sitter-based)
    const commissionPercentage = await getSitterCommissionPercentage(id);

    // Calculate earnings breakdown
    let totalEarnings = 0;
    const earningsByBooking: Array<{
      bookingId: string;
      clientName: string;
      service: string;
      date: Date;
      totalPrice: number;
      earnings: number;
      commissionPercentage: number;
    }> = [];

    const earningsByService: Record<string, {
      service: string;
      bookingCount: number;
      totalEarnings: number;
      totalRevenue: number;
    }> = {};

    for (const booking of completedBookings) {
      const earnings = (booking.totalPrice * commissionPercentage) / 100;
      totalEarnings += earnings;

      // Earnings by booking
      earningsByBooking.push({
        bookingId: booking.id,
        clientName: `${booking.firstName} ${booking.lastName}`,
        service: booking.service,
        date: booking.startAt,
        totalPrice: booking.totalPrice,
        earnings,
        commissionPercentage,
      });

      // Earnings by service type
      if (!earningsByService[booking.service]) {
        earningsByService[booking.service] = {
          service: booking.service,
          bookingCount: 0,
          totalEarnings: 0,
          totalRevenue: 0,
        };
      }
      earningsByService[booking.service].bookingCount += 1;
      earningsByService[booking.service].totalEarnings += earnings;
      earningsByService[booking.service].totalRevenue += booking.totalPrice;
    }

    // Convert earningsByService to array
    const earningsByServiceArray = Object.values(earningsByService).sort(
      (a, b) => b.totalEarnings - a.totalEarnings
    );

    // Calculate period earnings (last 30 days, last 90 days, all time)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const last30DaysBookings = completedBookings.filter(
      (b) => b.startAt >= thirtyDaysAgo
    );
    const last90DaysBookings = completedBookings.filter(
      (b) => b.startAt >= ninetyDaysAgo
    );

    const earningsLast30Days = last30DaysBookings.reduce(
      (sum, b) => sum + (b.totalPrice * commissionPercentage) / 100,
      0
    );
    const earningsLast90Days = last90DaysBookings.reduce(
      (sum, b) => sum + (b.totalPrice * commissionPercentage) / 100,
      0
    );

    return NextResponse.json({
      sitter: {
        id: sitter.id,
        firstName: sitter.firstName,
        lastName: sitter.lastName,
        commissionPercentage,
        currentTier: sitter.currentTier ? {
          id: sitter.currentTier.id,
          name: sitter.currentTier.name,
        } : null,
      },
      summary: {
        totalEarnings: Number(totalEarnings.toFixed(2)),
        totalBookings: completedBookings.length,
        earningsLast30Days: Number(earningsLast30Days.toFixed(2)),
        earningsLast90Days: Number(earningsLast90Days.toFixed(2)),
        commissionPercentage,
      },
      earningsByBooking,
      earningsByService: earningsByServiceArray.map((s) => ({
        ...s,
        totalEarnings: Number(s.totalEarnings.toFixed(2)),
        totalRevenue: Number(s.totalRevenue.toFixed(2)),
      })),
    });
  } catch (error) {
    console.error("Failed to fetch sitter earnings:", error);
    return NextResponse.json({ error: "Failed to fetch earnings" }, { status: 500 });
  }
}

