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
      
      // Convert date strings to Date objects
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
    
    // Upcoming payouts: For now, use pending amount as proxy
    // In a real implementation, this would come from payout schedule
    const upcomingPayouts = pendingAmount;

    return {
      totalCollected,
      pendingCount,
      pendingAmount,
      failedCount,
      failedAmount,
      upcomingPayouts,
    };
  }, [analytics.recentPayments]);

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
      key: 'reference',
      header: 'Invoice',
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
      key: 'amount',
      header: 'Amount',
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
      render: (payment) => (
        <Badge variant={getStatusBadgeVariant(payment.status)}>
          {getStatusLabel(payment.status)}
        </Badge>
      ),
      align: 'center',
    },
    {
      key: 'method',
      header: 'Method',
      render: (payment) => (
        <div style={{ fontSize: tokens.typography.fontSize.sm[0] }}>
          {getPaymentMethodLabel(payment.paymentMethod)}
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (payment) => (
        <div style={{ fontSize: tokens.typography.fontSize.sm[0] }}>
          {formatDateTime(payment.created)}
        </div>
      ),
    },
  ];

  if (loading && analytics.recentPayments.length === 0) {
    return (
      <AppShell physiology="analytical">
        <PageHeader
          title="Payments"
          description="Payment transactions and revenue overview"
        />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: tokens.spacing[5], // Tighter spacing for analytical
            marginBottom: tokens.spacing[6],
          }}
        >
          <Skeleton height="120px" />
          <Skeleton height="120px" />
          <Skeleton height="120px" />
          <Skeleton height="120px" />
        </div>
        <Card depth="elevated">
          <Skeleton height="400px" />
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell physiology="analytical">
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
                color: tokens.colors.error.DEFAULT,
              }}
            >
              <i className="fas fa-exclamation-circle" />
              <span>{error}</span>
            </div>
            <Button variant="secondary" size="sm" onClick={fetchAnalytics}>
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* KPI Summary Row - Analytical: tighter spacing, sharper posture */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: tokens.spacing[5], // Tighter spacing for analytical
          marginBottom: tokens.spacing[6],
        }}
      >
        <StatCard
          label="Total Collected"
          value={formatCurrency(kpis.totalCollected)}
          icon={<i className="fas fa-dollar-sign" />}
        />
        <StatCard
          label="Pending Payments"
          value={`${kpis.pendingCount} (${formatCurrency(kpis.pendingAmount)})`}
          icon={<i className="fas fa-clock" />}
        />
        <StatCard
          label="Failed Payments"
          value={`${kpis.failedCount} (${formatCurrency(kpis.failedAmount)})`}
          icon={<i className="fas fa-exclamation-triangle" />}
        />
        <StatCard
          label="Upcoming Payouts"
          value={formatCurrency(kpis.upcomingPayouts)}
          icon={<i className="fas fa-arrow-up" />}
        />
      </div>

      {/* Filters - Analytical: tighter spacing */}
      <Card
        depth="elevated"
        style={{
          marginBottom: tokens.spacing[6],
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: tokens.spacing[3], // Tighter spacing for analytical
          }}
        >
          <Input
            placeholder="Search by client, email, or invoice..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<i className="fas fa-search" />}
          />
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
          />
        </div>
      </Card>

      {/* Payments Table - Analytical: elastic, responsive */}
      <Card depth="elevated" padding={!loading}>
        {loading ? (
          <Skeleton height="400px" />
        ) : filteredPayments.length === 0 ? (
          <EmptyState
            icon="💳"
            title="No payments found"
            description={
              searchTerm || statusFilter !== 'all'
                ? 'No payments match your filters. Try adjusting your search or filters.'
                : 'Payment transactions will appear here once customers make payments.'
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

