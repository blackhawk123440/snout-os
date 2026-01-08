/**
 * Payroll API
 * 
 * GET /api/payroll - Get all pay periods
 * POST /api/payroll - Create a new pay period calculation
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  calculateSitterEarnings,
  calculatePayPeriodDates,
  calculateFees,
  calculateNetPayout,
  type PayPeriod,
} from "@/lib/payroll-engine";

type PayPeriodResponse = PayPeriod & {
  sitterName: string;
};

/**
 * GET /api/payroll
 * Get all pay periods with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sitterId = searchParams.get('sitterId');
    const status = searchParams.get('status');
    const payPeriod = searchParams.get('payPeriod') as 'weekly' | 'biweekly' | 'monthly' | null;

    const where: any = {};
    if (sitterId) where.sitterId = sitterId;
    if (status) where.status = status;
    if (payPeriod) where.payPeriod = payPeriod;

    // Note: This assumes we have a PayPeriod model in the database
    // For now, we'll calculate on-the-fly from bookings
    // In production, you'd query the PayPeriod table

    const payPeriods: PayPeriodResponse[] = [];

    // Get all sitters
    const sitters = await prisma.sitter.findMany({
      where: sitterId ? { id: sitterId } : {},
      select: {
        id: true,
        firstName: true,
        lastName: true,
        commissionPercentage: true,
      },
    });

    // Calculate pay periods for each sitter
    for (const sitter of sitters) {
      const { startDate, endDate } = calculatePayPeriodDates(
        payPeriod || 'biweekly',
        new Date()
      );

      const earnings = await calculateSitterEarnings(sitter.id, startDate, endDate);
      const fees = calculateFees(earnings.totalCommission);
      const netPayout = calculateNetPayout(earnings.totalCommission, fees);

      payPeriods.push({
        id: `${sitter.id}-${startDate.toISOString()}`,
        sitterId: sitter.id,
        sitterName: `${sitter.firstName} ${sitter.lastName}`,
        startDate,
        endDate,
        status: 'pending',
        totalEarnings: earnings.totalEarnings,
        commissionAmount: earnings.totalCommission,
        fees,
        netPayout,
        bookingCount: earnings.bookingCount,
        createdAt: new Date(),
      });
    }

    return NextResponse.json({ payPeriods });
  } catch (error) {
    console.error("[GET /api/payroll] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payroll data" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payroll
 * Create a new pay period calculation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sitterId, startDate, endDate, payPeriod = 'biweekly' } = body;

    if (!sitterId) {
      return NextResponse.json(
        { error: "sitterId is required" },
        { status: 400 }
      );
    }

    const start = startDate ? new Date(startDate) : calculatePayPeriodDates(payPeriod).startDate;
    const end = endDate ? new Date(endDate) : calculatePayPeriodDates(payPeriod).endDate;

    const earnings = await calculateSitterEarnings(sitterId, start, end);
    const fees = calculateFees(earnings.totalCommission);
    const netPayout = calculateNetPayout(earnings.totalCommission, fees);

    // In production, save this to PayPeriod table
    const payPeriodData = {
      id: `${sitterId}-${start.toISOString()}`,
      sitterId,
      startDate: start,
      endDate: end,
      status: 'pending' as const,
      totalEarnings: earnings.totalEarnings,
      commissionAmount: earnings.totalCommission,
      fees,
      netPayout,
      bookingCount: earnings.bookingCount,
      createdAt: new Date(),
      bookings: earnings.bookings,
    };

    return NextResponse.json({ payPeriod: payPeriodData });
  } catch (error) {
    console.error("[POST /api/payroll] Error:", error);
    return NextResponse.json(
      { error: "Failed to calculate pay period" },
      { status: 500 }
    );
  }
}

