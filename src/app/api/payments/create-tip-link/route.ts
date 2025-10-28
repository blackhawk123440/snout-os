import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { buildTipLink } from "@/lib/tip-link-builder";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, sitterAlias, serviceAmount, customerEmail, customerName } = body;

    if (!bookingId || !serviceAmount) {
      return NextResponse.json(
        { error: "Missing required fields: bookingId and serviceAmount" },
        { status: 400 }
      );
    }

    // Calculate tip percentages
    const tipPercentages = [10, 15, 20, 25];
    const tipOptions = tipPercentages.map(percentage => ({
      percentage,
      amount: Math.round(serviceAmount * (percentage / 100) * 100) / 100,
      total: Math.round((serviceAmount + serviceAmount * (percentage / 100)) * 100) / 100
    }));

    // Create a custom tip link that includes all the booking details
    const tipLinkData = {
      bookingId,
      sitterAlias: sitterAlias || 'sitter',
      serviceAmount,
      customerEmail,
      customerName,
      tipOptions,
      baseUrl: 'https://tip.snoutservices.com/link.html'
    };

    // Create a unique tip link with encoded data
    const tipLinkParams = new URLSearchParams({
      amount: serviceAmount.toString(),
      sitter: sitterAlias || 'sitter',
      booking: bookingId,
      ...(customerEmail && { email: customerEmail }),
      ...(customerName && { name: customerName })
    });

    const tipLink = `https://tip.snoutservices.com/link.html?${tipLinkParams.toString()}`;

    // Also create a Stripe payment link for the base service amount
    let stripePaymentLink = null;
    try {
      const paymentLink = await stripe.paymentLinks.create({
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Snout Services - ${sitterAlias || 'Sitter'}`,
                description: `Service payment for booking ${bookingId}`,
              },
              unit_amount: Math.round(serviceAmount * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        metadata: {
          bookingId,
          sitterAlias: sitterAlias || 'sitter',
          serviceAmount: serviceAmount.toString(),
        },
        ...(customerEmail && { customer_email: customerEmail }),
      });

      stripePaymentLink = paymentLink.url;
    } catch (stripeError) {
      console.error("Failed to create Stripe payment link:", stripeError);
    }

    return NextResponse.json({
      tipLink,
      stripePaymentLink,
      serviceAmount,
      tipOptions,
      bookingId,
      sitterAlias: sitterAlias || 'sitter'
    });

  } catch (error) {
    console.error("Failed to create tip link:", error);
    return NextResponse.json(
      { error: "Failed to create tip link" },
      { status: 500 }
    );
  }
}
