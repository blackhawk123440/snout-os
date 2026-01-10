/**
 * Payroll API - PayrollRun Truth
 * 
 * GET /api/payroll - Get all payroll runs
 * POST /api/payroll - Create a new payroll run calculation
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computePayrollForPeriod, createPayrollRun, generatePayPeriods } from "@/lib/payroll/payroll-service";

/**
 * GET /api/payroll
 * Get all payroll runs with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const frequency = searchParams.get('payPeriod') as 'weekly' | 'biweekly' | null;

    const where: any = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    // Get payroll runs
    const payrollRuns = await prisma.payrollRun.findMany({
      where,
      include: {
        lineItems: {
          include: {
            sitter: {
              include: {
                currentTier: true,
              },
            },
          },
        },
        adjustments: {
          include: {
            sitter: true,
          },
        },
      },
      orderBy: {
        payPeriodStart: 'desc',
      },
      take: 100,
    });

    // Transform to PayPeriod format for backward compatibility
    const payPeriods = payrollRuns.flatMap(run =>
      run.lineItems.map(item => ({
        id: `${run.id}-${item.id}`,
        sitterId: item.sitterId,
        sitterName: `${item.sitter.firstName} ${item.sitter.lastName}`,
        startDate: run.payPeriodStart,
        endDate: run.payPeriodEnd,
        status: run.status,
        totalEarnings: item.totalEarnings,
        commissionAmount: item.commissionAmount,
        fees: 0, // Fees not in current model
        netPayout: item.netAmount,
        bookingCount: item.bookingCount,
        createdAt: run.createdAt,
        approvedAt: run.approvedAt,
        paidAt: run.paidAt,
      }))
    );

    return NextResponse.json({ payPeriods, payrollRuns });
  } catch (error: any) {
    console.error("[GET /api/payroll] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payroll data", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payroll
 * Create a new payroll run calculation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startDate, endDate, frequency = 'biweekly', adjustments = [] } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Compute payroll
    const computations = await computePayrollForPeriod(start, end);

    // Create payroll run
    const runId = await createPayrollRun(start, end, computations, adjustments);

    // Return the created run
    const payrollRun = await prisma.payrollRun.findUnique({
      where: { id: runId },
      include: {
        lineItems: {
          include: {
            sitter: true,
          },
        },
        adjustments: {
          include: {
            sitter: true,
          },
        },
      },
    });

    return NextResponse.json({ payrollRun });
  } catch (error: any) {
    console.error("[POST /api/payroll] Error:", error);
    return NextResponse.json(
      { error: "Failed to create payroll run", details: error.message },
      { status: 500 }
    );
  }
}

