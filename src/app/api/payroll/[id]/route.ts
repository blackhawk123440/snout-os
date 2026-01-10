/**
 * Payroll Run Details API
 * 
 * GET /api/payroll/[id] - Get detailed breakdown of a payroll run
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPayrollRunDetails } from "@/lib/payroll/payroll-service";

/**
 * GET /api/payroll/[id]
 * Get detailed breakdown of a payroll run including line items and adjustments
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Handle both runId and composite IDs (runId-lineItemId)
    const [runId] = id.split('-');
    
    const payrollRun = await getPayrollRunDetails(runId);
    
    if (!payrollRun) {
      return NextResponse.json(
        { error: "Payroll run not found" },
        { status: 404 }
      );
    }

    // Get booking details for line items (for backward compatibility)
    const bookings: any[] = [];
    for (const lineItem of payrollRun.lineItems) {
      // Get bookings for this sitter in this period
      const sitterBookings = await prisma.booking.findMany({
        where: {
          sitterId: lineItem.sitterId,
          status: 'completed',
          startAt: {
            gte: payrollRun.payPeriodStart,
            lte: payrollRun.payPeriodEnd,
          },
        },
        orderBy: {
          startAt: 'asc',
        },
      });

      for (const booking of sitterBookings) {
        const commissionRate = lineItem.commissionRate;
        bookings.push({
          bookingId: booking.id,
          bookingDate: booking.startAt,
          service: booking.service,
          totalPrice: booking.totalPrice,
          commissionPercentage: commissionRate,
          commissionAmount: (booking.totalPrice * commissionRate) / 100,
          status: booking.status,
        });
      }
    }

    return NextResponse.json({
      payrollRun,
      bookings,
      lineItems: payrollRun.lineItems,
      adjustments: payrollRun.adjustments,
    });
  } catch (error: any) {
    console.error("[GET /api/payroll/[id]] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payroll run details", details: error.message },
      { status: 500 }
    );
  }
}

