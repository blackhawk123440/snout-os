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
  StatCard,
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
          <Card>
            <div style={{ 
              padding: tokens.spacing[6],
              textAlign: 'center',
            }}>
              <div style={{ 
                fontSize: tokens.typography.fontSize.xl[0],
                marginBottom: tokens.spacing[2],
              }}>
                👤
              </div>
              <div style={{ 
                fontSize: tokens.typography.fontSize.base[0],
                fontWeight: tokens.typography.fontWeight.semibold,
                marginBottom: tokens.spacing[2],
                color: tokens.colors.text.primary,
              }}>
                Sitter not found
              </div>
              <div style={{ 
                fontSize: tokens.typography.fontSize.sm[0],
                color: tokens.colors.text.secondary,
              }}>
                The sitter you're looking for doesn't exist or has been removed.
              </div>
            </div>
          </Card>
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

          {/* Profile Tab - Identity Information Only */}
          <TabPanel id="profile">
            <SitterProfileTab
              sitter={sitter}
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

// Foundation tab components - always render structure
function SitterPayrollTab({ sitterId, stats }: { sitterId: string; stats: SitterStats | null }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
      <Card>
        <SectionHeader 
          title="Payroll & Earnings" 
          description="Earnings from completed bookings"
        />
      <div style={{ padding: tokens.spacing[4] }}>
        {stats && stats.totalEarnings > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            <StatCard label="Total Earnings" value={`$${stats.totalEarnings.toFixed(2)}`} />
            <div style={{ 
              padding: tokens.spacing[4],
              backgroundColor: tokens.colors.neutral[50],
              borderRadius: tokens.borderRadius.md,
            }}>
              <div style={{ 
                fontSize: tokens.typography.fontSize.sm[0],
                color: tokens.colors.text.secondary,
                lineHeight: '1.5',
              }}>
                <strong>How it works:</strong> Earnings are calculated from completed bookings using your commission rate. 
                Detailed payroll history, payment schedules, and earnings breakdowns will appear here once the payroll 
                system is fully activated.
              </div>
            </div>
          </div>
        ) : (
          <div style={{ 
            padding: tokens.spacing[6],
            textAlign: 'center',
          }}>
            <div style={{ 
              fontSize: tokens.typography.fontSize.xl[0],
              marginBottom: tokens.spacing[2],
            }}>
              💰
            </div>
            <div style={{ 
              fontSize: tokens.typography.fontSize.base[0],
              fontWeight: tokens.typography.fontWeight.semibold,
              marginBottom: tokens.spacing[2],
              color: tokens.colors.text.primary,
            }}>
              Payroll system
            </div>
            <div style={{ 
              fontSize: tokens.typography.fontSize.sm[0],
              color: tokens.colors.text.secondary,
              maxWidth: '500px',
              margin: '0 auto',
              lineHeight: '1.5',
            }}>
              This section will populate after completed bookings are processed. Earnings are calculated 
              automatically based on your commission rate. Payment history and detailed breakdowns will 
              appear here once you have completed bookings.
            </div>
          </div>
        )}
        </div>
      </Card>
    </div>
  );
}

function SitterPerformanceTab({ sitterId, dashboardData }: { sitterId: string; dashboardData: any }) {
  const hasData = dashboardData?.performance && (
    dashboardData.performance.completionRate !== null ||
    dashboardData.performance.acceptanceRate !== null ||
    dashboardData.performance.onTimeRate !== null ||
    dashboardData.performance.clientRating !== null
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
      <Card>
        <SectionHeader 
          title="Performance Metrics" 
          description="Track your acceptance, completion, and on-time rates"
        />
        <div style={{ padding: tokens.spacing[4] }}>
        {hasData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
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
            <div style={{ 
              padding: tokens.spacing[4],
              backgroundColor: tokens.colors.neutral[50],
              borderRadius: tokens.borderRadius.md,
            }}>
              <div style={{ 
                fontSize: tokens.typography.fontSize.sm[0],
                color: tokens.colors.text.secondary,
                lineHeight: '1.5',
              }}>
                <strong>How metrics are calculated:</strong> Performance metrics are tracked automatically as you accept 
                bookings, complete visits, and receive client feedback. Some metrics may show "N/A" until sufficient data 
                is available. Ratings and on-time tracking activate after your first completed bookings.
              </div>
            </div>
          </div>
        ) : (
          <div style={{ 
            padding: tokens.spacing[6],
            textAlign: 'center',
          }}>
            <div style={{ 
              fontSize: tokens.typography.fontSize.xl[0],
              marginBottom: tokens.spacing[2],
            }}>
              📊
            </div>
            <div style={{ 
              fontSize: tokens.typography.fontSize.base[0],
              fontWeight: tokens.typography.fontWeight.semibold,
              marginBottom: tokens.spacing[2],
              color: tokens.colors.text.primary,
            }}>
              Performance tracking
            </div>
            <div style={{ 
              fontSize: tokens.typography.fontSize.sm[0],
              color: tokens.colors.text.secondary,
              maxWidth: '500px',
              margin: '0 auto',
              lineHeight: '1.5',
            }}>
              Performance metrics will appear here as you accept and complete bookings. The system tracks 
              acceptance rate, completion rate, on-time performance, and client ratings. Metrics become 
              available after your first few bookings are processed.
            </div>
          </div>
        )}
      </div>
      </Card>
    </div>
  );
}

function SitterTierTab({ sitter, dashboardData }: { sitter: Sitter; dashboardData: any }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
      <Card>
        <SectionHeader 
          title="Tier System" 
          description="Your current tier and progression status"
        />
      <div style={{ padding: tokens.spacing[4] }}>
        {sitter.currentTier ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            <div>
              <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[2] }}>
                Current Tier
              </div>
              <SitterTierBadge 
                tier={sitter.currentTier ? {
                  ...sitter.currentTier,
                  priorityLevel: sitter.currentTier.priorityLevel ?? undefined,
                } : null} 
                size="lg" 
              />
            </div>
            <div style={{ 
              padding: tokens.spacing[4],
              backgroundColor: tokens.colors.neutral[50],
              borderRadius: tokens.borderRadius.md,
            }}>
              <div style={{ 
                fontSize: tokens.typography.fontSize.sm[0],
                color: tokens.colors.text.secondary,
                lineHeight: '1.5',
              }}>
                <strong>How tiers work:</strong> Tiers reflect your experience level and performance. As you complete 
                more bookings and maintain high performance metrics, you'll progress through tiers. Each tier unlocks 
                additional benefits and opportunities. Tier progression is calculated automatically based on your 
                booking history and performance data.
              </div>
            </div>
          </div>
        ) : (
          <div style={{ 
            padding: tokens.spacing[6],
            textAlign: 'center',
          }}>
            <div style={{ 
              fontSize: tokens.typography.fontSize.xl[0],
              marginBottom: tokens.spacing[2],
            }}>
              ⭐
            </div>
            <div style={{ 
              fontSize: tokens.typography.fontSize.base[0],
              fontWeight: tokens.typography.fontWeight.semibold,
              marginBottom: tokens.spacing[2],
              color: tokens.colors.text.primary,
            }}>
              Tier assignment
            </div>
            <div style={{ 
              fontSize: tokens.typography.fontSize.sm[0],
              color: tokens.colors.text.secondary,
              maxWidth: '500px',
              margin: '0 auto',
              lineHeight: '1.5',
            }}>
              Your tier will be assigned based on your experience and performance. Tiers determine 
              eligibility for different service types and booking opportunities. Once assigned, you'll 
              see your current tier, benefits, and progress toward the next tier here.
            </div>
          </div>
        )}
        </div>
      </Card>
    </div>
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
