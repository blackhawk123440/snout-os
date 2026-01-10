/**
 * Approve Payroll Run API
 * 
 * POST /api/payroll/[id]/approve - Approve a payroll run for payout
 */

import { NextRequest, NextResponse } from "next/server";
import { approvePayrollRun } from "@/lib/payroll/payroll-service";

/**
 * POST /api/payroll/[id]/approve
 * Approve a payroll run (owner only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { approvedBy } = body;

    // Handle both runId and composite IDs (runId-lineItemId)
    const [runId] = id.split('-');

    if (!approvedBy) {
      return NextResponse.json(
        { error: "approvedBy is required" },
        { status: 400 }
      );
    }

    await approvePayrollRun(runId, approvedBy);

    return NextResponse.json({
      success: true,
      message: "Payroll run approved",
      payrollRunId: runId,
    });
  } catch (error: any) {
    console.error("[POST /api/payroll/[id]/approve] Error:", error);
    return NextResponse.json(
      { error: "Failed to approve payroll run", details: error.message },
      { status: 500 }
    );
  }
}

