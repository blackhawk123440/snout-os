import { stripe } from "./stripe";

/**
 * Fetch real-time Stripe analytics
 */
export async function getStripeAnalytics() {
  if (!stripe) {
    return {
      balance: { available: 0, pending: 0, total: 0 },
      recentCharges: [],
      statistics: {
        totalRevenue: 0,
        successfulCharges: 0,
        refundedCharges: 0,
        pendingCharges: 0,
        totalRefunded: 0,
      },
      topCustomers: [],
      recentPayouts: [],
    };
  }

  try {
    // 1. Get Account Balance
    const balance = await stripe.balance.retrieve();
    const availableBalance = balance.available.reduce((sum, b) => sum + b.amount, 0) / 100;
    const pendingBalance = balance.pending.reduce((sum, b) => sum + b.amount, 0) / 100;

    // 2. Get Recent Charges (last 100)
    const charges = await stripe.charges.list({
      limit: 100,
    });

    // 3. Get Recent PaymentIntents for more details
    const paymentIntents = await stripe.paymentIntents.list({
      limit: 100,
    });

    // 4. Get Recent Payouts
    const payouts = await stripe.payouts.list({
      limit: 10,
    });

    // 5. Calculate statistics
    const successfulCharges = charges.data.filter((c) => c.status === "succeeded");
    const refundedCharges = charges.data.filter((c) => c.refunded);
    const pendingCharges = charges.data.filter((c) => c.status === "pending");

    const totalRevenue = successfulCharges.reduce((sum, c) => sum + c.amount, 0) / 100;
    const totalRefunded = refundedCharges.reduce((sum, c) => sum + (c.amount_refunded || 0), 0) / 100;

    // 6. Top Customers (by total spend)
    const customerSpending = new Map<string, { email: string | null; total: number; count: number }>();
    
    successfulCharges.forEach((charge) => {
      const email = charge.billing_details?.email || charge.receipt_email || "Unknown";
      const current = customerSpending.get(email) || { email, total: 0, count: 0 };
      customerSpending.set(email, {
        email,
        total: current.total + charge.amount / 100,
        count: current.count + 1,
      });
    });

    const topCustomers = Array.from(customerSpending.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // 7. Format recent charges with more details
    const recentCharges = charges.data.slice(0, 20).map((charge) => ({
      id: charge.id,
      amount: charge.amount / 100,
      currency: charge.currency.toUpperCase(),
      status: charge.status,
      customer: charge.billing_details?.name || charge.billing_details?.email || "Unknown",
      email: charge.billing_details?.email || charge.receipt_email,
      description: charge.description || "Pet Care Service",
      created: new Date(charge.created * 1000),
      refunded: charge.refunded,
      paid: charge.paid,
      paymentMethod: charge.payment_method_details?.type || "card",
      last4: charge.payment_method_details?.card?.last4,
      brand: charge.payment_method_details?.card?.brand,
      metadata: charge.metadata,
    }));

    // 8. Format recent payouts
    const recentPayouts = payouts.data.map((payout) => ({
      id: payout.id,
      amount: payout.amount / 100,
      currency: payout.currency.toUpperCase(),
      status: payout.status,
      arrivalDate: new Date(payout.arrival_date * 1000),
      created: new Date(payout.created * 1000),
      description: payout.description,
      method: payout.method,
    }));

    return {
      balance: {
        available: availableBalance,
        pending: pendingBalance,
        total: availableBalance + pendingBalance,
      },
      recentCharges,
      statistics: {
        totalRevenue,
        successfulCharges: successfulCharges.length,
        refundedCharges: refundedCharges.length,
        pendingCharges: pendingCharges.length,
        totalRefunded,
        netRevenue: totalRevenue - totalRefunded,
      },
      topCustomers,
      recentPayouts,
    };
  } catch (error) {
    console.error("Failed to fetch Stripe analytics:", error);
    throw error;
  }
}

/**
 * Get Stripe balance only (faster)
 */
export async function getStripeBalance() {
  if (!stripe) {
    return { available: 0, pending: 0, total: 0 };
  }

  try {
    const balance = await stripe.balance.retrieve();
    const availableBalance = balance.available.reduce((sum, b) => sum + b.amount, 0) / 100;
    const pendingBalance = balance.pending.reduce((sum, b) => sum + b.amount, 0) / 100;

    return {
      available: availableBalance,
      pending: pendingBalance,
      total: availableBalance + pendingBalance,
    };
  } catch (error) {
    console.error("Failed to fetch Stripe balance:", error);
    return { available: 0, pending: 0, total: 0 };
  }
}

/**
 * Get payment details for a specific charge
 */
export async function getChargeDetails(chargeId: string) {
  if (!stripe) {
    return null;
  }

  try {
    const charge = await stripe.charges.retrieve(chargeId);
    return {
      id: charge.id,
      amount: charge.amount / 100,
      currency: charge.currency.toUpperCase(),
      status: charge.status,
      customer: charge.billing_details?.name || "Unknown",
      email: charge.billing_details?.email || charge.receipt_email,
      description: charge.description,
      created: new Date(charge.created * 1000),
      refunded: charge.refunded,
      paid: charge.paid,
      receiptUrl: charge.receipt_url,
      metadata: charge.metadata,
    };
  } catch (error) {
    console.error("Failed to fetch charge details:", error);
    return null;
  }
}

/**
 * Get all payments for a date range
 */
export async function getPaymentsByDateRange(startDate: Date, endDate: Date) {
  if (!stripe) {
    return [];
  }

  try {
    const charges = await stripe.charges.list({
      created: {
        gte: Math.floor(startDate.getTime() / 1000),
        lte: Math.floor(endDate.getTime() / 1000),
      },
      limit: 100,
    });

    return charges.data.map((charge) => ({
      id: charge.id,
      amount: charge.amount / 100,
      status: charge.status,
      customer: charge.billing_details?.name || charge.billing_details?.email || "Unknown",
      created: new Date(charge.created * 1000),
      refunded: charge.refunded,
    }));
  } catch (error) {
    console.error("Failed to fetch payments by date range:", error);
    return [];
  }
}

