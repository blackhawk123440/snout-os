'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppCard, AppCardBody } from '@/components/app';
import { renderClientPreview } from '@/lib/strip-emojis';

interface HomeData {
  upcomingCount: number;
  recentBookings: Array<{ id: string; service: string; startAt: string; status: string }>;
  latestReport?: { id: string; content: string; createdAt: string; service?: string } | null;
}

interface BillingData {
  invoices: Array<{ id: string; paymentStatus: string }>;
  loyalty: { points: number; tier: string };
}

export function ClientAtAGlanceSidebar() {
  const router = useRouter();
  const [home, setHome] = useState<HomeData | null>(null);
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [homeRes, billingRes] = await Promise.all([
        fetch('/api/client/home'),
        fetch('/api/client/billing'),
      ]);
      const homeJson = await homeRes.json().catch(() => ({}));
      const billingJson = await billingRes.json().catch(() => ({}));
      if (homeRes.ok && homeJson) {
        setHome({
          upcomingCount: homeJson.upcomingCount ?? 0,
          recentBookings: homeJson.recentBookings ?? [],
          latestReport: homeJson.latestReport ?? null,
        });
      } else {
        setHome(null);
      }
      if (billingRes.ok && billingJson) {
        setBilling({
          invoices: billingJson.invoices ?? [],
          loyalty: billingJson.loyalty ?? { points: 0, tier: '—' },
        });
      } else {
        setBilling(null);
      }
    } catch {
      setHome(null);
      setBilling(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <aside className="w-full space-y-3 lg:block lg:w-72 lg:shrink-0 lg:space-y-3">
        <div className="h-16 animate-pulse rounded-xl bg-slate-200 lg:rounded-lg" />
        <div className="h-16 animate-pulse rounded-xl bg-slate-200 lg:rounded-lg" />
        <div className="h-16 animate-pulse rounded-xl bg-slate-200 lg:rounded-lg" />
      </aside>
    );
  }

  const nextVisit = home && (home.upcomingCount > 0 || home.recentBookings?.length > 0);
  const latestReport = home?.latestReport;
  const unpaidCount = billing?.invoices?.filter((i) => i.paymentStatus === 'unpaid').length ?? 0;

  return (
    <aside className="w-full space-y-4 lg:w-72 lg:shrink-0 lg:space-y-3">
      <AppCard className="shadow-sm">
        <AppCardBody className="py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Next visit</p>
          {nextVisit ? (
            <>
              <p className="mt-1 font-semibold tabular-nums text-slate-900">
                {home!.upcomingCount} upcoming
              </p>
              <Link
                href="/client/bookings"
                className="mt-1.5 inline-block text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                View bookings
              </Link>
            </>
          ) : (
            <p className="mt-1 text-sm text-slate-500">No upcoming visits</p>
          )}
        </AppCardBody>
      </AppCard>

      <AppCard
        className="cursor-pointer shadow-sm"
        onClick={() => latestReport && router.push(`/client/reports/${latestReport.id}`)}
      >
        <AppCardBody className="py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Latest report</p>
          {latestReport ? (
            <>
              <p className="mt-1 line-clamp-2 text-sm text-slate-700">
                {renderClientPreview(latestReport.content)}
              </p>
              <Link
                href="/client/reports"
                onClick={(e) => e.stopPropagation()}
                className="mt-1.5 inline-block text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                All reports
              </Link>
            </>
          ) : (
            <p className="mt-1 text-sm text-slate-500">No reports yet</p>
          )}
        </AppCardBody>
      </AppCard>

      <AppCard className="shadow-sm">
        <AppCardBody className="py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Billing</p>
          {billing ? (
            <>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {billing.loyalty.points} points · {billing.loyalty.tier}
              </p>
              {unpaidCount > 0 ? (
                <Link
                  href="/client/billing"
                  className="mt-1.5 inline-block text-sm font-medium text-amber-600 hover:text-amber-700"
                >
                  {unpaidCount} unpaid invoice{unpaidCount !== 1 ? 's' : ''}
                </Link>
              ) : (
                <Link
                  href="/client/billing"
                  className="mt-1.5 inline-block text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  View billing
                </Link>
              )}
            </>
          ) : (
            <p className="mt-1 text-sm text-slate-500">—</p>
          )}
        </AppCardBody>
      </AppCard>
    </aside>
  );
}
