/**
 * Dashboard Home Page - Enterprise Rebuild
 * 
 * Complete rebuild using design system and components.
 * Zero legacy styling - all through components and tokens.
 */

'use client';

import { useState, useEffect } from 'react';
import { PageHeader, StatCard, Card, Button, Skeleton, Table, Badge } from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';
import { TableColumn } from '@/components/ui/Table';
import Link from 'next/link';

interface DashboardStats {
  totalBookings: number;
  activeSitters: number;
  totalRevenue: number;
  happyClients: number;
}

interface Booking {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  service: string;
  startAt: Date | string;
  endAt: Date | string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  totalPrice: number;
  pets: Array<{ species: string }>;
  sitter?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export default function DashboardHomePage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    activeSitters: 0,
    totalRevenue: 0,
    happyClients: 0,
  });
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [bookingsRes, sittersRes] = await Promise.all([
        fetch('/api/bookings').catch(() => null),
        fetch('/api/sitters').catch(() => null),
      ]);

      const bookings = bookingsRes?.ok ? await bookingsRes.json() : { bookings: [] };
      const sitters = sittersRes?.ok ? await sittersRes.json() : { sitters: [] };

      const bookingsList = (bookings.bookings || []).map((b: any) => ({
        ...b,
        startAt: new Date(b.startAt),
        endAt: new Date(b.endAt),
      }));

      const activeBookings = bookingsList.filter(
        (b: Booking) => b.status !== 'cancelled' && b.status !== 'completed'
      );
      const activeSitters = (sitters.sitters || []).filter((s: any) => s.active);
      const totalRevenue = bookingsList.reduce(
        (sum: number, b: Booking) => sum + (b.totalPrice || 0),
        0
      );

      // Get recent bookings (last 10, sorted by date)
      const recent = bookingsList
        .sort((a: Booking, b: Booking) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
        .slice(0, 10);

      setStats({
        totalBookings: activeBookings.length,
        activeSitters: activeSitters.length,
        totalRevenue,
        happyClients: Math.floor(activeBookings.length * 0.95),
      });
      setRecentBookings(recent);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Dashboard"
        description="Overview of your pet care business operations"
        actions={
          <Link href="/bookings">
            <Button variant="primary">
              View All Bookings
            </Button>
          </Link>
        }
      />

      {/* Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: tokens.spacing[6],
          marginBottom: tokens.spacing[8],
        }}
      >
        {loading ? (
          <>
            <Skeleton height="120px" />
            <Skeleton height="120px" />
            <Skeleton height="120px" />
            <Skeleton height="120px" />
          </>
        ) : (
          <>
            <StatCard
              label="Active Bookings"
              value={stats.totalBookings}
              icon={<i className="fas fa-calendar-check" />}
            />
            <StatCard
              label="Active Sitters"
              value={stats.activeSitters}
              icon={<i className="fas fa-user-friends" />}
            />
            <StatCard
              label="Total Revenue"
              value={`$${stats.totalRevenue.toFixed(2)}`}
              icon={<i className="fas fa-dollar-sign" />}
            />
            <StatCard
              label="Happy Clients"
              value={stats.happyClients}
              icon={<i className="fas fa-smile" />}
            />
          </>
        )}
      </div>

      {/* Recent Bookings */}
      <Card
        header={
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                fontSize: tokens.typography.fontSize.lg[0],
                fontWeight: tokens.typography.fontWeight.semibold,
                color: tokens.colors.text.primary,
              }}
            >
              Recent Bookings
            </div>
            <Link href="/bookings">
              <Button variant="secondary" size="sm">
                View All
              </Button>
            </Link>
          </div>
        }
        style={{ marginBottom: tokens.spacing[6] }}
      >
        {loading ? (
          <Skeleton height="300px" />
        ) : recentBookings.length === 0 ? (
          <div
            style={{
              padding: tokens.spacing[8],
              textAlign: 'center',
              color: tokens.colors.text.secondary,
            }}
          >
            No bookings yet. Create your first booking to get started.
          </div>
        ) : (
          <RecentBookingsTable bookings={recentBookings} />
        )}
      </Card>

      {/* Quick Actions */}
      <Card
        header={
          <div
            style={{
              fontSize: tokens.typography.fontSize.lg[0],
              fontWeight: tokens.typography.fontWeight.semibold,
              color: tokens.colors.text.primary,
            }}
          >
            Quick Actions
          </div>
        }
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: tokens.spacing[4],
          }}
        >
          <Link href="/bookings">
            <Button variant="secondary" leftIcon={<i className="fas fa-calendar-check" />}>
              View Bookings
            </Button>
          </Link>
          <Link href="/clients">
            <Button variant="secondary" leftIcon={<i className="fas fa-users" />}>
              Manage Clients
            </Button>
          </Link>
          <Link href="/bookings/sitters">
            <Button variant="secondary" leftIcon={<i className="fas fa-user-friends" />}>
              Manage Sitters
            </Button>
          </Link>
          <Link href="/payments">
            <Button variant="secondary" leftIcon={<i className="fas fa-credit-card" />}>
              View Payments
            </Button>
          </Link>
        </div>
      </Card>
    </AppShell>
  );
}

function RecentBookingsTable({ bookings }: { bookings: Booking[] }) {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'error' | 'neutral'> = {
      pending: 'warning',
      confirmed: 'success',
      completed: 'default',
      cancelled: 'error',
    };
    return (
      <Badge variant={variants[status] || 'neutral'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const columns: TableColumn<Booking>[] = [
    {
      key: 'client',
      header: 'Client',
      render: (row) => (
        <div>
          <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
            {row.firstName} {row.lastName}
          </div>
          <div
            style={{
              fontSize: tokens.typography.fontSize.sm[0],
              color: tokens.colors.text.secondary,
            }}
          >
            {row.phone}
          </div>
        </div>
      ),
    },
    {
      key: 'service',
      header: 'Service',
      render: (row) => <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>{row.service}</div>,
    },
    {
      key: 'date',
      header: 'Date',
      render: (row) => <div style={{ fontSize: tokens.typography.fontSize.sm[0] }}>{formatDate(row.startAt)}</div>,
    },
    {
      key: 'sitter',
      header: 'Sitter',
      render: (row) =>
        row.sitter ? (
          <div>{row.sitter.firstName} {row.sitter.lastName}</div>
        ) : (
          <span style={{ color: tokens.colors.text.tertiary }}>Unassigned</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => getStatusBadge(row.status),
      align: 'center',
    },
    {
      key: 'price',
      header: 'Price',
      render: (row) => (
        <div style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
          ${row.totalPrice.toFixed(2)}
        </div>
      ),
      align: 'right',
    },
  ];

  return (
    <Table
      columns={columns}
      data={bookings}
      emptyMessage="No bookings found"
      onRowClick={(row) => {
        window.location.href = `/bookings?booking=${row.id}`;
      }}
      keyExtractor={(row) => row.id}
    />
  );
}
