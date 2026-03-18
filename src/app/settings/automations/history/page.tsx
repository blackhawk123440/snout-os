'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  PageHeader,
  Card,
  Button,
  Select,
  Badge,
  EmptyState,
  Skeleton,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';

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

const STATUS_COLORS: Record<string, string> = {
  success: 'success',
  failed: 'error',
  skipped: 'warning',
  pending: 'default',
};

const TYPE_LABELS: Record<string, string> = {
  bookingConfirmation: 'Booking Confirmation',
  nightBeforeReminder: 'Night Before Reminder',
  paymentReminder: 'Payment Reminder',
  sitterAssignment: 'Sitter Assignment',
  postVisitThankYou: 'Post Visit Thank You',
  ownerNewBookingAlert: 'Owner Booking Alert',
};

export default function AutomationHistoryPage() {
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [retrying, setRetrying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const res = await fetch(`/api/automations/ledger?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setRuns(data.runs || []);
    } catch {
      setError('Failed to load automation history');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const retryRun = async (run: AutomationRun) => {
    if (!run.automationType || !run.bookingId) return;
    setRetrying(run.id);
    try {
      const res = await fetch('/api/automations/test-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          automationType: run.automationType,
          bookingId: run.bookingId,
        }),
      });
      if (!res.ok) throw new Error('Retry failed');
      await fetchRuns();
    } catch {
      setError('Retry failed. Please try again.');
    } finally {
      setRetrying(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <AppShell>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <PageHeader
          title="Automation History"
          description="Recent automation runs and their results"
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacing[4], gap: tokens.spacing[3], flexWrap: 'wrap' }}>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 180 }}
            options={[
              { label: 'All statuses', value: 'all' },
              { label: 'Success', value: 'success' },
              { label: 'Failed', value: 'failed' },
              { label: 'Skipped', value: 'skipped' },
            ]}
          />
          <Link href="/settings/automations">
            <Button variant="ghost" size="sm">
              <i className="fas fa-arrow-left" style={{ marginRight: tokens.spacing[1] }} />
              Back to settings
            </Button>
          </Link>
        </div>

        {error && (
          <Card style={{ backgroundColor: tokens.colors.error[50], padding: tokens.spacing[3], marginBottom: tokens.spacing[4] }}>
            <div style={{ color: tokens.colors.error.DEFAULT, fontSize: tokens.typography.fontSize.sm[0] }}>
              {error}
            </div>
          </Card>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2] }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} style={{ height: 64, borderRadius: tokens.borderRadius.lg }} />
            ))}
          </div>
        ) : runs.length === 0 ? (
          <EmptyState
            icon="fa-history"
            title="No automation runs yet"
            description="Automation runs will appear here as they fire."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2] }}>
            {runs.map((run) => (
              <Card key={run.id} style={{
                padding: tokens.spacing[3],
                borderLeft: `3px solid ${run.status === 'failed' ? tokens.colors.error.DEFAULT : run.status === 'success' ? tokens.colors.success.DEFAULT : tokens.colors.border.default}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: tokens.spacing[3] }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], marginBottom: tokens.spacing[1], flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: tokens.typography.fontSize.sm[0] }}>
                        {TYPE_LABELS[run.automationType || ''] || run.automationType || run.eventType}
                      </span>
                      <Badge variant={STATUS_COLORS[run.status] as any}>
                        {run.status}
                      </Badge>
                    </div>
                    {run.booking && (
                      <p style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary, margin: 0 }}>
                        {run.booking.firstName} {run.booking.lastName} - {run.booking.service}
                      </p>
                    )}
                    {run.status === 'failed' && run.error && (
                      <p style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.error.DEFAULT, margin: `${tokens.spacing[1]} 0 0` }}>
                        {run.error}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], flexShrink: 0 }}>
                    <span style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary, whiteSpace: 'nowrap' }}>
                      {formatDate(run.createdAt)}
                    </span>
                    {run.status === 'failed' && run.automationType && run.bookingId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => retryRun(run)}
                        disabled={retrying === run.id}
                      >
                        {retrying === run.id ? 'Retrying...' : 'Retry'}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
