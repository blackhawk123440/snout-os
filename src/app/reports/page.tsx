'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { OwnerAppShell, LayoutWrapper, PageHeader, Section } from '@/components/layout';
import { KpiGrid, type KpiItem } from '@/components/app/KpiGrid';
import { Card, Skeleton, Button } from '@/components/ui';

type KpiWithTrend = {
  value: number;
  previousValue?: number;
  deltaPercent?: number | null;
  trend?: 'up' | 'down' | 'neutral';
};

type KpisPayload = {
  range: string;
  periodStart: string;
  periodEnd: string;
  revenueToday: number;
  revenueWeek: number;
  revenueMonth: number;
  revenue: KpiWithTrend;
  bookingsToday: number;
  bookingsWeek: number;
  bookingsMonth: number;
  bookings: KpiWithTrend;
  activeClients: KpiWithTrend;
  activeSitters: KpiWithTrend;
  utilization: number;
  utilizationPrevious?: number;
  cancellationRate: KpiWithTrend;
  failedPaymentCount: KpiWithTrend;
  automationFailureCount: KpiWithTrend;
  payoutVolume: KpiWithTrend;
  averageBookingValue: KpiWithTrend;
  repeatBookingRate: KpiWithTrend;
  messageResponseLag: { value: number } | null;
};

const RANGE_OPTIONS = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
];

export default function ReportsPage() {
  const [range, setRange] = useState('30d');
  const [kpis, setKpis] = useState<KpisPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics/kpis?range=${range}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.message || res.statusText || 'Failed to load');
        setKpis(null);
        return;
      }
      const data = await res.json();
      setKpis(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setKpis(null);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void load();
  }, [load]);

  const kpiItems: KpiItem[] = kpis
    ? [
        {
          label: 'Revenue (period)',
          value: `$${kpis.revenue.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          delta: kpis.revenue.deltaPercent ?? undefined,
          href: '/payments',
        },
        {
          label: 'Bookings (period)',
          value: kpis.bookings.value,
          delta: kpis.bookings.deltaPercent ?? undefined,
          href: '/bookings',
        },
        {
          label: 'Active clients',
          value: kpis.activeClients.value,
          delta: kpis.activeClients.deltaPercent ?? undefined,
          href: '/clients',
        },
        {
          label: 'Active sitters',
          value: kpis.activeSitters.value,
          delta: kpis.activeSitters.deltaPercent ?? undefined,
          href: '/sitters',
        },
        {
          label: 'Cancellation rate',
          value: `${kpis.cancellationRate.value.toFixed(1)}%`,
          delta: kpis.cancellationRate.deltaPercent ?? undefined,
        },
        {
          label: 'Failed payments',
          value: kpis.failedPaymentCount.value,
          delta: kpis.failedPaymentCount.deltaPercent ?? undefined,
          href: '/payments?status=failed',
        },
        {
          label: 'Automation failures',
          value: kpis.automationFailureCount.value,
          delta: kpis.automationFailureCount.deltaPercent ?? undefined,
          href: '/ops/automation-failures',
        },
        {
          label: 'Payout volume',
          value: `$${kpis.payoutVolume.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          delta: kpis.payoutVolume.deltaPercent ?? undefined,
          href: '/ops/payouts',
        },
        {
          label: 'Avg booking value',
          value: `$${kpis.averageBookingValue.value.toFixed(2)}`,
          delta: kpis.averageBookingValue.deltaPercent ?? undefined,
        },
        {
          label: 'Repeat booking rate',
          value: `${kpis.repeatBookingRate.value.toFixed(1)}%`,
          delta: kpis.repeatBookingRate.deltaPercent ?? undefined,
          href: '/clients',
        },
        {
          label: 'Message response lag',
          value: kpis.messageResponseLag != null ? `${kpis.messageResponseLag.value} min` : 'Not enough data',
        },
      ]
    : [];

  const hasIssues =
    kpis &&
    (kpis.failedPaymentCount.value > 0 ||
      kpis.automationFailureCount.value > 0 ||
      kpis.cancellationRate.value >= 20);

  const rangeLabel = RANGE_OPTIONS.find((o) => o.value === range)?.label ?? range;

  return (
    <OwnerAppShell>
      <LayoutWrapper variant="wide" className="min-w-0">
        <PageHeader
          title="Reports"
          subtitle="Executive summary: revenue, bookings, utilization, and operational health."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                aria-label="Period"
              >
                {RANGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <Link href="/analytics">
                <Button variant="secondary" size="sm">
                  View analytics
                </Button>
              </Link>
            </div>
          }
        />

        {error && (
          <Section>
            <Card className="border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-800">{error}</p>
              <Button size="sm" className="mt-2" onClick={() => void load()}>
                Retry
              </Button>
            </Card>
          </Section>
        )}

        {loading && (
          <Section title="KPIs">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} height={100} />
              ))}
            </div>
          </Section>
        )}

        {!loading && kpis && (
          <>
            <Section title="Key metrics">
              <KpiGrid items={kpiItems} className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" />
            </Section>

            {hasIssues && (
              <Section title="Attention">
                <Card className="border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-800">Items that may need attention this period:</p>
                  <ul className="mt-2 flex flex-wrap gap-3 text-sm">
                    {kpis.failedPaymentCount.value > 0 && (
                      <li>
                        <Link
                          href="/payments?status=failed"
                          className="text-teal-600 hover:underline"
                        >
                          {kpis.failedPaymentCount.value} failed payment{kpis.failedPaymentCount.value !== 1 ? 's' : ''}
                        </Link>
                      </li>
                    )}
                    {kpis.automationFailureCount.value > 0 && (
                      <li>
                        <Link
                          href="/ops/automation-failures"
                          className="text-teal-600 hover:underline"
                        >
                          {kpis.automationFailureCount.value} automation failure{kpis.automationFailureCount.value !== 1 ? 's' : ''}
                        </Link>
                      </li>
                    )}
                    {kpis.cancellationRate.value >= 20 && (
                      <li>
                        <span className="text-slate-700">
                          Cancellation rate at {kpis.cancellationRate.value.toFixed(1)}%
                        </span>
                        <Link href="/bookings" className="ml-1 text-teal-600 hover:underline">
                          View bookings
                        </Link>
                      </li>
                    )}
                  </ul>
                </Card>
              </Section>
            )}

            <Section title="Operational summary">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card className="p-4">
                  <p className="text-xs text-slate-500">Bookings ({rangeLabel})</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{kpis.bookings.value}</p>
                  <Link href="/bookings" className="mt-2 inline-block text-sm text-teal-600 hover:underline">
                    View all bookings →
                  </Link>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-slate-500">Revenue ({rangeLabel})</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    ${kpis.revenue.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <Link href="/payments" className="mt-2 inline-block text-sm text-teal-600 hover:underline">
                    View payments →
                  </Link>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-slate-500">Active sitters</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{kpis.activeSitters.value}</p>
                  <Link href="/sitters" className="mt-2 inline-block text-sm text-teal-600 hover:underline">
                    View sitters →
                  </Link>
                </Card>
              </div>
            </Section>
          </>
        )}

        {!loading && !kpis && !error && (
          <Section>
            <Card className="p-8 text-center text-sm text-slate-500">
              No data available. Select a period or try again later.
            </Card>
          </Section>
        )}
      </LayoutWrapper>
    </OwnerAppShell>
  );
}
