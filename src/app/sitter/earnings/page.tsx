'use client';

import { useMemo, useState } from 'react';
import { Button, Drawer, DataTableShell, Table } from '@/components/ui';
import { LayoutWrapper } from '@/components/layout';
import { StatusChip } from '@/components/ui/status-chip';
import {
  SitterCard,
  SitterCardHeader,
  SitterCardBody,
  SitterPageHeader,
  SitterSkeletonList,
  SitterErrorState,
  SitterEmptyState,
} from '@/components/sitter';
import { calculateTransferSummary } from './earnings-helpers';
import { useSitterEarnings, useSitterCompletedJobs, useSitterTransfers } from '@/lib/api/sitter-portal-hooks';

interface EarningsData {
  commissionPercentage: number;
  grossTotal: number;
  earningsTotal: number;
  grossThisMonth: number;
  earningsThisMonth: number;
  grossLastMonth: number;
  earningsLastMonth: number;
  completedBookingsCount: number;
  completedThisMonthCount: number;
  completedLastMonthCount: number;
  averagePerVisit: number;
}

interface CompletedJob {
  id: string;
  service: string;
  startAt: string;
  endAt: string;
  clientName: string;
  pets: Array<{ id: string; name?: string | null; species?: string | null }>;
  base: number;
  tip: number;
  addOns: number;
  gross: number;
  afterSplit: number;
  commissionPercentage: number;
}

interface PayoutTransfer {
  id: string;
  bookingId?: string | null;
  stripeTransferId?: string | null;
  amount: number;
  currency: string;
  status: string;
  lastError?: string | null;
  createdAt: string;
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

export default function SitterEarningsPage() {
  const [selectedJob, setSelectedJob] = useState<CompletedJob | null>(null);

  const earningsQuery = useSitterEarnings();
  const jobsQuery = useSitterCompletedJobs();
  const transfersQuery = useSitterTransfers();

  const loading = earningsQuery.isLoading || jobsQuery.isLoading || transfersQuery.isLoading;
  const data = earningsQuery.data;
  const error = earningsQuery.error;
  const completedJobs = jobsQuery.data?.jobs || [];
  const transfers = transfersQuery.data?.transfers || [];
  const jobsLoading = jobsQuery.isLoading;
  const transfersLoading = transfersQuery.isLoading;

  const transferSummary = useMemo(() => calculateTransferSummary(transfers), [transfers]);

  return (
    <LayoutWrapper variant="narrow">
      <SitterPageHeader
        title="Earnings"
        subtitle="Your commission summary"
        action={
          <Button variant="secondary" size="sm" onClick={() => { earningsQuery.refetch(); jobsQuery.refetch(); transfersQuery.refetch(); }} disabled={loading}>
            Refresh
          </Button>
        }
      />
      {loading ? (
        <SitterSkeletonList count={3} />
      ) : error ? (
        <SitterErrorState
          title="Couldn't load earnings"
          subtitle={error?.message}
          onRetry={() => { earningsQuery.refetch(); jobsQuery.refetch(); transfersQuery.refetch(); }}
        />
      ) : data ? (
        <div className="space-y-4">
          <SitterCard>
            <SitterCardHeader>
              <p className="text-sm font-medium text-text-tertiary">Total earnings</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">
                ${data.earningsTotal.toFixed(2)}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {data.completedBookingsCount} completed visits · {data.commissionPercentage}% after split
              </p>
              {data.completedBookingsCount > 0 && (
                <p className="mt-0.5 text-sm text-text-tertiary">
                  ${data.averagePerVisit.toFixed(2)} average per visit
                </p>
              )}
            </SitterCardHeader>
          </SitterCard>

          <SitterCard className="border-border-brand bg-surface-brand-subtle">
            <SitterCardBody>
              <p className="text-sm font-medium text-text-brand">Next payout</p>
              {transferSummary.hasPaidHistory && transferSummary.nextPayoutDate ? (
                <>
                  <p className="mt-1 text-2xl font-semibold text-text-brand">
                    {transferSummary.nextPayoutDate.toLocaleDateString([], {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-text-brand">Estimated</p>
                </>
              ) : (
                <p className="mt-1 text-sm text-text-brand">After first completed visit</p>
              )}
            </SitterCardBody>
          </SitterCard>

          <SitterCard>
            <SitterCardBody>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide">This month</p>
                  <p className="mt-1 text-xl font-semibold text-text-primary tabular-nums">
                    ${data.earningsThisMonth.toFixed(2)}
                  </p>
                  <p className="mt-0.5 text-xs text-text-tertiary">
                    {data.completedThisMonthCount} visits
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Last month</p>
                  <p className="mt-1 text-xl font-semibold text-text-primary tabular-nums">
                    ${data.earningsLastMonth.toFixed(2)}
                  </p>
                  <p className="mt-0.5 text-xs text-text-tertiary">
                    {data.completedLastMonthCount} visits
                  </p>
                </div>
              </div>
            </SitterCardBody>
          </SitterCard>

          <SitterCard>
            <SitterCardBody>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Pending</p>
                  <p className="mt-1 text-xl font-semibold text-text-primary tabular-nums">
                    ${(transferSummary.pendingCents / 100).toFixed(2)}
                  </p>
                  <p className="mt-0.5 text-xs text-text-tertiary">Awaiting payout</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Paid (30d)</p>
                  <p className="mt-1 text-xl font-semibold text-text-primary tabular-nums">
                    ${(transferSummary.paid30dCents / 100).toFixed(2)}
                  </p>
                  <p className="mt-0.5 text-xs text-text-tertiary">Last 30 days</p>
                </div>
              </div>
            </SitterCardBody>
          </SitterCard>

          <h3 className="text-base font-semibold text-text-primary">Payout transfers</h3>
          {transfersLoading ? (
            <SitterSkeletonList count={2} />
          ) : transfers.length === 0 ? (
            <SitterEmptyState
              title="No payouts yet"
              subtitle="Transfers will appear here after completed bookings are paid out."
            />
          ) : (
            <DataTableShell stickyHeader>
              <Table
                columns={[
                  { key: 'amount', header: 'Amount', mobileOrder: 1, mobileLabel: 'Amount', render: (t) => (
                    <span className="tabular-nums font-medium">${(t.amount / 100).toFixed(2)} {t.currency.toUpperCase()}</span>
                  )},
                  { key: 'date', header: 'Date', mobileOrder: 2, mobileLabel: 'Date', hideBelow: 'md', render: (t) =>
                    t.createdAt ? formatDate(t.createdAt) : '—'
                  },
                  { key: 'status', header: 'Status', mobileOrder: 3, mobileLabel: 'Status', render: (t) => (
                    <span className="flex items-center gap-1">
                      <StatusChip
                        variant={t.status === 'paid' ? 'success' : t.status === 'failed' ? 'danger' : 'neutral'}
                        ariaLabel={`Transfer status: ${t.status}`}
                      >
                        {t.status}
                      </StatusChip>
                      {t.lastError && (
                        <span className="text-status-danger-text" title={t.lastError}>(failed)</span>
                      )}
                    </span>
                  )},
                ]}
                data={transfers}
                keyExtractor={(t) => t.id}
                emptyMessage="No payouts yet"
                forceTableLayout
              />
            </DataTableShell>
          )}

          <h3 className="text-base font-semibold text-text-primary">Completed jobs</h3>
          {jobsLoading ? (
            <SitterSkeletonList count={2} />
          ) : completedJobs.length === 0 ? (
            <SitterEmptyState
              title="No completed jobs yet"
              subtitle="Your earnings will appear here after visits are completed."
            />
          ) : (
            <DataTableShell stickyHeader>
              <Table
                columns={[
                  { key: 'client', header: 'Client', mobileOrder: 1, mobileLabel: 'Client', render: (job) => job.clientName },
                  { key: 'service', header: 'Service', mobileOrder: 2, mobileLabel: 'Service', hideBelow: 'md', render: (job) => job.service },
                  { key: 'date', header: 'Date', mobileOrder: 3, mobileLabel: 'Date', render: (job) => formatDate(job.endAt) },
                  { key: 'amount', header: 'Amount', mobileOrder: 4, mobileLabel: 'Amount', render: (job) => (
                    <span className="tabular-nums font-semibold">${job.afterSplit.toFixed(2)}</span>
                  )},
                ]}
                data={completedJobs}
                keyExtractor={(job) => job.id}
                emptyMessage="No completed jobs yet"
                onRowClick={(job) => setSelectedJob(job as CompletedJob)}
                forceTableLayout
              />
            </DataTableShell>
          )}

          <p className="text-center text-xs text-text-tertiary">
            Earnings are based on completed bookings. Payouts are sent to your connected Stripe account.
          </p>
        </div>
      ) : null}

      <Drawer
        isOpen={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        title={selectedJob ? `${selectedJob.service} · ${selectedJob.clientName}` : ''}
        placement="right"
        width="min(380px, 100vw)"
      >
        {selectedJob && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              {formatDate(selectedJob.startAt)}
              {selectedJob.pets.length > 0 && ` · ${selectedJob.pets.map((p) => p.name || p.species || 'Pet').join(', ')}`}
            </p>
            <div className="space-y-2 rounded-2xl border border-border-default bg-surface-secondary p-4">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Base</span>
                <span className="font-medium">${selectedJob.base.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Tip</span>
                <span className="font-medium">${selectedJob.tip.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Add-ons</span>
                <span className="font-medium">${selectedJob.addOns.toFixed(2)}</span>
              </div>
              <div className="border-t border-border-default pt-2 flex justify-between text-sm font-medium">
                <span>After split ({selectedJob.commissionPercentage}%)</span>
                <span className="text-text-primary">${selectedJob.afterSplit.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </LayoutWrapper>
  );
}
