'use client';

import { useEffect, useState } from 'react';
import { SitterCard, SitterCardHeader, SitterCardBody, SitterPageHeader } from '@/components/sitter';
import { Badge } from '@/components/ui';

type SrsPayload = {
  tier: string;
  score: number;
  rolling26w?: number | null;
  provisional: boolean;
  atRisk: boolean;
  atRiskReason?: string;
  visits30d: number;
  breakdown: {
    responsiveness: number;
    acceptance: number;
    completion: number;
    timeliness: number;
    accuracy: number;
    engagement: number;
    conduct: number;
  };
  nextActions: string[];
};

export default function SitterPerformancePage() {
  const [data, setData] = useState<SrsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/sitter/me/srs');
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error || 'Failed to load performance data');
        setLoading(false);
        return;
      }
      setData(body);
      setLoading(false);
    }
    void load();
  }, []);

  const tierLabel = data ? `${data.tier.charAt(0).toUpperCase()}${data.tier.slice(1)}` : 'Foundation';

  return (
    <div className="mx-auto max-w-3xl pb-8">
      <SitterPageHeader title="Performance" subtitle="Your Service Reliability Score (SRS) and tier progress" />
      <div className="space-y-4">
        <SitterCard>
          <SitterCardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-neutral-900">Current Reliability Tier</h3>
              {data && <Badge variant="info">{tierLabel}</Badge>}
            </div>
          </SitterCardHeader>
          <SitterCardBody>
            {loading ? (
              <p className="text-sm text-neutral-600">Loading SRS...</p>
            ) : error ? (
              <p className="text-sm text-rose-700">{error}</p>
            ) : data ? (
              <div className="space-y-2">
                <p className="text-2xl font-semibold text-neutral-900">{data.score.toFixed(1)} / 100</p>
                <p className="text-sm text-neutral-600">
                  Rolling 30-day reliability score. {data.rolling26w ? `26-week average: ${data.rolling26w.toFixed(1)}.` : ''}
                </p>
                <p className="text-sm text-neutral-600">Activity sample: {data.visits30d} visits in last 30 days.</p>
                {data.provisional && <p className="text-xs text-amber-700">Provisional score until enough sample size is reached.</p>}
                {data.atRisk && <p className="text-xs text-rose-700">At risk: {data.atRiskReason || 'Score below tier target'}</p>}
              </div>
            ) : (
              <p className="text-sm text-neutral-600">No reliability data yet.</p>
            )}
          </SitterCardBody>
        </SitterCard>

        <SitterCard>
          <SitterCardHeader>
            <h3 className="font-semibold text-neutral-900">Recent Trend and Period Summary</h3>
          </SitterCardHeader>
          <SitterCardBody>
            {loading ? (
              <p className="text-sm text-neutral-600">Loading trend...</p>
            ) : data ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                  <p className="text-xs text-neutral-500">30d Score</p>
                  <p className="text-lg font-semibold text-neutral-900">{data.score.toFixed(1)}</p>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                  <p className="text-xs text-neutral-500">26w Avg</p>
                  <p className="text-lg font-semibold text-neutral-900">{data.rolling26w ? data.rolling26w.toFixed(1) : 'N/A'}</p>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                  <p className="text-xs text-neutral-500">Visits (30d)</p>
                  <p className="text-lg font-semibold text-neutral-900">{data.visits30d}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-neutral-600">Trend unavailable until activity data exists.</p>
            )}
          </SitterCardBody>
        </SitterCard>

        <SitterCard>
          <SitterCardHeader>
            <h3 className="font-semibold text-neutral-900">What Affects Your Score</h3>
          </SitterCardHeader>
          <SitterCardBody>
            {loading ? (
              <p className="text-sm text-neutral-600">Loading factors...</p>
            ) : data ? (
              <div className="grid grid-cols-1 gap-2 text-sm text-neutral-700 sm:grid-cols-2">
                <p>Responsiveness: {data.breakdown.responsiveness.toFixed(1)} / 20</p>
                <p>Acceptance: {data.breakdown.acceptance.toFixed(1)} / 12</p>
                <p>Completion: {data.breakdown.completion.toFixed(1)} / 8</p>
                <p>Timeliness: {data.breakdown.timeliness.toFixed(1)} / 20</p>
                <p>Accuracy: {data.breakdown.accuracy.toFixed(1)} / 20</p>
                <p>Engagement: {data.breakdown.engagement.toFixed(1)} / 10</p>
                <p>Conduct: {data.breakdown.conduct.toFixed(1)} / 10</p>
              </div>
            ) : (
              <p className="text-sm text-neutral-600">No score factors yet.</p>
            )}
          </SitterCardBody>
        </SitterCard>

        <SitterCard>
          <SitterCardBody>
            <p className="text-sm font-medium text-neutral-700">Next Actions</p>
            {loading ? (
              <p className="mt-1 text-xs text-neutral-500">Loading recommended actions...</p>
            ) : data?.nextActions?.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-neutral-600">
                {data.nextActions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xs text-neutral-500">Keep completing visits and responding quickly to maintain reliability.</p>
            )}
          </SitterCardBody>
        </SitterCard>
      </div>
    </div>
  );
}
