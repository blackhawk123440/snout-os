import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';

    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0); // All time
    }

    // Fetch payment intents from Stripe
    const paymentIntents = await stripe.paymentIntents.list({
      created: {
        gte: Math.floor(startDate.getTime() / 1000),
      },
      limit: 100,
    });

    // Fetch charges for more detailed data
    const charges = await stripe.charges.list({
      created: {
        gte: Math.floor(startDate.getTime() / 1000),
      },
      limit: 100,
    });

    // Calculate analytics
    const totalRevenue = paymentIntents.data
      .filter(pi => pi.status === 'succeeded')
      .reduce((sum, pi) => sum + (pi.amount / 100), 0);

    const totalBookings = await prisma.booking.count({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
    });

    const paidBookings = await prisma.booking.count({
      where: {
        paymentStatus: 'paid',
        createdAt: {
          gte: startDate,
        },
      },
    });

    const pendingPayments = paymentIntents.data
      .filter(pi => pi.status === 'requires_payment_method' || pi.status === 'requires_confirmation')
      .length;

    // Calculate time period revenues
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const todayRevenue = paymentIntents.data
      .filter(pi => pi.status === 'succeeded' && new Date(pi.created * 1000) >= today)
      .reduce((sum, pi) => sum + (pi.amount / 100), 0);

    const weeklyRevenue = paymentIntents.data
      .filter(pi => pi.status === 'succeeded' && new Date(pi.created * 1000) >= weekStart)
      .reduce((sum, pi) => sum + (pi.amount / 100), 0);

    const monthlyRevenue = paymentIntents.data
      .filter(pi => pi.status === 'succeeded' && new Date(pi.created * 1000) >= monthStart)
      .reduce((sum, pi) => sum + (pi.amount / 100), 0);

    const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    // Payment methods breakdown
    const paymentMethods = {
      card: 0,
      bank_transfer: 0,
      other: 0,
    };

    charges.data.forEach(charge => {
      if (charge.status === 'succeeded') {
        switch (charge.payment_method_details?.type) {
          case 'card':
            paymentMethods.card += charge.amount / 100;
            break;
          case 'bank_transfer':
            paymentMethods.bank_transfer += charge.amount / 100;
            break;
          default:
            paymentMethods.other += charge.amount / 100;
        }
      }
    });

    // Recent payments
    const recentPayments = paymentIntents.data
      .filter(pi => pi.status === 'succeeded')
      .slice(0, 10)
      .map(pi => ({
        id: pi.id,
        amount: pi.amount / 100,
        status: pi.status,
        customerEmail: pi.receipt_email || 'No email',
        createdAt: new Date(pi.created * 1000).toISOString(),
        bookingId: pi.metadata?.bookingId || 'Unknown',
      }));

    const analytics = {
      totalRevenue,
      totalBookings,
      paidBookings,
      pendingPayments,
      monthlyRevenue,
      weeklyRevenue,
      todayRevenue,
      averageBookingValue,
      paymentMethods,
      recentPayments,
    };

    return NextResponse.json({ analytics });
  } catch (error) {
    console.error("Failed to fetch Stripe analytics:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}