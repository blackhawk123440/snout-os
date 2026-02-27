'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Drawer } from '@/components/ui';
import {
  SitterCard,
  SitterCardHeader,
  SitterCardBody,
  SitterPageHeader,
  SitterSkeletonList,
  SitterErrorState,
  SitterEmptyState,
  FeatureStatusPill,
} from '@/components/sitter';

type PeriodTab = 'today' | 'week' | 'month';

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

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

export default function SitterEarningsPage() {
  const [periodTab, setPeriodTab] = useState<PeriodTab>('month');
  const [data, setData] = useState<EarningsData | null>(null);
  const [jobs, setJobs] = useState<CompletedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<CompletedJob | null>(null);

  const loadEarnings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sitter/earnings');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Unable to load earnings');
        setData(null);
        return;
      }
      setData(json);
    } catch {
      setError('Unable to load earnings');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadJobs = useCallback(async () => {
    setJobsLoading(true);
    try {
      const res = await fetch('/api/sitter/completed-jobs');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setJobs([]);
        return;
      }
      setJobs(Array.isArray(json.jobs) ? json.jobs : []);
    } catch {
      setJobs([]);
    } finally {
      setJobsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEarnings();
    void loadJobs();
  }, [loadEarnings, loadJobs]);

  return (
    <div className="mx-auto max-w-3xl pb-8">
      <SitterPageHeader
        title="Earnings"
        subtitle="Your commission summary"
        action={
          <Button variant="secondary" size="sm" onClick={() => void loadEarnings()} disabled={loading}>
            Refresh
          </Button>
        }
      />
      {loading ? (
        <SitterSkeletonList count={3} />
      ) : error ? (
        <SitterErrorState
          title="Couldn't load earnings"
          subtitle={error}
          onRetry={() => void loadEarnings()}
        />
      ) : data ? (
        <div className="space-y-4">
          <div className="flex gap-2 rounded-xl border border-neutral-200 p-0.5">
            {(['today', 'week', 'month'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriodTab(p)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition ${
                  periodTab === p ? 'bg-neutral-200 text-neutral-900' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <SitterCard>
            <SitterCardHeader>
              <p className="text-sm font-medium text-neutral-500">Total earnings</p>
              <p className="mt-1 text-2xl font-bold text-neutral-900">
                ${data.earningsTotal.toFixed(2)}
              </p>
              <p className="mt-1 text-sm text-neutral-600">
                {data.completedBookingsCount} completed · {data.commissionPercentage}% after split
              </p>
            </SitterCardHeader>
          </SitterCard>

          <SitterCard>
            <SitterCardBody>
              <p className="text-sm font-medium text-neutral-500">This month</p>
              <p className="mt-1 text-xl font-semibold text-neutral-900">
                ${data.earningsThisMonth.toFixed(2)}
              </p>
              <p className="mt-1 text-sm text-neutral-600">
                {data.completedThisMonthCount} bookings · Gross ${data.grossThisMonth.toFixed(2)}
              </p>
            </SitterCardBody>
          </SitterCard>

          <SitterCard>
            <SitterCardBody>
              <p className="text-sm font-medium text-neutral-500">Last month</p>
              <p className="mt-1 text-xl font-semibold text-neutral-900">
                ${data.earningsLastMonth.toFixed(2)}
              </p>
              <p className="mt-1 text-sm text-neutral-600">
                {data.completedLastMonthCount} bookings · Gross ${data.grossLastMonth.toFixed(2)}
              </p>
            </SitterCardBody>
          </SitterCard>

          <div className="flex items-center justify-center gap-2">
            <Button variant="secondary" size="md" disabled>
              Instant payout
            </Button>
            <FeatureStatusPill featureKey="instant_payout" />
          </div>

          <h3 className="text-base font-semibold text-neutral-900">Completed jobs</h3>
          {jobsLoading ? (
            <SitterSkeletonList count={2} />
          ) : jobs.length === 0 ? (
            <SitterEmptyState
              title="No completed jobs yet"
              subtitle="Your earnings will appear here after visits are completed."
            />
          ) : (
            <div className="space-y-2">
              {jobs.map((job) => (
                <SitterCard key={job.id} onClick={() => setSelectedJob(job)}>
                  <SitterCardBody className="flex flex-row items-center justify-between">
                    <div>
                      <p className="font-medium text-neutral-900">{job.clientName}</p>
                      <p className="text-sm text-neutral-600">
                        {job.service} · {formatDate(job.endAt)}
                      </p>
                    </div>
                    <p className="font-semibold text-neutral-900">${job.afterSplit.toFixed(2)}</p>
                  </SitterCardBody>
                </SitterCard>
              ))}
            </div>
          )}

          <p className="text-center text-xs text-neutral-500">
            Earnings are estimates based on completed bookings. No payments or payouts in this MVP.
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
            <p className="text-sm text-neutral-600">
              {formatDate(selectedJob.startAt)}
              {selectedJob.pets.length > 0 && ` · ${selectedJob.pets.map((p) => p.name || p.species || 'Pet').join(', ')}`}
            </p>
            <div className="space-y-2 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Base</span>
                <span className="font-medium">${selectedJob.base.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Tip</span>
                <span className="font-medium">${selectedJob.tip.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Add-ons</span>
                <span className="font-medium">${selectedJob.addOns.toFixed(2)}</span>
              </div>
              <div className="border-t border-neutral-200 pt-2 flex justify-between text-sm font-medium">
                <span>After split ({selectedJob.commissionPercentage}%)</span>
                <span className="text-neutral-900">${selectedJob.afterSplit.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
