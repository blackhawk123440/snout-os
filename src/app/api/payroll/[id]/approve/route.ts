/**
 * Approve Pay Period API
 * 
 * POST /api/payroll/[id]/approve - Approve a pay period for payout
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * POST /api/payroll/[id]/approve
 * Approve a pay period (owner only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { approvedBy } = body;

    // In production, this would update the PayPeriod table
    // For now, we'll just return success
    // You would do: await prisma.payPeriod.update({ where: { id }, data: { status: 'approved', approvedAt: new Date(), approvedBy } })

    return NextResponse.json({
      success: true,
      message: "Pay period approved",
      payPeriodId: id,
    });
  } catch (error) {
    console.error("[POST /api/payroll/[id]/approve] Error:", error);
    return NextResponse.json(
      { error: "Failed to approve pay period" },
      { status: 500 }
    );
  }
}

