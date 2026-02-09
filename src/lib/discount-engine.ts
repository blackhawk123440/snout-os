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
  // Note: Discount model not available in messaging dashboard schema
  // Return null - discount codes not available
  return null;
}

/**
 * Find and apply automatic discounts (first-time, loyalty, etc.)
 */
export async function findAutomaticDiscounts(
  context: DiscountContext
): Promise<DiscountResult[]> {
  // Note: Discount model not available in messaging dashboard schema
  // Return empty array - automatic discounts not available
  return [];
  
  /* Original code (commented out):
  const discounts: DiscountResult[] = [];

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
      // Note: Booking model not available in messaging dashboard schema
      // Skip loyalty discount check
      continue;
      
      /* Original code (commented out):
      const previousBookings = await prisma.booking.count({
        where: { clientId: context.clientId, status: "completed" },
      });
      if (previousBookings === 0) continue;
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
  // Note: Discount and DiscountUsage models not available in messaging dashboard schema
  // No-op - discount application not available
  return;
}

/**
 * Get discount for a booking
 */
export async function getBookingDiscount(bookingId: string): Promise<DiscountResult | null> {
  // Note: DiscountUsage model not available in messaging dashboard schema
  // Return null - booking discount lookup not available
  return null;
}



