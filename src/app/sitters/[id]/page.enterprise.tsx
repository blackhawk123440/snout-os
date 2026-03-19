'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { OwnerAppShell, LayoutWrapper, PageHeader, Section } from '@/components/layout';
import { AppErrorState, getStatusPill } from '@/components/app';
import { Button, DataTableShell, EmptyState, StatusChip, Table, TableSkeleton } from '@/components/ui';

type Booking = {
  id: string;
  firstName: string;
  lastName: string;
  service: string;
  startAt: string;
  endAt: string;
  status: string;
  totalPrice: number;
};

type Dashboard = {
  pendingRequests?: Booking[];
  upcomingBookings?: Booking[];
  completedBookings?: Booking[];
  stats?: { totalBookings?: number; completedBookings?: number; totalEarnings?: number; upcomingCount?: number };
};

type Sitter = {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
  commissionPercentage?: number;
};

export default function SitterDetailEnterprisePage() {
  const params = useParams<{ id: string }>();
  const sitterId = params.id;

  const { data, isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['owner', 'sitters', sitterId],
    queryFn: async () => {
      const [sitterRes, dashRes] = await Promise.all([
        fetch(`/api/sitters/${sitterId}`),
        fetch(`/api/sitters/${sitterId}/dashboard`),
      ]);
      const sitterJson = await sitterRes.json().catch(() => ({}));
      const dashJson = await dashRes.json().catch(() => ({}));
      if (!sitterRes.ok) throw new Error(sitterJson.error || 'Failed to load sitter');
      if (!dashRes.ok) throw new Error(dashJson.error || 'Failed to load sitter dashboard');
      return { sitter: (sitterJson.sitter || null) as Sitter | null, dashboard: (dashJson || null) as Dashboard | null };
    },
    enabled: !!sitterId,
  });

  const sitter = data?.sitter ?? null;
  const dashboard = data?.dashboard ?? null;

  const nextBooking = useMemo(
    () =>
      dashboard?.upcomingBookings
        ?.slice()
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0],
    [dashboard]
  );

  if (loading) {
    return (
      <OwnerAppShell>
        <LayoutWrapper variant="wide">
          <PageHeader title="Sitter" subtitle="Loading..." />
          <TableSkeleton rows={7} cols={5} />
        </LayoutWrapper>
      </OwnerAppShell>
    );
  }
  if (queryError || !sitter) {
    return (
      <OwnerAppShell>
        <LayoutWrapper variant="wide">
          <PageHeader title="Sitter" subtitle="Unable to load sitter" />
          <AppErrorState title="Couldn't load sitter" subtitle={queryError?.message || 'Unknown error'} onRetry={() => void refetch()} />
        </LayoutWrapper>
      </OwnerAppShell>
    );
  }

  const bookings = dashboard?.upcomingBookings || [];
  const completed = dashboard?.completedBookings || [];
  const stats = dashboard?.stats || {};

  return (
    <OwnerAppShell>
      <LayoutWrapper variant="wide">
        <PageHeader
          title={`${sitter.firstName} ${sitter.lastName}`}
          subtitle="Sitter operator profile"
          actions={
            <div className="flex gap-2">
              <Link href="/sitters"><Button variant="secondary">Back</Button></Link>
              <Link href="/bookings/new"><Button>New booking</Button></Link>
              {sitter.phone ? <a href={`tel:${sitter.phone}`} title="Owner/admin operational call exception"><Button variant="secondary">Call (ops exception)</Button></a> : null}
              <Link href={`/ops/calendar-repair?sitterId=${sitter.id}`}><Button variant="secondary">Repair calendar</Button></Link>
              <Link href={`/ops/payouts?sitterId=${sitter.id}`}><Button variant="secondary">View payouts</Button></Link>
            </div>
          }
        />

        <Section title="At a Glance">
          <div className="grid gap-3 md:grid-cols-5">
            <div className="rounded-lg border p-3"><div className="text-xs text-[var(--color-text-secondary)]">Next booking</div><div>{nextBooking ? new Date(nextBooking.startAt).toLocaleString() : 'None'}</div></div>
            <div className="rounded-lg border p-3"><div className="text-xs text-[var(--color-text-secondary)]">Last completed</div><div>{completed[0] ? new Date(completed[0].endAt).toLocaleDateString() : 'None'}</div></div>
            <div className="rounded-lg border p-3"><div className="text-xs text-[var(--color-text-secondary)]">Total bookings</div><div>{stats.totalBookings || 0}</div></div>
            <div className="rounded-lg border p-3"><div className="text-xs text-[var(--color-text-secondary)]">Earnings</div><div>${Number(stats.totalEarnings || 0).toFixed(2)}</div></div>
            <div className="rounded-lg border p-3"><div className="text-xs text-[var(--color-text-secondary)]">Status</div><StatusChip variant={sitter.isActive ? 'success' : 'warning'}>{sitter.isActive ? 'Active' : 'Inactive'}</StatusChip></div>
          </div>
        </Section>

        <Section title="Upcoming Bookings">
          {bookings.length === 0 ? (
            <EmptyState title="No upcoming bookings" description="Assign this sitter to upcoming work from bookings." />
          ) : (
            <DataTableShell stickyHeader>
              <Table<Booking>
                forceTableLayout
                columns={[
                  { key: 'client', header: 'Client', mobileOrder: 1, mobileLabel: 'Client', render: (r) => `${r.firstName} ${r.lastName}` },
                  { key: 'service', header: 'Service', mobileOrder: 2, mobileLabel: 'Service' },
                  { key: 'startAt', header: 'Start', mobileOrder: 3, mobileLabel: 'Start', render: (r) => new Date(r.startAt).toLocaleString() },
                  { key: 'status', header: 'Status', mobileOrder: 4, mobileLabel: 'Status', render: (r) => <StatusChip>{getStatusPill(r.status).label}</StatusChip> },
                  { key: 'total', header: 'Total', mobileOrder: 5, mobileLabel: 'Total', align: 'right', render: (r) => `$${r.totalPrice.toFixed(2)}` },
                ]}
                data={bookings}
                keyExtractor={(r) => r.id}
                onRowClick={(r) => (window.location.href = `/bookings/${r.id}`)}
                emptyMessage="No upcoming bookings"
              />
            </DataTableShell>
          )}
        </Section>
      </LayoutWrapper>
    </OwnerAppShell>
  );
}

