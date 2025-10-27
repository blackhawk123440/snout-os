import { NextRequest, NextResponse } from "next/server";
import { getStripeAnalytics } from "@/lib/stripe-analytics";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '30d';
    
    const analytics = await getStripeAnalytics(timeRange);
    return NextResponse.json({ analytics });
  } catch (error) {
    console.error("Failed to fetch Stripe analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}