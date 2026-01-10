/**
 * Client Detail Page - Enterprise Rebuild
 * 
 * Complete client detail view with profile, booking history, and payment summary.
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { SitterAssignmentDisplay } from '@/components/sitter';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
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
  paymentStatus: string;
  pets: Array<{ species: string }>;
  sitter?: {
    id: string;
    firstName: string;
    lastName: string;
    currentTier?: {
      id: string;
      name: string;
      priorityLevel?: number;
      color?: string;
    } | null;
  } | null;
  timeSlots?: Array<{
    id: string;
    startAt: Date | string;
    endAt: Date | string;
    duration?: number;
  }>;
}

interface ClientStats {
  totalBookings: number;
  totalRevenue: number;
  completedBookings: number;
  upcomingBookings: number;
}

function ClientDetailContent() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  const isMobile = useMobile();

  const [client, setClient] = useState<Client | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clientId) {
      fetchClientData();
    }
  }, [clientId]);

  const fetchClientData = async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch client');
      }
      const data = await response.json();
      setClient(data.client);
      setBookings(data.bookings || []);
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to fetch client:', error);
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
      key: 'service',
      header: 'Service',
      mobileLabel: 'Service',
      mobileOrder: 1,
      render: (row) => (
        <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
          {row.service}
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      mobileLabel: 'Date',
      mobileOrder: 2,
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
      mobileOrder: 3,
      render: (row) => (
        <Badge variant={getStatusBadgeVariant(row.status)}>
          {row.status}
        </Badge>
      ),
      align: 'center',
    },
    {
      key: 'sitter',
      header: 'Sitter',
      mobileLabel: 'Sitter',
      mobileOrder: 4,
      render: (row) => (
        <SitterAssignmentDisplay sitter={row.sitter} showUnassigned compact showTierBadge />
      ),
    },
    {
      key: 'total',
      header: 'Total',
      mobileLabel: 'Total',
      mobileOrder: 5,
      render: (row) => (
        <div style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
          {formatCurrency(row.totalPrice)}
        </div>
      ),
      align: 'right',
    },
  ];

  if (loading) {
    return (
      <AppShell>
        <PageHeader title="Client Details" />
        <div style={{ padding: tokens.spacing[6] }}>
          <Skeleton height={400} />
        </div>
      </AppShell>
    );
  }

  if (!client) {
    return (
      <AppShell>
        <PageHeader title="Client Not Found" />
        <div style={{ padding: tokens.spacing[6] }}>
          <EmptyState
            title="Client not found"
            description="The client you're looking for doesn't exist."
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title={`${client.firstName} ${client.lastName}`}
        description="Client profile and booking history"
        actions={
          <div style={{ display: 'flex', gap: tokens.spacing[3] }}>
            <Link href="/clients">
              <Button variant="secondary" leftIcon={<i className="fas fa-arrow-left" />}>
                Back
              </Button>
            </Link>
          </div>
        }
      />

      <div style={{ padding: tokens.spacing[6] }}>
        {isMobile ? (
          <>
            {/* Mobile: Stats Cards */}
            {stats && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing[4], marginBottom: tokens.spacing[6] }}>
                <StatCard label="Total Bookings" value={stats.totalBookings} />
                <StatCard label="Total Revenue" value={formatCurrency(stats.totalRevenue)} />
                <StatCard label="Completed" value={stats.completedBookings} />
                <StatCard label="Upcoming" value={stats.upcomingBookings} />
              </div>
            )}

            {/* Mobile: Client Profile */}
            <Card style={{ marginBottom: tokens.spacing[4] }}>
              <SectionHeader title="Contact Information" />
              <div style={{ padding: tokens.spacing[4], display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
                <div>
                  <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                    Phone
                  </div>
                  <a href={`tel:${client.phone}`} style={{ color: tokens.colors.primary.DEFAULT, textDecoration: 'none' }}>
                    {client.phone}
                  </a>
                </div>
                <div>
                  <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                    Email
                  </div>
                  <a href={`mailto:${client.email}`} style={{ color: tokens.colors.primary.DEFAULT, textDecoration: 'none' }}>
                    {client.email}
                  </a>
                </div>
                {client.address && (
                  <div>
                    <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                      Address
                    </div>
                    <div>{client.address}</div>
                  </div>
                )}
              </div>
            </Card>

            {/* Mobile: Booking History */}
            <Card>
              <SectionHeader title="Booking History" />
              <Table
                columns={bookingColumns}
                data={bookings}
                emptyMessage="No bookings found for this client."
                onRowClick={(row) => {
                  window.location.href = `/bookings/${row.id}`;
                }}
                keyExtractor={(row) => row.id}
              />
            </Card>
          </>
        ) : (
          <>
            {/* Desktop: Two Column Layout */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 400px',
                gap: tokens.spacing[6],
              }}
            >
              {/* Left Column: Booking History */}
              <div>
                {/* Stats Row */}
                {stats && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: tokens.spacing[4], marginBottom: tokens.spacing[6] }}>
                    <StatCard label="Total Bookings" value={stats.totalBookings} />
                    <StatCard label="Total Revenue" value={formatCurrency(stats.totalRevenue)} />
                    <StatCard label="Completed" value={stats.completedBookings} />
                    <StatCard label="Upcoming" value={stats.upcomingBookings} />
                  </div>
                )}

                {/* Booking History */}
                <Card>
                  <SectionHeader title="Booking History" />
                  <Table
                    columns={bookingColumns}
                    data={bookings}
                    emptyMessage="No bookings found for this client."
                    onRowClick={(row) => {
                      window.location.href = `/bookings/${row.id}`;
                    }}
                    keyExtractor={(row) => row.id}
                  />
                </Card>
              </div>

              {/* Right Column: Client Profile & Actions */}
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
                {/* Client Profile */}
                <Card>
                  <SectionHeader title="Client Profile" />
                  <div style={{ padding: tokens.spacing[4], display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
                    <div>
                      <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                        Name
                      </div>
                      <div style={{ fontWeight: tokens.typography.fontWeight.semibold, fontSize: tokens.typography.fontSize.base[0] }}>
                        {client.firstName} {client.lastName}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                        Phone
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        style={{ width: '100%', justifyContent: 'flex-start' }}
                        onClick={() => window.location.href = `tel:${client.phone}`}
                        leftIcon={<i className="fas fa-phone" />}
                      >
                        {client.phone}
                      </Button>
                    </div>
                    <div>
                      <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                        Email
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        style={{ width: '100%', justifyContent: 'flex-start' }}
                        onClick={() => window.location.href = `mailto:${client.email}`}
                        leftIcon={<i className="fas fa-envelope" />}
                      >
                        {client.email}
                      </Button>
                    </div>
                    {client.address && (
                      <div>
                        <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                          Address
                        </div>
                        <div style={{ fontSize: tokens.typography.fontSize.sm[0] }}>{client.address}</div>
                      </div>
                    )}
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
                      leftIcon={<i className="fas fa-calendar-plus" />}
                      onClick={() => {
                        // Navigate to create booking with client pre-filled
                        window.location.href = `/bookings/new?clientId=${client.id}`;
                      }}
                    >
                      New Booking
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      style={{ width: '100%' }}
                      leftIcon={<i className="fas fa-envelope" />}
                      onClick={() => window.location.href = `/messages?clientId=${client.id}`}
                    >
                      Send Message
                    </Button>
                  </div>
                </Card>

                {/* Payments Summary */}
                <Card>
                  <SectionHeader title="Payments Summary" />
                  <div style={{ padding: tokens.spacing[4] }}>
                    {stats ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
                        <div>
                          <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                            Total Revenue
                          </div>
                          <div style={{ fontSize: tokens.typography.fontSize.xl[0], fontWeight: tokens.typography.fontWeight.bold, color: tokens.colors.success.DEFAULT }}>
                            {formatCurrency(stats.totalRevenue)}
                          </div>
                        </div>
                        <div style={{ paddingTop: tokens.spacing[3], borderTop: `1px solid ${tokens.colors.border.default}` }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            style={{ width: '100%', justifyContent: 'flex-start' }}
                            onClick={() => window.location.href = `/payments?clientId=${client.id}`}
                            leftIcon={<i className="fas fa-dollar-sign" />}
                          >
                            View Payment History
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                        No payment data available
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

export default function ClientDetailPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <PageHeader title="Client Details" />
        <div style={{ padding: tokens.spacing[6] }}>
          <Skeleton height={400} />
        </div>
      </AppShell>
    }>
      <ClientDetailContent />
    </Suspense>
  );
}

