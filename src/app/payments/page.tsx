"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { COLORS } from "@/lib/booking-utils";

interface Payment {
  id: string;
  amount: number;
  status: string;
  created: Date;
  customerEmail: string;
  customerName?: string;
  description?: string;
  paymentMethod?: string;
  currency?: string;
}

interface Analytics {
  totalRevenue: number;
  totalCustomers: number;
  totalInvoices: number;
  recentPayments: Payment[];
  monthlyRevenue: number;
  weeklyRevenue: number;
  dailyRevenue: number;
  averagePayment: number;
  paymentMethods: Record<string, number>;
  revenueByMonth: Record<string, number>;
  topCustomers: Array<{ email: string; totalSpent: number; paymentCount: number }>;
  conversionRate: number;
  refundRate: number;
  churnRate: number;
}

interface TimeRange {
  label: string;
  value: string;
  days: number;
}

export default function PaymentsPage() {
  const [analytics, setAnalytics] = useState<Analytics>({
    totalRevenue: 0,
    totalCustomers: 0,
    totalInvoices: 0,
    recentPayments: [],
    monthlyRevenue: 0,
    weeklyRevenue: 0,
    dailyRevenue: 0,
    averagePayment: 0,
    paymentMethods: {},
    revenueByMonth: {},
    topCustomers: [],
    conversionRate: 0,
    refundRate: 0,
    churnRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>({
    label: "Last 30 Days",
    value: "30d",
    days: 30
  });
  const [selectedTab, setSelectedTab] = useState<'overview' | 'analytics' | 'customers' | 'reports'>('overview');

  const timeRanges: TimeRange[] = [
    { label: "Last 7 Days", value: "7d", days: 7 },
    { label: "Last 30 Days", value: "30d", days: 30 },
    { label: "Last 90 Days", value: "90d", days: 90 },
    { label: "Last Year", value: "1y", days: 365 },
  ];

  useEffect(() => {
    fetchAnalytics();
  }, [selectedTimeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/stripe/analytics?timeRange=${selectedTimeRange.value}`);
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setAnalytics(data.analytics || analytics);
    } catch {
      // Silently handle errors
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-100 text-green-800 border-green-200";
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "failed": return "bg-red-100 text-red-800 border-red-200";
      case "refunded": return "bg-purple-100 text-purple-800 border-purple-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getRevenueGrowth = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'card': return 'fas fa-credit-card';
      case 'bank_transfer': return 'fas fa-university';
      case 'paypal': return 'fab fa-paypal';
      case 'apple_pay': return 'fab fa-apple-pay';
      case 'google_pay': return 'fab fa-google-pay';
      default: return 'fas fa-credit-card';
    }
  };

  return (
    <div className="min-h-screen w-full" style={{ background: COLORS.primaryLighter }}>
      {/* Header */}
      <div className="bg-white border-b shadow-sm" style={{ borderColor: COLORS.border }}>
        <div className="max-w-[1600px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg" style={{ background: COLORS.primary }}>
                <i className="fas fa-chart-line text-xl" style={{ color: COLORS.primaryLight }}></i>
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: COLORS.primary }}>
                  Payment Analytics Dashboard
                </h1>
                <p className="text-sm text-gray-600">Comprehensive financial insights and payment analytics</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Time Range Selector */}
              <select
                value={selectedTimeRange.value}
                onChange={(e) => {
                  const range = timeRanges.find(r => r.value === e.target.value);
                  if (range) setSelectedTimeRange(range);
                }}
                className="px-4 py-2 text-sm font-semibold border-2 rounded-lg"
                style={{ borderColor: COLORS.border }}
              >
                {timeRanges.map(range => (
                  <option key={range.value} value={range.value}>{range.label}</option>
                ))}
              </select>
              <button
                onClick={fetchAnalytics}
                disabled={loading}
                className="px-4 py-2 text-sm font-bold border-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ color: COLORS.primary, borderColor: COLORS.primaryLight }}
                title="Refresh analytics"
              >
                <i className={`fas fa-sync-alt ${loading ? 'animate-spin' : ''}`}></i>
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

      <div className="max-w-[1600px] mx-auto px-8 py-6">
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {[
              { id: 'overview', label: 'Overview', icon: 'fas fa-chart-pie' },
              { id: 'analytics', label: 'Analytics', icon: 'fas fa-chart-line' },
              { id: 'customers', label: 'Customers', icon: 'fas fa-users' },
              { id: 'reports', label: 'Reports', icon: 'fas fa-file-alt' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all ${
                  selectedTab === tab.id
                    ? 'bg-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                style={selectedTab === tab.id ? { background: COLORS.primary, color: COLORS.primaryLight } : {}}
              >
                <i className={tab.icon}></i>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <div className="space-y-8">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl p-6 border-2 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Revenue</p>
                    <p className="text-3xl font-bold mt-2" style={{ color: COLORS.primary }}>
                      {formatCurrency(analytics.totalRevenue)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">All time</p>
                  </div>
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-sm" style={{ background: COLORS.primaryLight }}>
                    <i className="fas fa-dollar-sign text-2xl" style={{ color: COLORS.primary }}></i>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border-2 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Monthly Revenue</p>
                    <p className="text-3xl font-bold mt-2" style={{ color: COLORS.primary }}>
                      {formatCurrency(analytics.monthlyRevenue)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">This month</p>
                  </div>
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-sm" style={{ background: COLORS.primaryLight }}>
                    <i className="fas fa-calendar-alt text-2xl" style={{ color: COLORS.primary }}></i>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border-2 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Customers</p>
                    <p className="text-3xl font-bold mt-2" style={{ color: COLORS.primary }}>
                      {analytics.totalCustomers}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Active customers</p>
                  </div>
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-sm" style={{ background: COLORS.primaryLight }}>
                    <i className="fas fa-users text-2xl" style={{ color: COLORS.primary }}></i>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border-2 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Average Payment</p>
                    <p className="text-3xl font-bold mt-2" style={{ color: COLORS.primary }}>
                      {formatCurrency(analytics.averagePayment)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Per transaction</p>
                  </div>
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-sm" style={{ background: COLORS.primaryLight }}>
                    <i className="fas fa-chart-bar text-2xl" style={{ color: COLORS.primary }}></i>
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 border-2 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                    <i className="fas fa-chart-line text-sm" style={{ color: COLORS.primary }}></i>
                  </div>
                  <h3 className="text-lg font-bold" style={{ color: COLORS.primary }}>Weekly Revenue</h3>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold" style={{ color: COLORS.primary }}>
                    {formatCurrency(analytics.weeklyRevenue)}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">Last 7 days</p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border-2 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                    <i className="fas fa-calendar-day text-sm" style={{ color: COLORS.primary }}></i>
                  </div>
                  <h3 className="text-lg font-bold" style={{ color: COLORS.primary }}>Daily Revenue</h3>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold" style={{ color: COLORS.primary }}>
                    {formatCurrency(analytics.dailyRevenue)}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">Today</p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border-2 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                    <i className="fas fa-file-invoice text-sm" style={{ color: COLORS.primary }}></i>
                  </div>
                  <h3 className="text-lg font-bold" style={{ color: COLORS.primary }}>Total Invoices</h3>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold" style={{ color: COLORS.primary }}>
                    {analytics.totalInvoices}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">All time</p>
                </div>
              </div>
            </div>

            {/* Recent Payments */}
            <div className="bg-white rounded-xl border-2 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
              <div className="p-6 border-b" style={{ borderColor: COLORS.border }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                      <i className="fas fa-credit-card text-sm" style={{ color: COLORS.primary }}></i>
                    </div>
                    <h2 className="text-xl font-bold" style={{ color: COLORS.primary }}>
                      Recent Payments
                    </h2>
                  </div>
                  <span className="text-sm text-gray-500">{analytics.recentPayments.length} payments</span>
                </div>
              </div>

              <div className="p-6">
                {loading ? (
                  <div className="text-center py-12">
                    <i className="fas fa-spinner fa-spin text-3xl" style={{ color: COLORS.primary }}></i>
                    <p className="mt-4 text-gray-600">Loading payments...</p>
                  </div>
                ) : analytics.recentPayments.length === 0 ? (
                  <div className="text-center py-12">
                    <i className="fas fa-credit-card text-5xl text-gray-300 mb-4"></i>
                    <p className="text-gray-600 text-lg">No payments found</p>
                    <p className="text-gray-500 text-sm mt-2">Payments will appear here once customers make transactions</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analytics.recentPayments.slice(0, 10).map((payment) => (
                      <div
                        key={payment.id}
                        className="p-6 border-2 rounded-xl hover:shadow-md transition-all"
                        style={{ borderColor: COLORS.border }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-3">
                              <h3 className="font-bold text-lg">
                                Payment #{payment.id.slice(-8).toUpperCase()}
                              </h3>
                              <span className={`px-3 py-1 text-sm font-bold rounded-full border ${getStatusColor(payment.status)}`}>
                                {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <i className="fas fa-calendar text-gray-400"></i>
                                <span className="text-gray-600">{formatDateTime(payment.created)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <i className="fas fa-envelope text-gray-400"></i>
                                <span className="text-gray-600">{payment.customerEmail}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <i className="fas fa-dollar-sign text-gray-400"></i>
                                <span className="font-semibold text-lg" style={{ color: COLORS.primary }}>
                                  {formatCurrency(payment.amount)}
                                </span>
                              </div>
                              {payment.paymentMethod && (
                                <div className="flex items-center gap-2">
                                  <i className={`${getPaymentMethodIcon(payment.paymentMethod)} text-gray-400`}></i>
                                  <span className="text-gray-600 capitalize">{payment.paymentMethod.replace('_', ' ')}</span>
                                </div>
                              )}
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
        )}

        {/* Analytics Tab */}
        {selectedTab === 'analytics' && (
          <div className="space-y-8">
            {/* Payment Methods Breakdown */}
            <div className="bg-white rounded-xl border-2 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
              <div className="p-6 border-b" style={{ borderColor: COLORS.border }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                    <i className="fas fa-chart-pie text-sm" style={{ color: COLORS.primary }}></i>
                  </div>
                  <h2 className="text-xl font-bold" style={{ color: COLORS.primary }}>
                    Payment Methods Breakdown
                  </h2>
                </div>
              </div>
              <div className="p-6">
                {Object.keys(analytics.paymentMethods).length === 0 ? (
                  <div className="text-center py-8">
                    <i className="fas fa-chart-pie text-4xl text-gray-300 mb-4"></i>
                    <p className="text-gray-600">No payment method data available</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(analytics.paymentMethods).map(([method, count]) => (
                      <div key={method} className="p-4 border-2 rounded-lg" style={{ borderColor: COLORS.border }}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                            <i className={`${getPaymentMethodIcon(method)} text-lg`} style={{ color: COLORS.primary }}></i>
                          </div>
                          <div>
                            <p className="font-semibold capitalize">{method.replace('_', ' ')}</p>
                            <p className="text-2xl font-bold" style={{ color: COLORS.primary }}>{count}</p>
                            <p className="text-sm text-gray-600">transactions</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Revenue by Month */}
            <div className="bg-white rounded-xl border-2 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
              <div className="p-6 border-b" style={{ borderColor: COLORS.border }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                    <i className="fas fa-chart-bar text-sm" style={{ color: COLORS.primary }}></i>
                  </div>
                  <h2 className="text-xl font-bold" style={{ color: COLORS.primary }}>
                    Revenue by Month
                  </h2>
                </div>
              </div>
              <div className="p-6">
                {Object.keys(analytics.revenueByMonth).length === 0 ? (
                  <div className="text-center py-8">
                    <i className="fas fa-chart-bar text-4xl text-gray-300 mb-4"></i>
                    <p className="text-gray-600">No monthly revenue data available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(analytics.revenueByMonth).map(([month, revenue]) => (
                      <div key={month} className="flex items-center justify-between p-4 border-2 rounded-lg" style={{ borderColor: COLORS.border }}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                            <i className="fas fa-calendar text-lg" style={{ color: COLORS.primary }}></i>
                          </div>
                          <div>
                            <p className="font-semibold">{month}</p>
                            <p className="text-sm text-gray-600">Monthly revenue</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold" style={{ color: COLORS.primary }}>
                            {formatCurrency(revenue)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 border-2 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                    <i className="fas fa-percentage text-sm" style={{ color: COLORS.primary }}></i>
                  </div>
                  <h3 className="text-lg font-bold" style={{ color: COLORS.primary }}>Conversion Rate</h3>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold" style={{ color: COLORS.primary }}>
                    {analytics.conversionRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-600 mt-2">Payment success rate</p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border-2 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                    <i className="fas fa-undo text-sm" style={{ color: COLORS.primary }}></i>
                  </div>
                  <h3 className="text-lg font-bold" style={{ color: COLORS.primary }}>Refund Rate</h3>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold" style={{ color: COLORS.primary }}>
                    {analytics.refundRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-600 mt-2">Refund percentage</p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border-2 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                    <i className="fas fa-user-times text-sm" style={{ color: COLORS.primary }}></i>
                  </div>
                  <h3 className="text-lg font-bold" style={{ color: COLORS.primary }}>Churn Rate</h3>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold" style={{ color: COLORS.primary }}>
                    {analytics.churnRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-600 mt-2">Customer churn</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Customers Tab */}
        {selectedTab === 'customers' && (
          <div className="space-y-8">
            {/* Top Customers */}
            <div className="bg-white rounded-xl border-2 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
              <div className="p-6 border-b" style={{ borderColor: COLORS.border }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                    <i className="fas fa-trophy text-sm" style={{ color: COLORS.primary }}></i>
                  </div>
                  <h2 className="text-xl font-bold" style={{ color: COLORS.primary }}>
                    Top Customers
                  </h2>
                </div>
              </div>
              <div className="p-6">
                {analytics.topCustomers.length === 0 ? (
                  <div className="text-center py-8">
                    <i className="fas fa-users text-4xl text-gray-300 mb-4"></i>
                    <p className="text-gray-600">No customer data available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analytics.topCustomers.map((customer, index) => (
                      <div key={customer.email} className="flex items-center justify-between p-4 border-2 rounded-lg" style={{ borderColor: COLORS.border }}>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm" style={{ background: COLORS.primaryLight }}>
                            <span className="text-lg font-bold" style={{ color: COLORS.primary }}>#{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-semibold">{customer.email}</p>
                            <p className="text-sm text-gray-600">{customer.paymentCount} payments</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold" style={{ color: COLORS.primary }}>
                            {formatCurrency(customer.totalSpent)}
                          </p>
                          <p className="text-sm text-gray-600">Total spent</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {selectedTab === 'reports' && (
          <div className="space-y-8">
            <div className="bg-white rounded-xl border-2 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
              <div className="p-6 border-b" style={{ borderColor: COLORS.border }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                    <i className="fas fa-file-alt text-sm" style={{ color: COLORS.primary }}></i>
                  </div>
                  <h2 className="text-xl font-bold" style={{ color: COLORS.primary }}>
                    Financial Reports
                  </h2>
                </div>
              </div>
              <div className="p-6">
                <div className="text-center py-12">
                  <i className="fas fa-file-alt text-5xl text-gray-300 mb-4"></i>
                  <p className="text-gray-600 text-lg">Financial reports coming soon</p>
                  <p className="text-gray-500 text-sm mt-2">Export detailed financial reports and analytics</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}