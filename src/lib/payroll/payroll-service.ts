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
  
  // Original code (commented out - Booking model not available):
  // const bookings = await prisma.booking.findMany({
  //   where: {
  //     status: 'completed',
  //     startAt: { gte: startDate, lte: endDate },
  //     sitterId: { not: null },
  //   },
  //   include: { sitter: { include: { currentTier: true } } },
  //   orderBy: { startAt: 'asc' },
  // });
  // ... (Booking model queries disabled)
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

  // Note: PayrollRun and PayrollLineItem models don't exist in messaging dashboard schema
  // This functionality is disabled for the messaging dashboard
  throw new Error('Payroll functionality not available in messaging dashboard schema');
  
  // Disabled code:
  // const payrollRun = await prisma.payrollRun.create({ ... });
  // return payrollRun.id;
}

/**
 * Get payroll run with details
 */
export async function getPayrollRunDetails(runId: string) {
  // Note: PayrollRun model doesn't exist in messaging dashboard schema
  throw new Error('Payroll functionality not available in messaging dashboard schema');
}

/**
 * Approve a payroll run
 */
export async function approvePayrollRun(
  runId: string,
  approvedBy: string
): Promise<void> {
  // Note: PayrollRun model doesn't exist in messaging dashboard schema
  throw new Error('Payroll functionality not available in messaging dashboard schema');
}

