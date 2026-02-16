/**
 * Sitter Detail Page - Enterprise Rebuild
 * 
 * Complete sitter detail view with profile, tier, assigned bookings, and payroll snapshot.
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
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
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';
import { useMobile } from '@/lib/use-mobile';
import { BookingScheduleDisplay } from '@/components/booking';
import { SitterTierBadge } from '@/components/sitter';

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
  const sitterId = params.id as string;
  const isMobile = useMobile();

  const [sitter, setSitter] = useState<Sitter | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<SitterStats | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <AppShell>
      <PageHeader
        title={`${sitter.firstName} ${sitter.lastName}`}
        description="Sitter profile and assigned bookings"
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

      <div style={{ padding: tokens.spacing[4] }}> {/* Phase E: Tighter density to match Dashboard */}
        {isMobile ? (
          <>
            {/* Mobile: Stats Cards */}
            {stats && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing[4], marginBottom: tokens.spacing[6] }}>
                <StatCard label="Total Bookings" value={stats.totalBookings} />
                <StatCard label="Completed" value={stats.completedBookings} />
                <StatCard label="Total Earnings" value={formatCurrency(stats.totalEarnings)} />
                <StatCard label="Upcoming" value={stats.upcomingCount} />
              </div>
            )}

            {/* Mobile: Sitter Profile */}
            <Card style={{ marginBottom: tokens.spacing[4] }}>
              <SectionHeader title="Profile" />
              <div style={{ padding: tokens.spacing[4], display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
                {sitter.currentTier && (
                  <div>
                    <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                      Tier
                    </div>
                    <SitterTierBadge tier={sitter.currentTier} />
                  </div>
                )}
                <div>
                  <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                    Status
                  </div>
                  <Badge variant={sitter.isActive ? "success" : "error"}>
                    {sitter.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div>
                  <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                    Email
                  </div>
                  <a href={`mailto:${sitter.email}`} style={{ color: tokens.colors.primary.DEFAULT, textDecoration: 'none' }}>
                    {sitter.email}
                  </a>
                </div>
                <div>
                  <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                    Phone
                  </div>
                  <a href={`tel:${sitter.phone}`} style={{ color: tokens.colors.primary.DEFAULT, textDecoration: 'none' }}>
                    {sitter.phone}
                  </a>
                </div>
                <div>
                  <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                    Commission
                  </div>
                  <div>{sitter.commissionPercentage || 80}%</div>
                </div>
              </div>
            </Card>

            {/* Mobile: Messaging Section */}
            <Card style={{ marginBottom: tokens.spacing[4] }}>
              <SectionHeader title="Messaging" />
              <div style={{ padding: tokens.spacing[4], display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
                <div>
                  <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                    Status
                  </div>
                  <Badge variant={sitter.isActive ? "success" : "error"}>
                    {sitter.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div>
                  <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                    Business Number
                  </div>
                  <div style={{ fontSize: tokens.typography.fontSize.sm[0], fontFamily: 'monospace', color: tokens.colors.text.primary }}>
                    {sitter.maskedNumber || 'Not assigned'}
                  </div>
                </div>
                {sitter.activeAssignmentWindowsCount !== undefined && (
                  <div>
                    <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                      Active Windows
                    </div>
                    <div style={{ fontWeight: tokens.typography.fontWeight.semibold, fontSize: tokens.typography.fontSize.base[0] }}>
                      {sitter.activeAssignmentWindowsCount}
                    </div>
                  </div>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  style={{ width: '100%', marginTop: tokens.spacing[2] }}
                  leftIcon={<i className="fas fa-comments" />}
                  onClick={() => window.location.href = `/messages?sitterId=${sitter.id}`}
                >
                  Open Inbox
                </Button>
              </div>
            </Card>

            {/* Mobile: Upcoming Bookings */}
            <Card>
              <SectionHeader title="Upcoming Bookings" />
              {upcomingBookings.length === 0 ? (
                <div style={{ padding: tokens.spacing[4] }}>
                  <EmptyState
                    title="No upcoming bookings"
                    description="This sitter has no upcoming assigned bookings"
                    icon="📅"
                  />
                </div>
              ) : (
                <Table
                  columns={bookingColumns}
                  data={upcomingBookings}
                  emptyMessage="No upcoming bookings"
                  onRowClick={(row) => {
                    window.location.href = `/bookings/${row.id}`;
                  }}
                  keyExtractor={(row) => row.id}
                />
              )}
            </Card>
          </>
        ) : (
          <>
            {/* Desktop: Two Column Layout */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 400px',
                gap: tokens.spacing[4], // Phase E: Tighter density to match Dashboard
              }}
            >
              {/* Left Column: Upcoming Bookings */}
              <div>
                {/* Stats Row */}
                {stats && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: tokens.spacing[2], marginBottom: tokens.spacing[4] }}> {/* Phase E: Token-only - disciplined spacing */}
                    <StatCard label="Total Bookings" value={stats.totalBookings} />
                    <StatCard label="Completed" value={stats.completedBookings} />
                    <StatCard label="Total Earnings" value={formatCurrency(stats.totalEarnings)} />
                    <StatCard label="Upcoming" value={stats.upcomingCount} />
                  </div>
                )}

                {/* Upcoming Bookings */}
                <Card>
                  <SectionHeader title="Upcoming Assigned Bookings" />
                  {upcomingBookings.length === 0 ? (
                    <div style={{ padding: tokens.spacing[4] }}>
                      <EmptyState
                        title="No upcoming bookings"
                        description="This sitter has no upcoming assigned bookings"
                        icon="📅"
                      />
                    </div>
                  ) : (
                    <Table
                      columns={bookingColumns}
                      data={upcomingBookings}
                      emptyMessage="No upcoming bookings"
                      onRowClick={(row) => {
                        window.location.href = `/bookings/${row.id}`;
                      }}
                      keyExtractor={(row) => row.id}
                    />
                  )}
                </Card>
              </div>

              {/* Right Column: Sitter Profile & Actions */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: tokens.spacing[4],
                  position: 'sticky',
                  top: 0,
                  alignSelf: 'flex-start',
                  maxHeight: 'calc(100vh - 200px)',
                  overflowY: 'auto',
                }}
              >
                {/* Sitter Profile */}
                <Card>
                  <SectionHeader title="Sitter Profile" />
                  <div style={{ padding: tokens.spacing[4], display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
                    {sitter.currentTier && (
                      <div>
                        <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                          Tier
                        </div>
                        <SitterTierBadge tier={sitter.currentTier} />
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                        Status
                      </div>
                      <Badge variant={sitter.isActive ? "success" : "error"}>
                        {sitter.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div>
                      <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                        Email
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        style={{ width: '100%', justifyContent: 'flex-start' }}
                        onClick={() => window.location.href = `mailto:${sitter.email}`}
                        leftIcon={<i className="fas fa-envelope" />}
                      >
                        {sitter.email}
                      </Button>
                    </div>
                    <div>
                      <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                        Phone
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        style={{ width: '100%', justifyContent: 'flex-start' }}
                        onClick={() => window.location.href = `tel:${sitter.phone}`}
                        leftIcon={<i className="fas fa-phone" />}
                      >
                        {sitter.phone}
                      </Button>
                    </div>
                    <div>
                      <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                        Commission Rate
                      </div>
                      <div style={{ fontWeight: tokens.typography.fontWeight.semibold, fontSize: tokens.typography.fontSize.base[0] }}>
                        {sitter.commissionPercentage || 80}%
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Messaging Section */}
                <Card>
                  <SectionHeader title="Messaging" />
                  <div style={{ padding: tokens.spacing[4], display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
                    <div>
                      <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                        Status
                      </div>
                      <Badge variant={sitter.isActive ? "success" : "error"}>
                        {sitter.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div>
                      <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                        Business Number
                      </div>
                      <div style={{ fontSize: tokens.typography.fontSize.sm[0], fontFamily: 'monospace', color: tokens.colors.text.primary }}>
                        {sitter.maskedNumber || 'Not assigned'}
                      </div>
                    </div>
                    {sitter.activeAssignmentWindowsCount !== undefined && (
                      <div>
                        <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                          Active Windows
                        </div>
                        <div style={{ fontWeight: tokens.typography.fontWeight.semibold, fontSize: tokens.typography.fontSize.base[0] }}>
                          {sitter.activeAssignmentWindowsCount}
                        </div>
                      </div>
                    )}
                    <Button
                      variant="primary"
                      size="sm"
                      style={{ width: '100%', marginTop: tokens.spacing[2] }}
                      leftIcon={<i className="fas fa-comments" />}
                      onClick={() => window.location.href = `/messages?sitterId=${sitter.id}`}
                    >
                      Open Inbox
                    </Button>
                  </div>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <SectionHeader title="Quick Actions" />
                  <div style={{ padding: tokens.spacing[4], display: 'flex', flexDirection: 'column', gap: tokens.spacing[2] }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      style={{ width: '100%' }}
                      leftIcon={<i className="fas fa-calendar-alt" />}
                      onClick={() => window.open(`/sitter-dashboard?id=${sitter.id}&admin=true`, '_blank')}
                    >
                      View Dashboard
                    </Button>
                  </div>
                </Card>

                {/* Payroll Snapshot */}
                <Card>
                  <SectionHeader title="Payroll Snapshot" />
                  <div style={{ padding: tokens.spacing[4] }}>
                    {stats ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
                        <div>
                          <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                            Total Earnings
                          </div>
                          <div style={{ fontSize: tokens.typography.fontSize.xl[0], fontWeight: tokens.typography.fontWeight.bold, color: tokens.colors.success.DEFAULT }}>
                            {formatCurrency(stats.totalEarnings)}
                          </div>
                        </div>
                        <div style={{ paddingTop: tokens.spacing[3], borderTop: `1px solid ${tokens.colors.border.default}` }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            style={{ width: '100%', justifyContent: 'flex-start' }}
                            onClick={() => window.location.href = `/payroll?sitterId=${sitter.id}`}
                            leftIcon={<i className="fas fa-dollar-sign" />}
                          >
                            View Payroll History
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                        No payroll data available
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}
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

