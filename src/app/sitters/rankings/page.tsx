'use client';

import { useCallback, useEffect, useState } from 'react';
import { OwnerAppShell, LayoutWrapper, PageHeader, Section } from '@/components/layout';
import { AppErrorState } from '@/components/app';
import { Button, EmptyState } from '@/components/ui';
import { PageSkeleton } from '@/components/ui/loading-state';
import { toastSuccess, toastError } from '@/lib/toast';

interface RankedSitter {
  id: string;
  name: string;
  tier: string;
  commissionPct: number;
  acceptanceRate: number;
  completionRate: number;
  onTimeRate: number;
  totalBookings: number;
  completedBookings: number;
  compositeScore: number;
}

const metricColor = (value: number, threshold: number) =>
  value >= threshold ? 'text-status-success-text' : value >= threshold * 0.8 ? 'text-status-warning-text' : 'text-status-danger-text';

export default function SitterRankingsPage() {
  const [rankings, setRankings] = useState<RankedSitter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ops/sitters/rankings');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error || 'Failed'); return; }
      setRankings(json.rankings || []);
    } catch { setError('Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const evaluateTiers = async () => {
    setEvaluating(true);
    try {
      const res = await fetch('/api/ops/sitters/evaluate-tiers', { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        toastSuccess(`Evaluated ${json.evaluated} sitters: ${json.promoted} promoted, ${json.demoted} demoted`);
        void load();
      } else toastError(json.error || 'Failed');
    } catch { toastError('Failed'); }
    finally { setEvaluating(false); }
  };

  return (
    <OwnerAppShell>
      <LayoutWrapper variant="wide">
        <PageHeader
          title="Sitter Rankings"
          subtitle="Performance comparison"
          actions={
            <Button variant="secondary" size="sm" onClick={evaluateTiers} disabled={evaluating}>
              {evaluating ? 'Evaluating\u2026' : 'Evaluate tiers'}
            </Button>
          }
        />
        <Section>
          {loading ? <PageSkeleton /> : error ? (
            <AppErrorState title="Couldn't load" subtitle={error} onRetry={() => void load()} />
          ) : rankings.length === 0 ? (
            <EmptyState title="No active sitters" description="Add sitters to see performance rankings." />
          ) : (
            <div className="space-y-2">
              {rankings.map((s, i) => (
                <div key={s.id} className="flex items-center gap-4 rounded-xl border border-border-default bg-surface-primary px-4 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-tertiary text-sm font-bold text-text-secondary">
                    {i === 0 ? '\ud83c\udfc6' : `#${i + 1}`}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-text-primary">{s.name}</p>
                      <span className="rounded-full bg-accent-tertiary px-2 py-0.5 text-[10px] font-medium text-accent-primary">{s.tier}</span>
                      {i === 0 && <span className="rounded-full bg-status-warning-bg px-2 py-0.5 text-[10px] font-bold text-status-warning-text">Top performer</span>}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
                      <span className={metricColor(s.acceptanceRate, 70)}>Accept: {s.acceptanceRate}%</span>
                      <span className={metricColor(s.completionRate, 90)}>Complete: {s.completionRate}%</span>
                      <span className={metricColor(s.onTimeRate, 85)}>On-time: {s.onTimeRate}%</span>
                      <span className="text-text-tertiary">{s.completedBookings} visits</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-bold text-text-primary">{s.compositeScore}</p>
                    <p className="text-[10px] text-text-tertiary">score</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </LayoutWrapper>
    </OwnerAppShell>
  );
}
