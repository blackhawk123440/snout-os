import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function GET(request: NextRequest) {
  try {
    // Check if Stripe credentials are configured
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

    if (!secretKey || !publishableKey) {
      return NextResponse.json({
        working: false,
        status: "not_configured",
        message: "Stripe credentials are not configured. Please add STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY to your environment variables.",
      });
    }

    // Test Stripe connection by trying to retrieve account info
    try {
      const stripe = new Stripe(secretKey, {
        apiVersion: "2023-10-16",
      });

      // Try to get account balance (this validates the API key)
      const balance = await stripe.balance.retrieve();

      return NextResponse.json({
        working: true,
        status: "working",
        message: "Stripe is connected and working correctly! ✅",
        details: {
          secretKeyConfigured: !!secretKey,
          publishableKeyConfigured: !!publishableKey,
          accountBalance: balance.available[0]?.amount || 0,
          currency: balance.available[0]?.currency || "usd",
        },
      });
    } catch (stripeError: any) {
      // Handle specific Stripe errors
      let errorMessage = stripeError.message || "Unknown error";
      let helpfulMessage = errorMessage;

      if (stripeError.type === "StripeAuthenticationError") {
        helpfulMessage = "Invalid API key. Please check your STRIPE_SECRET_KEY in your environment variables.";
      } else if (stripeError.type === "StripePermissionError") {
        helpfulMessage = "API key doesn't have permission. Check your Stripe account permissions.";
      } else if (stripeError.type === "StripeAPIError") {
        helpfulMessage = `Stripe API error: ${errorMessage}`;
      }

      return NextResponse.json({
        working: false,
        status: "error",
        message: `Stripe connection error: ${helpfulMessage}`,
        details: {
          secretKeyConfigured: !!secretKey,
          publishableKeyConfigured: !!publishableKey,
          error: errorMessage,
          type: stripeError.type,
        },
      });
    }
  } catch (error: any) {
    return NextResponse.json({
      working: false,
      status: "error",
      message: `Failed to test Stripe: ${error.message || "Unknown error"}`,
    }, { status: 500 });
  }
}
