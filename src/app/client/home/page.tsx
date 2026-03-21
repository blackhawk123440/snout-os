'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Circle } from 'lucide-react';
import { LayoutWrapper, ClientRefreshButton } from '@/components/layout';
import { AppErrorState } from '@/components/app';
import { Button, PageSkeleton } from '@/components/ui';
import { renderClientPreview } from '@/lib/strip-emojis';
import { useClientHome, useClientOnboardingStatus } from '@/lib/api/client-hooks';

function statusBadge(status: string) {
  const s = status.toLowerCase();
  let cls = 'bg-surface-secondary text-text-secondary';
  let label = status;
  if (s === 'pending' || s === 'requested') { cls = 'bg-status-warning-bg text-status-warning-text border border-status-warning-border'; label = 'Pending'; }
  else if (s === 'confirmed' || s === 'scheduled') { cls = 'bg-status-success-bg text-status-success-text border border-status-success-border'; label = 'Confirmed'; }
  else if (s === 'completed') { cls = 'bg-surface-secondary text-text-secondary'; label = 'Completed'; }
  else if (s === 'cancelled' || s === 'canceled') { cls = 'bg-status-danger-bg text-status-danger-text border border-status-danger-border'; label = 'Cancelled'; }
  return <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${cls}`}>{label}</span>;
}

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
      <div className="max-w-xl mx-auto pt-2">
        <div className="flex justify-end mb-1">
          <ClientRefreshButton onRefresh={refetch} loading={loading} />
        </div>

        {loading ? (
          <PageSkeleton />
        ) : error ? (
          <AppErrorState title="Couldn't load" subtitle={error.message || 'Unable to load'} onRetry={() => void refetch()} />
        ) : data ? (
          <div className="space-y-6">
            {/* Greeting */}
            <div className="mb-2">
              <h1 className="text-[28px] font-bold tracking-tight text-text-primary font-heading leading-tight">
                Welcome back, {firstName}
              </h1>
              <p className="text-[15px] text-text-secondary mt-1 font-normal">
                Here&apos;s what&apos;s happening with your pets
              </p>
            </div>

            {/* Onboarding checklist */}
            {onboarding && onboarding.completionPercent < 100 && !onboardingDismissed && (
              <div className="rounded-2xl border border-border-default bg-surface-primary p-5 shadow-[0_1px_3px_rgba(28,25,23,0.03)]">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[14px] font-semibold text-text-primary font-heading">Complete your profile</p>
                  <button
                    type="button"
                    onClick={() => {
                      setOnboardingDismissed(true);
                      try { localStorage.setItem('snout-onboarding-dismissed', String(Date.now())); } catch {}
                    }}
                    className="min-h-[44px] text-[12px] text-text-tertiary hover:text-text-secondary transition-colors"
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
                      className={`flex items-center gap-3 rounded-lg px-2 py-2 min-h-[44px] text-[14px] transition-all duration-fast ${
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
              </div>
            )}

            {/* Next Visit Hero Card */}
            {nextVisit ? (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent-secondary via-surface-primary to-accent-secondary/30 border border-accent-secondary p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-accent-primary/60 mb-2">Next visit</p>
                    <h2 className="text-[22px] font-bold text-text-primary font-heading leading-snug">
                      {nextVisit.service}
                    </h2>
                    <p className="text-[14px] text-text-secondary mt-1">
                      {formatDate(nextVisit.startAt)} at {formatTime(nextVisit.startAt)}
                    </p>
                  </div>
                  <div className="w-[56px] h-[56px] rounded-2xl bg-accent-secondary flex items-center justify-center shadow-sm ring-2 ring-surface-primary">
                    <span className="text-[22px] font-bold text-accent-primary">{nextVisit.service?.[0] || 'V'}</span>
                  </div>
                </div>
                <div className="mt-5">
                  <Link href={`/client/bookings/${nextVisit.id}`}>
                    <Button variant="primary" size="md">View details</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-gradient-to-br from-stone-50 to-white border border-stone-100 p-8 text-center shadow-[0_1px_4px_rgba(28,25,23,0.04)]">
                <h2 className="text-[20px] font-bold text-text-primary font-heading mb-1.5">No upcoming visits</h2>
                <p className="text-[14px] text-text-secondary mb-5 max-w-[280px] mx-auto leading-relaxed">
                  Book a visit and we&apos;ll take great care of them.
                </p>
                <Link href="/client/bookings/new">
                  <Button variant="primary" size="md">Book a visit</Button>
                </Link>
                <div className="mt-3">
                  <Link href="/client/meet-greet" className="text-[13px] font-medium text-text-tertiary hover:text-text-secondary transition-colors">
                    or schedule a meet &amp; greet
                  </Link>
                </div>
              </div>
            )}

            {/* Latest Report Card */}
            {data.latestReport && (() => {
              const reportPhotoUrl = (() => {
                if (!data.latestReport!.mediaUrls) return null;
                try {
                  const parsed = typeof data.latestReport!.mediaUrls === 'string' ? JSON.parse(data.latestReport!.mediaUrls) : data.latestReport!.mediaUrls;
                  return Array.isArray(parsed) && typeof parsed[0] === 'string' ? parsed[0] : null;
                } catch { return null; }
              })();
              return reportPhotoUrl ? (
                <div
                  className="rounded-2xl border border-border-default bg-surface-primary overflow-hidden shadow-[0_1px_3px_rgba(28,25,23,0.03)] cursor-pointer"
                  onClick={() => router.push(`/client/reports/${data.latestReport!.id}`)}
                >
                  <img src={reportPhotoUrl} alt="Visit photo" className="w-full h-[180px] object-cover" />
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">Latest report</p>
                      <Link href="/client/reports" onClick={(e) => e.stopPropagation()} className="text-[12px] font-medium text-accent-primary hover:underline">
                        All reports
                      </Link>
                    </div>
                    <h3 className="text-[16px] font-semibold text-text-primary">{data.latestReport.service || 'Update'}</h3>
                    <p className="text-[14px] text-text-secondary mt-1 leading-relaxed line-clamp-2">
                      {renderClientPreview(data.latestReport.content)}
                    </p>
                    <p className="text-[12px] text-text-tertiary mt-2 tabular-nums">
                      {new Date(data.latestReport.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  className="rounded-2xl border border-border-default bg-surface-primary p-5 shadow-[0_1px_3px_rgba(28,25,23,0.03)] cursor-pointer"
                  onClick={() => router.push(`/client/reports/${data.latestReport!.id}`)}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">Latest report</p>
                    <Link href="/client/reports" onClick={(e) => e.stopPropagation()} className="text-[12px] font-medium text-accent-primary hover:underline">
                      All reports
                    </Link>
                  </div>
                  <h3 className="text-[16px] font-semibold text-text-primary">{data.latestReport.service || 'Update'}</h3>
                  <p className="text-[14px] text-text-secondary mt-1 leading-relaxed line-clamp-2">
                    {renderClientPreview(data.latestReport.content)}
                  </p>
                  <p className="text-[12px] text-text-tertiary mt-2 tabular-nums">
                    {new Date(data.latestReport.createdAt).toLocaleDateString()}
                  </p>
                </div>
              );
            })()}

            {/* Quick Rebook */}
            <QuickRebookCard />

            {/* Upcoming & Recent */}
            {data.recentBookings?.length > 0 && (
              <section aria-label="Upcoming and recent visits">
                <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-text-tertiary mb-3">Upcoming &amp; recent</h3>
                <div className="rounded-2xl border border-border-default bg-surface-primary divide-y divide-border-muted shadow-[0_1px_3px_rgba(28,25,23,0.03)]">
                  {data.recentBookings.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => router.push(`/client/bookings/${b.id}`)}
                      className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-surface-secondary transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                    >
                      <div>
                        <p className="text-[14px] font-medium text-text-primary">{b.service}</p>
                        <p className="text-[12px] text-text-tertiary tabular-nums mt-0.5">{formatDate(b.startAt)}</p>
                      </div>
                      {statusBadge(b.status)}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Fallback empty state */}
            {!data.latestReport && (!data.recentBookings || data.recentBookings.length === 0) && (
              <div className="rounded-2xl bg-gradient-to-br from-stone-50 to-white border border-stone-100 p-8 text-center shadow-[0_1px_4px_rgba(28,25,23,0.04)]">
                <h2 className="text-[20px] font-bold text-text-primary font-heading mb-1.5">No activity yet</h2>
                <p className="text-[14px] text-text-secondary mb-5 max-w-[280px] mx-auto leading-relaxed">
                  Book your first visit and your sitter will share updates here.
                </p>
                <Link href="/client/bookings/new">
                  <Button variant="primary" size="md">Book a visit</Button>
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
    <div className="rounded-2xl border border-border-default bg-surface-primary p-5 shadow-[0_1px_3px_rgba(28,25,23,0.03)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary mb-2">Quick rebook</p>
      <h3 className="text-[16px] font-semibold text-text-primary">
        {data.suggestedService || data.lastBooking.service}
      </h3>
      {data.suggestedSitter && (
        <p className="text-[13px] text-text-secondary mt-0.5">with {data.suggestedSitter.name}</p>
      )}
      <p className="text-[13px] text-text-tertiary mt-0.5">Based on your booking history</p>
      <div className="mt-4">
        <Button variant="primary" size="md" onClick={() => router.push(`/client/bookings/new?rebookFrom=${data.lastBooking.id}`)}>Book again</Button>
      </div>
    </div>
  );
}
