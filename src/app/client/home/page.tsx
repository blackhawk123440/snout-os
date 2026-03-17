'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutWrapper, PageHeader, ClientRefreshButton } from '@/components/layout';
import {
  AppCard,
  AppCardBody,
  AppErrorState,
  AppStatusPill,
} from '@/components/app';
import { EmptyState, PageSkeleton } from '@/components/ui';
import { renderClientPreview } from '@/lib/strip-emojis';

interface HomeData {
  clientName: string;
  upcomingCount: number;
  recentBookings: Array<{
    id: string;
    service: string;
    startAt: string;
    status: string;
  }>;
  latestReport?: {
    id: string;
    content: string;
    createdAt: string;
    service?: string;
  } | null;
}

interface OnboardingStatus {
  hasAccount: boolean;
  hasPets: boolean;
  hasEmergencyContact: boolean;
  hasAddress: boolean;
  hasHomeAccess: boolean;
  completionPercent: number;
}

export default function ClientHomePage() {
  const router = useRouter();
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  // Check localStorage for dismiss state
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('snout-onboarding-dismissed');
      if (dismissed) {
        const ts = parseInt(dismissed, 10);
        if (Date.now() - ts < 7 * 24 * 60 * 60 * 1000) setOnboardingDismissed(true);
      }
    } catch { /* ignore */ }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/client/home');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Unable to load');
        setData(null);
        return;
      }
      setData(json);
    } catch {
      setError('Unable to load');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    // Load onboarding status
    if (!onboardingDismissed) {
      fetch('/api/client/onboarding-status')
        .then((r) => r.ok ? r.json() : null)
        .then((d) => { if (d) setOnboarding(d); })
        .catch(() => {});
    }
  }, [load, onboardingDismissed]);

  // Poll reports every 45s for real-time feed
  useEffect(() => {
    const interval = setInterval(load, 45000);
    return () => clearInterval(interval);
  }, [load]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <LayoutWrapper variant="narrow">
      <PageHeader
        title="Home"
        subtitle="Your pet care hub"
        actions={<ClientRefreshButton onRefresh={load} loading={loading} />}
      />
      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <AppErrorState title="Couldn't load" subtitle={error} onRetry={() => void load()} />
      ) : data ? (
        <div className="flex w-full flex-col gap-4">
          {/* Onboarding checklist */}
          {onboarding && onboarding.completionPercent < 100 && !onboardingDismissed && (
            <AppCard className="border-accent-primary/30">
              <AppCardBody>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-text-primary">Complete your profile</p>
                  <button
                    type="button"
                    onClick={() => {
                      setOnboardingDismissed(true);
                      try { localStorage.setItem('snout-onboarding-dismissed', String(Date.now())); } catch {}
                    }}
                    className="min-h-[44px] text-xs text-text-tertiary hover:text-text-secondary"
                  >
                    Skip for now
                  </button>
                </div>
                <div className="space-y-2">
                  {[
                    { done: onboarding.hasAccount, label: 'Create account', href: '#' },
                    { done: onboarding.hasPets, label: `Add your pets${onboarding.hasPets ? '' : ' (0/1)'}`, href: '/client/pets/new' },
                    { done: onboarding.hasEmergencyContact, label: 'Add emergency contact', href: '/client/profile' },
                    { done: onboarding.hasAddress, label: 'Add home address', href: '/client/profile' },
                    { done: onboarding.hasHomeAccess, label: 'Add home access info', href: '/client/profile' },
                  ].map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-2 py-1.5 min-h-[44px] text-sm transition ${
                        item.done
                          ? 'text-text-tertiary'
                          : 'text-text-primary hover:bg-surface-secondary font-medium'
                      }`}
                    >
                      <span className="text-base">{item.done ? '\u2611' : '\u2610'}</span>
                      <span className={item.done ? 'line-through' : ''}>{item.label}</span>
                    </Link>
                  ))}
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-tertiary">
                  <div className="h-full rounded-full bg-accent-primary transition-[width]" style={{ width: `${onboarding.completionPercent}%` }} />
                </div>
              </AppCardBody>
            </AppCard>
          )}

          {/* App-style feed: Next visit → Latest report → Upcoming & recent */}
          <AppCard className="shadow-sm w-full">
              <AppCardBody className="flex flex-col gap-3 pb-4">
                <p className="text-sm font-semibold text-text-primary">Next visit</p>
                {data.upcomingCount > 0 ? (
                  <>
                    <p className="text-base font-medium text-text-primary">
                      {data.upcomingCount} upcoming visit{data.upcomingCount !== 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-text-secondary">Hi, {data.clientName?.split(' ')[0] || 'there'}</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-text-primary">No upcoming visits</p>
                    <p className="text-sm text-text-secondary">Book your next visit anytime.</p>
                  </>
                )}
                <Link
                  href="/client/bookings/new"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-surface-inverse px-4 text-sm font-medium text-text-inverse transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-2"
                >
                  Book a visit
                </Link>
              </AppCardBody>
            </AppCard>

          {data.latestReport ? (
            <AppCard className="w-full" onClick={() => router.push(`/client/reports/${data.latestReport!.id}`)}>
              <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2 lg:px-0 lg:pt-0">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">Latest report</p>
                  <p className="mt-0.5 font-semibold text-text-primary">{data.latestReport.service || 'Update'}</p>
                </div>
                <Link
                  href="/client/reports"
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 text-sm text-text-secondary hover:text-text-primary hover:underline"
                >
                  All reports
                </Link>
              </div>
              <AppCardBody className="relative">
                <p className="line-clamp-2 text-sm text-text-secondary">
                  {renderClientPreview(data.latestReport.content)}
                </p>
                <p className="mt-2 text-right text-xs text-text-tertiary tabular-nums">
                  {new Date(data.latestReport.createdAt).toLocaleDateString()}
                </p>
              </AppCardBody>
            </AppCard>
          ) : (
            <div className="w-full">
              <EmptyState
                title="No visit reports yet"
                description="After each visit, your sitter will share an update here."
                primaryAction={{ label: 'View bookings', onClick: () => router.push('/client/bookings') }}
              />
            </div>
          )}

          {data.recentBookings?.length > 0 ? (
            <section className="w-full" aria-label="Upcoming and recent visits">
              <h2 className="mb-2 text-sm font-semibold tracking-tight text-text-primary">Upcoming & recent</h2>
              <div className="w-full overflow-hidden rounded-xl border border-border-default bg-surface-primary lg:rounded-lg">
                {data.recentBookings.map((b) => (
                  <div
                    key={b.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`View booking ${b.service}`}
                    onClick={() => router.push(`/client/bookings/${b.id}`)}
                    onKeyDown={(e) => e.key === 'Enter' && router.push(`/client/bookings/${b.id}`)}
                    className="flex min-h-[56px] cursor-pointer items-center gap-3 border-b border-border-default px-4 py-1.5 last:border-b-0 hover:bg-surface-secondary active:bg-surface-tertiary lg:min-h-[44px]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-primary">{b.service}</p>
                      <p className="truncate text-xs text-text-tertiary tabular-nums">{formatDate(b.startAt)}</p>
                    </div>
                    <div className="flex shrink-0">
                      <AppStatusPill status={b.status} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <div className="w-full">
              <EmptyState
                title="No upcoming visits"
                description="Book your next visit anytime."
                primaryAction={{ label: 'Book a visit', onClick: () => router.push('/client/bookings/new') }}
              />
            </div>
          )}
        </div>
      ) : null}
    </LayoutWrapper>
  );
}
