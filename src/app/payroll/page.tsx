/**
 * Payroll Page - Owner view
 *
 * Single source of truth: Booking → PayoutTransfer → Ledger.
 * Shows payroll runs (weekly from PayoutTransfer), summary, approve, export.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Table,
  TableColumn,
  StatCard,
  Skeleton,
  EmptyState,
  Modal,
  Flex,
  Grid,
  GridCol,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';
import { useMobile } from '@/lib/use-mobile';

interface PayrollRunListItem {
  id: string;
  startDate: string;
  endDate: string;
  sitterCount: number;
  totalPayout: number;
  status: string;
}

interface PayrollRunDetail {
  run: {
    id: string;
    startDate: string;
    endDate: string;
    status: string;
    totalPayout: number;
  };
  sitters: Array<{
    sitterId: string;
    sitterName: string;
    bookingCount: number;
    earnings: number;
    commission: number;
    payoutAmount: number;
    stripeAccount: boolean;
  }>;
  bookings: Array<{
    bookingId: string;
    bookingDate: string;
    service: string;
    totalPrice: number;
    commissionPercentage: number;
    commissionAmount: number;
    status: string;
  }>;
}

export default function PayrollPage() {
  const isMobile = useMobile();
  const [runs, setRuns] = useState<PayrollRunListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PayrollRunDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [runToApprove, setRunToApprove] = useState<PayrollRunListItem | null>(null);
  const [approving, setApproving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const fetchPayroll = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      const response = await fetch(`/api/payroll?${params}`);
      if (!response.ok) throw new Error('Failed to fetch payroll');
      const data = await response.json();
      setRuns(data.payPeriods || []);
    } catch (error) {
      console.error('Failed to fetch payroll:', error);
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchPayroll();
  }, [fetchPayroll]);

  const handleViewDetails = useCallback(async (run: PayrollRunListItem) => {
    setSelectedRunId(run.id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/payroll/${run.id}`);
      if (response.ok) {
        const data = await response.json();
        setDetail(data as PayrollRunDetail);
      }
    } catch (error) {
      console.error('Failed to fetch run details:', error);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleApprove = async () => {
    if (!selectedRunId) return;
    setApproving(true);
    try {
      const response = await fetch(`/api/payroll/${selectedRunId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy: 'owner' }),
      });
      if (response.ok) {
        setShowApprovalModal(false);
        setRunToApprove(null);
        setSelectedRunId(null);
        setDetail(null);
        fetchPayroll();
      } else {
        const json = await response.json().catch(() => ({}));
        alert(json.error || 'Failed to approve');
      }
    } catch (error) {
      console.error('Failed to approve:', error);
      alert('Failed to approve. Please try again.');
    } finally {
      setApproving(false);
    }
  };

  const handleExportCSV = useCallback(async (runId?: string) => {
    try {
      const params = runId ? new URLSearchParams({ runId }) : new URLSearchParams();
      const response = await fetch(`/api/payroll/export?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to export payroll');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export payroll:', error);
      alert('Failed to export payroll. Please try again.');
    }
  }, []);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
      draft: 'default',
      pending: 'warning',
      approved: 'success',
      paid: 'success',
      canceled: 'error',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const filteredRuns = filterStatus === 'all' ? runs : runs.filter((r) => r.status === filterStatus);
  const totalPending = runs.filter((r) => r.status === 'pending' || r.status === 'draft').reduce((s, r) => s + r.totalPayout, 0);
  const totalApproved = runs.filter((r) => r.status === 'approved').reduce((s, r) => s + r.totalPayout, 0);
  const totalPaid = runs.filter((r) => r.status === 'paid').reduce((s, r) => s + r.totalPayout, 0);
  const currentRun = runs[0] ?? null;

  const runColumns: TableColumn<PayrollRunListItem>[] = [
    {
      key: 'period',
      header: 'Pay Period',
      render: (r) => (
        <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
          {formatDate(r.startDate)} – {formatDate(r.endDate)}
        </div>
      ),
    },
    { key: 'sitters', header: 'Sitters', render: (r) => r.sitterCount, align: 'center' as const },
    {
      key: 'payout',
      header: 'Total Payout',
      render: (r) => (
        <div style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
          {formatCurrency(r.totalPayout)}
        </div>
      ),
      align: 'right' as const,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => getStatusBadge(r.status),
      align: 'center' as const,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <Flex gap={2}>
          <Button variant="tertiary" size="sm" onClick={() => handleViewDetails(r)}>
            View
          </Button>
          {r.status === 'pending' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setRunToApprove(r);
                setSelectedRunId(r.id);
                setShowApprovalModal(true);
              }}
            >
              Approve
            </Button>
          )}
          <Button
            variant="tertiary"
            size="sm"
            onClick={() => handleExportCSV(r.id)}
            leftIcon={<i className="fas fa-download" />}
          >
            Export
          </Button>
        </Flex>
      ),
    },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Payroll"
        description="Manage sitter commissions and payouts"
        actions={
          <Flex gap={3}>
            <Button
              variant="secondary"
              leftIcon={<i className="fas fa-download" />}
              onClick={() => handleExportCSV()}
            >
              Export CSV
            </Button>
            <Button
              variant="primary"
              onClick={fetchPayroll}
              disabled={loading}
              leftIcon={<i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`} />}
            >
              Refresh
            </Button>
          </Flex>
        }
      />

      <div style={{ padding: tokens.spacing[6] }}>
        {/* Top Summary */}
        <div style={{ marginBottom: tokens.spacing[6] }}>
          <Grid gap={4}>
            <GridCol span={12} md={6} lg={3}>
              <StatCard
                label="Current Pay Period"
                value={
                  currentRun
                    ? `${formatDate(currentRun.startDate)} – ${formatDate(currentRun.endDate)}`
                    : '—'
                }
                icon={<i className="fas fa-calendar" />}
              />
            </GridCol>
            <GridCol span={12} md={6} lg={3}>
              <StatCard
                label="Total Sitters"
                value={(currentRun?.sitterCount) ?? (runs.reduce((s, r) => s + r.sitterCount, 0) || 0)}
                icon={<i className="fas fa-users" />}
              />
            </GridCol>
            <GridCol span={12} md={6} lg={3}>
              <StatCard
                label="Total Payout"
                value={formatCurrency(runs.reduce((s, r) => s + r.totalPayout, 0))}
                icon={<i className="fas fa-dollar-sign" />}
              />
            </GridCol>
            <GridCol span={12} md={6} lg={3}>
              <StatCard
                label="Status"
                value={currentRun?.status ?? '—'}
                icon={<i className="fas fa-info-circle" />}
              />
            </GridCol>
          </Grid>
        </div>

        <div style={{ marginBottom: tokens.spacing[4] }}>
          <Flex gap={4} wrap>
            <StatCard label="Pending Payouts" value={formatCurrency(totalPending)} icon={<i className="fas fa-clock" />} />
            <StatCard label="Approved" value={formatCurrency(totalApproved)} icon={<i className="fas fa-check-circle" />} />
            <StatCard label="Total Paid" value={formatCurrency(totalPaid)} icon={<i className="fas fa-dollar-sign" />} />
          </Flex>
        </div>

        {/* Status filter */}
        <div style={{ marginBottom: tokens.spacing[3] }}>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: tokens.spacing[2], borderRadius: 4 }}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        {/* Payroll Table: runs with Sitter count, Total Payout, Status; View opens sitters + bookings */}
        {loading ? (
          <Card>
            <Skeleton height={400} />
          </Card>
        ) : filteredRuns.length === 0 ? (
          <Card>
            <EmptyState
              icon="💰"
              title="No payroll runs found"
              description="Payroll runs appear once completed visits have been paid out to sitters."
            />
          </Card>
        ) : (
          <Card padding={false}>
            <Table
              columns={runColumns}
              data={filteredRuns}
              emptyMessage="No payroll runs found"
            />
          </Card>
        )}
      </div>

      {/* Run Detail Modal */}
      <Modal
        isOpen={!!selectedRunId && !showApprovalModal}
        onClose={() => {
          setSelectedRunId(null);
          setDetail(null);
        }}
        title={
          detail
            ? `Pay Period – ${formatDate(detail.run.startDate)} to ${formatDate(detail.run.endDate)}`
            : 'Pay Period Details'
        }
        size="lg"
      >
        {detailLoading ? (
          <Skeleton height={200} />
        ) : detail ? (
          <Flex direction="column" gap={4}>
            <Grid gap={4}>
              <GridCol span={12} md={6}>
                <Card>
                  <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                    Total Payout
                  </div>
                  <div style={{ fontSize: tokens.typography.fontSize.xl[0], fontWeight: tokens.typography.fontWeight.bold, color: tokens.colors.success.DEFAULT }}>
                    {formatCurrency(detail.run.totalPayout)}
                  </div>
                </Card>
              </GridCol>
              <GridCol span={12} md={6}>
                <Card>
                  <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                    Sitters
                  </div>
                  <div style={{ fontSize: tokens.typography.fontSize.xl[0], fontWeight: tokens.typography.fontWeight.bold }}>
                    {detail.sitters.length}
                  </div>
                </Card>
              </GridCol>
            </Grid>

            <div style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Sitters</div>
            <Table
              columns={[
                { key: 'sitter', header: 'Sitter', render: (s) => s.sitterName },
                { key: 'bookings', header: 'Bookings', render: (s) => s.bookingCount, align: 'center' as const },
                { key: 'earnings', header: 'Earnings', render: (s) => formatCurrency(s.earnings), align: 'right' as const },
                { key: 'commission', header: 'Commission', render: (s) => formatCurrency(s.commission), align: 'right' as const },
                { key: 'payout', header: 'Payout', render: (s) => formatCurrency(s.payoutAmount), align: 'right' as const },
                { key: 'stripe', header: 'Stripe', render: (s) => (s.stripeAccount ? 'Connected' : '—'), align: 'center' as const },
              ]}
              data={detail.sitters}
              emptyMessage="No sitters"
            />

            {detail.bookings.length > 0 && (
              <>
                <div style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
                  Booking Breakdown ({detail.bookings.length})
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {detail.bookings.map((b) => (
                    <Card key={b.bookingId} style={{ marginBottom: tokens.spacing[2] }}>
                      <Flex justify="space-between" align="center">
                        <div>
                          <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>{b.service}</div>
                          <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                            {formatDate(b.bookingDate)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div>{formatCurrency(b.totalPrice)}</div>
                          <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                            {formatCurrency(b.commissionAmount)} ({b.commissionPercentage}%)
                          </div>
                        </div>
                      </Flex>
                    </Card>
                  ))}
                </div>
              </>
            )}

            <Button variant="secondary" onClick={() => selectedRunId && handleExportCSV(selectedRunId)}>
              Export this period CSV
            </Button>
          </Flex>
        ) : null}
      </Modal>

      {/* Approval Modal */}
      <Modal
        isOpen={showApprovalModal}
        onClose={() => { setShowApprovalModal(false); setRunToApprove(null); }}
        title="Approve Payroll Run"
        size="md"
      >
        {runToApprove && (
          <Flex direction="column" gap={4}>
            <div>
              <div style={{ marginBottom: tokens.spacing[2] }}>
                Approve payroll run for period <strong>{formatDate(runToApprove.startDate)} – {formatDate(runToApprove.endDate)}</strong>?
                Total payout: <strong>{formatCurrency(runToApprove.totalPayout)}</strong> ({runToApprove.sitterCount} sitter{runToApprove.sitterCount !== 1 ? 's' : ''}).
              </div>
            </div>
            <Flex gap={3}>
              <Button variant="primary" onClick={handleApprove} disabled={approving} style={{ flex: 1 }}>
                {approving ? 'Approving...' : 'Approve'}
              </Button>
              <Button variant="tertiary" onClick={() => { setShowApprovalModal(false); setRunToApprove(null); }} style={{ flex: 1 }}>
                Cancel
              </Button>
            </Flex>
          </Flex>
        )}
      </Modal>
    </AppShell>
  );
}
