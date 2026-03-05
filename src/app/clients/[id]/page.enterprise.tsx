'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { OwnerAppShell, LayoutWrapper, PageHeader, Section } from '@/components/layout';
import { AppErrorState, getStatusPill } from '@/components/app';
import { Button, DataTableShell, EmptyState, StatusChip, Table, TableSkeleton } from '@/components/ui';

type Booking = {
  id: string;
  service: string;
  startAt: string;
  endAt: string;
  status: string;
  totalPrice: number;
  paymentStatus: string;
  sitter?: { id: string; firstName: string; lastName: string } | null;
};

type ClientData = {
  client: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    address?: string;
  };
  stats: {
    totalBookings: number;
    totalRevenue: number;
    completedBookings: number;
    upcomingBookings: number;
  };
  bookings: Booking[];
};

export default function ClientDetailEnterprisePage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${params.id}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to load client');
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load client');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id) void load();
  }, [params.id, load]);

  const nextBooking = useMemo(
    () =>
      data?.bookings
        ?.filter((b) => new Date(b.startAt).getTime() > Date.now())
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0],
    [data]
  );

  if (loading) {
    return (
      <OwnerAppShell>
        <LayoutWrapper variant="wide">
          <PageHeader title="Client" subtitle="Loading..." />
          <TableSkeleton rows={8} cols={5} />
        </LayoutWrapper>
      </OwnerAppShell>
    );
  }
  if (error || !data) {
    return (
      <OwnerAppShell>
        <LayoutWrapper variant="wide">
          <PageHeader title="Client" subtitle="Unable to load client" />
          <AppErrorState title="Couldn't load client" subtitle={error || 'Unknown error'} onRetry={() => void load()} />
        </LayoutWrapper>
      </OwnerAppShell>
    );
  }

  const c = data.client;
  return (
    <OwnerAppShell>
      <LayoutWrapper variant="wide">
        <PageHeader
          title={`${c.firstName} ${c.lastName}`}
          subtitle="Client operator profile"
          actions={
            <div className="flex gap-2">
              <Link href="/clients"><Button variant="secondary">Back</Button></Link>
              <Link href={`/bookings/new?clientId=${c.id}`}><Button>New booking</Button></Link>
              <a href={`mailto:${c.email}`}><Button variant="secondary">Message</Button></a>
              <Link href={`/payments?clientId=${c.id}`}><Button variant="secondary">View payments</Button></Link>
            </div>
          }
        />

        <Section title="At a Glance">
          <div className="grid gap-3 md:grid-cols-5">
            <div className="rounded-lg border p-3"><div className="text-xs text-[var(--color-text-secondary)]">Next booking</div><div>{nextBooking ? new Date(nextBooking.startAt).toLocaleString() : 'None'}</div></div>
            <div className="rounded-lg border p-3"><div className="text-xs text-[var(--color-text-secondary)]">Last booking</div><div>{data.bookings[0] ? new Date(data.bookings[0].startAt).toLocaleDateString() : 'None'}</div></div>
            <div className="rounded-lg border p-3"><div className="text-xs text-[var(--color-text-secondary)]">Total bookings</div><div>{data.stats.totalBookings}</div></div>
            <div className="rounded-lg border p-3"><div className="text-xs text-[var(--color-text-secondary)]">Upcoming</div><div>{data.stats.upcomingBookings}</div></div>
            <div className="rounded-lg border p-3"><div className="text-xs text-[var(--color-text-secondary)]">Revenue</div><div>${data.stats.totalRevenue.toFixed(2)}</div></div>
          </div>
        </Section>

        <Section title="Booking History">
          {data.bookings.length === 0 ? (
            <EmptyState title="No bookings yet" description="Create a booking to start client history." />
          ) : (
            <DataTableShell stickyHeader>
              <Table<Booking>
                forceTableLayout
                columns={[
                  { key: 'service', header: 'Service', mobileOrder: 1, mobileLabel: 'Service' },
                  {
                    key: 'startAt',
                    header: 'Scheduled',
                    mobileOrder: 2,
                    mobileLabel: 'Scheduled',
                    render: (r) => new Date(r.startAt).toLocaleString(),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    mobileOrder: 3,
                    mobileLabel: 'Status',
                    render: (r) => <StatusChip>{getStatusPill(r.status).label}</StatusChip>,
                  },
                  {
                    key: 'sitter',
                    header: 'Sitter',
                    mobileOrder: 4,
                    mobileLabel: 'Sitter',
                    hideBelow: 'md',
                    render: (r) => (r.sitter ? `${r.sitter.firstName} ${r.sitter.lastName}` : 'Unassigned'),
                  },
                  { key: 'total', header: 'Total', mobileOrder: 5, mobileLabel: 'Total', align: 'right', render: (r) => `$${r.totalPrice.toFixed(2)}` },
                ]}
                data={data.bookings}
                keyExtractor={(r) => r.id}
                onRowClick={(r) => (window.location.href = `/bookings/${r.id}`)}
                emptyMessage="No bookings"
              />
            </DataTableShell>
          )}
        </Section>
      </LayoutWrapper>
    </OwnerAppShell>
  );
}

