'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { OwnerAppShell, LayoutWrapper, PageHeader, Section } from '@/components/layout';
import { Card, EmptyState, Skeleton, StatusChip, Button } from '@/components/ui';

type OpsMetrics = {
  activeVisitsCount: number;
  openBookingsCount: number;
  revenueYTD: number;
  retentionRate: number;
};

type AttentionPayload = { alerts?: Array<{ id: string }>; staffing?: Array<{ id: string }> };

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<OpsMetrics | null>(null);
  const [attention, setAttention] = useState<AttentionPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [metricsRes, attentionRes] = await Promise.all([
        fetch('/api/ops/metrics'),
        fetch('/api/ops/command-center/attention'),
      ]);
      const metricsJson = await metricsRes.json().catch(() => ({}));
      const attentionJson = await attentionRes.json().catch(() => ({}));
      if (metricsRes.ok) {
        setMetrics({
          activeVisitsCount: Number(metricsJson.activeVisitsCount || 0),
          openBookingsCount: Number(metricsJson.openBookingsCount || 0),
          revenueYTD: Number(metricsJson.revenueYTD || 0),
          retentionRate: Number(metricsJson.retentionRate || 0),
        });
      } else {
        setMetrics({ activeVisitsCount: 0, openBookingsCount: 0, revenueYTD: 0, retentionRate: 0 });
      }
      if (attentionRes.ok) {
        setAttention({
          alerts: Array.isArray(attentionJson.alerts) ? attentionJson.alerts : [],
          staffing: Array.isArray(attentionJson.staffing) ? attentionJson.staffing : [],
        });
      } else {
        setAttention({ alerts: [], staffing: [] });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const health = useMemo(() => {
    if (!attention) return { alerts: 0, staffing: 0, total: 0 };
    const alerts = attention.alerts?.length || 0;
    const staffing = attention.staffing?.length || 0;
    return { alerts, staffing, total: alerts + staffing };
  }, [attention]);

  return (
    <OwnerAppShell>
      <LayoutWrapper variant="wide">
        <PageHeader
          title="Overview"
          subtitle="Business health snapshot, operator alerts, and next actions."
          actions={
            <Link href="/bookings/new">
              <Button size="sm">New booking</Button>
            </Link>
          }
        />

        <Section title="Health snapshot">
          {loading ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Skeleton height={96} />
              <Skeleton height={96} />
              <Skeleton height={96} />
              <Skeleton height={96} />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <p className="text-xs text-slate-500">Active visits</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{metrics?.activeVisitsCount ?? 0}</p>
              </Card>
              <Card>
                <p className="text-xs text-slate-500">Open bookings</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{metrics?.openBookingsCount ?? 0}</p>
              </Card>
              <Card>
                <p className="text-xs text-slate-500">Revenue YTD</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">
                  ${Math.round(metrics?.revenueYTD ?? 0).toLocaleString()}
                </p>
                {(metrics?.revenueYTD ?? 0) === 0 && (metrics?.openBookingsCount ?? 0) > 0 && (
                  <p className="mt-0.5 text-xs text-slate-500">No collected payments yet</p>
                )}
              </Card>
              <Card>
                <p className="text-xs text-slate-500">Retention</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{Math.round(metrics?.retentionRate ?? 0)}%</p>
                {(metrics?.retentionRate ?? 0) === 0 && (metrics?.openBookingsCount ?? 0) > 0 && (
                  <p className="mt-0.5 text-xs text-slate-500">No repeat clients yet</p>
                )}
              </Card>
            </div>
          )}
        </Section>

        <Section title="Priority queues">
          {loading ? (
            <Skeleton height={120} />
          ) : health.total === 0 ? (
            <EmptyState
              title="No active queue items"
              description="All current command-center queues are clear."
              primaryAction={{ label: 'Open command center', onClick: () => (window.location.href = '/command-center') }}
            />
          ) : (
            <Card>
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip variant="danger">Alerts: {health.alerts}</StatusChip>
                <StatusChip variant="warning">Staffing: {health.staffing}</StatusChip>
                <StatusChip variant="info">Total attention: {health.total}</StatusChip>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/command-center">
                  <Button variant="secondary" size="sm">
                    Open command center
                  </Button>
                </Link>
                <Link href="/ops/automation-failures">
                  <Button variant="secondary" size="sm">
                    Automation failures
                  </Button>
                </Link>
                <Link href="/ops/payouts">
                  <Button variant="secondary" size="sm">
                    Payout operations
                  </Button>
                </Link>
              </div>
            </Card>
          )}
        </Section>
      </LayoutWrapper>
    </OwnerAppShell>
  );
}
