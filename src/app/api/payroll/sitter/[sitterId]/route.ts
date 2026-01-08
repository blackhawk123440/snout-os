/**
 * Sitter Payroll API
 * 
 * GET /api/payroll/sitter/[sitterId] - Get payroll data for a specific sitter
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  calculateSitterEarnings,
  calculatePayPeriodDates,
  calculateFees,
  calculateNetPayout,
} from "@/lib/payroll-engine";

/**
 * GET /api/payroll/sitter/[sitterId]
 * Get all pay periods for a specific sitter
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sitterId: string }> }
) {
  try {
    const { sitterId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const payPeriod = (searchParams.get('payPeriod') || 'biweekly') as 'weekly' | 'biweekly' | 'monthly';

    const sitter = await prisma.sitter.findUnique({
      where: { id: sitterId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        commissionPercentage: true,
      },
    });

    if (!sitter) {
      return NextResponse.json(
        { error: "Sitter not found" },
        { status: 404 }
      );
    }

    // Calculate current pay period
    const { startDate, endDate } = calculatePayPeriodDates(payPeriod, new Date());
    const earnings = await calculateSitterEarnings(sitterId, startDate, endDate);
    const fees = calculateFees(earnings.totalCommission);
    const netPayout = calculateNetPayout(earnings.totalCommission, fees);

    // Calculate previous pay period for comparison
    const prevStartDate = new Date(startDate);
    if (payPeriod === 'weekly') {
      prevStartDate.setDate(prevStartDate.getDate() - 7);
    } else if (payPeriod === 'biweekly') {
      prevStartDate.setDate(prevStartDate.getDate() - 14);
    } else {
      prevStartDate.setMonth(prevStartDate.getMonth() - 1);
    }
    const prevEndDate = new Date(startDate);
    prevEndDate.setDate(prevEndDate.getDate() - 1);
    prevEndDate.setHours(23, 59, 59, 999);

    const prevEarnings = await calculateSitterEarnings(sitterId, prevStartDate, prevEndDate);
    const prevFees = calculateFees(prevEarnings.totalCommission);
    const prevNetPayout = calculateNetPayout(prevEarnings.totalCommission, prevFees);

    return NextResponse.json({
      sitter: {
        id: sitter.id,
        name: `${sitter.firstName} ${sitter.lastName}`,
        commissionPercentage: sitter.commissionPercentage || 80,
      },
      currentPeriod: {
        id: `${sitterId}-${startDate.toISOString()}`,
        startDate,
        endDate,
        status: 'pending',
        totalEarnings: earnings.totalEarnings,
        commissionAmount: earnings.totalCommission,
        fees,
        netPayout,
        bookingCount: earnings.bookingCount,
        bookings: earnings.bookings,
      },
      previousPeriod: {
        startDate: prevStartDate,
        endDate: prevEndDate,
        totalEarnings: prevEarnings.totalEarnings,
        commissionAmount: prevEarnings.totalCommission,
        fees: prevFees,
        netPayout: prevNetPayout,
        bookingCount: prevEarnings.bookingCount,
      },
    });
  } catch (error) {
    console.error("[GET /api/payroll/sitter/[sitterId]] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sitter payroll data" },
      { status: 500 }
    );
  }
}

