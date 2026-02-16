/**
 * Sitter Dashboard
 * 
 * Action-first operational dashboard for sitters
 * Answers: What requires my action right now?
 */

'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, Card, Button, Skeleton } from '@/components/ui';
import { useAuth } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { tokens } from '@/lib/design-tokens';
import Link from 'next/link';
import { useSitterDashboard } from '@/lib/api/sitter-dashboard-hooks';
import { PendingRequests } from '@/components/sitter/PendingRequests';
import { UpcomingBookings } from '@/components/sitter/UpcomingBookings';
import { CompletedBookings } from '@/components/sitter/CompletedBookings';
import { PerformanceSnapshot } from '@/components/sitter/PerformanceSnapshot';
import { StatusAvailability } from '@/components/sitter/StatusAvailability';
import { MessagingInboxCard } from '@/components/sitter/MessagingInboxCard';
import { SitterSRSCard } from '@/components/sitter/SitterSRSCard';

function SitterDashboardContent() {
  const { user, isSitter, loading: authLoading } = useAuth();
  const router = useRouter();
  const sitterId = (user as any)?.sitterId;

  const { data: dashboardData, isLoading: dashboardLoading } = useSitterDashboard(sitterId);

  if (authLoading || dashboardLoading) {
    return (
      <AppShell>
        <PageHeader title="Sitter Dashboard" />
        <div style={{ padding: tokens.spacing[4] }}>
          <Skeleton height={400} />
        </div>
      </AppShell>
    );
  }

  if (!isSitter) {
    router.push('/messages');
    return null;
  }

  if (!sitterId) {
    return (
      <AppShell>
        <PageHeader title="Sitter Dashboard" />
        <div style={{ padding: tokens.spacing[4] }}>
          <div>Unable to load dashboard. Please try logging in again.</div>
        </div>
      </AppShell>
    );
  }

  const hasPendingRequests = (dashboardData?.pendingRequests?.length ?? 0) > 0;
  const totalEarnings = dashboardData?.completedBookings?.reduce((sum, b) => sum + (b.totalPrice * 0.8), 0) ?? null;

  return (
    <AppShell>
      <PageHeader
        title="Sitter Dashboard"
        description="Your bookings, messages, and performance at a glance"
        actions={
          <Link href="/api/auth/signout">
            <Button variant="secondary" size="sm">Logout</Button>
          </Link>
        }
      />
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4], padding: tokens.spacing[4] }}>
        {/* Status & Availability - Always rendered */}
        <StatusAvailability 
          isAvailable={dashboardData?.isAvailable ?? true}
          sitterId={sitterId}
        />

        {/* Pending Requests - Always rendered, shows empty state if none */}
        <PendingRequests 
          bookings={dashboardData?.pendingRequests ?? []}
          sitterId={sitterId}
        />

        {/* Upcoming Bookings - Chronological list */}
        <UpcomingBookings 
          bookings={dashboardData?.upcomingBookings ?? []}
        />

        {/* Completed Bookings - Collapsed by default */}
        <CompletedBookings 
          bookings={dashboardData?.completedBookings ?? []}
          totalEarnings={totalEarnings}
        />

        {/* Performance & Tier - Grid layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: tokens.spacing[4],
        }}>
          <PerformanceSnapshot 
            performance={dashboardData?.performance ?? {
              acceptanceRate: null,
              completionRate: null,
              onTimeRate: null,
              clientRating: null,
              totalEarnings: null,
              completedBookingsCount: 0,
            }}
            currentTier={dashboardData?.currentTier ?? null}
          />
          
          {/* Your Level (SRS) Card - Single tier component */}
          <SitterSRSCard />
        </div>

        {/* Messaging Inbox Card - Always rendered */}
        <MessagingInboxCard 
          unreadCount={dashboardData?.unreadMessageCount ?? 0}
        />
      </div>
    </AppShell>
  );
}

export default function SitterDashboardPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <PageHeader title="Sitter Dashboard" />
        <div style={{ padding: tokens.spacing[4] }}>
          <Skeleton height={400} />
        </div>
      </AppShell>
    }>
      <SitterDashboardContent />
    </Suspense>
  );
}
