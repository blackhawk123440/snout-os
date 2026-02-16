/**
 * Sitter Dashboard
 * 
 * Phase 3: Enterprise-ready sitter dashboard home
 * Shows inbox card, today's assignments, business number, and messaging status
 */

'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, Card, Button, Badge, EmptyState, Skeleton, StatCard } from '@/components/ui';
import { useAuth } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useSitterThreads } from '@/lib/api/sitter-hooks';
import { useAssignmentWindows } from '@/lib/api/assignments-hooks';
import { tokens } from '@/lib/design-tokens';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { SitterSRSCard } from '@/components/sitter/SitterSRSCard';

function SitterDashboardContent() {
  const { user, isSitter, loading: authLoading } = useAuth();
  const router = useRouter();
  const sitterId = (user as any)?.sitterId;
  
  const { data: threads = [], isLoading: threadsLoading } = useSitterThreads();
  const { data: windows = [], isLoading: windowsLoading } = useAssignmentWindows(
    sitterId ? { sitterId, status: 'active' } : undefined
  );
  
  const activeThreads = threads.filter((t: any) => {
    const window = t.assignmentWindows?.[0];
    if (!window) return false;
    const now = new Date();
    return new Date(window.startsAt) <= now && new Date(window.endsAt) >= now;
  });
  
  const todayWindows = windows.filter((w: any) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
    const windowDate = new Date(w.startsAt);
    windowDate.setHours(0, 0, 0, 0);
    return windowDate.getTime() === today.getTime();
  });
  
  // Get sitter's business number (masked)
  const sitterNumber = threads[0]?.messageNumber?.e164 || 'Not assigned';

  if (authLoading || threadsLoading || windowsLoading) {
    return (
      <AppShell>
        <PageHeader title="Sitter Dashboard" />
          <Skeleton height={200} />
      </AppShell>
    );
  }

  if (!isSitter) {
    router.push('/messages');
    return null;
  }

  return (
    <AppShell>
        <PageHeader
          title="Sitter Dashboard"
          actions={
          <Link href="/api/auth/signout">
            <Button variant="secondary" size="sm">Logout</Button>
              </Link>
        }
      />
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4], padding: tokens.spacing[4] }}>
        {/* Inbox Card */}
        <Card style={{ padding: tokens.spacing[4] }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacing[3] }}>
            <h3 style={{ fontSize: tokens.typography.fontSize.lg[0], fontWeight: tokens.typography.fontWeight.semibold }}>
              Inbox
            </h3>
            <Link href="/sitter/inbox">
              <Button variant="primary" size="sm">Open Inbox</Button>
            </Link>
                </div>
              <StatCard
            label="Active Conversations"
            value={activeThreads.length}
          />
                        </Card>

        {/* Today's Assignments */}
        <Card style={{ padding: tokens.spacing[4] }}>
          <h3 style={{ fontSize: tokens.typography.fontSize.lg[0], fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[3] }}>
            Today's Assignments
          </h3>
          {todayWindows.length === 0 ? (
                  <EmptyState
              title="No assignments today"
              description="You have no active assignment windows today."
                  />
                ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2] }}>
              {todayWindows.map((window: any) => {
                const now = new Date();
                const isActive = new Date(window.startsAt) <= now && new Date(window.endsAt) >= now;
                              return (
                  <div
                    key={window.id}
                        style={{
                      padding: tokens.spacing[3],
                      border: `1px solid ${tokens.colors.border.default}`,
                      borderRadius: tokens.borderRadius.md,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                      <div>
                      <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
                        {window.thread?.client?.name || 'Client'}
                          </div>
                          <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                        {new Date(window.startsAt).toLocaleTimeString()} - {new Date(window.endsAt).toLocaleTimeString()}
                          </div>
                        </div>
                    <Badge variant={isActive ? 'success' : 'default'}>
                      {isActive ? 'Active' : 'Upcoming'}
                    </Badge>
                                        </div>
                              );
                            })}
                      </div>
                    )}
            </Card>

        {/* Business Number */}
        <Card style={{ padding: tokens.spacing[4] }}>
          <h3 style={{ fontSize: tokens.typography.fontSize.lg[0], fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[3] }}>
            Your Business Number
          </h3>
          <div style={{ fontSize: tokens.typography.fontSize.lg[0], fontFamily: 'monospace', color: tokens.colors.text.primary }}>
            {sitterNumber}
                      </div>
          <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginTop: tokens.spacing[2] }}>
            This is your dedicated masked number, assigned when you were activated. It persists across all bookings. During active assignment windows, messages send from this number.
                </div>
              </Card>

        {/* Your Level (SRS) Card - Sitter-facing tier display */}
        <SitterSRSCard />

        {/* Messaging Status */}
        <Card style={{ padding: tokens.spacing[4], backgroundColor: tokens.colors.info[50] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
            <div style={{ fontSize: tokens.typography.fontSize.xl[0] }}>ℹ️</div>
            <div>
              <div style={{ fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[1] }}>
                Messaging Status
                    </div>
                    <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                You can message only during assignment windows. Outside active windows, compose is disabled.
                    </div>
                      </div>
          </div>
                  </Card>
            </div>
    </AppShell>
  );
}

export default function SitterDashboardPage() {
  return (
    <Suspense fallback={<Skeleton height={400} />}>
      <SitterDashboardContent />
    </Suspense>
  );
}
