/**
 * Dashboard Home Page - Enterprise Rebuild
 * 
 * Complete rebuild using design system and components.
 * Real-time metrics via /api/ops/metrics (poll every 15s).
 * Revenue forecast chart via /api/ops/forecast/revenue.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, StatCard, Card, Button, Skeleton } from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';
import { useAuth } from '@/lib/auth-client';
import Link from 'next/link';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface MetricsData {
  activeVisitsCount: number;
  openBookingsCount: number;
  revenueYTD: number;
  retentionRate: number;
  timestamp?: string;
}

interface ForecastData {
  daily: { date: string; amount: number }[];
  aiCommentary: string;
}

export default function DashboardHomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);

  // Redirect based on authentication and role
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login?redirect=/');
      } else {
        const isSitter = (user as any).sitterId;
        if (isSitter) {
          router.push('/sitter/inbox');
        } else {
          // Owners: canonical home is Command Center
          router.replace('/command-center');
        }
      }
    }
  }, [user, authLoading, router]);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/ops/metrics');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch {
      // Fallback: try legacy endpoints
      const [bookingsRes, sittersRes] = await Promise.all([
        fetch('/api/bookings').catch(() => null),
        fetch('/api/sitters').catch(() => null),
      ]);
      const bookings = bookingsRes?.ok ? await bookingsRes.json() : { bookings: [] };
      const sitters = sittersRes?.ok ? await sittersRes.json() : { sitters: [] };
      const activeBookings = (bookings.bookings || []).filter(
        (b: any) => b.status !== 'cancelled' && b.status !== 'completed'
      );
      setMetrics({
        activeVisitsCount: activeBookings.filter((b: any) => b.status === 'in_progress').length,
        openBookingsCount: activeBookings.length,
        revenueYTD: (bookings.bookings || []).reduce((s: number, b: any) => s + (b.totalPrice || 0), 0),
        retentionRate: 0,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchForecast = useCallback(async () => {
    try {
      // Deterministic only (fast). Use ?ai=true for AI commentary.
      const res = await fetch('/api/ops/forecast/revenue?range=90d');
      if (res.ok) {
        const data = await res.json();
        setForecast(data);
      }
    } catch {
      setForecast(null);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchMetrics();
      fetchForecast();
    }
  }, [user, fetchMetrics, fetchForecast]);

  // Poll metrics every 15s
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchMetrics, 15000);
    return () => clearInterval(interval);
  }, [user, fetchMetrics]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: tokens.colors.text.secondary }}>Loading...</div>
      </div>
    );
  }

  // Redirect to login if not authenticated (handled by useEffect, but show nothing while redirecting)
  if (!user) {
    return null;
  }

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

      {/* Real-time metrics (poll every 15s) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: tokens.spacing[2],
          marginBottom: tokens.spacing[4],
        }}
      >
        {loading ? (
          <>
            <Skeleton height="120px" />
            <Skeleton height="120px" />
            <Skeleton height="120px" />
            <Skeleton height="120px" />
          </>
        ) : metrics ? (
          <>
            <div style={{
              border: `1px solid ${tokens.colors.border.default}`,
              borderRadius: tokens.borderRadius.sm,
              padding: tokens.spacing[1],
              boxShadow: tokens.shadows.md,
            }}>
              <StatCard
                label="Active Visits (GPS)"
                value={metrics.activeVisitsCount}
                icon={<i className="fas fa-map-marker-alt" />}
              />
            </div>
            <StatCard
              label="Open Bookings"
              value={metrics.openBookingsCount}
              icon={<i className="fas fa-calendar-check" />}
            />
            <StatCard
              label="Revenue YTD"
              value={`$${metrics.revenueYTD.toFixed(2)}`}
              icon={<i className="fas fa-dollar-sign" />}
            />
            <StatCard
              label="Retention %"
              value={`${metrics.retentionRate}%`}
              icon={<i className="fas fa-users" />}
            />
          </>
        ) : (
          <Skeleton height="120px" />
        )}
      </div>

      {/* Revenue forecast chart */}
      {forecast && forecast.daily.length > 0 && (
        <Card
          header={
            <div style={{
              fontSize: tokens.typography.fontSize.base[0],
              fontWeight: tokens.typography.fontWeight.medium,
              color: tokens.colors.text.secondary,
            }}>
              Revenue (last 90 days)
            </div>
          }
        >
          <div style={{ padding: tokens.spacing[4], minHeight: 200 }}>
            <Line
              data={{
                labels: forecast.daily.slice(-30).map((d) => d.date.slice(5)),
                datasets: [{
                  label: 'Revenue ($)',
                  data: forecast.daily.slice(-30).map((d) => d.amount),
                  borderColor: tokens.colors.primary.DEFAULT,
                  backgroundColor: tokens.colors.primary[100],
                  tension: 0.2,
                }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                  legend: { display: false },
                },
                scales: {
                  y: { beginAtZero: true },
                },
              }}
            />
          </div>
          {forecast.aiCommentary && (
            <div style={{
              padding: tokens.spacing[4],
              paddingTop: 0,
              fontSize: tokens.typography.fontSize.sm[0],
              color: tokens.colors.text.secondary,
              fontStyle: 'italic',
            }}>
              {forecast.aiCommentary}
            </div>
          )}
        </Card>
      )}

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
