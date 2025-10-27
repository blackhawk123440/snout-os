import { NextRequest, NextResponse } from "next/server";
import { getStripeAnalytics } from "@/lib/stripe";

export async function GET() {
  try {
    const analytics = await getStripeAnalytics();
    return NextResponse.json({ analytics });
  } catch (error) {
    console.error("Failed to fetch Stripe analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}