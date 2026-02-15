/**
 * Sitter Detail Page - Enterprise Rebuild with Tabs
 * 
 * Tabbed interface: Dashboard (default), Profile, Messages, Payroll, Performance, Tier
 * All within existing AppShell - no global dashboard changes
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
import { SitterDashboardTab } from '@/components/sitter/SitterDashboardTab';
import { SitterProfileTab } from '@/components/sitter/SitterProfileTab';
import { SitterMessagesTab } from '@/components/sitter/SitterMessagesTab';
import { useSitterDashboard } from '@/lib/api/sitter-dashboard-hooks';

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

function SitterDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sitterId = params.id as string;
  const isMobile = useMobile();
  
  // Get initial tab from URL or default to 'dashboard'
  const initialTab = searchParams?.get('tab') || 'dashboard';
  const [activeTab, setActiveTab] = useState(initialTab);

  const [sitter, setSitter] = useState<Sitter | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<SitterStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch dashboard data for unread count
  const { data: dashboardData } = useSitterDashboard(sitterId);

  useEffect(() => {
    if (dashboardData) {
      setUnreadCount(dashboardData.unreadMessageCount || 0);
    }
  }, [dashboardData]);

  useEffect(() => {
    if (sitterId) {
      fetchSitterData();
    }
  }, [sitterId]);

  const fetchSitterData = async () => {
    try {
      const response = await fetch(`/api/sitters/${sitterId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch sitter');
      }
      const data = await response.json();
      setSitter(data.sitter);
      setUpcomingBookings(data.upcomingBookings || []);
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to fetch sitter:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <PageHeader title="Sitter Details" />
        <div style={{ padding: tokens.spacing[4] }}>
          <Skeleton height={400} />
        </div>
      </AppShell>
    );
  }

  if (!sitter) {
    return (
      <AppShell>
        <PageHeader title="Sitter Not Found" />
        <div style={{ padding: tokens.spacing[4] }}>
          <EmptyState
            title="Sitter not found"
            description={undefined}
          />
        </div>
      </AppShell>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: <i className="fas fa-home" /> },
    { id: 'profile', label: 'Profile', icon: <i className="fas fa-user" /> },
    { 
      id: 'messages', 
      label: 'Messages', 
      icon: <i className="fas fa-inbox" />,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    { id: 'payroll', label: 'Payroll', icon: <i className="fas fa-dollar-sign" /> },
    { id: 'performance', label: 'Performance', icon: <i className="fas fa-chart-line" /> },
    { id: 'tier', label: 'Tier', icon: <i className="fas fa-star" /> },
  ];

  return (
    <AppShell>
      <PageHeader
        title={`${sitter.firstName} ${sitter.lastName}`}
        description="Sitter profile and operational dashboard"
        actions={
          <div style={{ display: 'flex', gap: tokens.spacing[3] }}>
            <Link href="/bookings/sitters">
              <Button variant="secondary" leftIcon={<i className="fas fa-arrow-left" />}>
                Back
              </Button>
            </Link>
          </div>
        }
      />

      <div style={{ padding: tokens.spacing[4] }}>
        <Tabs
          tabs={tabs}
          defaultTab="dashboard"
          activeTab={activeTab}
          onTabChange={(tabId) => {
            setActiveTab(tabId);
            // Update URL without page reload
            const url = new URL(window.location.href);
            url.searchParams.set('tab', tabId);
            window.history.pushState({}, '', url);
          }}
        >
          {/* Dashboard Tab - Action-First */}
          <TabPanel id="dashboard">
            <SitterDashboardTab 
              sitterId={sitterId}
              sitter={sitter}
              dashboardData={dashboardData}
            />
          </TabPanel>

          {/* Profile Tab - Existing Profile Content */}
          <TabPanel id="profile">
            <SitterProfileTab
              sitter={sitter}
              upcomingBookings={upcomingBookings}
              stats={stats}
              isMobile={isMobile}
            />
          </TabPanel>

          {/* Messages Tab - Sitter-Scoped Inbox */}
          <TabPanel id="messages">
            <SitterMessagesTab sitterId={sitterId} />
          </TabPanel>

          {/* Payroll Tab */}
          <TabPanel id="payroll">
            <SitterPayrollTab sitterId={sitterId} stats={stats} />
          </TabPanel>

          {/* Performance Tab */}
          <TabPanel id="performance">
            <SitterPerformanceTab sitterId={sitterId} dashboardData={dashboardData} />
          </TabPanel>

          {/* Tier Tab */}
          <TabPanel id="tier">
            <SitterTierTab sitter={sitter} dashboardData={dashboardData} />
          </TabPanel>
        </Tabs>
      </div>
    </AppShell>
  );
}

// Placeholder components for other tabs
function SitterPayrollTab({ sitterId, stats }: { sitterId: string; stats: SitterStats | null }) {
  return (
    <Card>
      <SectionHeader title="Payroll & Earnings" />
      <div style={{ padding: tokens.spacing[4] }}>
        {stats ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            <StatCard label="Total Earnings" value={`$${stats.totalEarnings.toFixed(2)}`} />
            <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
              Payroll history and detailed earnings breakdown coming soon.
            </div>
          </div>
        ) : (
          <EmptyState title="No payroll data available" />
        )}
      </div>
    </Card>
  );
}

function SitterPerformanceTab({ sitterId, dashboardData }: { sitterId: string; dashboardData: any }) {
  return (
    <Card>
      <SectionHeader title="Performance Metrics" />
      <div style={{ padding: tokens.spacing[4] }}>
        {dashboardData?.performance ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: tokens.spacing[4] }}>
            <StatCard 
              label="Acceptance Rate" 
              value={dashboardData.performance.acceptanceRate ? `${(dashboardData.performance.acceptanceRate * 100).toFixed(0)}%` : 'N/A'} 
            />
            <StatCard 
              label="Completion Rate" 
              value={dashboardData.performance.completionRate ? `${(dashboardData.performance.completionRate * 100).toFixed(0)}%` : 'N/A'} 
            />
            <StatCard 
              label="On-Time Rate" 
              value={dashboardData.performance.onTimeRate ? `${(dashboardData.performance.onTimeRate * 100).toFixed(0)}%` : 'N/A'} 
            />
            <StatCard 
              label="Client Rating" 
              value={dashboardData.performance.clientRating ? dashboardData.performance.clientRating.toFixed(1) : 'N/A'} 
            />
          </div>
        ) : (
          <EmptyState title="Performance data not available" />
        )}
      </div>
    </Card>
  );
}

function SitterTierTab({ sitter, dashboardData }: { sitter: Sitter; dashboardData: any }) {
  return (
    <Card>
      <SectionHeader title="Tier Information" />
      <div style={{ padding: tokens.spacing[4] }}>
        {sitter.currentTier ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            <div>
              <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[2] }}>
                Current Tier
              </div>
              <SitterTierBadge tier={sitter.currentTier} size="lg" />
            </div>
            <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
              Tier progression and benefits coming soon.
            </div>
          </div>
        ) : (
          <EmptyState title="No tier assigned" />
        )}
      </div>
    </Card>
  );
}

export default function SitterDetailPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <PageHeader title="Sitter Details" />
        <div style={{ padding: tokens.spacing[4] }}>
          <Skeleton height={400} />
        </div>
      </AppShell>
    }>
      <SitterDetailContent />
    </Suspense>
  );
}
