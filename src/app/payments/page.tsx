"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { COLORS } from "@/lib/booking-utils";

interface PaymentAnalytics {
  totalRevenue: number;
  totalBookings: number;
  paidBookings: number;
  pendingPayments: number;
  monthlyRevenue: number;
  weeklyRevenue: number;
  todayRevenue: number;
  averageBookingValue: number;
  paymentMethods: {
    card: number;
    bank_transfer: number;
    other: number;
  };
  recentPayments: Array<{
    id: string;
    amount: number;
    status: string;
    customerEmail: string;
    createdAt: string;
    bookingId: string;
  }>;
}

export default function PaymentsPage() {
  const [analytics, setAnalytics] = useState<PaymentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/stripe/analytics?range=${dateRange}`);
      const data = await response.json();
      setAnalytics(data.analytics);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    }
    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen" style={{ background: "#f5f5f5" }}>
      {/* Header */}
      <div className="bg-white border-b shadow-sm" style={{ borderColor: "#e0e0e0" }}>
        <div className="max-w-[1400px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: COLORS.primary }}>
                <i className="fas fa-chart-line" style={{ color: COLORS.primaryLight }}></i>
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: COLORS.primary }}>
                  Payment Analytics
                </h1>
                <p className="text-xs text-gray-500">Live Stripe payment data and revenue tracking</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="px-3 py-2 text-sm font-bold border-2 rounded-lg focus:outline-none focus:ring-2"
                style={{ borderColor: COLORS.primaryLight, color: COLORS.primary }}
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="all">All time</option>
              </select>
              <button
                onClick={fetchAnalytics}
                className="px-4 py-2 text-sm font-bold text-white rounded-lg hover:opacity-90 transition-all"
                style={{ background: COLORS.primary }}
              >
                <i className="fas fa-sync-alt mr-2"></i>Refresh
              </button>
              <Link
                href="/bookings"
                className="px-4 py-2 text-sm font-medium border rounded-lg hover:bg-gray-50 transition-colors"
                style={{ color: COLORS.primary, borderColor: COLORS.border }}
              >
                <i className="fas fa-arrow-left mr-2"></i>Back to Bookings
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-8 py-6">
        {loading ? (
          <div className="text-center py-8">
            <i className="fas fa-spinner fa-spin text-2xl" style={{ color: COLORS.primary }}></i>
            <p className="mt-2 text-gray-600">Loading payment analytics...</p>
          </div>
        ) : analytics ? (
          <div className="space-y-6">
            {/* Revenue Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-6 border-2 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold" style={{ color: COLORS.primary }}>
                      {formatCurrency(analytics.totalRevenue)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                    <i className="fas fa-dollar-sign text-lg" style={{ color: COLORS.primary }}></i>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 border-2 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                    <p className="text-2xl font-bold" style={{ color: COLORS.primary }}>
                      {analytics.totalBookings}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                    <i className="fas fa-calendar-check text-lg" style={{ color: COLORS.primary }}></i>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 border-2 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Paid Bookings</p>
                    <p className="text-2xl font-bold" style={{ color: COLORS.primary }}>
                      {analytics.paidBookings}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                    <i className="fas fa-check-circle text-lg" style={{ color: COLORS.primary }}></i>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 border-2 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Booking Value</p>
                    <p className="text-2xl font-bold" style={{ color: COLORS.primary }}>
                      {formatCurrency(analytics.averageBookingValue)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                    <i className="fas fa-chart-bar text-lg" style={{ color: COLORS.primary }}></i>
                  </div>
                </div>
              </div>
            </div>

            {/* Time Period Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-6 border-2 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Today</p>
                    <p className="text-xl font-bold" style={{ color: COLORS.primary }}>
                      {formatCurrency(analytics.todayRevenue)}
                    </p>
                  </div>
                  <i className="fas fa-calendar-day text-lg" style={{ color: COLORS.primary }}></i>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 border-2 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">This Week</p>
                    <p className="text-xl font-bold" style={{ color: COLORS.primary }}>
                      {formatCurrency(analytics.weeklyRevenue)}
                    </p>
                  </div>
                  <i className="fas fa-calendar-week text-lg" style={{ color: COLORS.primary }}></i>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 border-2 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">This Month</p>
                    <p className="text-xl font-bold" style={{ color: COLORS.primary }}>
                      {formatCurrency(analytics.monthlyRevenue)}
                    </p>
                  </div>
                  <i className="fas fa-calendar-alt text-lg" style={{ color: COLORS.primary }}></i>
                </div>
              </div>
            </div>

            {/* Payment Methods Breakdown */}
            <div className="bg-white rounded-lg p-6 border-2 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
              <h3 className="text-lg font-bold mb-4" style={{ color: COLORS.primary }}>
                Payment Methods
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: COLORS.primary }}>
                    {formatCurrency(analytics.paymentMethods.card)}
                  </div>
                  <div className="text-sm text-gray-600">Card Payments</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: COLORS.primary }}>
                    {formatCurrency(analytics.paymentMethods.bank_transfer)}
                  </div>
                  <div className="text-sm text-gray-600">Bank Transfer</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: COLORS.primary }}>
                    {formatCurrency(analytics.paymentMethods.other)}
                  </div>
                  <div className="text-sm text-gray-600">Other</div>
                </div>
              </div>
            </div>

            {/* Recent Payments */}
            <div className="bg-white rounded-lg p-6 border-2 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
              <h3 className="text-lg font-bold mb-4" style={{ color: COLORS.primary }}>
                Recent Payments
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b" style={{ borderColor: COLORS.border }}>
                      <th className="text-left py-3 px-4 font-semibold text-sm" style={{ color: COLORS.primary }}>
                        Customer
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-sm" style={{ color: COLORS.primary }}>
                        Amount
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-sm" style={{ color: COLORS.primary }}>
                        Status
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-sm" style={{ color: COLORS.primary }}>
                        Date
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-sm" style={{ color: COLORS.primary }}>
                        Booking
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.recentPayments.map((payment) => (
                      <tr key={payment.id} className="border-b" style={{ borderColor: COLORS.border }}>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {payment.customerEmail}
                        </td>
                        <td className="py-3 px-4 text-sm font-semibold" style={{ color: COLORS.primary }}>
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 text-xs font-bold rounded ${
                            payment.status === 'succeeded' ? 'bg-green-100 text-green-700' :
                            payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {payment.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {formatDate(payment.createdAt)}
                        </td>
                        <td className="py-3 px-4">
                          <Link
                            href={`/bookings?id=${payment.bookingId}`}
                            className="text-sm font-medium hover:underline"
                            style={{ color: COLORS.primary }}
                          >
                            View Booking
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <i className="fas fa-exclamation-triangle text-4xl text-gray-300 mb-4"></i>
            <p className="text-gray-600">Failed to load payment analytics</p>
            <button
              onClick={fetchAnalytics}
              className="mt-4 px-4 py-2 text-sm font-bold text-white rounded-lg hover:opacity-90 transition-all"
              style={{ background: COLORS.primary }}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}