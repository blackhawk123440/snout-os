/**
 * Clients List Page - Enterprise Rebuild
 * 
 * Complete rebuild using design system and components.
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  PageHeader,
  Table,
  Button,
  Input,
  Select,
  Card,
  EmptyState,
  Skeleton,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';
import { TableColumn } from '@/components/ui/Table';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  petCount?: number;
  lastBooking?: Date | string;
  totalBookings?: number;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'recent' | 'bookings'>('name');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients').catch(() => null);
      if (response?.ok) {
        const data = await response.json();
        setClients((data.clients || []).map((c: any) => ({
          ...c,
          lastBooking: c.lastBooking ? new Date(c.lastBooking) : null,
        })));
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedClients = useMemo(() => {
    let filtered = clients;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.firstName.toLowerCase().includes(term) ||
          c.lastName.toLowerCase().includes(term) ||
          c.phone.includes(term) ||
          c.email.toLowerCase().includes(term)
      );
    }

    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      } else if (sortBy === 'recent') {
        const aDate = a.lastBooking ? new Date(a.lastBooking).getTime() : 0;
        const bDate = b.lastBooking ? new Date(b.lastBooking).getTime() : 0;
        return bDate - aDate;
      } else {
        return (b.totalBookings || 0) - (a.totalBookings || 0);
      }
    });

    return filtered;
  }, [clients, searchTerm, sortBy]);

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'Never';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const columns: TableColumn<Client>[] = [
    {
      key: 'name',
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
            {row.email}
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (row) => (
        <div
          style={{
            fontSize: tokens.typography.fontSize.base[0],
            color: tokens.colors.text.primary,
          }}
        >
          {row.phone}
        </div>
      ),
    },
    {
      key: 'pets',
      header: 'Pets',
      render: (row) => (
        <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
          {row.petCount || 0}
        </div>
      ),
      align: 'center',
    },
    {
      key: 'bookings',
      header: 'Total Bookings',
      render: (row) => (
        <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
          {row.totalBookings || 0}
        </div>
      ),
      align: 'center',
    },
    {
      key: 'lastBooking',
      header: 'Last Booking',
      render: (row) => (
        <div
          style={{
            fontSize: tokens.typography.fontSize.sm[0],
            color: tokens.colors.text.secondary,
          }}
        >
          {formatDate(row.lastBooking)}
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Clients"
        description="Manage client information and contact details"
        actions={
          <Link href="/clients/new">
            <Button variant="primary" leftIcon={<i className="fas fa-plus" />}>
              New Client
            </Button>
          </Link>
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
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: isMobile ? tokens.spacing[3] : tokens.spacing[4],
          }}
        >
          <Input
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<i className="fas fa-search" />}
          />
          <Select
            label="Sort By"
            options={[
              { value: 'name', label: 'Name' },
              { value: 'recent', label: 'Most Recent' },
              { value: 'bookings', label: 'Most Bookings' },
            ]}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          />
        </div>
      </Card>

      {/* Clients List (mobile cards, desktop table) */}
      {loading ? (
        <Card>
          <Skeleton height="400px" />
        </Card>
      ) : filteredAndSortedClients.length === 0 ? (
        <Card>
          <EmptyState
            icon="👥"
            title="No clients found"
            description="Add your first client to get started."
          />
        </Card>
      ) : (
        <>
          {/* Mobile: Card list */}
          <div
            style={{
              display: 'block',
              '@media (min-width: 1024px)': {
                display: 'none',
              },
            } as React.CSSProperties & { '@media (min-width: 1024px)': React.CSSProperties }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
              {filteredAndSortedClients.map((c) => (
                <Link
                  key={c.id}
                  href={`/clients/${c.id}`}
                  style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                >
                  <Card padding={false}>
                    <div style={{ padding: tokens.spacing[3] }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: tokens.spacing[3],
                          marginBottom: tokens.spacing[2],
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontSize: tokens.typography.fontSize.base[0],
                              fontWeight: tokens.typography.fontWeight.semibold,
                              color: tokens.colors.text.primary,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {c.firstName} {c.lastName}
                          </div>
                          <div
                            style={{
                              fontSize: tokens.typography.fontSize.sm[0],
                              color: tokens.colors.text.secondary,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {c.email}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: tokens.typography.fontSize.sm[0],
                            color: tokens.colors.text.secondary,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {c.petCount || 0} pets
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: tokens.spacing[1],
                          fontSize: tokens.typography.fontSize.sm[0],
                          color: tokens.colors.text.secondary,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
                          <i className="fas fa-phone" style={{ width: '16px' }} />
                          <span style={{ color: tokens.colors.text.primary }}>{c.phone}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
                          <i className="fas fa-book" style={{ width: '16px' }} />
                          <span>{c.totalBookings || 0} bookings</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
                          <i className="fas fa-calendar" style={{ width: '16px' }} />
                          <span>Last: {formatDate(c.lastBooking)}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Desktop: Table */}
          <Card
            padding={false}
            style={{
              display: 'none',
              '@media (min-width: 1024px)': {
                display: 'block',
              },
            } as React.CSSProperties & { '@media (min-width: 1024px)': React.CSSProperties }}
          >
            <Table
              columns={columns}
              data={filteredAndSortedClients}
              emptyMessage="No clients found. Add your first client to get started."
              onRowClick={(row) => {
                window.location.href = `/clients/${row.id}`;
              }}
              keyExtractor={(row) => row.id}
            />
          </Card>
        </>
      )}
    </AppShell>
  );
}

