/**
 * Sitter Detail Page - Enterprise Rebuild
 * 
 * Complete sitter detail view with profile, tier, assigned bookings, and payroll snapshot.
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Table,
  TableColumn,
  StatCard,
  EmptyState,
  Skeleton,
  SectionHeader,
  Tabs,
  TabPanel,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';
import { useMobile } from '@/lib/use-mobile';
import { BookingScheduleDisplay } from '@/components/booking';
import { SitterTierBadge } from '@/components/sitter';
import { TierSummaryCard } from '@/components/sitter/TierSummaryCard';
import { TierTab } from '@/components/sitter/TierTab';
import { SitterMessagesTab } from '@/components/sitter/SitterMessagesTab';
import { SitterPageHeader } from '@/components/sitter/SitterPageHeader';
import { SitterProfileTab } from '@/components/sitter/SitterProfileTab';
import { PerformanceTab } from '@/components/sitter/PerformanceTab';
import { PayrollTab } from '@/components/sitter/PayrollTab';
import { ActivityTab } from '@/components/sitter/ActivityTab';
import { InboxSummaryCard } from '@/components/sitter/InboxSummaryCard';
import { PendingRequests } from '@/components/sitter/PendingRequests';
import { UpcomingBookings } from '@/components/sitter/UpcomingBookings';
import { CompletedBookings } from '@/components/sitter/CompletedBookings';
import { PerformanceSnapshot } from '@/components/sitter/PerformanceSnapshot';
import { useAuth } from '@/lib/auth-client';

interface Sitter {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  isActive: boolean;
  commissionPercentage: number;
  maskedNumber?: string;
  activeAssignmentWindowsCount?: number;
  currentTier?: {
    id: string;
    name: string;
    priorityLevel: number;
  } | null;
}

interface Booking {
  id: string;
  firstName: string;
  lastName: string;
  service: string;
  startAt: Date | string;
  endAt: Date | string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  totalPrice: number;
  pets: Array<{ species: string }>;
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  } | null;
  timeSlots?: Array<{
    id: string;
    startAt: Date | string;
    endAt: Date | string;
    duration?: number;
  }>;
}

interface SitterStats {
  totalBookings: number;
  completedBookings: number;
  totalEarnings: number;
  upcomingCount: number;
}

type SitterTab = 'dashboard' | 'profile' | 'messages' | 'tier' | 'performance' | 'payroll' | 'activity';

function SitterDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sitterId = params.id as string;
  const isMobile = useMobile();
  
  // Check if user has edit permissions (owner only for now) - MUST be called before any early returns
  const { user } = useAuth();
  const canEdit = user?.role === 'owner';

  // Get tab from URL or default to dashboard
  const tabParam = searchParams.get('tab') as SitterTab | null;
  const validTabs: SitterTab[] = ['dashboard', 'profile', 'messages', 'tier', 'performance', 'payroll', 'activity'];
  const [activeTab, setActiveTab] = useState<SitterTab>(
    (tabParam && validTabs.includes(tabParam)) ? tabParam : 'dashboard'
  );

  const [sitter, setSitter] = useState<Sitter | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [completedBookings, setCompletedBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<SitterStats | null>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Update URL when tab changes
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', activeTab);
    window.history.pushState({}, '', url.toString());
  }, [activeTab]);

  useEffect(() => {
    if (sitterId) {
      fetchSitterData();
    }
  }, [sitterId]);

  const fetchSitterData = async () => {
    try {
      // Fetch sitter basic info
      const sitterRes = await fetch(`/api/sitters/${sitterId}`);
      if (!sitterRes.ok) {
        throw new Error('Failed to fetch sitter');
      }
      const sitterData = await sitterRes.json();
      setSitter(sitterData.sitter);
      setStats(sitterData.stats);

      // Fetch dashboard data (pending requests, bookings, performance)
      const dashboardRes = await fetch(`/api/sitters/${sitterId}/dashboard`);
      if (dashboardRes.ok) {
        const dashboardData = await dashboardRes.json();
        setPendingRequests(dashboardData.pendingRequests || []);
        setUpcomingBookings(dashboardData.upcomingBookings || []);
        setCompletedBookings(dashboardData.completedBookings || []);
        setPerformance(dashboardData.performance);
        if (dashboardData.stats) {
          setStats(dashboardData.stats);
        }
      }
    } catch (error) {
      console.error('Failed to fetch sitter:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadgeVariant = (status: string): 'default' | 'info' | 'success' | 'warning' | 'error' => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'pending': return 'warning';
      case 'completed': return 'info';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const bookingColumns: TableColumn<Booking>[] = [
    {
      key: 'client',
      header: 'Client',
      mobileLabel: 'Client',
      mobileOrder: 1,
      render: (row) => (
        <div>
          <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
            {row.firstName} {row.lastName}
          </div>
          {row.client && (
            <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
              {row.client.email}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'service',
      header: 'Service',
      mobileLabel: 'Service',
      mobileOrder: 2,
      render: (row) => (
        <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
          {row.service}
        </div>
      ),
    },
    {
      key: 'schedule',
      header: 'Schedule',
      mobileLabel: 'Schedule',
      mobileOrder: 3,
      render: (row) => (
        <BookingScheduleDisplay
          service={row.service}
          startAt={row.startAt}
          endAt={row.endAt}
          timeSlots={row.timeSlots}
        />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      mobileLabel: 'Status',
      mobileOrder: 4,
      render: (row) => (
        <Badge variant={getStatusBadgeVariant(row.status)}>
          {row.status}
        </Badge>
      ),
      align: 'center',
    },
    {
      key: 'earnings',
      header: 'Earnings',
      mobileLabel: 'Earnings',
      mobileOrder: 5,
      render: (row) => {
        if (!sitter) return null;
        const earnings = (row.totalPrice * (sitter.commissionPercentage || 80)) / 100;
        return (
          <div style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
            {formatCurrency(earnings)}
          </div>
        );
      },
      align: 'right',
    },
  ];

  if (loading) {
    return (
      <AppShell>
        <PageHeader title="Sitter Details" />
        <div style={{ padding: tokens.spacing[4] }}> {/* Phase E: Tighter density to match Dashboard */}
          <Skeleton height={400} />
        </div>
      </AppShell>
    );
  }

  if (!sitter) {
    return (
      <AppShell>
        <PageHeader title="Sitter Not Found" />
        <div style={{ padding: tokens.spacing[4] }}> {/* Phase E: Tighter density to match Dashboard */}
          <EmptyState
            title="Sitter not found"
            description={undefined} // Phase E: Neutral, operational
          />
        </div>
      </AppShell>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'profile', label: 'Profile' },
    { id: 'messages', label: 'Messages' },
    { id: 'tier', label: 'Tier' },
    { id: 'performance', label: 'Performance' },
    { id: 'payroll', label: 'Payroll' },
    { id: 'activity', label: 'Activity' },
  ];

  return (
    <AppShell>
      {/* Global Header */}
      <SitterPageHeader
        sitter={sitter}
        isAvailable={true} // TODO: Fetch from API
        canEdit={canEdit}
        onAvailabilityToggle={() => {
          // TODO: Implement availability toggle
          console.log('Toggle availability');
        }}
      />

      <div style={{ padding: tokens.spacing[4] }}>
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as SitterTab)}
        >
          <TabPanel id="dashboard">
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
              {/* Pending Requests */}
              {pendingRequests.length > 0 && (
                <PendingRequests 
                  bookings={pendingRequests as any}
                  sitterId={sitterId}
                />
              )}

              {/* Stats Row */}
              {stats && (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', 
                  gap: tokens.spacing[3],
                }}>
                  <StatCard label="Total Bookings" value={stats.totalBookings} />
                  <StatCard label="Completed" value={stats.completedBookings} />
                  <StatCard label="Total Earnings" value={formatCurrency(stats.totalEarnings)} />
                  <StatCard label="Upcoming" value={stats.upcomingCount} />
                </div>
              )}

              {/* Main Content Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 400px',
                gap: tokens.spacing[4],
              }}>
                {/* Left Column: Operational Content */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
                  {/* Upcoming Bookings */}
                  <UpcomingBookings bookings={upcomingBookings as any} />

                  {/* Completed Bookings (Collapsed) */}
                  <CompletedBookings 
                    bookings={completedBookings as any}
                    totalEarnings={stats?.totalEarnings || null}
                  />

                  {/* Performance Snapshot */}
                  {performance && (
                    <PerformanceSnapshot
                      performance={performance}
                      currentTier={sitter.currentTier || null}
                    />
                  )}
                </div>

                {/* Right Column: Summary Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
                  {/* Tier Summary */}
                  <TierSummaryCard 
                    sitterId={sitterId}
                    onViewDetails={() => setActiveTab('tier')}
                  />

                  {/* Inbox Summary */}
                  <InboxSummaryCard sitterId={sitterId} />
                </div>
              </div>
            </div>
          </TabPanel>

          <TabPanel id="profile">
            {sitter && <SitterProfileTab sitter={sitter} isMobile={isMobile} />}
          </TabPanel>

          <TabPanel id="messages">
            <SitterMessagesTab sitterId={sitterId} />
          </TabPanel>

          <TabPanel id="tier">
            <TierTab sitterId={sitterId} />
          </TabPanel>

          <TabPanel id="performance">
            <PerformanceTab sitterId={sitterId} />
          </TabPanel>

          <TabPanel id="payroll">
            <PayrollTab sitterId={sitterId} />
          </TabPanel>

          <TabPanel id="activity">
            <ActivityTab sitterId={sitterId} />
          </TabPanel>
        </Tabs>
      </div>
    </AppShell>
  );
}

export default function SitterDetailPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <PageHeader title="Sitter Details" />
        <div style={{ padding: tokens.spacing[4] }}> {/* Phase E: Tighter density to match Dashboard */}
          <Skeleton height={400} />
        </div>
      </AppShell>
    }>
      <SitterDetailContent />
    </Suspense>
  );
}

