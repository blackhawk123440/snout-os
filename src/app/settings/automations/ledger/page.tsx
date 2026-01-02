/**
 * Automation Ledger Page - Enterprise Rebuild
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
  Badge,
  EmptyState,
  Skeleton,
  Select,
  Table,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';
import { TableColumn } from '@/components/ui/Table';

interface AutomationRun {
  id: string;
  eventType: string;
  automationType: string | null;
  status: 'success' | 'failed' | 'skipped' | 'pending';
  error: string | null;
  metadata: any;
  bookingId: string | null;
  booking: {
    id: string;
    firstName: string;
    lastName: string;
    service: string;
    status: string;
  } | null;
  createdAt: string;
}

export default function AutomationLedgerPage() {
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [automationTypeFilter, setAutomationTypeFilter] = useState<string>('all');
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRuns();
  }, [statusFilter, automationTypeFilter]);

  const fetchRuns = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (automationTypeFilter !== 'all') {
        params.append('automationType', automationTypeFilter);
      }
      params.append('limit', '100');

      const response = await fetch(`/api/automations/ledger?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setRuns(data.runs || []);
        setTotal(data.total || 0);
      } else {
        setError(data.error || 'Failed to fetch automation runs');
      }
    } catch (err) {
      setError('Failed to fetch automation runs');
      setRuns([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getAutomationTypeLabel = (type: string | null) => {
    if (!type) return 'Unknown';
    return type
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'success', label: 'Success' },
    { value: 'failed', label: 'Failed' },
    { value: 'skipped', label: 'Skipped' },
    { value: 'pending', label: 'Pending' },
  ];

  const automationTypeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'bookingConfirmation', label: 'Booking Confirmation' },
    { value: 'ownerNewBookingAlert', label: 'Owner Alert' },
    { value: 'nightBeforeReminder', label: 'Night Before Reminder' },
    { value: 'paymentReminder', label: 'Payment Reminder' },
    { value: 'sitterAssignment', label: 'Sitter Assignment' },
    { value: 'postVisitThankYou', label: 'Post Visit Thank You' },
    { value: 'dailySummary', label: 'Daily Summary' },
  ];

  const tableColumns: TableColumn<AutomationRun>[] = [
    {
      key: 'status',
      header: 'Status',
      render: (run) => {
        const variantMap: Record<string, 'success' | 'error' | 'warning' | 'info' | 'neutral'> = {
          success: 'success',
          failed: 'error',
          skipped: 'warning',
          pending: 'info',
        };
        return <Badge variant={variantMap[run.status] || 'neutral'}>{run.status.toUpperCase()}</Badge>;
      },
    },
    {
      key: 'type',
      header: 'Automation Type',
      render: (run) => <div style={{ fontSize: tokens.typography.fontSize.sm[0] }}>{getAutomationTypeLabel(run.automationType)}</div>,
    },
    {
      key: 'booking',
      header: 'Booking',
      render: (run) => {
        if (!run.booking) return <span style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>—</span>;
        return (
          <div style={{ fontSize: tokens.typography.fontSize.sm[0] }}>
            {run.booking.firstName} {run.booking.lastName} - {run.booking.service}
            {run.bookingId && (
              <Link
                href={`/bookings?booking=${run.bookingId}`}
                style={{ marginLeft: tokens.spacing[2], color: tokens.colors.primary.DEFAULT, textDecoration: 'underline', fontSize: tokens.typography.fontSize.xs[0] }}
              >
                View
              </Link>
            )}
          </div>
        );
      },
    },
    {
      key: 'created',
      header: 'Created',
      render: (run) => (
        <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
          {formatDate(run.createdAt)}
        </div>
      ),
    },
    {
      key: 'error',
      header: 'Error',
      render: (run) => {
        if (!run.error) return <span style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>—</span>;
        return (
          <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.error.DEFAULT, maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={run.error}>
            {run.error}
          </div>
        );
      },
    },
  ];

  return (
    <AppShell physiology="analytical">
      <PageHeader
        title="Automation Run Ledger"
        description="View automation execution history and failures"
        actions={
          <Link href="/settings">
            <Button variant="tertiary" leftIcon={<i className="fas fa-arrow-left" />}>
              Back to Settings
            </Button>
          </Link>
        }
      />

      <div style={{ padding: tokens.spacing[6] }}>
        {/* Error Banner */}
        {error && (
          <Card
            depth="critical"
            style={{
              marginBottom: tokens.spacing[6],
              backgroundColor: tokens.colors.error[50],
              borderColor: tokens.colors.error[200],
            }}
          >
            <div style={{ padding: tokens.spacing[4], color: tokens.colors.error[700] }}>{error}</div>
          </Card>
        )}

        {/* Filters */}
        <Card depth="elevated" style={{ marginBottom: tokens.spacing[6] }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing[4], marginBottom: tokens.spacing[4] }}>
            <div>
              <label style={{ display: 'block', fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.medium, marginBottom: tokens.spacing[2], color: tokens.colors.text.primary }}>
                Filter by Status
              </label>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={statusOptions}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.medium, marginBottom: tokens.spacing[2], color: tokens.colors.text.primary }}>
                Filter by Automation Type
              </label>
              <Select
                value={automationTypeFilter}
                onChange={(e) => setAutomationTypeFilter(e.target.value)}
                options={automationTypeOptions}
              />
            </div>
          </div>
          <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
            Showing {runs.length} of {total} automation runs
          </div>
        </Card>

        {loading ? (
          <Card depth="elevated">
            <div style={{ padding: tokens.spacing[6] }}>
              <Skeleton height={400} />
            </div>
          </Card>
        ) : runs.length === 0 ? (
          <EmptyState
            title="No Automation Runs"
            description={statusFilter !== 'all' || automationTypeFilter !== 'all' ? 'Try adjusting your filters' : 'Automation runs will appear here once automations start executing'}
            icon={<i className="fas fa-history" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
          />
        ) : (
          <Card depth="elevated">
            <Table columns={tableColumns} data={runs} keyExtractor={(run) => run.id} />
          </Card>
        )}
      </div>
    </AppShell>
  );
}
