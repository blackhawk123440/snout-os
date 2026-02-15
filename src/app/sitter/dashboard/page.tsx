/**
 * Sitter Dashboard
 * 
 * Enterprise-grade operational dashboard for sitters.
 * Action-driven, not informational. Answers: What requires my action right now?
 */

'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, Skeleton } from '@/components/ui';
import { useAuth } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useSitterDashboard } from '@/lib/api/sitter-dashboard-hooks';
import { SitterDashboardContent } from '@/components/sitter/SitterDashboardContent';

function SitterDashboardPageContent() {
  const { user, isSitter, loading: authLoading } = useAuth();
  const router = useRouter();
  const sitterId = (user as any)?.sitterId;

  const { data: dashboardData, isLoading: dashboardLoading } = useSitterDashboard(sitterId);

  if (authLoading || dashboardLoading) {
    return (
      <AppShell>
        <PageHeader title="Dashboard" />
        <Skeleton height={400} />
      </AppShell>
    );
  }

  if (!isSitter || !sitterId) {
    router.push('/messages');
    return null;
  }

  return (
    <AppShell>
      <SitterDashboardContent dashboardData={dashboardData} sitterId={sitterId} />
    </AppShell>
  );
}

export default function SitterDashboardPage() {
  return (
    <Suspense fallback={<Skeleton height={400} />}>
      <SitterDashboardPageContent />
    </Suspense>
  );
}
