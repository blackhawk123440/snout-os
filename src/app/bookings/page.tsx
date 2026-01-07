/**
 * Bookings List Page - Enterprise Rebuild
 * 
 * Complete rebuild using design system and components.
 * Zero legacy styling - all through components and tokens.
 */

'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  PageHeader,
  Table,
  Button,
  Badge,
  Card,
  Input,
  Select,
  EmptyState,
  Skeleton,
  StatCard,
  Tabs,
  TabPanel,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';
import { TableColumn } from '@/components/ui/Table';

interface Booking {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
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
  } | null;
  timeSlots?: Array<{
    startAt: Date | string;
    endAt: Date | string;
    duration?: number;
  }>;
}

interface OverviewStats {
  todaysVisits: number;
  unassigned: number;
  pending: number;
  monthlyRevenue: number;
}

interface Sitter {
  id: string;
  firstName: string;
  lastName: string;
}

function BookingsPageContent() {
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [sitters, setSitters] = useState<Sitter[]>([]);
  const [loading, setLoading] = useState(true);
  const [overviewStats, setOverviewStats] = useState<OverviewStats>({
    todaysVisits: 0,
    unassigned: 0,
    pending: 0,
    monthlyRevenue: 0,
  });
  const [activeTab, setActiveTab] = useState<'all' | 'today' | 'pending' | 'confirmed' | 'completed' | 'unassigned'>('all');
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'today'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'price'>('date');

  useEffect(() => {
    fetchData();
  }, []);


  // Sync activeTab with filter
  useEffect(() => {
    if (activeTab === 'all') {
    setFilter('all');
    } else if (activeTab === 'today') {
    setFilter('today');
    } else if (activeTab === 'pending') {
    setFilter('pending');
    } else if (activeTab === 'confirmed') {
    setFilter('confirmed');
    } else if (activeTab === 'completed') {
    setFilter('completed');
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [bookingsRes, sittersRes] = await Promise.all([
        fetch('/api/bookings').catch(() => null),
        fetch('/api/sitters').catch(() => null),
      ]);

      let allBookings: any[] = [];
      if (bookingsRes?.ok) {
        const data = await bookingsRes.json();
        allBookings = data.bookings || [];
        setBookings(allBookings.map((b: any) => ({
          ...b,
          startAt: new Date(b.startAt),
          endAt: new Date(b.endAt),
        })));
      }

      if (sittersRes?.ok) {

        const data = await sittersRes.json();

        setSitters(data.sitters || []);

      }



      // Calculate overview stats

      const today = new Date();

      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);

      tomorrow.setDate(tomorrow.getDate() + 1);



      const todaysVisits = allBookings.filter((b: any) => {

        const startDate = new Date(b.startAt);

        return startDate >= today && startDate < tomorrow && b.status !== 'cancelled';

      }).length;



      const unassigned = allBookings.filter((b: any) => 

        !b.sitterId && b.status !== 'cancelled' && b.status !== 'completed'

      ).length;



      const pending = allBookings.filter((b: any) => b.status === 'pending').length;



      const currentMonth = new Date().getMonth();

      const currentYear = new Date().getFullYear();

      const monthlyRevenue = allBookings

        .filter((b: any) => {

          const bookingDate = new Date(b.createdAt);

          return bookingDate.getMonth() === currentMonth && 

                 bookingDate.getFullYear() === currentYear &&

                 b.status !== 'cancelled';

        })

        .reduce((sum: number, b: any) => sum + (b.totalPrice || 0), 0);



      setOverviewStats({

        todaysVisits,

        unassigned,

        pending,

        monthlyRevenue,

      });


      // Calculate overview stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todaysVisits = allBookings.filter((b: any) => {
        const startDate = new Date(b.startAt);
        return startDate >= today && startDate < tomorrow && b.status !== 'cancelled';
      }).length;

      const unassigned = allBookings.filter((b: any) => 
        !b.sitterId && b.status !== 'cancelled' && b.status !== 'completed'
      ).length;

      const pending = allBookings.filter((b: any) => b.status === 'pending').length;

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyRevenue = allBookings
        .filter((b: any) => {
          const bookingDate = new Date(b.createdAt);
          return bookingDate.getMonth() === currentMonth && 
                 bookingDate.getFullYear() === currentYear &&
                 b.status !== 'cancelled';
        })
        .reduce((sum: number, b: any) => sum + (b.totalPrice || 0), 0);

      setOverviewStats({
        todaysVisits,
        unassigned,
        pending,
        monthlyRevenue,
      });

      // Calculate overview stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todaysVisits = allBookings.filter((b: any) => {
        const startDate = new Date(b.startAt);
        return startDate >= today && startDate < tomorrow && b.status !== 'cancelled';
      }).length;

      const unassigned = allBookings.filter((b: any) => 
        !b.sitterId && b.status !== 'cancelled' && b.status !== 'completed'
      ).length;

      const pending = allBookings.filter((b: any) => b.status === 'pending').length;

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyRevenue = allBookings
        .filter((b: any) => {
          const bookingDate = new Date(b.createdAt);
          return bookingDate.getMonth() === currentMonth && 
                 bookingDate.getFullYear() === currentYear &&
                 b.status !== 'cancelled';
        })
        .reduce((sum: number, b: any) => sum + (b.totalPrice || 0), 0);

      setOverviewStats({
        todaysVisits,
        unassigned,
        pending,
        monthlyRevenue,
      });
    } catch (error) {
      console.error('Failed to fetch data:', error);
      } finally {
          setLoading(false);
    }
  };

  const filteredAndSortedBookings = useMemo(() => {
    let filtered = bookings;

    // Apply tab-based filter
    if (activeTab === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter((b) => {
        const start = new Date(b.startAt);
        start.setHours(0, 0, 0, 0);
        return start.getTime() === today.getTime();
      });
    } else if (activeTab === 'unassigned') {
      filtered = filtered.filter((b) => !b.sitterId && b.status !== 'cancelled' && b.status !== 'completed');
    } else if (activeTab !== 'all' && activeTab !== 'today' && activeTab !== 'unassigned') {
      filtered = filtered.filter((b) => b.status === activeTab);
    }

    // Apply legacy filter (for backward compatibility)
    if (filter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter((b) => {
        const start = new Date(b.startAt);
        start.setHours(0, 0, 0, 0);
        return start.getTime() === today.getTime();
      });
    } else if (filter !== 'all') {
      filtered = filtered.filter((b) => b.status === filter);
    }

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.firstName.toLowerCase().includes(term) ||
          b.lastName.toLowerCase().includes(term) ||
          b.phone.includes(term) ||
          b.email.toLowerCase().includes(term) ||
          b.service.toLowerCase().includes(term)
      );
    }

    // Apply sort
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.startAt).getTime() - new Date(a.startAt).getTime();
      } else if (sortBy === 'name') {
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      } else {
        return b.totalPrice - a.totalPrice;
      }
    });

    return filtered;
  }, [bookings, activeTab, filter, searchTerm, sortBy]);

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPets = (pets: Array<{ species: string }>) => {
    const counts: Record<string, number> = {};
    pets.forEach((pet) => {
      counts[pet.species] = (counts[pet.species] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([species, count]) => `${count} ${species}${count > 1 ? 's' : ''}`)
      .join(', ');
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
      render: (row) => (
        <div>
          <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>{row.service}</div>
          <div
                          style={{
              fontSize: tokens.typography.fontSize.sm[0],
              color: tokens.colors.text.secondary,
            }}
          >
            {formatPets(row.pets)}
                    </div>
                  </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (row) => (
        <div>
          <div>{formatDate(row.startAt)}</div>
          <div
                                style={{ 
              fontSize: tokens.typography.fontSize.sm[0],
              color: tokens.colors.text.secondary,
            }}
          >
            {new Date(row.startAt).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
                                          })}
                                        </div>
                                      </div>
      ),
    },
    {
      key: 'sitter',
      header: 'Sitter',
      render: (row) =>
        row.sitter ? (
                                          <div>
            {row.sitter.firstName} {row.sitter.lastName}
                                </div>
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
    <AppShell>
      <PageHeader
        title="Bookings"
        description="Manage all bookings and assignments"
        actions={
          <a href="https://snout-form.onrender.com" target="_blank" rel="noopener noreferrer">
            <Button variant="primary" leftIcon={<i className="fas fa-plus" />}>
              New Booking
            </Button>
          </a>
        }
      />


      {/* Overview Dashboard Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: tokens.spacing[4],
          marginBottom: tokens.spacing[6],
        }}
      >
        <StatCard
          label="Today's Visits"
          value={overviewStats.todaysVisits}
          icon={<i className="fas fa-calendar-day" />}
        />
        <StatCard
          label="Unassigned"
          value={overviewStats.unassigned}
          icon={<i className="fas fa-user-slash" />}
        />
        <StatCard
          label="Pending"
          value={overviewStats.pending}
          icon={<i className="fas fa-clock" />}
        />
        <StatCard
          label="Monthly Revenue"
          value={formatCurrency(overviewStats.monthlyRevenue)}
          icon={<i className="fas fa-dollar-sign" />}
        />
      </div>

      {/* Tabs Navigation */}
      <Tabs
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as any)}
        tabs={[
          { id: 'all', label: 'All Bookings' },
          { id: 'today', label: "Today's Visits", badge: overviewStats.todaysVisits > 0 ? overviewStats.todaysVisits : undefined },
          { id: 'pending', label: 'Pending', badge: overviewStats.pending > 0 ? overviewStats.pending : undefined },
          { id: 'confirmed', label: 'Confirmed' },
          { id: 'completed', label: 'Completed' },
          { id: 'unassigned', label: 'Unassigned', badge: overviewStats.unassigned > 0 ? overviewStats.unassigned : undefined },
        ]}
      >
        {/* Search and Sort Controls */}
        <Card
          style={{ 
            marginBottom: tokens.spacing[6],
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: tokens.spacing[4],
            }}
          >
            <Input
              placeholder="Search bookings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<i className="fas fa-search" />}
            />
            <Select
              label="Sort By"
              options={[
                { value: 'date', label: 'Date' },
                { value: 'name', label: 'Name' },
                { value: 'price', label: 'Price' },
              ]}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            />
          </div>
        </Card>

        {/* Tab Panels */}
        <TabPanel id="all">
          {loading ? (
            <Card>
              <Skeleton height="400px" />
            </Card>
          ) : filteredAndSortedBookings.length === 0 ? (
            <Card>
              <EmptyState
                icon="📭"
                title="No bookings found"
                description="Create your first booking to get started."
              />
            </Card>
          ) : (
            <Card padding={!loading}>
              <Table
                columns={columns}
                data={filteredAndSortedBookings}
                emptyMessage="No bookings found. Create your first booking to get started."
                onRowClick={(row) => {
                  window.location.href = `/bookings/${row.id}`;
                }}
                keyExtractor={(row) => row.id}
              />
            </Card>
          )}
        </TabPanel>

        <TabPanel id="today">
          {loading ? (
            <Card>
              <Skeleton height="400px" />
            </Card>
          ) : filteredAndSortedBookings.length === 0 ? (
            <Card>
              <EmptyState
                icon="📅"
                title="No visits today"
                description="No bookings scheduled for today."
              />
            </Card>
          ) : (
            <Card padding={!loading}>
              <Table
                columns={columns}
                data={filteredAndSortedBookings}
                emptyMessage="No visits scheduled for today."
                onRowClick={(row) => {
                  window.location.href = `/bookings/${row.id}`;
                }}
                keyExtractor={(row) => row.id}
              />
            </Card>
          )}
        </TabPanel>

        <TabPanel id="pending">
          {loading ? (
            <Card>
              <Skeleton height="400px" />
            </Card>
          ) : filteredAndSortedBookings.length === 0 ? (
            <Card>
              <EmptyState
                icon="⏳"
                title="No pending bookings"
                description="All bookings are confirmed or completed."
              />
            </Card>
          ) : (
            <Card padding={!loading}>
              <Table
                columns={columns}
                data={filteredAndSortedBookings}
                emptyMessage="No pending bookings."
                onRowClick={(row) => {
                  window.location.href = `/bookings/${row.id}`;
                }}
                keyExtractor={(row) => row.id}
              />
            </Card>
          )}
        </TabPanel>

        <TabPanel id="confirmed">
          {loading ? (
            <Card>
              <Skeleton height="400px" />
            </Card>
          ) : filteredAndSortedBookings.length === 0 ? (
            <Card>
              <EmptyState
                icon="✅"
                title="No confirmed bookings"
                description="No bookings are currently confirmed."
              />
            </Card>
          ) : (
            <Card padding={!loading}>
              <Table
                columns={columns}
                data={filteredAndSortedBookings}
                emptyMessage="No confirmed bookings."
                onRowClick={(row) => {
                  window.location.href = `/bookings/${row.id}`;
                }}
                keyExtractor={(row) => row.id}
              />
            </Card>
          )}
        </TabPanel>

        <TabPanel id="completed">
          {loading ? (
            <Card>
              <Skeleton height="400px" />
            </Card>
          ) : filteredAndSortedBookings.length === 0 ? (
            <Card>
              <EmptyState
                icon="🎉"
                title="No completed bookings"
                description="No bookings have been completed yet."
              />
            </Card>
          ) : (
            <Card padding={!loading}>
              <Table
                columns={columns}
                data={filteredAndSortedBookings}
                emptyMessage="No completed bookings."
                onRowClick={(row) => {
                  window.location.href = `/bookings/${row.id}`;
                }}
                keyExtractor={(row) => row.id}
              />
            </Card>
          )}
        </TabPanel>

        <TabPanel id="unassigned">
          {loading ? (
            <Card>
              <Skeleton height="400px" />
            </Card>
          ) : filteredAndSortedBookings.length === 0 ? (
            <Card>
              <EmptyState
                icon="👤"
                title="All bookings assigned"
                description="All active bookings have sitters assigned."
              />
            </Card>
          ) : (
            <Card padding={!loading}>
              <Table
                columns={columns}
                data={filteredAndSortedBookings}
                emptyMessage="All bookings are assigned."
                onRowClick={(row) => {
                  window.location.href = `/bookings/${row.id}`;
                }}
                keyExtractor={(row) => row.id}
              />
            </Card>
          )}
        </TabPanel>
      </Tabs>    </AppShell>
  );
}

export default function BookingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BookingsPageContent />
    </Suspense>
  );
}

