'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Circle, Repeat } from 'lucide-react';
import { LayoutWrapper, ClientRefreshButton } from '@/components/layout';
import {
  AppErrorState,
  AppStatusPill,
} from '@/components/app';
import { PageSkeleton } from '@/components/ui';
import { renderClientPreview } from '@/lib/strip-emojis';
import { useClientHome, useClientOnboardingStatus } from '@/lib/api/client-hooks';

export default function ClientHomePage() {
  const router = useRouter();
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

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
  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const firstName = data?.clientName?.split(' ')[0] || 'there';
  const upcomingBookings = data?.recentBookings?.filter(b =>
    ['pending', 'confirmed', 'scheduled'].includes(b.status.toLowerCase())
  ) || [];
  const nextVisit = upcomingBookings[0];

  return (
    <LayoutWrapper variant="narrow">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-end mb-2">
          <ClientRefreshButton onRefresh={refetch} loading={loading} />
        </div>

        {loading ? (
          <PageSkeleton />
        ) : error ? (
          <AppErrorState title="Couldn't load" subtitle={error.message || 'Unable to load'} onRetry={() => void refetch()} />
        ) : data ? (
          <div className="flex flex-col">
            {/* SECTION 1: Greeting */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-text-primary font-heading">
                Welcome back, {firstName}
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                Here&apos;s what&apos;s happening with your pets
              </p>
            </div>

            {/* Onboarding checklist */}
            {onboarding && onboarding.completionPercent < 100 && !onboardingDismissed && (
              <div className="rounded-2xl border border-border-default bg-white p-5 shadow-[var(--shadow-card)] mb-8">
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
                  <div className="h-full rounded-full bg-[#c2410c] transition-[width]" style={{ width: `${onboarding.completionPercent}%` }} />
                </div>
              </div>
            )}

            {/* SECTION 2: Next Visit Hero Card */}
            {nextVisit ? (
              <div className="rounded-2xl border border-border-default bg-white p-6 shadow-[var(--shadow-md)] mb-8">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary mb-1">Next visit</p>
                    <h2 className="text-xl font-bold text-text-primary font-heading">
                      {nextVisit.service}
                    </h2>
                    <p className="text-sm text-text-secondary mt-1 tabular-nums">
                      {formatDate(nextVisit.startAt)} at {formatTime(nextVisit.startAt)}
                    </p>
                  </div>
                  <div className="shrink-0 ml-4">
                    <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center">
                      <span className="text-lg font-semibold text-orange-700">{nextVisit.service?.[0] || 'V'}</span>
                    </div>
                  </div>
                </div>
                <Link href={`/client/bookings/${nextVisit.id}`}>
                  <button className="w-full rounded-xl bg-[#c2410c] text-white font-semibold py-3.5 text-base hover:bg-[#9a3412] active:scale-[0.98] transition-all duration-150">
                    View details
                  </button>
                </Link>
              </div>
            ) : (
              <div className="rounded-2xl border border-border-default bg-white p-8 shadow-[var(--shadow-md)] mb-8 text-center">
                <h2 className="text-xl font-bold text-text-primary font-heading mb-2">
                  No upcoming visits
                </h2>
                <p className="text-sm text-text-secondary mb-6 max-w-sm mx-auto">
                  Book a visit and we&apos;ll take great care of them.
                </p>
                <div className="flex flex-col gap-3 max-w-sm mx-auto">
                  <Link href="/client/bookings/new">
                    <button className="w-full rounded-xl bg-[#c2410c] text-white font-semibold py-3.5 text-base hover:bg-[#9a3412] active:scale-[0.98] transition-all duration-150">
                      Book a visit
                    </button>
                  </Link>
                  <Link href="/client/meet-greet">
                    <button className="w-full rounded-xl bg-white text-text-primary border border-border-default font-medium py-3 text-sm hover:bg-surface-secondary transition-all duration-150">
                      Schedule a meet &amp; greet
                    </button>
                  </Link>
                </div>
              </div>
            )}

            {/* SECTION 3: Latest Report Card */}
            {data.latestReport && (() => {
              const reportPhotoUrl = (() => {
                if (!data.latestReport!.mediaUrls) return null;
                try {
                  const parsed = typeof data.latestReport!.mediaUrls === 'string' ? JSON.parse(data.latestReport!.mediaUrls) : data.latestReport!.mediaUrls;
                  return Array.isArray(parsed) && typeof parsed[0] === 'string' ? parsed[0] : null;
                } catch { return null; }
              })();
              return (
              <div
                className="rounded-2xl border border-border-default bg-white overflow-hidden shadow-[var(--shadow-card)] mb-8 cursor-pointer"
                onClick={() => router.push(`/client/reports/${data.latestReport!.id}`)}
              >
                {reportPhotoUrl && (
                  <img src={reportPhotoUrl} alt="Visit photo" className="w-full h-48 object-cover" />
                )}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">Latest report</p>
                    <Link href="/client/reports" onClick={(e) => e.stopPropagation()} className="text-xs font-medium text-[#c2410c] hover:underline">
                      All reports →
                    </Link>
                  </div>
                  <h3 className="text-base font-semibold text-text-primary">{data.latestReport.service || 'Update'}</h3>
                  <p className="text-sm text-text-secondary mt-1 line-clamp-2">
                    {renderClientPreview(data.latestReport.content)}
                  </p>
                  <p className="text-xs text-text-tertiary mt-2 tabular-nums">
                    {new Date(data.latestReport.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              );
            })()}

            {/* SECTION 4: Quick Rebook */}
            <QuickRebookCard />

            {/* SECTION 5: Upcoming & Recent */}
            {data.recentBookings?.length > 0 && (
              <section aria-label="Upcoming and recent visits">
                <h2 className="mb-3 font-heading text-sm font-semibold tracking-tight text-text-primary">Upcoming &amp; recent</h2>
                <div className="rounded-2xl border border-border-default bg-white overflow-hidden shadow-[var(--shadow-card)]">
                  {data.recentBookings.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => router.push(`/client/bookings/${b.id}`)}
                      className="flex items-center justify-between py-3.5 px-4 border-b border-border-muted last:border-0 cursor-pointer hover:bg-surface-secondary transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-text-primary">{b.service}</p>
                        <p className="text-xs text-text-tertiary tabular-nums">{formatDate(b.startAt)}</p>
                      </div>
                      <AppStatusPill status={b.status} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {!data.latestReport && (!data.recentBookings || data.recentBookings.length === 0) && (
              <div className="rounded-2xl border border-border-default bg-white p-12 text-center">
                <h2 className="text-lg font-semibold text-text-primary mb-2">No activity yet</h2>
                <p className="text-sm text-text-secondary max-w-xs mx-auto mb-6">
                  Book your first visit and your sitter will share updates here.
                </p>
                <Link href="/client/bookings/new">
                  <button className="rounded-xl bg-[#c2410c] text-white font-semibold px-6 py-3 text-sm hover:bg-[#9a3412] active:scale-[0.98] transition-all">
                    Book a visit
                  </button>
                </Link>
              </div>
            )}
          </div>
        ) : null}
      </div>
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
    <div className="rounded-2xl border border-border-default bg-white p-5 shadow-[var(--shadow-card)] mb-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Repeat className="w-3.5 h-3.5 text-text-tertiary" />
            <p className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">Quick rebook</p>
          </div>
          <p className="font-heading font-semibold text-text-primary">
            {data.suggestedService || data.lastBooking.service}
          </p>
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
          className="min-h-[44px] rounded-xl bg-[#c2410c] px-4 text-sm font-semibold text-white hover:bg-[#9a3412] transition-all duration-150"
        >
          Book Again
        </button>
      </div>
    </div>
  );
}
