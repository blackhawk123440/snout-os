/**
 * Payroll CSV Export
 * 
 * Exports payroll runs to CSV format.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const runId = searchParams.get('runId'); // Optional: export specific run

    const where: any = {};
    if (status !== 'all') {
      where.status = status;
    }
    if (runId) {
      where.id = runId;
    }

    const payrollRuns = await prisma.payrollRun.findMany({
      where,
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
      orderBy: {
        payPeriodStart: 'desc',
      },
    });

    let csv = 'Payroll Run ID,Pay Period Start,Pay Period End,Status,Total Amount,Total Sitters,Approved By,Approved At,Paid At\n';
    
    for (const run of payrollRuns) {
      csv += `"${run.id}","${run.payPeriodStart.toISOString()}","${run.payPeriodEnd.toISOString()}","${run.status}","${run.totalAmount}","${run.totalSitters}","${run.approvedBy || ''}","${run.approvedAt ? run.approvedAt.toISOString() : ''}","${run.paidAt ? run.paidAt.toISOString() : ''}"\n`;
      
      // Line items
      csv += '\nLine Items:\n';
      csv += 'Sitter Name,Sitter ID,Booking Count,Total Earnings,Commission Rate,Commission Amount,Adjustments,Net Amount\n';
      for (const item of run.lineItems) {
        csv += `"${item.sitter.firstName} ${item.sitter.lastName}","${item.sitterId}","${item.bookingCount}","${item.totalEarnings}","${item.commissionRate}","${item.commissionAmount}","${item.adjustments}","${item.netAmount}"\n`;
      }
      
      // Adjustments
      if (run.adjustments.length > 0) {
        csv += '\nAdjustments:\n';
        csv += 'Sitter Name,Type,Amount,Reason,Created At\n';
        for (const adj of run.adjustments) {
          csv += `"${adj.sitter.firstName} ${adj.sitter.lastName}","${adj.type}","${adj.amount}","${(adj.reason || '').replace(/"/g, '""')}","${adj.createdAt.toISOString()}"\n`;
        }
      }
      
      csv += '\n';
    }

    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="payroll-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error("Failed to export payroll:", error);
    return NextResponse.json(
      { error: "Failed to export payroll", details: error.message },
      { status: 500 }
    );
  }
}

