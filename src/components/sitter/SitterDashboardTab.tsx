/**
 * Sitter Dashboard Tab
 * 
 * Action-first operational dashboard within the sitter detail page
 * Answers: What requires my action right now?
 */

'use client';

import { Card, Button, Badge } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';
import { PendingRequests } from './PendingRequests';
import { UpcomingBookings } from './UpcomingBookings';
import { CompletedBookings } from './CompletedBookings';
import { PerformanceSnapshot } from './PerformanceSnapshot';
import { StatusAvailability } from './StatusAvailability';
import { SitterTierCard } from './SitterTierCard';
import { MessagingInboxCard } from './MessagingInboxCard';
import type { SitterDashboardData } from '@/lib/api/sitter-dashboard-hooks';
import Link from 'next/link';

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
  if (!dashboardData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
        <Card style={{ padding: tokens.spacing[4] }}>
          <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
            Loading dashboard data...
          </div>
        </Card>
      </div>
    );
  }

  const hasPendingRequests = dashboardData.pendingRequests.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
      {/* Status & Availability - Top Priority */}
      <StatusAvailability 
        isAvailable={dashboardData.isAvailable}
        sitterId={sitterId}
      />

      {/* Pending Requests - Highest Priority if any exist */}
      {hasPendingRequests && (
        <PendingRequests 
          bookings={dashboardData.pendingRequests}
          sitterId={sitterId}
        />
      )}

      {/* Performance & Tier - Side by side on desktop */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: tokens.spacing[4],
      }}>
        <PerformanceSnapshot 
          performance={dashboardData.performance}
          currentTier={dashboardData.currentTier}
        />
        <SitterTierCard 
          currentTier={dashboardData.currentTier}
        />
      </div>

      {/* Messaging Inbox Card */}
      <MessagingInboxCard 
        unreadCount={dashboardData.unreadMessageCount}
      />

      {/* Upcoming Bookings */}
      <UpcomingBookings 
        bookings={dashboardData.upcomingBookings}
      />

      {/* Completed Bookings - Collapsed by default */}
      <CompletedBookings 
        bookings={dashboardData.completedBookings}
        totalEarnings={dashboardData.performance.totalEarnings}
      />
    </div>
  );
}
