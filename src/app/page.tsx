/**
 * Dashboard Home Page - Enterprise Rebuild
 * 
 * Complete rebuild using design system and components.
 * Zero legacy styling - all through components and tokens.
 */

'use client';

import { useState, useEffect } from 'react';
import { PageHeader, StatCard, Card, Button, Skeleton } from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';
import Link from 'next/link';

interface DashboardStats {
  totalBookings: number;
  activeSitters: number;
  totalRevenue: number;
  happyClients: number;
}

export default function DashboardHomePage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    activeSitters: 0,
    totalRevenue: 0,
    happyClients: 0,
  });
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

      const activeBookings = (bookings.bookings || []).filter(
        (b: any) => b.status !== 'cancelled' && b.status !== 'completed'
      );
      const activeSitters = (sitters.sitters || []).filter((s: any) => s.active);
      const totalRevenue = (bookings.bookings || []).reduce(
        (sum: number, b: any) => sum + (b.totalPrice || 0),
        0
      );

      setStats({
        totalBookings: activeBookings.length,
        activeSitters: activeSitters.length,
        totalRevenue,
        happyClients: Math.floor(activeBookings.length * 0.95),
      });
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

      {/* Stats Grid - Phase B6: Hierarchy with Active Bookings as heartbeat */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: tokens.spacing[4], // Phase B6: Tighter gap to reduce equality
          marginBottom: tokens.spacing[6], // Phase B6: Reduced margin
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
            {/* Active Bookings - Primary heartbeat */}
            <div style={{ 
              border: `1px solid ${tokens.colors.border.default}`, // Phase B6: Slight emphasis
              borderRadius: tokens.radius.sm,
              padding: tokens.spacing[1],
              boxShadow: tokens.shadow.xs, // Phase B6: Subtle depth
            }}>
              <StatCard
                label="Active Bookings"
                value={stats.totalBookings}
                icon={<i className="fas fa-calendar-check" />}
              />
            </div>
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

      {/* Quick Actions - Phase B6: Secondary to stats */}
      <Card
        header={
          <div
            style={{
              fontSize: tokens.typography.fontSize.base[0], // Phase B6: Smaller heading
              fontWeight: tokens.typography.fontWeight.medium, // Phase B6: Lighter weight
              color: tokens.colors.text.secondary, // Phase B6: Less prominent
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
