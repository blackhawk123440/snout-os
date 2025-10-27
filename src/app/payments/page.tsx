"use client";

import { useState, useEffect } from "react";
import { COLORS } from "@/lib/booking-utils";

interface Payment {
  id: string;
  amount: number;
  status: string;
  created: Date;
  customerEmail: string;
}

interface Analytics {
  totalRevenue: number;
  totalCustomers: number;
  totalInvoices: number;
  recentPayments: Payment[];
}

export default function PaymentsPage() {
  const [analytics, setAnalytics] = useState<Analytics>({
    totalRevenue: 0,
    totalCustomers: 0,
    totalInvoices: 0,
    recentPayments: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/stripe/analytics");
      const data = await response.json();
      setAnalytics(data.analytics || analytics);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    }
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "failed": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="min-h-screen" style={{ background: "#f5f5f5" }}>
      {/* Header */}
      <div className="bg-white border-b shadow-sm" style={{ borderColor: "#e0e0e0" }}>
        <div className="max-w-[1400px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: COLORS.primary }}>
                <i className="fas fa-credit-card" style={{ color: COLORS.primaryLight }}></i>
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: COLORS.primary }}>
                  Payments & Analytics
                </h1>
                <p className="text-xs text-gray-500">Track revenue and payment analytics</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchAnalytics}
                disabled={loading}
                className="px-4 py-2 text-sm font-bold border-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ color: COLORS.primary, borderColor: COLORS.primaryLight }}
                title="Refresh analytics"
              >
                <i className={`fas fa-sync-alt ${loading ? 'animate-spin' : ''}`}></i>
              </button>
              <a
                href="/bookings"
                className="px-4 py-2 text-sm font-medium border rounded-lg hover:bg-gray-50 transition-colors"
                style={{ color: COLORS.primary, borderColor: COLORS.border }}
              >
                <i className="fas fa-arrow-left mr-2"></i>Back to Bookings
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-8 py-6">
        {/* Analytics Cards */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg p-6 border-2" style={{ borderColor: COLORS.primaryLight }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-3xl font-bold" style={{ color: COLORS.primary }}>
                  ${analytics.totalRevenue.toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                <i className="fas fa-dollar-sign text-2xl" style={{ color: COLORS.primary }}></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border-2" style={{ borderColor: COLORS.primaryLight }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Customers</p>
                <p className="text-3xl font-bold" style={{ color: COLORS.primary }}>
                  {analytics.totalCustomers}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                <i className="fas fa-users text-2xl" style={{ color: COLORS.primary }}></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border-2" style={{ borderColor: COLORS.primaryLight }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                <p className="text-3xl font-bold" style={{ color: COLORS.primary }}>
                  {analytics.totalInvoices}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                <i className="fas fa-file-invoice text-2xl" style={{ color: COLORS.primary }}></i>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white rounded-lg border-2" style={{ borderColor: COLORS.primaryLight }}>
          <div className="p-4 border-b" style={{ borderColor: COLORS.border }}>
            <h2 className="text-lg font-bold" style={{ color: COLORS.primary }}>
              Recent Payments
            </h2>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <i className="fas fa-spinner fa-spin text-2xl" style={{ color: COLORS.primary }}></i>
                <p className="mt-2 text-gray-600">Loading payments...</p>
              </div>
            ) : analytics.recentPayments.length === 0 ? (
              <div className="text-center py-8">
                <i className="fas fa-credit-card text-4xl text-gray-300 mb-4"></i>
                <p className="text-gray-600">No payments found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {analytics.recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="p-4 border rounded-lg hover:shadow-md transition-all"
                    style={{ borderColor: COLORS.border }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-lg">
                            Payment #{payment.id.slice(-8)}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-bold rounded ${getStatusColor(payment.status)}`}>
                            {payment.status}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600">
                          <div className="flex items-center gap-4">
                            <span><i className="fas fa-calendar mr-1"></i>{formatDate(payment.created)}</span>
                            <span><i className="fas fa-envelope mr-1"></i>{payment.customerEmail}</span>
                            <span><i className="fas fa-dollar-sign mr-1"></i>${payment.amount.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}