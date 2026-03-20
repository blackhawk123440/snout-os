'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2, Circle, Calendar, FileText, Repeat, ChevronRight,
  CalendarPlus, Users, PawPrint,
} from 'lucide-react';
import { LayoutWrapper, PageHeader, ClientRefreshButton } from '@/components/layout';
import {
  AppCard,
  AppCardBody,
  AppErrorState,
  AppStatusPill,
} from '@/components/app';
import { EmptyState, PageSkeleton } from '@/components/ui';
import { InteractiveRow } from '@/components/ui/interactive-row';
import { renderClientPreview } from '@/lib/strip-emojis';
import { useClientHome, useClientOnboardingStatus } from '@/lib/api/client-hooks';

export default function ClientHomePage() {
  const router = useRouter();
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

  const { data, isLoading: loading, error, refetch } = useClientHome();
  const { data: onboarding } = useClientOnboardingStatus(!onboardingDismissed);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <LayoutWrapper variant="narrow">
      <PageHeader
        title="Home"
        subtitle="Your pet care hub"
        actions={<ClientRefreshButton onRefresh={refetch} loading={loading} />}
      />
      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <AppErrorState title="Couldn't load" subtitle={error.message || 'Unable to load'} onRetry={() => void refetch()} />
      ) : data ? (
        <div className="flex w-full flex-col gap-4">
          {/* Onboarding checklist */}
          {onboarding && onboarding.completionPercent < 100 && !onboardingDismissed && (
            <AppCard className="border-accent-primary/20 shadow-[0_1px_3px_rgba(28,25,23,0.04),0_0_0_1px_rgba(28,25,23,0.06)]">
              <AppCardBody>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-heading text-sm font-semibold text-text-primary">Complete your profile</p>
                  <button
                    type="button"
                    onClick={() => {
                      setOnboardingDismissed(true);
                      try { localStorage.setItem('snout-onboarding-dismissed', String(Date.now())); } catch {}
                    }}
                    className="min-h-[44px] text-xs text-text-tertiary hover:text-text-secondary transition-colors"
                  >
                    Skip for now
                  </button>
                </div>
                <div className="space-y-1">
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
                      className={`flex items-center gap-3 rounded-lg px-2 py-2 min-h-[44px] text-sm transition-all duration-fast ${
                        item.done
                          ? 'text-text-tertiary'
                          : 'text-text-primary hover:bg-surface-secondary font-medium'
                      }`}
                    >
                      {item.done
                        ? <CheckCircle2 className="w-4.5 h-4.5 text-status-success-fill shrink-0" />
                        : <Circle className="w-4.5 h-4.5 text-text-disabled shrink-0" />
                      }
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
          <AppCard className="w-full shadow-[0_1px_3px_rgba(28,25,23,0.04),0_0_0_1px_rgba(28,25,23,0.06)]">
              <AppCardBody className="flex flex-col gap-3 pb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-text-tertiary" />
                  <p className="font-heading text-sm font-semibold text-text-primary">Next visit</p>
                </div>
                {data.upcomingCount > 0 ? (
                  <>
                    <p className="font-heading text-xl font-bold text-text-primary tabular-nums">
                      {data.upcomingCount} upcoming visit{data.upcomingCount !== 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-text-secondary">Hi, {data.clientName?.split(' ')[0] || 'there'}</p>
                  </>
                ) : (
                  <>
                    <p className="font-heading text-base font-semibold text-text-primary">No upcoming visits</p>
                    <p className="text-sm text-text-secondary">Book your next visit anytime.</p>
                  </>
                )}
                <Link
                  href="/client/bookings/new"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-accent-primary px-4 text-sm font-semibold text-text-inverse transition-all duration-fast hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-2"
                >
                  <CalendarPlus className="w-4 h-4" />
                  Book a visit
                </Link>
                <Link
                  href="/client/meet-greet"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-border-default px-4 text-sm font-medium text-text-secondary transition-all duration-fast hover:bg-surface-secondary"
                >
                  <Users className="w-4 h-4" />
                  Schedule a meet & greet
                </Link>
              </AppCardBody>
            </AppCard>

          {/* Quick Rebook card */}
          <QuickRebookCard />

          {data.latestReport ? (
            <AppCard className="w-full shadow-[0_1px_3px_rgba(28,25,23,0.04),0_0_0_1px_rgba(28,25,23,0.06)] cursor-pointer" onClick={() => router.push(`/client/reports/${data.latestReport!.id}`)}>
              <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2 lg:px-0 lg:pt-0">
                <div className="min-w-0 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-text-tertiary shrink-0" />
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">Latest report</p>
                    <p className="mt-0.5 font-heading font-semibold text-text-primary">{data.latestReport.service || 'Update'}</p>
                  </div>
                </div>
                <Link
                  href="/client/reports"
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  All reports
                  <ChevronRight className="w-3.5 h-3.5" />
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
              <h2 className="mb-2 font-heading text-sm font-semibold tracking-tight text-text-primary">Upcoming & recent</h2>
              <div className="w-full overflow-hidden rounded-xl border border-border-default bg-surface-primary lg:rounded-lg">
                {data.recentBookings.map((b) => (
                  <InteractiveRow
                    key={b.id}
                    aria-label={`View booking ${b.service}`}
                    onClick={() => router.push(`/client/bookings/${b.id}`)}
                    className="last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-primary">{b.service}</p>
                      <p className="truncate text-xs text-text-tertiary tabular-nums">{formatDate(b.startAt)}</p>
                    </div>
                    <div className="flex shrink-0">
                      <AppStatusPill status={b.status} />
                    </div>
                  </InteractiveRow>
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

function QuickRebookCard() {
  const router = useRouter();
  const { data } = useQuery({
    queryKey: ['client', 'quick-rebook'],
    queryFn: async () => {
      const res = await fetch('/api/client/quick-rebook');
      return res.ok ? res.json() : null;
    },
    staleTime: 300000,
  });

  if (!data?.canQuickRebook || !data.lastBooking) return null;

  return (
    <AppCard className="w-full border-accent-primary/20 shadow-[0_1px_3px_rgba(28,25,23,0.04),0_0_0_1px_rgba(28,25,23,0.06)]">
      <AppCardBody>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Repeat className="w-3.5 h-3.5 text-text-tertiary" />
              <p className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">Quick rebook</p>
            </div>
            <p className="font-heading font-semibold text-text-primary">{data.suggestedService || data.lastBooking.service}</p>
            {data.suggestedSitter && (
              <p className="text-sm text-text-secondary">with {data.suggestedSitter.name}</p>
            )}
            {data.suggestedDay && data.suggestedTime && (
              <p className="text-xs text-text-tertiary mt-1">
                You usually book on {data.suggestedDay}s at {data.suggestedTime}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => router.push(`/client/bookings/new?rebookFrom=${data.lastBooking.id}`)}
            className="min-h-[44px] rounded-lg bg-accent-primary px-4 text-sm font-semibold text-text-inverse hover:brightness-90 transition-all duration-fast"
          >
            Book Again
          </button>
        </div>
      </AppCardBody>
    </AppCard>
  );
}
