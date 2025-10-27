import { stripe } from "@/lib/stripe";

export async function getStripeAnalytics(): Promise<{
  totalRevenue: number;
  totalCustomers: number;
  totalInvoices: number;
  recentPayments: any[];
}> {
  try {
    const [customers, invoices] = await Promise.all([
      stripe.customers.list({ limit: 100 }),
      stripe.invoices.list({ limit: 100, status: "paid" }),
    ]);

    const totalRevenue = invoices.data.reduce((sum, invoice) => {
      return sum + (invoice.amount_paid || 0) / 100; // Convert from cents
    }, 0);

    const recentPayments = invoices.data
      .slice(0, 10)
      .map(invoice => ({
        id: invoice.id,
        amount: (invoice.amount_paid || 0) / 100,
        status: invoice.status,
        created: new Date(invoice.created * 1000),
        customerEmail: invoice.customer_email,
      }));

    return {
      totalRevenue,
      totalCustomers: customers.data.length,
      totalInvoices: invoices.data.length,
      recentPayments,
    };
  } catch (error) {
    console.error("Failed to fetch Stripe analytics:", error);
    return {
      totalRevenue: 0,
      totalCustomers: 0,
      totalInvoices: 0,
      recentPayments: [],
    };
  }
}