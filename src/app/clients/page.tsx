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

  useEffect(() => {
    fetchClients();
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
      mobileLabel: 'Client',
      mobileOrder: 1,
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
      mobileLabel: 'Phone',
      mobileOrder: 2,
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
      mobileLabel: 'Pets',
      mobileOrder: 3,
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
      mobileLabel: 'Total Bookings',
      mobileOrder: 4,
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
      mobileLabel: 'Last Booking',
      mobileOrder: 5,
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: tokens.spacing[4],
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

      {/* Clients Table */}
      <Card padding={!loading}>
        {loading ? (
          <Skeleton height="400px" />
        ) : (
          <Table
            columns={columns}
            data={filteredAndSortedClients}
            emptyMessage="No clients found. Add your first client to get started."
            onRowClick={(row) => {
              window.location.href = `/clients/${row.id}`;
            }}
            keyExtractor={(row) => row.id}
          />
        )}
      </Card>
    </AppShell>
  );
}

