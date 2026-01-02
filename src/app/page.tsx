/**
 * Dashboard - Control Surface
 * 
 * Observational posture: calm, wide layouts, slow ambient motion,
 * stable data presentation, gradual emphasis shifts.
 * 
 * This page establishes the DNA for the entire system.
 */

'use client';

import { useState, useEffect } from 'react';
import { ControlSurfaceAppShell } from '@/components/control-surface/AppShell';
import { Panel, StatCard, Button } from '@/components/control-surface';
import { controlSurface } from '@/lib/design-tokens-control-surface';
import Link from 'next/link';

interface DashboardStats {
  totalBookings: number;
  activeSitters: number;
  totalRevenue: number;
  happyClients: number;
}

export default function ControlSurfaceDashboard() {
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
    <ControlSurfaceAppShell posture="observational">
      {/* Page Header */}
      <div
        style={{
          padding: controlSurface.layout.container.padding,
          paddingBottom: controlSurface.spacing[8],
          maxWidth: controlSurface.layout.container.maxWidth,
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: controlSurface.spacing[10],
            gap: controlSurface.spacing[6],
          }}
        >
          <div>
            <h1
              style={{
                fontSize: controlSurface.typography.fontSize['3xl'][0] as string,
                fontWeight: controlSurface.typography.fontWeight.semibold,
                color: controlSurface.colors.base.neutral.primary,
                lineHeight: (controlSurface.typography.fontSize['3xl'][1] as { lineHeight: string }).lineHeight,
                letterSpacing: (controlSurface.typography.fontSize['3xl'][1] as { letterSpacing: string }).letterSpacing,
                margin: 0,
                marginBottom: controlSurface.spacing[2],
              }}
            >
              Dashboard
            </h1>
            <p
              style={{
                fontSize: controlSurface.typography.fontSize.base[0] as string,
                color: controlSurface.colors.base.neutral.secondary,
                lineHeight: (controlSurface.typography.fontSize.base[1] as { lineHeight: string }).lineHeight,
                margin: 0,
              }}
            >
              Overview of your pet care business operations
            </p>
          </div>
          <Link href="/bookings">
            <Button variant="primary">View All Bookings</Button>
          </Link>
        </div>

        {/* Stats Grid - Observational Posture: Wide, Calm, Stable */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: controlSurface.spacing[6],
            marginBottom: controlSurface.spacing[12],
          }}
          className="cs-responsive-grid"
        >
          {loading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Panel key={i} depth="elevated" spacing="moderate">
                  <div
                    style={{
                      height: '120px',
                      backgroundColor: controlSurface.colors.base.depth1,
                      borderRadius: controlSurface.spatial.radius.base,
                      animation: 'pulse 2s ease-in-out infinite',
                    }}
                  />
                </Panel>
              ))}
            </>
          ) : (
            <>
              <StatCard
                label="Active Bookings"
                value={stats.totalBookings}
                icon={<i className="fas fa-calendar-check" />}
                voltage="ambient"
              />
              <StatCard
                label="Active Sitters"
                value={stats.activeSitters}
                icon={<i className="fas fa-user-friends" />}
                voltage="ambient"
              />
              <StatCard
                label="Total Revenue"
                value={`$${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                icon={<i className="fas fa-dollar-sign" />}
                voltage="edge"
              />
              <StatCard
                label="Happy Clients"
                value={stats.happyClients}
                icon={<i className="fas fa-smile" />}
                voltage="ambient"
              />
            </>
          )}
        </div>

        {/* Quick Actions - Observational: Stable, Deliberate */}
        <Panel depth="elevated" voltage="ambient" spacing="moderate">
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: controlSurface.spacing[6],
            }}
          >
            <div
              style={{
                fontSize: controlSurface.typography.fontSize.lg[0] as string,
                fontWeight: controlSurface.typography.fontWeight.semibold,
                color: controlSurface.colors.base.neutral.primary,
                lineHeight: (controlSurface.typography.fontSize.lg[1] as { lineHeight: string }).lineHeight,
              }}
            >
              Quick Actions
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: controlSurface.spacing[4],
              }}
              className="cs-responsive-grid"
            >
              <Link href="/bookings">
                <Button variant="secondary" leftIcon={<i className="fas fa-calendar-check" />} style={{ width: '100%' }}>
                  View Bookings
                </Button>
              </Link>
              <Link href="/clients">
                <Button variant="secondary" leftIcon={<i className="fas fa-users" />} style={{ width: '100%' }}>
                  Manage Clients
                </Button>
              </Link>
              <Link href="/bookings/sitters">
                <Button variant="secondary" leftIcon={<i className="fas fa-user-friends" />} style={{ width: '100%' }}>
                  Manage Sitters
                </Button>
              </Link>
              <Link href="/payments">
                <Button variant="secondary" leftIcon={<i className="fas fa-credit-card" />} style={{ width: '100%' }}>
                  View Payments
                </Button>
              </Link>
            </div>
          </div>
        </Panel>
      </div>
    </ControlSurfaceAppShell>
  );
}

