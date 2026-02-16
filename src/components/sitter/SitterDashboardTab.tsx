/**
 * Sitter Dashboard Tab
 * 
 * Action-first operational dashboard within the sitter detail page
 * Answers: What requires my action right now?
 */

'use client';

import { Card, Skeleton, Badge } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';
import { PendingRequests } from './PendingRequests';
import { UpcomingBookings } from './UpcomingBookings';
import { CompletedBookings } from './CompletedBookings';
import { PerformanceSnapshot } from './PerformanceSnapshot';
import { StatusAvailability } from './StatusAvailability';
import { SitterTierCard } from './SitterTierCard';
import { MessagingInboxCard } from './MessagingInboxCard';
import { SitterSRSCard } from './SitterSRSCard';
import type { SitterDashboardData } from '@/lib/api/sitter-dashboard-hooks';

interface SitterDashboardTabProps {
  sitterId: string;
  sitter: {
    id: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    currentTier?: {
      id: string;
      name: string;
      priorityLevel: number | null;
    } | null;
  };
  dashboardData: SitterDashboardData | null | undefined;
}

export function SitterDashboardTab({ sitterId, sitter, dashboardData }: SitterDashboardTabProps) {
  const isLoading = !dashboardData;
  const hasPendingRequests = (dashboardData?.pendingRequests?.length ?? 0) > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
      {/* Status & Availability - Always rendered */}
      {isLoading ? (
        <Card style={{ padding: tokens.spacing[4] }}>
          <Skeleton height={80} />
        </Card>
      ) : (
        <StatusAvailability 
          isAvailable={dashboardData.isAvailable}
          sitterId={sitterId}
        />
      )}

      {/* Pending Requests - Always render section, show skeletons when loading */}
      <Card style={{ padding: tokens.spacing[4] }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: tokens.spacing[4] 
        }}>
          <h2 style={{ 
            fontSize: tokens.typography.fontSize.xl[0], 
            fontWeight: tokens.typography.fontWeight.bold 
          }}>
            Pending Requests
          </h2>
          {!isLoading && hasPendingRequests && (
            <Badge variant="warning" style={{ fontSize: tokens.typography.fontSize.sm[0] }}>
              {dashboardData.pendingRequests.length} {dashboardData.pendingRequests.length === 1 ? 'request' : 'requests'}
            </Badge>
          )}
        </div>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
            <Skeleton height={200} />
            <Skeleton height={200} />
          </div>
        ) : hasPendingRequests ? (
          <PendingRequests 
            bookings={dashboardData.pendingRequests}
            sitterId={sitterId}
            showHeader={false}
          />
        ) : (
          <div style={{ 
            padding: tokens.spacing[4],
            textAlign: 'center',
            color: tokens.colors.text.secondary,
            fontSize: tokens.typography.fontSize.sm[0],
          }}>
            No pending requests. New booking requests will appear here.
          </div>
        )}
      </Card>

      {/* Performance & Tier - Always rendered, consistent grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: tokens.spacing[4],
      }}>
        {isLoading ? (
          <>
            <Card style={{ padding: tokens.spacing[4] }}>
              <Skeleton height={24} style={{ marginBottom: tokens.spacing[4] }} />
              <Skeleton height={150} />
            </Card>
            <Card style={{ padding: tokens.spacing[4] }}>
              <Skeleton height={24} style={{ marginBottom: tokens.spacing[4] }} />
              <Skeleton height={150} />
            </Card>
          </>
        ) : (
          <>
            <PerformanceSnapshot 
              performance={dashboardData.performance}
              currentTier={dashboardData.currentTier}
            />
            <SitterTierCard 
              currentTier={dashboardData.currentTier}
            />
          </>
        )}
      </div>

      {/* Your Level (SRS) Card - Always rendered */}
      <SitterSRSCard />

      {/* Messaging Inbox Card - Always rendered */}
      {isLoading ? (
        <Card style={{ padding: tokens.spacing[4] }}>
          <Skeleton height={100} />
        </Card>
      ) : (
        <MessagingInboxCard 
          unreadCount={dashboardData.unreadMessageCount}
        />
      )}

      {/* Upcoming Bookings - Always rendered */}
      {isLoading ? (
        <Card style={{ padding: tokens.spacing[4] }}>
          <h2 style={{ 
            fontSize: tokens.typography.fontSize.xl[0], 
            fontWeight: tokens.typography.fontWeight.bold,
            marginBottom: tokens.spacing[4],
          }}>
            Upcoming Bookings
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
            <Skeleton height={150} />
            <Skeleton height={150} />
          </div>
        </Card>
      ) : (
        <UpcomingBookings 
          bookings={dashboardData.upcomingBookings}
        />
      )}

      {/* Completed Bookings - Always rendered */}
      {isLoading ? (
        <Card style={{ padding: tokens.spacing[4] }}>
          <h2 style={{ 
            fontSize: tokens.typography.fontSize.xl[0], 
            fontWeight: tokens.typography.fontWeight.bold,
            marginBottom: tokens.spacing[4],
          }}>
            Completed Bookings
          </h2>
          <Skeleton height={100} />
        </Card>
      ) : (
        <CompletedBookings 
          bookings={dashboardData.completedBookings}
          totalEarnings={dashboardData.performance.totalEarnings}
        />
      )}
    </div>
  );
}
