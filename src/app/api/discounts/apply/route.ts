import { NextRequest, NextResponse } from "next/server";
import { applyDiscountCode, findAutomaticDiscounts, applyDiscountToBooking } from "@/lib/discount-engine";
import { prisma } from "@/lib/db";

/**
 * POST /api/discounts/apply
 * Apply a discount code or find automatic discounts
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      bookingId,
      discountCode,
      service,
      totalPrice,
      petCount,
      clientId,
      clientTags,
      isFirstTime,
    } = body;

    if (!service || totalPrice === undefined) {
      return NextResponse.json(
        { error: "Service and totalPrice are required" },
        { status: 400 }
      );
    }

    const context = {
      bookingId,
      service,
      totalPrice,
      petCount: petCount || 1,
      clientId,
      clientTags: clientTags || [],
      isFirstTime: isFirstTime || false,
      discountCode,
    };

    let discountResult = null;

    // If discount code provided, try to apply it
    if (discountCode) {
      discountResult = await applyDiscountCode(discountCode, context);
    } else {
      // Find automatic discounts
      const automaticDiscounts = await findAutomaticDiscounts(context);
      if (automaticDiscounts.length > 0) {
        // Use the first (best) automatic discount
        discountResult = automaticDiscounts[0];
      }
    }

    if (!discountResult) {
      return NextResponse.json({
        applied: false,
        message: discountCode ? "Invalid or expired discount code" : "No automatic discounts available",
      });
    }

    // If bookingId provided, record the discount usage
    if (bookingId) {
      await applyDiscountToBooking(bookingId, discountResult.discountId, discountResult.amount);
    }

    return NextResponse.json({
      applied: true,
      discount: discountResult,
      newTotal: discountResult.discountedTotal,
    });
  } catch (error: any) {
    console.error("Failed to apply discount:", error);
    return NextResponse.json(
      { error: "Failed to apply discount" },
      { status: 500 }
    );
  }
}



