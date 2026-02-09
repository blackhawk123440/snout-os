/**
 * Payroll Service
 * 
 * Computes payroll amounts from bookings and commission splits.
 * Creates PayrollRun records with PayrollLineItems and PayrollAdjustments.
 */

import { prisma } from '@/lib/db';

export interface PayrollPeriod {
  startDate: Date;
  endDate: Date;
  label: string;
}

export interface PayrollComputation {
  sitterId: string;
  sitterName: string;
  bookingCount: number;
  totalEarnings: number;
  commissionRate: number;
  commissionAmount: number;
  adjustments: number; // Sum of bonuses - deductions
  netAmount: number;
  bookings: Array<{
    bookingId: string;
    bookingDate: Date;
    service: string;
    totalPrice: number;
    commissionPercentage: number;
    commissionAmount: number;
  }>;
}

/**
 * Generate pay periods (weekly or biweekly)
 */
export function generatePayPeriods(
  startDate: Date,
  endDate: Date,
  frequency: 'weekly' | 'biweekly' = 'biweekly'
): PayrollPeriod[] {
  const periods: PayrollPeriod[] = [];
  const current = new Date(startDate);
  const days = frequency === 'weekly' ? 7 : 14;

  while (current < endDate) {
    const periodStart = new Date(current);
    const periodEnd = new Date(current);
    periodEnd.setDate(periodEnd.getDate() + days - 1);

    if (periodEnd > endDate) {
      periodEnd.setTime(endDate.getTime());
    }

    periods.push({
      startDate: periodStart,
      endDate: periodEnd,
      label: `${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`,
    });

    current.setDate(current.getDate() + days);
  }

  return periods;
}

/**
 * Compute payroll for a specific period
 */
export async function computePayrollForPeriod(
  startDate: Date,
  endDate: Date
): Promise<PayrollComputation[]> {
  // Note: Booking model not available in messaging dashboard schema
  // Return empty payroll computation
  return [];
  
  /* Original code (commented out):
  const bookings = await prisma.booking.findMany({
    where: {
      status: 'completed',
      startAt: {
        gte: startDate,
        lte: endDate,
      },
      sitterId: {
        not: null,
      },
    },
    include: {
      sitter: {
        include: {
          currentTier: true,
        },
      },
    },
    orderBy: {
      startAt: 'asc',
    },
  });

  // Group by sitter
  const sitterMap = new Map<string, PayrollComputation>();

  for (const booking of bookings) {
    if (!booking.sitterId || !booking.sitter) continue;

    const sitterId = booking.sitterId;
    const commissionRate = booking.sitter.commissionPercentage || 80;
    const commissionAmount = (booking.totalPrice * commissionRate) / 100;

    if (!sitterMap.has(sitterId)) {
      sitterMap.set(sitterId, {
        sitterId,
        sitterName: `${booking.sitter.firstName} ${booking.sitter.lastName}`,
        bookingCount: 0,
        totalEarnings: 0,
        commissionRate,
        commissionAmount: 0,
        adjustments: 0,
        netAmount: 0,
        bookings: [],
      });
    }

    const computation = sitterMap.get(sitterId)!;
    computation.bookingCount += 1;
    computation.totalEarnings += booking.totalPrice;
    computation.commissionAmount += commissionAmount;
    computation.bookings.push({
      bookingId: booking.id,
      bookingDate: booking.startAt,
      service: booking.service,
      totalPrice: booking.totalPrice,
      commissionPercentage: commissionRate,
      commissionAmount,
    });
  }

  // Calculate net amounts
  const computations = Array.from(sitterMap.values());
  for (const computation of computations) {
    computation.netAmount = computation.commissionAmount + computation.adjustments;
  }

  return computations;
}

/**
 * Create a payroll run from computations
 */
export async function createPayrollRun(
  startDate: Date,
  endDate: Date,
  computations: PayrollComputation[],
  adjustments: Array<{
    sitterId: string;
    type: 'bonus' | 'deduction';
    amount: number;
    reason: string;
  }> = []
): Promise<string> {
  // Calculate totals
  const totalAmount = computations.reduce((sum, c) => sum + c.netAmount, 0);
  const totalSitters = computations.length;

  // Create payroll run
  const payrollRun = await prisma.payrollRun.create({
    data: {
      payPeriodStart: startDate,
      payPeriodEnd: endDate,
      status: 'draft',
      totalAmount,
      totalSitters,
    },
  });

  // Create line items
  for (const computation of computations) {
    await prisma.payrollLineItem.create({
      data: {
        payrollRunId: payrollRun.id,
        sitterId: computation.sitterId,
        bookingCount: computation.bookingCount,
        totalEarnings: computation.totalEarnings,
        commissionRate: computation.commissionRate,
        commissionAmount: computation.commissionAmount,
        adjustments: 0, // Will be updated with adjustments
        netAmount: computation.netAmount,
      },
    });
  }

  // Create adjustments and update line items
  for (const adjustment of adjustments) {
    const adjustmentRecord = await prisma.payrollAdjustment.create({
      data: {
        payrollRunId: payrollRun.id,
        sitterId: adjustment.sitterId,
        type: adjustment.type,
        amount: adjustment.amount,
        reason: adjustment.reason,
      },
    });

    // Update line item adjustments
    const lineItem = await prisma.payrollLineItem.findFirst({
      where: {
        payrollRunId: payrollRun.id,
        sitterId: adjustment.sitterId,
      },
    });

    if (lineItem) {
      const adjustmentAmount = adjustment.type === 'bonus' ? adjustment.amount : -adjustment.amount;
      await prisma.payrollLineItem.update({
        where: { id: lineItem.id },
        data: {
          adjustments: lineItem.adjustments + adjustmentAmount,
          netAmount: lineItem.netAmount + adjustmentAmount,
        },
      });
    }
  }

  // Update total amount with adjustments
  const finalTotal = computations.reduce((sum, c) => {
    const sitterAdjustments = adjustments
      .filter(a => a.sitterId === c.sitterId)
      .reduce((adjSum, a) => adjSum + (a.type === 'bonus' ? a.amount : -a.amount), 0);
    return sum + c.netAmount + sitterAdjustments;
  }, 0);

  await prisma.payrollRun.update({
    where: { id: payrollRun.id },
    data: { totalAmount: finalTotal },
  });

  return payrollRun.id;
}

/**
 * Get payroll run with details
 */
export async function getPayrollRunDetails(runId: string) {
  return await prisma.payrollRun.findUnique({
    where: { id: runId },
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
  });
}

/**
 * Approve a payroll run
 */
export async function approvePayrollRun(
  runId: string,
  approvedBy: string
): Promise<void> {
  await prisma.payrollRun.update({
    where: { id: runId },
    data: {
      status: 'approved',
      approvedBy,
      approvedAt: new Date(),
    },
  });
}

