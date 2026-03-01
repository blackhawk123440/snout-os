/**
 * Command Center - Datadog-style owner dashboard
 * KPI grid, needs-attention queue, timeline, map placeholder, AI insights placeholder.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import {
  AppPageHeader,
  AppStatCard,
  AppFilterBar,
  AppSkeletonList,
  AppEmptyState,
  AppErrorState,
  AppCard,
  AppCardHeader,
  AppCardBody,
} from '@/components/app';
import { tokens } from '@/lib/design-tokens';
import { useAuth } from '@/lib/auth-client';
import { motion } from 'framer-motion';

// Stub data
const STUB_KPIS = [
  { label: 'Active Visits', value: 12, icon: 'fas fa-map-marker-alt', trend: 8 },
  { label: 'Open Bookings', value: 47, icon: 'fas fa-calendar-check', trend: -2 },
  { label: 'Revenue YTD', value: '$24,580', icon: 'fas fa-dollar-sign', trend: 14 },
  { label: 'Retention %', value: '92%', icon: 'fas fa-users', trend: 3 },
];

const STUB_NEEDS_ATTENTION = [
  { id: '1', type: 'booking', title: 'Booking #1024 needs sitter assignment', time: '2m ago' },
  { id: '2', type: 'client', title: 'New client inquiry - Jane Doe', time: '15m ago' },
  { id: '3', type: 'visit', title: 'Visit check-in overdue - Max the dog', time: '32m ago' },
];

const STUB_TIMELINE = [
  { id: '1', time: '10:42', text: 'Sitter Sarah checked in at Oak St', type: 'checkin' },
  { id: '2', time: '10:15', text: 'Booking #1023 confirmed', type: 'booking' },
  { id: '3', time: '09:58', text: 'New client registered', type: 'client' },
];

export default function CommandCenterPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login?redirect=/command-center');
      } else if ((user as { sitterId?: string }).sitterId) {
        router.push('/sitter/inbox');
      }
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

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
        title="Command Center"
        subtitle="Real-time overview of your pet care operations"
        action={
          <Link
            href="/bookings"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-teal-600)] px-4 py-2 text-sm font-medium text-white no-underline transition hover:bg-[var(--color-teal-700)]"
          >
            View Bookings
          </Link>
        }
      />

      {error && <AppErrorState message={error} onRetry={() => setError(null)} />}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-neutral-200 bg-neutral-100" />
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* KPI Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {STUB_KPIS.map((kpi, i) => (
              <AppStatCard
                key={kpi.label}
                label={kpi.label}
                value={kpi.value}
                icon={<i className={kpi.icon} />}
                trend={kpi.trend != null ? { value: kpi.trend } : undefined}
              />
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Needs Attention Queue */}
            <AppCard className="lg:col-span-2">
              <AppCardHeader title="Needs Attention" />
              <AppCardBody>
                {STUB_NEEDS_ATTENTION.length === 0 ? (
                  <AppEmptyState message="All caught up" />
                ) : (
                  <ul className="divide-y divide-neutral-100">
                    {STUB_NEEDS_ATTENTION.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                      >
                        <span className="text-sm text-neutral-700">{item.title}</span>
                        <span className="text-xs text-neutral-500">{item.time}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </AppCardBody>
            </AppCard>

            {/* Timeline */}
            <AppCard>
              <AppCardHeader title="Activity Timeline" />
              <AppCardBody>
                {STUB_TIMELINE.length === 0 ? (
                  <AppEmptyState message="No recent activity" />
                ) : (
                  <ul className="space-y-3">
                    {STUB_TIMELINE.map((e) => (
                      <li key={e.id} className="flex gap-3 text-sm">
                        <span className="shrink-0 font-mono text-xs text-neutral-500">{e.time}</span>
                        <span className="text-neutral-700">{e.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </AppCardBody>
            </AppCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Map Placeholder */}
            <AppCard>
              <AppCardHeader title="Live Map" />
              <AppCardBody>
                <div className="flex aspect-video items-center justify-center rounded-lg border-2 border-dashed border-neutral-200 bg-neutral-50 text-neutral-500">
                  Map placeholder
                </div>
              </AppCardBody>
            </AppCard>

            {/* AI Insights Placeholder */}
            <AppCard>
              <AppCardHeader title="AI Insights" />
              <AppCardBody>
                <div className="flex min-h-[200px] items-center justify-center rounded-lg border-2 border-dashed border-neutral-200 bg-neutral-50 text-neutral-500">
                  AI insights placeholder
                </div>
              </AppCardBody>
            </AppCard>
          </div>
        </motion.div>
      )}
    </AppShell>
  );
}
