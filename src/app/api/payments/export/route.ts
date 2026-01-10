/**
 * Payments CSV Export
 * 
 * Exports payments, refunds, and payouts to CSV format.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '30d';
    const type = searchParams.get('type') || 'charges'; // charges, refunds, payouts, all

    // Calculate date range
    const now = new Date();
    const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    const startDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));

    let csv = '';
    const headers = [];

    if (type === 'charges' || type === 'all') {
      const charges = await prisma.stripeCharge.findMany({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      headers.push('Charges');
      csv += 'Charge ID,Amount,Status,Customer Email,Customer Name,Description,Payment Method,Currency,Created At,Refunded,Amount Refunded\n';
      
      charges.forEach(charge => {
        csv += `"${charge.id}","${charge.amount / 100}","${charge.status}","${charge.customerEmail || ''}","${charge.customerName || ''}","${(charge.description || '').replace(/"/g, '""')}","${charge.paymentMethod || ''}","${charge.currency}","${charge.createdAt.toISOString()}","${charge.refunded}","${charge.amountRefunded / 100}"\n`;
      });

      csv += '\n';
    }

    if (type === 'refunds' || type === 'all') {
      const refunds = await prisma.stripeRefund.findMany({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      headers.push('Refunds');
      csv += 'Refund ID,Charge ID,Amount,Status,Reason,Created At\n';
      
      refunds.forEach(refund => {
        csv += `"${refund.id}","${refund.chargeId}","${refund.amount / 100}","${refund.status}","${refund.reason || ''}","${refund.createdAt.toISOString()}"\n`;
      });

      csv += '\n';
    }

    if (type === 'payouts' || type === 'all') {
      const payouts = await prisma.stripePayout.findMany({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      headers.push('Payouts');
      csv += 'Payout ID,Amount,Status,Arrival Date,Created At\n';
      
      payouts.forEach(payout => {
        csv += `"${payout.id}","${payout.amount / 100}","${payout.status}","${payout.arrivalDate ? payout.arrivalDate.toISOString() : ''}","${payout.createdAt.toISOString()}"\n`;
      });
    }

    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="payments-export-${timeRange}-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error("Failed to export payments:", error);
    return NextResponse.json(
      { error: "Failed to export payments", details: error.message },
      { status: 500 }
    );
  }
}

