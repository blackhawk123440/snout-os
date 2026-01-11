/**
 * Payroll Engine
 * 
 * Calculates commissions, pay periods, and payouts for sitters
 */

import { prisma } from "@/lib/db";

export interface CommissionRule {
  sitterId: string;
  commissionPercentage: number; // 70-80% typically
  minimumPayout?: number; // Minimum amount before payout
  payPeriod: 'weekly' | 'biweekly' | 'monthly';
}

export interface PayPeriod {
  id: string;
  sitterId: string;
  startDate: Date;
  endDate: Date;
  status: 'pending' | 'calculated' | 'approved' | 'paid' | 'cancelled';
  totalEarnings: number;
  commissionAmount: number;
  fees: number;
  netPayout: number;
  bookingCount: number;
  createdAt: Date;
  approvedAt?: Date;
  paidAt?: Date;
  approvedBy?: string;
}

export interface BookingEarning {
  bookingId: string;
  bookingDate: Date;
  service: string;
  totalPrice: number;
  commissionPercentage: number;
  commissionAmount: number;
  status: 'completed' | 'cancelled';
}

/**
 * Calculate earnings for a sitter from completed bookings in a date range
 */
export async function calculateSitterEarnings(
  sitterId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  bookings: BookingEarning[];
  totalEarnings: number;
  totalCommission: number;
  bookingCount: number;
}> {
  const sitter = await prisma.sitter.findUnique({
    where: { id: sitterId },
    select: { commissionPercentage: true },
  });

  if (!sitter) {
    throw new Error(`Sitter ${sitterId} not found`);
  }

  const commissionPercentage = sitter.commissionPercentage || 80;

  // Get all completed bookings for this sitter in the date range
  const bookings = await prisma.booking.findMany({
    where: {
      sitterId,
      status: 'completed',
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      createdAt: true,
      service: true,
      totalPrice: true,
      status: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  const bookingEarnings: BookingEarning[] = bookings.map((booking) => {
    const commissionAmount = (booking.totalPrice * commissionPercentage) / 100;
    return {
      bookingId: booking.id,
      bookingDate: booking.createdAt,
      service: booking.service,
      totalPrice: booking.totalPrice,
      commissionPercentage,
      commissionAmount,
      status: booking.status as 'completed' | 'cancelled',
    };
  });

  const totalEarnings = bookingEarnings.reduce((sum, b) => sum + b.totalPrice, 0);
  const totalCommission = bookingEarnings.reduce((sum, b) => sum + b.commissionAmount, 0);

  return {
    bookings: bookingEarnings,
    totalEarnings,
    totalCommission,
    bookingCount: bookings.length,
  };
}

/**
 * Calculate pay period dates based on pay period type
 */
export function calculatePayPeriodDates(
  payPeriod: 'weekly' | 'biweekly' | 'monthly',
  referenceDate: Date = new Date()
): { startDate: Date; endDate: Date } {
  const start = new Date(referenceDate);
  const end = new Date(referenceDate);

  if (payPeriod === 'weekly') {
    // Start of week (Monday)
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    
    // End of week (Sunday)
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else if (payPeriod === 'biweekly') {
    // Start of biweekly period (every other Monday)
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    
    // Go back to the start of the biweekly period
    const weeksSinceEpoch = Math.floor((start.getTime() - new Date('2024-01-01').getTime()) / (7 * 24 * 60 * 60 * 1000));
    const biweeklyOffset = (weeksSinceEpoch % 2) * 7;
    start.setDate(start.getDate() - biweeklyOffset);
    
    // End of biweekly period (13 days later)
    end.setDate(start.getDate() + 13);
    end.setHours(23, 59, 59, 999);
  } else {
    // Monthly - start of month
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    
    // End of month
    end.setMonth(end.getMonth() + 1);
    end.setDate(0); // Last day of current month
    end.setHours(23, 59, 59, 999);
  }

  return { startDate: start, endDate: end };
}

/**
 * Calculate fees (platform fees, processing fees, etc.)
 */
export function calculateFees(commissionAmount: number, feePercentage: number = 2.9): number {
  // Platform fee: 2.9% of commission (Stripe processing fee equivalent)
  return (commissionAmount * feePercentage) / 100;
}

/**
 * Calculate net payout after fees
 */
export function calculateNetPayout(commissionAmount: number, fees: number): number {
  return Math.max(0, commissionAmount - fees);
}


