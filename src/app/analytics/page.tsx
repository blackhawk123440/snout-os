/**
 * Analytics - Route scaffold
 * Header + filter bar, chart placeholder, loading/empty/error states.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import {
  AppPageHeader,
  AppFilterBar,
  AppChartCard,
} from '@/components/app';
import { useAuth } from '@/lib/auth-client';
import { tokens } from '@/lib/design-tokens';

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login?redirect=/analytics');
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span style={{ color: tokens.colors.text.secondary }}>Loading...</span>
      </div>
    );
  }
  if (!user) return null;

  return (
    <AppShell>
      <AppPageHeader
        title="Analytics"
        subtitle="Business insights and reports"
        action={
          <button
            type="button"
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Export Report
          </button>
        }
      />

      <AppFilterBar
        filters={[
          { key: 'metric', label: 'Metric', type: 'select', options: [
            { value: 'revenue', label: 'Revenue' },
            { value: 'visits', label: 'Visits' },
          ]},
        ]}
        values={filterValues}
        onChange={(k, v) => setFilterValues((p) => ({ ...p, [k]: v }))}
        onClear={() => setFilterValues({})}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <AppChartCard
          title="Revenue Trend"
          subtitle="Daily revenue over time"
          timeframe={filterValues.range ?? '30d'}
          onTimeframeChange={(v) => setFilterValues((p) => ({ ...p, range: v }))}
        />
        <AppChartCard
          title="Visit Volume"
          subtitle="Number of visits per day"
          timeframe={filterValues.range ?? '30d'}
          onTimeframeChange={(v) => setFilterValues((p) => ({ ...p, range: v }))}
        />
      </div>
    </AppShell>
  );
}
