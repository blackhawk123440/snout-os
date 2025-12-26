/**
 * Discount Engine
 * 
 * Applies discounts to bookings based on codes, rules, and conditions
 */

import { prisma } from "@/lib/db";

interface DiscountContext {
  bookingId?: string;
  service: string;
  totalPrice: number;
  petCount: number;
  clientId?: string;
  clientTags?: string[];
  isFirstTime?: boolean;
  discountCode?: string;
}

interface DiscountResult {
  discountId: string;
  discountName: string;
  type: string;
  amount: number;
  originalTotal: number;
  discountedTotal: number;
}

/**
 * Apply a discount code to a booking
 */
export async function applyDiscountCode(
  code: string,
  context: DiscountContext
): Promise<DiscountResult | null> {
  const discount = await prisma.discount.findUnique({
    where: { code },
  });

  if (!discount || !discount.enabled) {
    return null;
  }

  // Check validity dates
  if (discount.validFrom && new Date() < discount.validFrom) {
    return null;
  }
  if (discount.validUntil && new Date() > discount.validUntil) {
    return null;
  }

  // Check usage limit
  if (discount.usageLimit && discount.usageCount >= discount.usageLimit) {
    return null;
  }

  // Check minimum booking total
  if (discount.minBookingTotal && context.totalPrice < discount.minBookingTotal) {
    return null;
  }

  // Evaluate conditions if present
  if (discount.conditions) {
    const conditions = JSON.parse(discount.conditions);
    // Simple condition evaluation (can be enhanced)
    // For now, just check if conditions match
  }

  // Calculate discount amount
  let discountAmount = 0;
  if (discount.valueType === "percentage") {
    discountAmount = (context.totalPrice * discount.value) / 100;
  } else {
    discountAmount = discount.value;
  }

  // Apply max discount limit
  if (discount.maxDiscount && discountAmount > discount.maxDiscount) {
    discountAmount = discount.maxDiscount;
  }

  const discountedTotal = Math.max(0, context.totalPrice - discountAmount);

  return {
    discountId: discount.id,
    discountName: discount.name,
    type: discount.type,
    amount: discountAmount,
    originalTotal: context.totalPrice,
    discountedTotal,
  };
}

/**
 * Find and apply automatic discounts (first-time, loyalty, etc.)
 */
export async function findAutomaticDiscounts(
  context: DiscountContext
): Promise<DiscountResult[]> {
  const discounts: DiscountResult[] = [];

  // Get all automatic discounts
  const automaticDiscounts = await prisma.discount.findMany({
    where: {
      type: { in: ["firstTime", "loyalty", "referral", "automatic"] },
      enabled: true,
    },
  });

  for (const discount of automaticDiscounts) {
    // Check validity dates
    if (discount.validFrom && new Date() < discount.validFrom) continue;
    if (discount.validUntil && new Date() > discount.validUntil) continue;

    // Check usage limit
    if (discount.usageLimit && discount.usageCount >= discount.usageLimit) continue;

    // Check minimum booking total
    if (discount.minBookingTotal && context.totalPrice < discount.minBookingTotal) continue;

    // Type-specific checks
    if (discount.type === "firstTime" && !context.isFirstTime) continue;
    
    if (discount.type === "loyalty" && context.clientId) {
      // Check if client has previous bookings
      const previousBookings = await prisma.booking.count({
        where: { clientId: context.clientId, status: "completed" },
      });
      if (previousBookings === 0) continue; // Not a loyal client yet
    }

    // Evaluate conditions
    if (discount.conditions) {
      const conditions = JSON.parse(discount.conditions);
      // Simple condition evaluation
      // For now, skip complex conditions
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (discount.valueType === "percentage") {
      discountAmount = (context.totalPrice * discount.value) / 100;
    } else {
      discountAmount = discount.value;
    }

    // Apply max discount limit
    if (discount.maxDiscount && discountAmount > discount.maxDiscount) {
      discountAmount = discount.maxDiscount;
    }

    discounts.push({
      discountId: discount.id,
      discountName: discount.name,
      type: discount.type,
      amount: discountAmount,
      originalTotal: context.totalPrice,
      discountedTotal: Math.max(0, context.totalPrice - discountAmount),
    });
  }

  return discounts;
}

/**
 * Apply discount to a booking and record usage
 */
export async function applyDiscountToBooking(
  bookingId: string,
  discountId: string,
  amount: number
): Promise<void> {
  // Check if discount already applied
  const existing = await prisma.discountUsage.findUnique({
    where: { bookingId },
  });

  if (existing) {
    // Update existing usage
    await prisma.discountUsage.update({
      where: { bookingId },
      data: { discountId, amount },
    });
  } else {
    // Create new usage record
    await prisma.discountUsage.create({
      data: {
        bookingId,
        discountId,
        amount,
      },
    });
  }

  // Increment usage count
  await prisma.discount.update({
    where: { id: discountId },
    data: {
      usageCount: {
        increment: 1,
      },
    },
  });
}

/**
 * Get discount for a booking
 */
export async function getBookingDiscount(bookingId: string): Promise<DiscountResult | null> {
  const usage = await prisma.discountUsage.findUnique({
    where: { bookingId },
    include: {
      discount: true,
    },
  });

  if (!usage) {
    return null;
  }

  return {
    discountId: usage.discountId,
    discountName: usage.discount.name,
    type: usage.discount.type,
    amount: usage.amount,
    originalTotal: 0, // Would need to get from booking
    discountedTotal: 0,
  };
}


