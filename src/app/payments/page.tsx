/**
 * Payments Page - Enterprise Control Surface
 * 
 * Finance-grade payments dashboard. Calm, authoritative, legible.
 * Zero legacy styling - all through components and tokens.
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  PageHeader,
  Card,
  Button,
  Select,
  Input,
  Badge,
  StatCard,
  Table,
  TableColumn,
  Skeleton,
  EmptyState,
  MobileFilterBar,
  Flex,
  Grid,
  GridCol,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';
import { useMobile } from '@/lib/use-mobile';

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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [kpis, setKpis] = useState({
    totalCollected: 0,
    pendingCount: 0,
    pendingAmount: 0,
    failedCount: 0,
    failedAmount: 0,
    refundedAmount: 0,
  });
  const [comparison, setComparison] = useState<{
    previousPeriodTotal: number;
    periodComparison: number;
    isPositive: boolean;
  } | null>(null);
  const isMobile = useMobile();
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
  }, [selectedTimeRange, statusFilter, searchTerm]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        timeRange: selectedTimeRange.value,
        status: statusFilter,
        search: searchTerm,
      });
      
      const response = await fetch(`/api/payments?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch payment data');
      }
      const data = await response.json();
      
      // Convert charges to Payment format and update state
      const payments = (data.payments || []).map((p: any) => ({
        ...p,
        created: new Date(p.created),
      }));
      
      // Update KPIs and comparison from API response
      if (data.kpis) {
        setKpis(data.kpis);
      }
      if (data.comparison) {
        setComparison(data.comparison);
      }
      
      // Calculate derived metrics
      const totalRevenue = data.kpis?.totalCollected || 0;
      const monthlyTotal = data.revenueByMonth 
        ? Object.values(data.revenueByMonth).reduce((sum: number, val: any) => sum + val, 0)
        : 0;
      
      // Calculate weekly and daily revenue from revenueByDay
      const now = new Date();
      const weekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
      const dayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
      
      const weeklyRevenue = data.revenueByDay
        ? Object.entries(data.revenueByDay as Record<string, number>)
            .filter(([day]) => new Date(day) >= weekAgo)
            .reduce((sum, [, amount]) => sum + (typeof amount === 'number' ? amount : 0), 0)
        : 0;
      
      const dailyRevenue = data.revenueByDay
        ? Object.entries(data.revenueByDay as Record<string, number>)
            .filter(([day]) => new Date(day) >= dayAgo)
            .reduce((sum, [, amount]) => sum + (typeof amount === 'number' ? amount : 0), 0)
        : 0;
      
      // Calculate payment methods breakdown
      const paymentMethods: Record<string, number> = {};
      payments.forEach((p: any) => {
        const method = p.paymentMethod || 'card';
        paymentMethods[method] = (paymentMethods[method] || 0) + 1;
      });
      
      setAnalytics({
        totalRevenue,
        totalCustomers: data.topCustomers?.length || 0,
        totalInvoices: payments.length,
        recentPayments: payments,
        monthlyRevenue: monthlyTotal,
        weeklyRevenue,
        dailyRevenue,
        averagePayment: payments.length > 0 ? totalRevenue / payments.length : 0,
        paymentMethods,
        revenueByMonth: data.revenueByMonth || {},
        topCustomers: data.topCustomers || [],
        conversionRate: 0, // Not available from charges
        refundRate: data.kpis?.refundedCount > 0 && payments.length > 0
          ? (data.kpis.refundedCount / payments.length) * 100
          : 0,
        churnRate: 0, // Not available from charges
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams({
        timeRange: selectedTimeRange.value,
        type: 'all',
      });
      
      const response = await fetch(`/api/payments/export?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to export payments');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payments-export-${selectedTimeRange.value}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export payments');
    }
  };

  const filteredPayments = useMemo(() => {
    let filtered = analytics.recentPayments || [];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => {
        const normalizedStatus = p.status.toLowerCase();
        if (statusFilter === 'paid') {
          return normalizedStatus === 'paid' || normalizedStatus === 'succeeded';
        }
        if (statusFilter === 'pending') {
          return normalizedStatus === 'pending' || normalizedStatus === 'processing';
        }
        if (statusFilter === 'failed') {
          return (
            normalizedStatus === 'failed' ||
            normalizedStatus === 'canceled' ||
            normalizedStatus === 'requires_payment_method'
          );
        }
        if (statusFilter === 'refunded') {
          return normalizedStatus === 'refunded';
        }
        return true;
      });
    }

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.customerEmail.toLowerCase().includes(term) ||
          (p.customerName && p.customerName.toLowerCase().includes(term)) ||
          p.id.toLowerCase().includes(term) ||
          (p.description && p.description.toLowerCase().includes(term))
      );
    }

    // Sort by date (newest first)
    filtered = [...filtered].sort((a, b) => {
      const dateA = new Date(a.created).getTime();
      const dateB = new Date(b.created).getTime();
      return dateB - dateA;
    });

    return filtered;
  }, [analytics.recentPayments, statusFilter, searchTerm]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadgeVariant = (status: string): 'default' | 'success' | 'warning' | 'error' => {
    const normalized = status.toLowerCase();
    if (normalized === 'paid' || normalized === 'succeeded') return 'success';
    if (normalized === 'pending' || normalized === 'processing') return 'warning';
    if (
      normalized === 'failed' ||
      normalized === 'canceled' ||
      normalized === 'requires_payment_method'
    )
      return 'error';
    if (normalized === 'refunded') return 'default';
    return 'default';
  };

  const getStatusLabel = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized === 'succeeded') return 'Paid';
    if (normalized === 'requires_payment_method') return 'Failed';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getPaymentMethodLabel = (method?: string) => {
    if (!method) return 'Card';
    return method
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const paymentColumns: TableColumn<Payment>[] = [
    {
      key: 'client',
      header: 'Client',
      mobileLabel: 'Client',
      mobileOrder: 1,
      render: (payment) => (
        <div>
          <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
            {payment.customerName || payment.customerEmail}
          </div>
          {payment.customerName && (
            <div
              style={{
                fontSize: tokens.typography.fontSize.sm[0],
                color: tokens.colors.text.secondary,
              }}
            >
              {payment.customerEmail}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      mobileLabel: 'Amount',
      mobileOrder: 2,
      align: 'right',
      render: (payment) => (
        <div style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
          {formatCurrency(payment.amount)}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      mobileLabel: 'Status',
      mobileOrder: 3,
      render: (payment) => (
        <Badge variant={getStatusBadgeVariant(payment.status)}>
          {getStatusLabel(payment.status)}
        </Badge>
      ),
      align: 'center',
    },
    {
      key: 'reference',
      header: 'Invoice',
      mobileLabel: 'Invoice #',
      mobileOrder: 4,
      render: (payment) => (
        <div
          style={{
            fontSize: tokens.typography.fontSize.sm[0],
            color: tokens.colors.text.secondary,
            fontFamily: tokens.typography.fontFamily.mono.join(', '),
          }}
        >
          #{payment.id.slice(-8).toUpperCase()}
        </div>
      ),
    },
    {
      key: 'method',
      header: 'Method',
      mobileLabel: 'Payment Method',
      mobileOrder: 5,
      render: (payment) => (
        <div style={{ fontSize: tokens.typography.fontSize.sm[0] }}>
          {getPaymentMethodLabel(payment.paymentMethod)}
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      mobileLabel: 'Date',
      mobileOrder: 6,
      render: (payment) => (
        <div style={{ fontSize: tokens.typography.fontSize.sm[0] }}>
          {formatDateTime(payment.created)}
        </div>
      ),
    },
  ];

  if (loading && analytics.recentPayments.length === 0) {
    return (
      <AppShell>
        <PageHeader
          title="Payments"
          description="Payment transactions and revenue overview"
        />
        <div style={{ marginBottom: tokens.spacing[4] }}>
          <Grid gap={2}> {/* Batch 5: UI Constitution compliance */}
            <GridCol span={12} md={6} lg={3}>
              <Skeleton height="120px" />
            </GridCol>
            <GridCol span={12} md={6} lg={3}>
              <Skeleton height="120px" />
            </GridCol>
            <GridCol span={12} md={6} lg={3}>
              <Skeleton height="120px" />
            </GridCol>
            <GridCol span={12} md={6} lg={3}>
              <Skeleton height="120px" />
            </GridCol>
          </Grid>
        </div>
        <Card>
          <Skeleton height="400px" />
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Payments"
        description="Payment transactions and revenue overview"
        actions={
          <Select
            options={timeRanges.map((r) => ({ value: r.value, label: r.label }))}
            value={selectedTimeRange.value}
            onChange={(e) => {
              const range = timeRanges.find((r) => r.value === e.target.value);
              if (range) setSelectedTimeRange(range);
            }}
            style={{ minWidth: '150px' }}
          />
        }
      />

      {error && (
        <Card
          style={{
            marginBottom: tokens.spacing[6],
            borderColor: tokens.colors.error.DEFAULT,
            backgroundColor: tokens.colors.error[50],
          }}
        >
          <Flex align="center" justify="space-between">
            <Flex align="center" gap={3} style={{ color: tokens.colors.error.DEFAULT }}>
              <i className="fas fa-exclamation-circle" />
              <span>{error}</span>
            </Flex>
            <Button variant="secondary" size="sm" onClick={fetchAnalytics}>
              Retry
            </Button>
          </Flex>
        </Card>
      )}

      {/* Comparison Banner */}
      {comparison && !isMobile && (
        <Card style={{ marginBottom: tokens.spacing[4], backgroundColor: comparison.isPositive ? tokens.colors.success[50] : tokens.colors.error[50] }}>
          <div style={{ padding: tokens.spacing[4] }}>
            <Flex align="center" justify="space-between">
            <div>
              <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                {selectedTimeRange.label} vs Previous Period
              </div>
              <div style={{ fontSize: tokens.typography.fontSize.lg[0], fontWeight: tokens.typography.fontWeight.bold }}>
                {comparison.isPositive ? '+' : ''}{comparison.periodComparison.toFixed(1)}%
              </div>
              <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                Previous: {formatCurrency(comparison.previousPeriodTotal)} → Current: {formatCurrency(kpis.totalCollected)}
              </div>
            </div>
            <div style={{ fontSize: '2rem' }}>
              {comparison.isPositive ? '📈' : '📉'}
            </div>
            </Flex>
          </div>
        </Card>
      )}

      {/* KPI Summary Row - Phase E: Match Dashboard density */}
      <div style={{ marginBottom: isMobile ? tokens.spacing[4] : tokens.spacing[4] }}>
        <Grid gap={isMobile ? 3 : 2}> {/* Batch 5: UI Constitution compliance */}
          <GridCol span={12} md={6} lg={3}>
            <StatCard
              label="Total Collected"
              value={formatCurrency(kpis.totalCollected)}
              icon={<i className="fas fa-dollar-sign" />}
            />
          </GridCol>
          <GridCol span={12} md={6} lg={3}>
            <StatCard
              label="Pending Payments"
              value={`${kpis.pendingCount} (${formatCurrency(kpis.pendingAmount)})`}
              icon={<i className="fas fa-clock" />}
            />
          </GridCol>
          <GridCol span={12} md={6} lg={3}>
            <StatCard
              label="Failed Payments"
              value={`${kpis.failedCount} (${formatCurrency(kpis.failedAmount)})`}
              icon={<i className="fas fa-exclamation-triangle" />}
            />
          </GridCol>
          <GridCol span={12} md={6} lg={3}>
            <StatCard
              label="Refunded"
              value={formatCurrency(kpis.refundedAmount || 0)}
              icon={<i className="fas fa-undo" />}
            />
          </GridCol>
        </Grid>
      </div>

      {/* Mobile Export Button */}
      {isMobile && (
        <Card style={{ marginBottom: tokens.spacing[4] }}>
          <Button
            variant="secondary"
            style={{ width: '100%' }}
            leftIcon={<i className="fas fa-download" />}
            onClick={handleExportCSV}
          >
            Export CSV
          </Button>
        </Card>
      )}

      {/* Filters - Phase E: Match Bookings density */}
      <Card
        style={{
          marginBottom: isMobile ? tokens.spacing[4] : tokens.spacing[4], // Phase E: Tighter spacing to match Bookings
          padding: isMobile ? tokens.spacing[3] : undefined,
        }}
      >
        <Flex direction={isMobile ? 'column' : 'row'} gap={isMobile ? 3 : 4}> {/* Batch 5: UI Constitution compliance */}
          <Input
            placeholder="Search by client, email, or invoice..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<i className="fas fa-search" />}
            style={{ width: isMobile ? '100%' : 'auto', flex: isMobile ? 'none' : 1 }}
          />
          {isMobile ? (
            <MobileFilterBar
              activeFilter={statusFilter}
              onFilterChange={(filterId) => setStatusFilter(filterId)}
              options={[
                { id: 'all', label: 'All' },
                { id: 'paid', label: 'Paid' },
                { id: 'pending', label: 'Pending' },
                { id: 'failed', label: 'Failed' },
                { id: 'refunded', label: 'Refunded' },
              ]}
            />
          ) : (
            <Select
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'paid', label: 'Paid' },
                { value: 'pending', label: 'Pending' },
                { value: 'failed', label: 'Failed' },
                { value: 'refunded', label: 'Refunded' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: 'auto', minWidth: '200px' }}
              />
          )}
        </Flex>
      </Card>

      {/* Payments Table */}
      <Card padding={!loading}>
        {loading ? (
          <Skeleton height="400px" />
        ) : filteredPayments.length === 0 ? (
          <EmptyState
            icon="💳"
            title="No payments found"
            description={
              searchTerm || statusFilter !== 'all'
                ? undefined // Phase E: Neutral, operational - no friendly guidance
                : undefined // Phase E: Neutral, operational - remove onboarding tone
            }
          />
        ) : (
          <Table
            columns={paymentColumns}
            data={filteredPayments}
            emptyMessage="No payments found"
            keyExtractor={(payment) => payment.id}
          />
        )}
      </Card>
    </AppShell>
  );
}

