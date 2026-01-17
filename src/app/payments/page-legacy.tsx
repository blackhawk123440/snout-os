/**
 * Payments Page - Enterprise Rebuild
 * 
 * Complete rebuild using design system and components.
 * Zero legacy styling - all through components and tokens.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  PageHeader,
  Card,
  Button,
  Select,
  Badge,
  StatCard,
  Table,
  TableColumn,
  Tabs,
  TabPanel,
  Skeleton,
  EmptyState,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';

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

type TabType = 'overview' | 'analytics' | 'customers' | 'reports';

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
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>({
    label: 'Last 30 Days',
    value: '30d',
    days: 30,
  });
  const [selectedTab, setSelectedTab] = useState<TabType>('overview');

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
        throw new Error('Failed to fetch analytics');
      }
      const data = await response.json();
      setAnalytics(data.analytics || analytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDateTime = (date: Date | string) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadgeVariant = (status: string): 'default' | 'success' | 'warning' | 'error' => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      case 'refunded':
        return 'default';
      default:
        return 'default';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'card':
        return 'fas fa-credit-card';
      case 'bank_transfer':
        return 'fas fa-university';
      case 'paypal':
        return 'fab fa-paypal';
      case 'apple_pay':
        return 'fab fa-apple-pay';
      case 'google_pay':
        return 'fab fa-google-pay';
      default:
        return 'fas fa-credit-card';
    }
  };

  if (loading && analytics.totalRevenue === 0) {
    return (
      <AppShell>
        <PageHeader title="Payments" description="Payment analytics and insights" />
        <Card>
          <Skeleton height="600px" />
        </Card>
      </AppShell>
    );
  }

  if (error && analytics.totalRevenue === 0) {
    return (
      <AppShell>
        <PageHeader title="Payments" description="Payment analytics and insights" />
        <Card>
          <EmptyState
            icon="⚠️"
            title="Failed to Load Analytics"
            description={error}
            action={{
              label: 'Retry',
              onClick: fetchAnalytics,
              variant: 'primary',
            }}
          />
        </Card>
      </AppShell>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <i className="fas fa-chart-pie" /> },
    { id: 'analytics', label: 'Advanced Analytics', icon: <i className="fas fa-chart-area" /> },
    { id: 'customers', label: 'Customers', icon: <i className="fas fa-users" /> },
    { id: 'reports', label: 'Reports', icon: <i className="fas fa-file-alt" /> },
  ];

  const paymentColumns: TableColumn<Payment>[] = [
    {
      key: 'id',
      header: 'Payment ID',
      render: (payment) => `#${payment.id.slice(-8).toUpperCase()}`,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (payment) => (
        <span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
          {formatCurrency(payment.amount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (payment) => (
        <Badge variant={getStatusBadgeVariant(payment.status)}>
          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'customerEmail',
      header: 'Customer',
      render: (payment) => payment.customerEmail,
    },
    {
      key: 'created',
      header: 'Date',
      render: (payment) => formatDateTime(payment.created),
    },
    {
      key: 'paymentMethod',
      header: 'Method',
      render: (payment) =>
        payment.paymentMethod ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
            <i className={getPaymentMethodIcon(payment.paymentMethod)} />
            <span>{payment.paymentMethod.replace('_', ' ')}</span>
          </div>
        ) : (
          '-'
        ),
    },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Payments"
        description="Payment analytics and insights"
        actions={
          <>
            <Select
              options={timeRanges.map((r) => ({ value: r.value, label: r.label }))}
              value={selectedTimeRange.value}
              onChange={(e) => {
                const range = timeRanges.find((r) => r.value === e.target.value);
                if (range) setSelectedTimeRange(range);
              }}
              style={{ minWidth: '150px' }}
            />
            <Button variant="secondary" onClick={fetchAnalytics} isLoading={loading} leftIcon={<i className="fas fa-sync-alt" />}>
              Refresh
            </Button>
            <Link href="/bookings">
              <Button variant="secondary" leftIcon={<i className="fas fa-arrow-left" />}>
                Back
              </Button>
            </Link>
          </>
        }
      />

      {error && (
        <Card
          style={{
            marginBottom: tokens.spacing[6],
            borderColor: tokens.colors.error.DEFAULT,
            backgroundColor: tokens.colors.error[100],
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing[2],
              color: tokens.colors.error.DEFAULT,
            }}
          >
            <i className="fas fa-exclamation-circle" />
            <span>{error}</span>
          </div>
        </Card>
      )}

      <Card>
        <Tabs tabs={tabs} activeTab={selectedTab} onTabChange={(id) => setSelectedTab(id as TabType)}>
          <TabPanel id="overview">
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: tokens.spacing[8],
              }}
            >
              {/* Key Metrics */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: tokens.spacing[6],
                }}
              >
                <StatCard
                  label="Total Revenue"
                  value={formatCurrency(analytics.totalRevenue)}
                  icon={<i className="fas fa-dollar-sign" />}
                />
                <StatCard
                  label="Monthly Revenue"
                  value={formatCurrency(analytics.monthlyRevenue)}
                  icon={<i className="fas fa-calendar-alt" />}
                />
                <StatCard
                  label="Total Customers"
                  value={analytics.totalCustomers}
                  icon={<i className="fas fa-users" />}
                />
                <StatCard
                  label="Average Payment"
                  value={formatCurrency(analytics.averagePayment)}
                  icon={<i className="fas fa-chart-bar" />}
                />
              </div>

              {/* Revenue Trends */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: tokens.spacing[6],
                }}
              >
                <Card>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: tokens.spacing[3],
                      marginBottom: tokens.spacing[4],
                    }}
                  >
                    <div
                      style={{
                        width: '2rem',
                        height: '2rem',
                        borderRadius: tokens.borderRadius.md,
                        backgroundColor: tokens.colors.primary[100],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <i className="fas fa-chart-line" style={{ color: tokens.colors.primary.DEFAULT }} />
                    </div>
                    <h3
                      style={{
                        fontSize: tokens.typography.fontSize.lg[0],
                        fontWeight: tokens.typography.fontWeight.bold,
                        color: tokens.colors.text.primary,
                        margin: 0,
                      }}
                    >
                      Weekly Revenue
                    </h3>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        fontSize: tokens.typography.fontSize['4xl'][0],
                        fontWeight: tokens.typography.fontWeight.bold,
                        color: tokens.colors.text.primary,
                      }}
                    >
                      {formatCurrency(analytics.weeklyRevenue)}
                    </div>
                    <p
                      style={{
                        fontSize: tokens.typography.fontSize.sm[0],
                        color: tokens.colors.text.secondary,
                        marginTop: tokens.spacing[2],
                        margin: 0,
                      }}
                    >
                      Last 7 days
                    </p>
                  </div>
                </Card>

                <Card>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: tokens.spacing[3],
                      marginBottom: tokens.spacing[4],
                    }}
                  >
                    <div
                      style={{
                        width: '2rem',
                        height: '2rem',
                        borderRadius: tokens.borderRadius.md,
                        backgroundColor: tokens.colors.primary[100],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <i className="fas fa-calendar-day" style={{ color: tokens.colors.primary.DEFAULT }} />
                    </div>
                    <h3
                      style={{
                        fontSize: tokens.typography.fontSize.lg[0],
                        fontWeight: tokens.typography.fontWeight.bold,
                        color: tokens.colors.text.primary,
                        margin: 0,
                      }}
                    >
                      Daily Revenue
                    </h3>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        fontSize: tokens.typography.fontSize['4xl'][0],
                        fontWeight: tokens.typography.fontWeight.bold,
                        color: tokens.colors.text.primary,
                      }}
                    >
                      {formatCurrency(analytics.dailyRevenue)}
                    </div>
                    <p
                      style={{
                        fontSize: tokens.typography.fontSize.sm[0],
                        color: tokens.colors.text.secondary,
                        marginTop: tokens.spacing[2],
                        margin: 0,
                      }}
                    >
                      Today
                    </p>
                  </div>
                </Card>

                <Card>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: tokens.spacing[3],
                      marginBottom: tokens.spacing[4],
                    }}
                  >
                    <div
                      style={{
                        width: '2rem',
                        height: '2rem',
                        borderRadius: tokens.borderRadius.md,
                        backgroundColor: tokens.colors.primary[100],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <i className="fas fa-file-invoice" style={{ color: tokens.colors.primary.DEFAULT }} />
                    </div>
                    <h3
                      style={{
                        fontSize: tokens.typography.fontSize.lg[0],
                        fontWeight: tokens.typography.fontWeight.bold,
                        color: tokens.colors.text.primary,
                        margin: 0,
                      }}
                    >
                      Total Invoices
                    </h3>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        fontSize: tokens.typography.fontSize['4xl'][0],
                        fontWeight: tokens.typography.fontWeight.bold,
                        color: tokens.colors.text.primary,
                      }}
                    >
                      {analytics.totalInvoices}
                    </div>
                    <p
                      style={{
                        fontSize: tokens.typography.fontSize.sm[0],
                        color: tokens.colors.text.secondary,
                        marginTop: tokens.spacing[2],
                        margin: 0,
                      }}
                    >
                      All time
                    </p>
                  </div>
                </Card>
              </div>

              {/* Recent Payments */}
              <Card>
                <h2
                  style={{
                    fontSize: tokens.typography.fontSize.xl[0],
                    fontWeight: tokens.typography.fontWeight.bold,
                    color: tokens.colors.text.primary,
                    marginBottom: tokens.spacing[6],
                  }}
                >
                  Recent Payments
                </h2>
                <Table
                  columns={paymentColumns}
                  data={analytics.recentPayments.slice(0, 10)}
                  loading={loading}
                  emptyMessage="No payments found. Payments will appear here once customers make transactions."
                  keyExtractor={(payment) => payment.id}
                />
              </Card>
            </div>
          </TabPanel>

          <TabPanel id="analytics">
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: tokens.spacing[8],
              }}
            >
              {/* Payment Methods */}
              <Card>
                <h2
                  style={{
                    fontSize: tokens.typography.fontSize.xl[0],
                    fontWeight: tokens.typography.fontWeight.bold,
                    color: tokens.colors.text.primary,
                    marginBottom: tokens.spacing[6],
                  }}
                >
                  Payment Methods Breakdown
                </h2>
                {Object.keys(analytics.paymentMethods).length === 0 ? (
                  <EmptyState
                    icon="💳"
                    title="No Payment Methods"
                    description="No payment method data available"
                  />
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                      gap: tokens.spacing[4],
                    }}
                  >
                    {Object.entries(analytics.paymentMethods).map(([method, count]) => (
                      <Card key={method}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: tokens.spacing[3],
                          }}
                        >
                          <div
                            style={{
                              width: '2.5rem',
                              height: '2.5rem',
                              borderRadius: tokens.borderRadius.md,
                              backgroundColor: tokens.colors.primary[100],
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <i className={getPaymentMethodIcon(method)} style={{ color: tokens.colors.primary.DEFAULT }} />
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: tokens.typography.fontSize.base[0],
                                fontWeight: tokens.typography.fontWeight.semibold,
                                color: tokens.colors.text.primary,
                              }}
                            >
                              {method.replace('_', ' ')}
                            </div>
                            <div
                              style={{
                                fontSize: tokens.typography.fontSize['2xl'][0],
                                fontWeight: tokens.typography.fontWeight.bold,
                                color: tokens.colors.text.primary,
                              }}
                            >
                              {count}
                            </div>
                            <div
                              style={{
                                fontSize: tokens.typography.fontSize.sm[0],
                                color: tokens.colors.text.secondary,
                              }}
                            >
                              transactions
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </Card>

              {/* Revenue by Month */}
              <Card>
                <h2
                  style={{
                    fontSize: tokens.typography.fontSize.xl[0],
                    fontWeight: tokens.typography.fontWeight.bold,
                    color: tokens.colors.text.primary,
                    marginBottom: tokens.spacing[6],
                  }}
                >
                  Revenue by Month
                </h2>
                {Object.keys(analytics.revenueByMonth).length === 0 ? (
                  <EmptyState
                    icon="📊"
                    title="No Monthly Data"
                    description="No monthly revenue data available"
                  />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: tokens.spacing[4],
                    }}
                  >
                    {Object.entries(analytics.revenueByMonth).map(([month, revenue]) => (
                      <Card key={month}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: tokens.spacing[3],
                            }}
                          >
                            <div
                              style={{
                                width: '2.5rem',
                                height: '2.5rem',
                                borderRadius: tokens.borderRadius.md,
                                backgroundColor: tokens.colors.primary[100],
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <i className="fas fa-calendar" style={{ color: tokens.colors.primary.DEFAULT }} />
                            </div>
                            <div>
                              <div
                                style={{
                                  fontSize: tokens.typography.fontSize.base[0],
                                  fontWeight: tokens.typography.fontWeight.semibold,
                                  color: tokens.colors.text.primary,
                                }}
                              >
                                {month}
                              </div>
                              <div
                                style={{
                                  fontSize: tokens.typography.fontSize.sm[0],
                                  color: tokens.colors.text.secondary,
                                }}
                              >
                                Monthly revenue
                              </div>
                            </div>
                          </div>
                          <div
                            style={{
                              fontSize: tokens.typography.fontSize['2xl'][0],
                              fontWeight: tokens.typography.fontWeight.bold,
                              color: tokens.colors.text.primary,
                            }}
                          >
                            {formatCurrency(revenue)}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </Card>

              {/* Performance Metrics */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: tokens.spacing[6],
                }}
              >
                <StatCard
                  label="Conversion Rate"
                  value={`${analytics.conversionRate.toFixed(1)}%`}
                  icon={<i className="fas fa-percentage" />}
                />
                <StatCard
                  label="Refund Rate"
                  value={`${analytics.refundRate.toFixed(1)}%`}
                  icon={<i className="fas fa-undo" />}
                />
                <StatCard
                  label="Churn Rate"
                  value={`${analytics.churnRate.toFixed(1)}%`}
                  icon={<i className="fas fa-user-times" />}
                />
              </div>
            </div>
          </TabPanel>

          <TabPanel id="customers">
            <Card>
              <h2
                style={{
                  fontSize: tokens.typography.fontSize.xl[0],
                  fontWeight: tokens.typography.fontWeight.bold,
                  color: tokens.colors.text.primary,
                  marginBottom: tokens.spacing[6],
                }}
              >
                Top Customers
              </h2>
              {analytics.topCustomers.length === 0 ? (
                <EmptyState
                  icon="👥"
                  title="No Customer Data"
                  description="No customer data available"
                />
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: tokens.spacing[4],
                  }}
                >
                  {analytics.topCustomers.map((customer, index) => (
                    <Card key={customer.email}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: tokens.spacing[4],
                          }}
                        >
                          <div
                            style={{
                              width: '3rem',
                              height: '3rem',
                              borderRadius: tokens.borderRadius.lg,
                              backgroundColor: tokens.colors.primary[100],
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <span
                              style={{
                                fontSize: tokens.typography.fontSize.lg[0],
                                fontWeight: tokens.typography.fontWeight.bold,
                                color: tokens.colors.primary.DEFAULT,
                              }}
                            >
                              #{index + 1}
                            </span>
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: tokens.typography.fontSize.base[0],
                                fontWeight: tokens.typography.fontWeight.semibold,
                                color: tokens.colors.text.primary,
                              }}
                            >
                              {customer.email}
                            </div>
                            <div
                              style={{
                                fontSize: tokens.typography.fontSize.sm[0],
                                color: tokens.colors.text.secondary,
                              }}
                            >
                              {customer.paymentCount} payments
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div
                            style={{
                              fontSize: tokens.typography.fontSize['2xl'][0],
                              fontWeight: tokens.typography.fontWeight.bold,
                              color: tokens.colors.text.primary,
                            }}
                          >
                            {formatCurrency(customer.totalSpent)}
                          </div>
                          <div
                            style={{
                              fontSize: tokens.typography.fontSize.sm[0],
                              color: tokens.colors.text.secondary,
                            }}
                          >
                            Total spent
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabPanel>

          <TabPanel id="reports">
            <Card>
              <EmptyState
                icon="📄"
                title="Reports Coming Soon"
                description="Financial reports and detailed analytics export will be available here"
              />
            </Card>
          </TabPanel>
        </Tabs>
      </Card>
    </AppShell>
  );
}

