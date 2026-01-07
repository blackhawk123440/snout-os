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
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';
import { TableColumn } from '@/components/ui/Table';
import { BookingDetailCard } from '@/components/booking/BookingDetailCard';

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
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'today'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'price'>('date');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [bookingsRes, sittersRes] = await Promise.all([
        fetch('/api/bookings').catch(() => null),
        fetch('/api/sitters').catch(() => null),
      ]);

      if (bookingsRes?.ok) {
        const data = await bookingsRes.json();
        setBookings((data.bookings || []).map((b: any) => ({
          ...b,
          startAt: new Date(b.startAt),
          endAt: new Date(b.endAt),
        })));
      }

      if (sittersRes?.ok) {
        const data = await sittersRes.json();
              setSitters(data.sitters || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      } finally {
          setLoading(false);
    }
  };

  const filteredAndSortedBookings = useMemo(() => {
    let filtered = bookings;

    // Apply status filter
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
  }, [bookings, filter, searchTerm, sortBy]);

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

      {/* Filters and Search */}
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
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'pending', label: 'Pending' },
              { value: 'confirmed', label: 'Confirmed' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
              { value: 'today', label: 'Today' },
            ]}
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
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

      {/* Bookings List - Cards on mobile and desktop */}
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
        <>
          {/* Mobile: Card View */}
          <div
            style={{
              display: 'block',
              '@media (min-width: 1024px)': {
                display: 'none',
              },
            } as React.CSSProperties & { '@media (min-width: 1024px)': React.CSSProperties }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: tokens.spacing[4],
              }}
            >
              {filteredAndSortedBookings.map((booking) => (
                <BookingDetailCard
                  key={booking.id}
                  booking={booking}
                  variant="compact"
                />
              ))}
            </div>
          </div>

          {/* Desktop: Compact Card Grid */}
          <div
            style={{
              display: 'none',
              '@media (min-width: 1024px)': {
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                gap: tokens.spacing[4],
              },
            } as React.CSSProperties & { '@media (min-width: 1024px)': React.CSSProperties }}
          >
            {filteredAndSortedBookings.map((booking) => (
              <BookingDetailCard
                key={booking.id}
                booking={booking}
                variant="compact"
              />
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}

export default function BookingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BookingsPageContent />
    </Suspense>
  );
}

