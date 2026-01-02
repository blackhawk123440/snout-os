/**
 * Payments Page - Control Surface (Analytical Posture)
 * 
 * Finance-grade payments dashboard with Analytical posture:
 * - Sharper posture, tighter spacing
 * - High interpretive clarity, calm authority
 * - Elastic, continuous charts
 * - Real data density without clutter
 * - Pink as voltage only (focus, edge, active intent)
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { ControlSurfaceAppShell } from '@/components/control-surface/AppShell';
import { Panel, StatCard, Button, Table, Input, Badge, FilterBar, Chart } from '@/components/control-surface';
import { controlSurface } from '@/lib/design-tokens-control-surface';
import { usePosture } from '@/components/control-surface/PostureProvider';

interface Payment {
  id: string;
  amount: number;
  status: string;
  created: Date | string;
  customerEmail: string;
  customerName?: string;
  description?: string;
  paymentMethod?: string;
  currency?: string;
  bookingId?: string;
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

export default function PaymentsPageControlSurface() {
  const { config } = usePosture();
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
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>({
    label: 'Last 30 Days',
    value: '30d',
    days: 30,
  });

  const timeRanges: TimeRange[] = [
    { label: 'Last 7 Days', value: '7d', days: 7 },
    { label: 'Last 30 Days', value: '30d', days: 30 },
    { label: 'Last 90 Days', value: '90d', days: 90 },
    { label: 'Last Year', value: '1y', days: 365 },
  ];

  useEffect(() => {
    fetchAnalytics();
  }, [selectedTimeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/stripe/analytics?timeRange=${selectedTimeRange.value}`);
      if (!response.ok) {
        throw new Error('Failed to fetch payment data');
      }
      const data = await response.json();
      const analyticsData = data.analytics || analytics;
      
      analyticsData.recentPayments = (analyticsData.recentPayments || []).map((p: any) => ({
        ...p,
        created: new Date(p.created),
      }));
      
      setAnalytics(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate KPIs
  const kpis = useMemo(() => {
    const payments = analytics.recentPayments || [];
    const totalCollected = payments
      .filter((p) => p.status === 'paid' || p.status === 'succeeded')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const pendingCount = payments.filter(
      (p) => p.status === 'pending' || p.status === 'processing'
    ).length;
    
    const pendingAmount = payments
      .filter((p) => p.status === 'pending' || p.status === 'processing')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const failedCount = payments.filter(
      (p) => p.status === 'failed' || p.status === 'canceled' || p.status === 'requires_payment_method'
    ).length;
    
    const failedAmount = payments
      .filter((p) => p.status === 'failed' || p.status === 'canceled' || p.status === 'requires_payment_method')
      .reduce((sum, p) => sum + p.amount, 0);
    
    return {
      totalCollected,
      pendingCount,
      pendingAmount,
      failedCount,
      failedAmount,
      upcomingPayouts: pendingAmount, // Proxy for now
    };
  }, [analytics.recentPayments]);

  // Filter payments
  const filteredPayments = useMemo(() => {
    let filtered = analytics.recentPayments || [];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => {
        if (statusFilter === 'paid') {
          return p.status === 'paid' || p.status === 'succeeded';
        }
        if (statusFilter === 'pending') {
          return p.status === 'pending' || p.status === 'processing';
        }
        if (statusFilter === 'failed') {
          return p.status === 'failed' || p.status === 'canceled' || p.status === 'requires_payment_method';
        }
        return true;
      });
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.customerEmail?.toLowerCase().includes(term) ||
          p.customerName?.toLowerCase().includes(term) ||
          p.id?.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [analytics.recentPayments, statusFilter, searchTerm]);

  // Prepare chart data from revenueByMonth
  const chartData = useMemo(() => {
    const months = Object.keys(analytics.revenueByMonth || {}).sort();
    return months.map((month) => ({
      x: month,
      y: analytics.revenueByMonth[month] || 0,
      label: month,
    }));
  }, [analytics.revenueByMonth]);

  // Status badge variant
  const getStatusVariant = (status: string): 'success' | 'warning' | 'error' | 'neutral' => {
    if (status === 'paid' || status === 'succeeded') return 'success';
    if (status === 'pending' || status === 'processing') return 'warning';
    if (status === 'failed' || status === 'canceled' || status === 'requires_payment_method') return 'error';
    return 'neutral';
  };

  // Format currency (amount is already in dollars from the API)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Format date
  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d);
  };

  // Analytical posture: tighter spacing
  const containerPadding = config.spacing === 'tight' ? controlSurface.spacing[6] : controlSurface.spacing[8];
  const sectionGap = config.spacing === 'tight' ? controlSurface.spacing[6] : controlSurface.spacing[8];

  return (
    <ControlSurfaceAppShell posture="analytical">
      <div
        style={{
          padding: containerPadding,
          maxWidth: controlSurface.layout.container.maxWidth,
          margin: '0 auto',
          width: '100%',
        }}
      >
        {/* Page Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: sectionGap,
            gap: controlSurface.spacing[6],
          }}
        >
          <div>
            <h1
              style={{
                fontSize: controlSurface.typography.fontSize['2xl'][0] as string,
                fontWeight: controlSurface.typography.fontWeight.semibold,
                color: controlSurface.colors.base.neutral.primary,
                lineHeight: (controlSurface.typography.fontSize['2xl'][1] as { lineHeight: string }).lineHeight,
                margin: 0,
                marginBottom: controlSurface.spacing[2],
              }}
            >
              Payments
            </h1>
            <p
              style={{
                fontSize: controlSurface.typography.fontSize.sm[0] as string,
                color: controlSurface.colors.base.neutral.secondary,
                lineHeight: (controlSurface.typography.fontSize.sm[1] as { lineHeight: string }).lineHeight,
                margin: 0,
              }}
            >
              Revenue tracking and payment management
            </p>
          </div>
          <Button variant="primary">Export</Button>
        </div>

        {/* Error State */}
        {error && (
          <Panel
            depth="elevated"
            voltage="edge"
            spacing="moderate"
            style={{
              marginBottom: sectionGap,
              backgroundColor: controlSurface.colors.status.error.subtle,
              border: `1px solid ${controlSurface.colors.status.error.base}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div
                style={{
                  color: controlSurface.colors.status.error.base,
                  fontSize: controlSurface.typography.fontSize.base[0] as string,
                }}
              >
                {error}
              </div>
              <Button variant="secondary" size="sm" onClick={fetchAnalytics}>
                Retry
              </Button>
            </div>
          </Panel>
        )}

        {/* KPI Strip - Analytical: Tighter, sharper */}
        {loading ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: controlSurface.spacing[4],
              marginBottom: sectionGap,
            }}
          >
            {[1, 2, 3, 4].map((i) => (
              <Panel key={i} depth="elevated" spacing="moderate">
                <div
                  style={{
                    height: '100px',
                    backgroundColor: controlSurface.colors.base.depth2,
                    borderRadius: controlSurface.spatial.radius.base,
                  }}
                />
              </Panel>
            ))}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: controlSurface.spacing[4],
              marginBottom: sectionGap,
            }}
          >
            <StatCard
              label="Total Collected"
              value={formatCurrency(kpis.totalCollected)}
              icon={<i className="fas fa-dollar-sign" />}
              voltage="edge"
            />
            <StatCard
              label="Pending"
              value={`${kpis.pendingCount} (${formatCurrency(kpis.pendingAmount)})`}
              icon={<i className="fas fa-clock" />}
              voltage="ambient"
            />
            <StatCard
              label="Failed"
              value={`${kpis.failedCount} (${formatCurrency(kpis.failedAmount)})`}
              icon={<i className="fas fa-exclamation-triangle" />}
              voltage="ambient"
            />
            <StatCard
              label="Upcoming Payouts"
              value={formatCurrency(kpis.upcomingPayouts)}
              icon={<i className="fas fa-arrow-right" />}
              voltage="ambient"
            />
          </div>
        )}

        {/* Chart - Elastic and continuous */}
        {!loading && chartData.length > 0 && (
          <Panel depth="elevated" voltage="ambient" spacing="moderate" style={{ marginBottom: sectionGap }}>
            <div
              style={{
                fontSize: controlSurface.typography.fontSize.lg[0] as string,
                fontWeight: controlSurface.typography.fontWeight.semibold,
                color: controlSurface.colors.base.neutral.primary,
                marginBottom: controlSurface.spacing[4],
              }}
            >
              Revenue Trend
            </div>
            <Chart
              data={chartData}
              width={800}
              height={200}
              type="area"
              color={controlSurface.colors.voltage.edge}
              showGrid={true}
              showAxes={true}
            />
          </Panel>
        )}

        {/* Filters */}
        <FilterBar
          searchPlaceholder="Search payments, clients, invoices..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          filters={[
            {
              label: 'Status',
              value: 'status',
              options: [
                { label: 'All', value: 'all' },
                { label: 'Paid', value: 'paid' },
                { label: 'Pending', value: 'pending' },
                { label: 'Failed', value: 'failed' },
              ],
              selectedValue: statusFilter,
              onChange: setStatusFilter,
            },
            {
              label: 'Time Range',
              value: 'timeRange',
              options: timeRanges.map((tr) => ({ label: tr.label, value: tr.value })),
              selectedValue: selectedTimeRange.value,
              onChange: (value) => {
                const tr = timeRanges.find((t) => t.value === value);
                if (tr) setSelectedTimeRange(tr);
              },
            },
          ]}
        />

        {/* Payments Table */}
        {loading ? (
          <Panel depth="elevated" spacing="moderate" style={{ marginTop: sectionGap }}>
            <div
              style={{
                height: '400px',
                backgroundColor: controlSurface.colors.base.depth2,
                borderRadius: controlSurface.spatial.radius.base,
              }}
            />
          </Panel>
        ) : filteredPayments.length === 0 ? (
          <Panel depth="elevated" spacing="moderate" style={{ marginTop: sectionGap }}>
            <div
              style={{
                padding: controlSurface.spacing[12],
                textAlign: 'center',
                color: controlSurface.colors.base.neutral.secondary,
              }}
            >
              <i
                className="fas fa-inbox"
                style={{
                  fontSize: controlSurface.typography.fontSize['3xl'][0] as string,
                  marginBottom: controlSurface.spacing[4],
                  opacity: 0.5,
                }}
              />
              <div
                style={{
                  fontSize: controlSurface.typography.fontSize.lg[0] as string,
                  fontWeight: controlSurface.typography.fontWeight.medium,
                  color: controlSurface.colors.base.neutral.primary,
                  marginBottom: controlSurface.spacing[2],
                }}
              >
                No payments found
              </div>
              <div style={{ fontSize: controlSurface.typography.fontSize.sm[0] as string }}>
                Try adjusting your filters
              </div>
            </div>
          </Panel>
        ) : (
          <div style={{ marginTop: sectionGap }}>
            <Table<Payment>
              columns={[
                {
                  key: 'customer',
                  header: 'Client',
                  render: (payment: Payment) => (
                    <div>
                      <div style={{ fontWeight: controlSurface.typography.fontWeight.medium }}>
                        {payment.customerName || payment.customerEmail}
                      </div>
                      {payment.customerName && (
                        <div
                          style={{
                            fontSize: controlSurface.typography.fontSize.xs[0] as string,
                            color: controlSurface.colors.base.neutral.tertiary,
                          }}
                        >
                          {payment.customerEmail}
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'booking',
                  header: 'Booking/Invoice',
                  render: (payment: Payment) => (
                    <div
                      style={{
                        fontFamily: controlSurface.typography.fontFamily.mono.join(', '),
                        fontSize: controlSurface.typography.fontSize.sm[0] as string,
                      }}
                    >
                      {payment.bookingId || payment.id}
                    </div>
                  ),
                },
                {
                  key: 'amount',
                  header: 'Amount',
                  align: 'right',
                  render: (payment: Payment) => (
                    <div style={{ fontWeight: controlSurface.typography.fontWeight.semibold }}>
                      {formatCurrency(payment.amount)}
                    </div>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (payment: Payment) => <Badge variant={getStatusVariant(payment.status)}>{payment.status}</Badge>,
                },
                {
                  key: 'method',
                  header: 'Method',
                  render: (payment: Payment) => payment.paymentMethod || '—',
                },
                {
                  key: 'date',
                  header: 'Date',
                  render: (payment: Payment) => formatDate(payment.created),
                },
                {
                  key: 'actions',
                  header: '',
                  align: 'right',
                  render: (payment: Payment) => (
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  ),
                },
              ]}
              data={filteredPayments}
              keyExtractor={(payment) => payment.id}
              onRowClick={(payment) => {
                // Navigate to payment detail or open modal
                console.log('View payment:', payment.id);
              }}
            />
          </div>
        )}
      </div>
    </ControlSurfaceAppShell>
  );
}

