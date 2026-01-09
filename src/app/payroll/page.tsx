/**
 * Payroll Page - Enterprise Rebuild
 * 
 * Complete payroll management system with:
 * - Commission split rules
 * - Pay period breakdown
 * - Owner approvals
 * - Sitter payroll view
 */

'use client';

import { useState, useEffect } from 'react';
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Table,
  TableColumn,
  Select,
  Input,
  StatCard,
  Skeleton,
  EmptyState,
  Modal,
  Tabs,
  TabPanel,
  MobileFilterBar,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';
import { useMobile } from '@/lib/use-mobile';

interface PayPeriod {
  id: string;
  sitterId: string;
  sitterName?: string;
  startDate: Date | string;
  endDate: Date | string;
  status: 'pending' | 'calculated' | 'approved' | 'paid' | 'cancelled';
  totalEarnings: number;
  commissionAmount: number;
  fees: number;
  netPayout: number;
  bookingCount: number;
  createdAt: Date | string;
  approvedAt?: Date | string;
  paidAt?: Date | string;
  approvedBy?: string;
}

interface BookingEarning {
  bookingId: string;
  bookingDate: Date | string;
  service: string;
  totalPrice: number;
  commissionPercentage: number;
  commissionAmount: number;
  status: 'completed' | 'cancelled';
}

export default function PayrollPage() {
  const isMobile = useMobile();
  const [payPeriods, setPayPeriods] = useState<PayPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayPeriod, setSelectedPayPeriod] = useState<PayPeriod | null>(null);
  const [selectedBookings, setSelectedBookings] = useState<BookingEarning[]>([]);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approving, setApproving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPayPeriod, setFilterPayPeriod] = useState<string>('biweekly');
  const [activeTab, setActiveTab] = useState<'overview' | 'periods' | 'sitters'>('periods');

  useEffect(() => {
    fetchPayroll();
  }, [filterStatus, filterPayPeriod]);

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterPayPeriod) params.append('payPeriod', filterPayPeriod);

      const response = await fetch(`/api/payroll?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch payroll data');
      }

      const data = await response.json();
      setPayPeriods(data.payPeriods || []);
    } catch (error) {
      console.error('Failed to fetch payroll:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (payPeriod: PayPeriod) => {
    setSelectedPayPeriod(payPeriod);
    // Fetch booking details for this pay period
    try {
      const response = await fetch(`/api/payroll/${payPeriod.id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedBookings(data.bookings || []);
      }
    } catch (error) {
      console.error('Failed to fetch pay period details:', error);
    }
  };

  const handleApprove = async () => {
    if (!selectedPayPeriod) return;

    setApproving(true);
    try {
      const response = await fetch(`/api/payroll/${selectedPayPeriod.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy: 'owner' }),
      });

      if (response.ok) {
        setShowApprovalModal(false);
        fetchPayroll();
      }
    } catch (error) {
      console.error('Failed to approve pay period:', error);
    } finally {
      setApproving(false);
    }
  };

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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
      pending: 'warning',
      calculated: 'default',
      approved: 'success',
      paid: 'success',
      cancelled: 'error',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  // Calculate totals
  const totalPending = payPeriods
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + p.netPayout, 0);
  const totalApproved = payPeriods
    .filter((p) => p.status === 'approved')
    .reduce((sum, p) => sum + p.netPayout, 0);
  const totalPaid = payPeriods
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.netPayout, 0);

  const payPeriodColumns: TableColumn<PayPeriod>[] = [
    {
      key: 'sitter',
      header: 'Sitter',
      render: (period) => (
        <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
          {period.sitterName || `Sitter ${period.sitterId.slice(0, 8)}`}
        </div>
      ),
    },
    {
      key: 'period',
      header: 'Pay Period',
      render: (period) => (
        <div>
          {formatDate(period.startDate)} - {formatDate(period.endDate)}
        </div>
      ),
    },
    {
      key: 'bookings',
      header: 'Bookings',
      render: (period) => <div>{period.bookingCount}</div>,
      align: 'center',
    },
    {
      key: 'earnings',
      header: 'Total Earnings',
      render: (period) => <div>{formatCurrency(period.totalEarnings)}</div>,
      align: 'right',
    },
    {
      key: 'commission',
      header: 'Commission',
      render: (period) => <div>{formatCurrency(period.commissionAmount)}</div>,
      align: 'right',
    },
    {
      key: 'fees',
      header: 'Fees',
      render: (period) => <div>{formatCurrency(period.fees)}</div>,
      align: 'right',
    },
    {
      key: 'payout',
      header: 'Net Payout',
      render: (period) => (
        <div style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
          {formatCurrency(period.netPayout)}
        </div>
      ),
      align: 'right',
    },
    {
      key: 'status',
      header: 'Status',
      render: (period) => getStatusBadge(period.status),
      align: 'center',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (period) => (
        <div style={{ display: 'flex', gap: tokens.spacing[2] }}>
          <Button
            variant="tertiary"
            size="sm"
            onClick={() => handleViewDetails(period)}
          >
            View
          </Button>
          {period.status === 'pending' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setSelectedPayPeriod(period);
                setShowApprovalModal(true);
              }}
            >
              Approve
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Payroll"
        description="Manage sitter commissions and payouts"
        actions={
          <Button
            variant="primary"
            onClick={fetchPayroll}
            disabled={loading}
            leftIcon={<i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`} />}
          >
            Refresh
          </Button>
        }
      />

      <div style={{ padding: tokens.spacing[6] }}>
        {/* Overview Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: tokens.spacing[4],
            marginBottom: tokens.spacing[6],
          }}
        >
          <StatCard
            label="Pending Payouts"
            value={formatCurrency(totalPending)}
            icon={<i className="fas fa-clock" />}
          />
          <StatCard
            label="Approved"
            value={formatCurrency(totalApproved)}
            icon={<i className="fas fa-check-circle" />}
          />
          <StatCard
            label="Total Paid"
            value={formatCurrency(totalPaid)}
            icon={<i className="fas fa-dollar-sign" />}
          />
          <StatCard
            label="Pay Periods"
            value={payPeriods.length}
            icon={<i className="fas fa-calendar" />}
          />
        </div>

        {/* Filters */}
        <Card style={{ marginBottom: tokens.spacing[6] }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: tokens.spacing[4],
            }}
          >
            {isMobile ? (
              <MobileFilterBar
                activeFilter={filterStatus}
                onFilterChange={(filterId) => setFilterStatus(filterId)}
                options={[
                  { id: 'all', label: 'All' },
                  { id: 'pending', label: 'Pending' },
                  { id: 'approved', label: 'Approved' },
                  { id: 'paid', label: 'Paid' },
                ]}
              />
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: tokens.spacing[4],
                }}
              >
                <Select
                  label="Status"
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'approved', label: 'Approved' },
                    { value: 'paid', label: 'Paid' },
                  ]}
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                />
              </div>
            )}
            <Select
              label="Pay Period"
              options={[
                { value: 'weekly', label: 'Weekly' },
                { value: 'biweekly', label: 'Biweekly' },
                { value: 'monthly', label: 'Monthly' },
              ]}
              value={filterPayPeriod}
              onChange={(e) => setFilterPayPeriod(e.target.value)}
            />
          </div>
        </Card>

        {/* Pay Periods Table */}
        {loading ? (
          <Card>
            <Skeleton height={400} />
          </Card>
        ) : payPeriods.length === 0 ? (
          <Card>
            <EmptyState
              icon="💰"
              title="No pay periods found"
              description="Pay periods will appear here once bookings are completed"
            />
          </Card>
        ) : (
          <Card padding={false}>
            <Table
              columns={payPeriodColumns}
              data={payPeriods}
              emptyMessage="No pay periods found"
            />
          </Card>
        )}
      </div>

      {/* Pay Period Details Modal */}
      {selectedPayPeriod && (
        <Modal
          isOpen={!!selectedPayPeriod}
          onClose={() => {
            setSelectedPayPeriod(null);
            setSelectedBookings([]);
          }}
          title={`Pay Period Details - ${formatDate(selectedPayPeriod.startDate)} to ${formatDate(selectedPayPeriod.endDate)}`}
          size="lg"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: tokens.spacing[4],
              }}
            >
              <Card>
                <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                  Total Earnings
                </div>
                <div style={{ fontSize: tokens.typography.fontSize.xl[0], fontWeight: tokens.typography.fontWeight.bold }}>
                  {formatCurrency(selectedPayPeriod.totalEarnings)}
                </div>
              </Card>
              <Card>
                <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                  Net Payout
                </div>
                <div style={{ fontSize: tokens.typography.fontSize.xl[0], fontWeight: tokens.typography.fontWeight.bold, color: tokens.colors.success.DEFAULT }}>
                  {formatCurrency(selectedPayPeriod.netPayout)}
                </div>
              </Card>
            </div>

            {selectedBookings.length > 0 && (
              <div>
                <div style={{ fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[3] }}>
                  Booking Breakdown ({selectedBookings.length} bookings)
                </div>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {selectedBookings.map((booking) => (
                    <Card key={booking.bookingId} style={{ marginBottom: tokens.spacing[2] }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
                            {booking.service}
                          </div>
                          <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                            {formatDate(booking.bookingDate)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div>{formatCurrency(booking.totalPrice)}</div>
                          <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                            {formatCurrency(booking.commissionAmount)} ({booking.commissionPercentage}%)
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Approval Modal */}
      <Modal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        title="Approve Pay Period"
        size="md"
      >
        {selectedPayPeriod && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            <div>
              <div style={{ marginBottom: tokens.spacing[2] }}>
                Approve payout of <strong>{formatCurrency(selectedPayPeriod.netPayout)}</strong> to{' '}
                {selectedPayPeriod.sitterName || `Sitter ${selectedPayPeriod.sitterId.slice(0, 8)}`}?
              </div>
              <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                Period: {formatDate(selectedPayPeriod.startDate)} - {formatDate(selectedPayPeriod.endDate)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: tokens.spacing[3] }}>
              <Button
                variant="primary"
                onClick={handleApprove}
                disabled={approving}
                style={{ flex: 1 }}
              >
                {approving ? 'Approving...' : 'Approve'}
              </Button>
              <Button
                variant="tertiary"
                onClick={() => setShowApprovalModal(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}

