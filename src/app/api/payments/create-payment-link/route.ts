import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, includeTip = true } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    // Get booking details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        pets: true,
        sitter: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Get or create Stripe customer
    let customer;
    if (booking.email) {
      const existingCustomers = await stripe.customers.list({
        email: booking.email,
        limit: 1,
      });
      
      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
      } else {
        customer = await stripe.customers.create({
          email: booking.email,
          name: `${booking.firstName} ${booking.lastName}`,
          phone: booking.phone,
        });
      }
    }

    // Create Stripe product for this booking
    const product = await stripe.products.create({
      name: `${booking.service} - ${booking.firstName} ${booking.lastName}`,
      description: `Pet care service for ${booking.pets.length} pet(s) on ${new Date(booking.startAt).toLocaleDateString()}`,
      metadata: {
        bookingId: booking.id,
        service: booking.service,
        clientName: `${booking.firstName} ${booking.lastName}`,
        petCount: booking.pets.length.toString(),
      },
    });

    // Calculate base amount (service price)
    const baseAmount = Math.round((booking.totalPrice || 0) * 100); // Convert to cents

    // Create price for the base service
    const basePrice = await stripe.prices.create({
      product: product.id,
      unit_amount: baseAmount,
      currency: 'usd',
      metadata: {
        type: 'service',
        bookingId: booking.id,
      },
    });

    let paymentLinkData: any = {
      line_items: [
        {
          price: basePrice.id,
          quantity: 1,
        },
      ],
      metadata: {
        bookingId: booking.id,
        service: booking.service,
        clientName: `${booking.firstName} ${booking.lastName}`,
      },
    };

    // Add customer if available
    if (customer) {
      paymentLinkData.customer = customer.id;
    }

    // If tip is included, add tip options
    if (includeTip) {
      // Create tip prices (10%, 15%, 20%, 25%)
      const tipPercentages = [10, 15, 20, 25];
      const tipPrices = [];

      for (const percentage of tipPercentages) {
        const tipAmount = Math.round(baseAmount * (percentage / 100));
        const tipPrice = await stripe.prices.create({
          product: product.id,
          unit_amount: tipAmount,
          currency: 'usd',
          metadata: {
            type: 'tip',
            percentage: percentage.toString(),
            bookingId: booking.id,
          },
        });
        tipPrices.push({
          price: tipPrice.id,
          quantity: 1,
        });
      }

      // Add tip options to line items
      paymentLinkData.line_items.push(...tipPrices);
    }

    // Create payment link
    const paymentLink = await stripe.paymentLinks.create(paymentLinkData);

    // Update booking with payment link
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        stripePaymentLinkUrl: paymentLink.url,
      },
    });

    return NextResponse.json({
      paymentLink: paymentLink.url,
      bookingId: booking.id,
      baseAmount: booking.totalPrice || 0,
      tipOptions: includeTip ? [10, 15, 20, 25] : [],
      customerEmail: booking.email,
      customerName: `${booking.firstName} ${booking.lastName}`,
    });

  } catch (error) {
    console.error("Failed to create payment link:", error);
    return NextResponse.json(
      { error: "Failed to create payment link" },
      { status: 500 }
    );
  }
}
