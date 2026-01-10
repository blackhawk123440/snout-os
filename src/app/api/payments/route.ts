/**
 * Payments API - Stripe Truth
 * 
 * Queries local StripeCharge, StripeRefund, and StripePayout tables
 * instead of hitting Stripe API directly.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '30d';
    const statusFilter = searchParams.get('status') || 'all';
    const searchTerm = searchParams.get('search') || '';

    // Calculate date ranges
    const now = new Date();
    const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    const startDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
    
    // Get previous period for comparison
    const previousPeriodStart = new Date(startDate.getTime() - (daysAgo * 24 * 60 * 60 * 1000));

    // Build where clause for charges
    const chargeWhere: any = {
      createdAt: {
        gte: startDate,
      },
    };

    if (statusFilter !== 'all') {
      if (statusFilter === 'paid') {
        chargeWhere.status = { in: ['succeeded', 'paid'] };
      } else if (statusFilter === 'pending') {
        chargeWhere.status = { in: ['pending', 'processing'] };
      } else if (statusFilter === 'failed') {
        chargeWhere.status = { in: ['failed', 'canceled', 'requires_payment_method'] };
      } else if (statusFilter === 'refunded') {
        chargeWhere.refunded = true;
      }
    }

    if (searchTerm) {
      chargeWhere.OR = [
        { id: { contains: searchTerm, mode: 'insensitive' } },
        { customerEmail: { contains: searchTerm, mode: 'insensitive' } },
        { customerName: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // Fetch charges
    const charges = await prisma.stripeCharge.findMany({
      where: chargeWhere,
      orderBy: {
        createdAt: 'desc',
      },
      take: 1000, // Limit for performance
    });

    // Fetch refunds
    const refunds = await prisma.stripeRefund.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 500,
    });

    // Fetch payouts
    const payouts = await prisma.stripePayout.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 500,
    });

    // Convert charges to Payment format
    const payments = charges.map(charge => ({
      id: charge.id,
      amount: charge.amount / 100, // Convert cents to dollars
      status: charge.status,
      created: charge.createdAt,
      customerEmail: charge.customerEmail || '',
      customerName: charge.customerName || undefined,
      description: charge.description || undefined,
      paymentMethod: charge.paymentMethod || undefined,
      currency: charge.currency || 'usd',
      refunded: charge.refunded,
      amountRefunded: charge.amountRefunded / 100,
    }));

    // Calculate KPIs
    const totalCollected = charges
      .filter(c => c.status === 'succeeded' || c.status === 'paid')
      .reduce((sum, c) => sum + (c.amount - c.amountRefunded) / 100, 0);

    const pendingCount = charges.filter(c => 
      c.status === 'pending' || c.status === 'processing'
    ).length;

    const pendingAmount = charges
      .filter(c => c.status === 'pending' || c.status === 'processing')
      .reduce((sum, c) => sum + c.amount / 100, 0);

    const failedCount = charges.filter(c => 
      c.status === 'failed' || c.status === 'canceled' || c.status === 'requires_payment_method'
    ).length;

    const failedAmount = charges
      .filter(c => c.status === 'failed' || c.status === 'canceled' || c.status === 'requires_payment_method')
      .reduce((sum, c) => sum + c.amount / 100, 0);

    const refundedCount = charges.filter(c => c.refunded).length;
    const refundedAmount = charges
      .filter(c => c.refunded)
      .reduce((sum, c) => sum + c.amountRefunded / 100, 0);

    // Previous period comparison
    const previousPeriodCharges = await prisma.stripeCharge.findMany({
      where: {
        createdAt: {
          gte: previousPeriodStart,
          lt: startDate,
        },
        status: { in: ['succeeded', 'paid'] },
      },
    });

    const previousPeriodTotal = previousPeriodCharges.reduce(
      (sum, c) => sum + (c.amount - c.amountRefunded) / 100, 
      0
    );

    const periodComparison = previousPeriodTotal > 0
      ? ((totalCollected - previousPeriodTotal) / previousPeriodTotal) * 100
      : 0;

    // Revenue breakdown by day
    const revenueByDay: Record<string, number> = {};
    charges
      .filter(c => c.status === 'succeeded' || c.status === 'paid')
      .forEach(charge => {
        const dayKey = charge.createdAt.toISOString().split('T')[0];
        revenueByDay[dayKey] = (revenueByDay[dayKey] || 0) + (charge.amount - charge.amountRefunded) / 100;
      });

    // Revenue breakdown by month
    const revenueByMonth: Record<string, number> = {};
    charges
      .filter(c => c.status === 'succeeded' || c.status === 'paid')
      .forEach(charge => {
        const monthKey = charge.createdAt.toISOString().slice(0, 7); // YYYY-MM
        revenueByMonth[monthKey] = (revenueByMonth[monthKey] || 0) + (charge.amount - charge.amountRefunded) / 100;
      });

    // Top customers
    const customerSpending: Record<string, { totalSpent: number; paymentCount: number }> = {};
    charges
      .filter(c => c.status === 'succeeded' || c.status === 'paid')
      .forEach(charge => {
        const email = charge.customerEmail || 'Unknown';
        if (!customerSpending[email]) {
          customerSpending[email] = { totalSpent: 0, paymentCount: 0 };
        }
        customerSpending[email].totalSpent += (charge.amount - charge.amountRefunded) / 100;
        customerSpending[email].paymentCount += 1;
      });

    const topCustomers = Object.entries(customerSpending)
      .map(([email, data]) => ({ email, ...data }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    return NextResponse.json({
      payments,
      refunds: refunds.map(r => ({
        id: r.id,
        chargeId: r.chargeId,
        amount: r.amount / 100,
        status: r.status,
        reason: r.reason,
        createdAt: r.createdAt,
      })),
      payouts: payouts.map(p => ({
        id: p.id,
        amount: p.amount / 100,
        status: p.status,
        arrivalDate: p.arrivalDate,
        createdAt: p.createdAt,
      })),
      kpis: {
        totalCollected,
        pendingCount,
        pendingAmount,
        failedCount,
        failedAmount,
        refundedCount,
        refundedAmount,
      },
      comparison: {
        previousPeriodTotal,
        periodComparison,
        isPositive: periodComparison > 0,
      },
      revenueByDay,
      revenueByMonth,
      topCustomers,
    });
  } catch (error: any) {
    console.error("Failed to fetch payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments", details: error.message },
      { status: 500 }
    );
  }
}
