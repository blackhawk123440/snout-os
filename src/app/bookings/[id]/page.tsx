/**
 * Booking Detail Page - Enterprise Control Surface
 * 
 * Finance-grade operations command center for individual bookings.
 * Zero legacy styling - all through components and tokens.
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  PageHeader,
  Card,
  Button,
  Badge,
  StatCard,
  SectionHeader,
  Table,
  TableColumn,
  Modal,
  Skeleton,
  EmptyState,
  Select,
  Input,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';
import { getPricingForDisplay } from '@/lib/pricing-display-helpers';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string | null;
  age?: number | null;
  notes?: string | null;
}

interface TimeSlot {
  id: string;
  startAt: Date | string;
  endAt: Date | string;
  duration: number;
}

interface Sitter {
  id: string;
  firstName: string;
  lastName: string;
}

interface StatusHistoryEntry {
  id: string;
  fromStatus: string;
  toStatus: string;
  changedBy: string | null;
  reason: string | null;
  metadata: any;
  createdAt: Date | string;
}

interface Booking {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  pickupAddress?: string | null;
  dropoffAddress?: string | null;
  service: string;
  startAt: Date | string;
  endAt: Date | string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  totalPrice: number;
  pricingSnapshot?: string | null;
  paymentStatus: string;
  stripePaymentLinkUrl?: string | null;
  tipLinkUrl?: string | null;
  quantity: number;
  afterHours: boolean;
  holiday: boolean;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  pets: Pet[];
  timeSlots: TimeSlot[];
  sitter?: Sitter | null;
}

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showUnassignModal, setShowUnassignModal] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [sitters, setSitters] = useState<Sitter[]>([]);

  useEffect(() => {
    if (bookingId) {
      fetchBooking();
      fetchStatusHistory();
      fetchSitters();
    }
  }, [bookingId]);

  const fetchBooking = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/bookings/${bookingId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError('Booking not found');
        } else {
          throw new Error('Failed to fetch booking');
        }
        return;
      }
      const data = await response.json();
      const bookingData = {
        ...data.booking,
        startAt: new Date(data.booking.startAt),
        endAt: new Date(data.booking.endAt),
        createdAt: new Date(data.booking.createdAt),
        updatedAt: new Date(data.booking.updatedAt),
        pets: (data.booking.pets || []).map((p: any) => ({
          ...p,
        })),
        timeSlots: (data.booking.timeSlots || []).map((ts: any) => ({
          ...ts,
          startAt: new Date(ts.startAt),
          endAt: new Date(ts.endAt),
        })),
      };
      setBooking(bookingData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load booking');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatusHistory = async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/status-history`);
      if (response.ok) {
        const data = await response.json();
        setStatusHistory(
          (data.history || []).map((entry: any) => ({
            ...entry,
            createdAt: new Date(entry.createdAt),
          }))
        );
      }
    } catch (err) {
      console.error('Failed to fetch status history:', err);
    }
  };

  const fetchSitters = async () => {
    try {
      const response = await fetch('/api/sitters');
      if (response.ok) {
        const data = await response.json();
        setSitters(data.sitters || []);
      }
    } catch (err) {
      console.error('Failed to fetch sitters:', err);
    }
  };

  const handleStatusChange = async () => {
    if (!newStatus || !booking) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        await fetchBooking();
        await fetchStatusHistory();
        setShowStatusModal(false);
        setNewStatus('');
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Failed to update status: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const handleSitterAssign = async (sitterId: string) => {
    if (!booking) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sitterId }),
      });
      if (response.ok) {
        await fetchBooking();
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Failed to assign sitter: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to assign sitter:', err);
      alert('Failed to assign sitter');
    } finally {
      setSaving(false);
    }
  };

  const handleUnassign = async () => {
    if (!booking) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sitterId: null }),
      });
      if (response.ok) {
        await fetchBooking();
        setShowUnassignModal(false);
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Failed to unassign sitter: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to unassign sitter:', err);
      alert('Failed to unassign sitter');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusBadgeVariant = (status: string): 'default' | 'success' | 'warning' | 'error' => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'completed':
        return 'default';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPaymentStatusBadgeVariant = (status: string): 'default' | 'success' | 'warning' | 'error' => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'success';
      case 'pending':
        return 'warning';
      case 'unpaid':
        return 'error';
      default:
        return 'default';
    }
  };

  const getAvailableStatusTransitions = (currentStatus: string): string[] => {
    switch (currentStatus) {
      case 'pending':
        return ['confirmed', 'cancelled'];
      case 'confirmed':
        return ['completed', 'cancelled'];
      case 'completed':
        return [];
      case 'cancelled':
        return [];
      default:
        return [];
    }
  };

  // Calculate KPIs
  const paidAmount = booking?.paymentStatus === 'paid' ? booking.totalPrice : 0;
  const balance = booking ? booking.totalPrice - paidAmount : 0;

  if (loading) {
    return (
      <AppShell physiology="operational">
        <PageHeader title="Loading..." description="Fetching booking details" />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: tokens.spacing[6],
            marginBottom: tokens.spacing[6],
          }}
        >
          <Skeleton height="120px" />
          <Skeleton height="120px" />
          <Skeleton height="120px" />
          <Skeleton height="120px" />
        </div>
        <Card>
          <Skeleton height="400px" />
        </Card>
      </AppShell>
    );
  }

  if (error || !booking) {
    return (
      <AppShell physiology="operational">
        <PageHeader title="Booking Not Found" description={error || 'The booking you are looking for does not exist'} />
        <Card>
          <EmptyState
            icon="⚠️"
            title={error || 'Booking Not Found'}
            description="The booking you are looking for does not exist or could not be loaded."
            action={{
              label: 'Back to Bookings',
              onClick: () => router.push('/bookings'),
              variant: 'primary',
            }}
          />
        </Card>
      </AppShell>
    );
  }

  const pricingDisplay = booking.pricingSnapshot
    ? getPricingForDisplay(booking)
    : {
        total: booking.totalPrice,
        breakdown: [{ label: booking.service, amount: booking.totalPrice }],
        isFromSnapshot: false,
      };

  const statusTransitions = getAvailableStatusTransitions(booking.status);

  return (
    <AppShell physiology="operational">
      {/* Page Header */}
      <PageHeader
        title={`Booking - ${booking.firstName} ${booking.lastName}`}
        description={`${formatDate(booking.startAt)} - ${formatDate(booking.endAt)} • ${booking.status}${booking.sitter ? ` • Assigned: ${booking.sitter.firstName} ${booking.sitter.lastName}` : ''} • Updated ${formatDateTime(booking.updatedAt)}`}
        actions={
          <div
            style={{
              display: 'flex',
              gap: tokens.spacing[3],
              flexWrap: 'wrap',
            }}
          >
            <Link href="/bookings">
              <Button variant="secondary" leftIcon={<i className="fas fa-arrow-left" />}>
                Back
              </Button>
            </Link>
            {statusTransitions.length > 0 && (
              <Button
                variant="primary"
                onClick={() => {
                  setNewStatus(statusTransitions[0]);
                  setShowStatusModal(true);
                }}
                leftIcon={<i className="fas fa-check" />}
              >
                {statusTransitions[0] === 'confirmed' ? 'Confirm' : statusTransitions[0] === 'completed' ? 'Complete' : 'Update Status'}
              </Button>
            )}
          </div>
        }
      />

      {/* KPI Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: tokens.spacing[6],
          marginBottom: tokens.spacing[6],
        }}
      >
        <StatCard
          label="Total"
          value={formatCurrency(booking.totalPrice)}
          icon={<i className="fas fa-dollar-sign" />}
        />
        <StatCard
          label="Payment Status"
          value={booking.paymentStatus}
          icon={<i className="fas fa-credit-card" />}
        />
        {booking.paymentStatus !== 'paid' && (
          <StatCard
            label="Balance"
            value={formatCurrency(balance)}
            icon={<i className="fas fa-wallet" />}
          />
        )}
        <StatCard
          label="Service"
          value={booking.service}
          icon={<i className="fas fa-paw" />}
        />
        {booking.pets.length > 0 && (
          <StatCard
            label="Pets"
            value={booking.pets.length}
            icon={<i className="fas fa-dog" />}
          />
        )}
      </div>

      {/* Main Content - Two Column Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: tokens.spacing[6],
          '@media (min-width: 1024px)': {
            gridTemplateColumns: '1fr 400px',
          },
        } as React.CSSProperties & { '@media (min-width: 1024px)': React.CSSProperties }}
      >
        {/* Left Column */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.spacing[6],
          }}
        >
          {/* Schedule and Visit Details */}
          <Card>
            <SectionHeader title="Schedule and Visit Details" />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: tokens.spacing[4],
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: tokens.spacing[4],
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.sm[0],
                      color: tokens.colors.text.secondary,
                      marginBottom: tokens.spacing[1],
                    }}
                  >
                    Start Date & Time
                  </div>
                  <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
                    {formatDateTime(booking.startAt)}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.sm[0],
                      color: tokens.colors.text.secondary,
                      marginBottom: tokens.spacing[1],
                    }}
                  >
                    End Date & Time
                  </div>
                  <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
                    {formatDateTime(booking.endAt)}
                  </div>
                </div>
              </div>

              {booking.timeSlots.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.sm[0],
                      color: tokens.colors.text.secondary,
                      marginBottom: tokens.spacing[2],
                    }}
                  >
                    Time Slots
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: tokens.spacing[2],
                    }}
                  >
                    {booking.timeSlots.map((slot) => (
                      <div
                        key={slot.id}
                        style={{
                          padding: tokens.spacing[3],
                          backgroundColor: tokens.colors.background.secondary,
                          borderRadius: tokens.borderRadius.md,
                          fontSize: tokens.typography.fontSize.sm[0],
                        }}
                      >
                        {formatTime(slot.startAt)} - {formatTime(slot.endAt)} ({slot.duration} min)
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {booking.address && (
                <div>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.sm[0],
                      color: tokens.colors.text.secondary,
                      marginBottom: tokens.spacing[1],
                    }}
                  >
                    Address
                  </div>
                  <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
                    {booking.address}
                  </div>
                </div>
              )}

              {booking.pickupAddress && (
                <div>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.sm[0],
                      color: tokens.colors.text.secondary,
                      marginBottom: tokens.spacing[1],
                    }}
                  >
                    Pickup Address
                  </div>
                  <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
                    {booking.pickupAddress}
                  </div>
                </div>
              )}

              {booking.dropoffAddress && (
                <div>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.sm[0],
                      color: tokens.colors.text.secondary,
                      marginBottom: tokens.spacing[1],
                    }}
                  >
                    Dropoff Address
                  </div>
                  <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
                    {booking.dropoffAddress}
                  </div>
                </div>
              )}

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: tokens.spacing[4],
                }}
              >
                {booking.quantity > 1 && (
                  <div>
                    <div
                      style={{
                        fontSize: tokens.typography.fontSize.sm[0],
                        color: tokens.colors.text.secondary,
                        marginBottom: tokens.spacing[1],
                      }}
                    >
                      Quantity
                    </div>
                    <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
                      {booking.quantity}
                    </div>
                  </div>
                )}
                {booking.afterHours && (
                  <div>
                    <Badge variant="warning">After Hours</Badge>
                  </div>
                )}
                {booking.holiday && (
                  <div>
                    <Badge variant="warning">Holiday</Badge>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Pets and Care Instructions */}
          <Card>
            <SectionHeader title="Pets and Care Instructions" />
            {booking.pets.length === 0 ? (
              <EmptyState
                icon="🐾"
                title="No pets"
                description="No pets have been added to this booking."
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: tokens.spacing[4],
                }}
              >
                {booking.pets.map((pet) => (
                  <div
                    key={pet.id}
                    style={{
                      padding: tokens.spacing[4],
                      border: `1px solid ${tokens.colors.border.default}`,
                      borderRadius: tokens.borderRadius.md,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: tokens.spacing[2],
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: tokens.typography.fontWeight.semibold, fontSize: tokens.typography.fontSize.lg[0] }}>
                          {pet.name}
                        </div>
                        <div
                          style={{
                            fontSize: tokens.typography.fontSize.sm[0],
                            color: tokens.colors.text.secondary,
                            marginTop: tokens.spacing[1],
                          }}
                        >
                          {pet.species}
                          {pet.breed && ` • ${pet.breed}`}
                          {pet.age && ` • ${pet.age} ${pet.age === 1 ? 'year' : 'years'} old`}
                        </div>
                      </div>
                    </div>
                    {pet.notes && (
                      <div
                        style={{
                          marginTop: tokens.spacing[2],
                          padding: tokens.spacing[3],
                          backgroundColor: tokens.colors.background.secondary,
                          borderRadius: tokens.borderRadius.sm,
                          fontSize: tokens.typography.fontSize.sm[0],
                        }}
                      >
                        {pet.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {booking.notes && (
              <div style={{ marginTop: tokens.spacing[6] }}>
                <div
                  style={{
                    fontSize: tokens.typography.fontSize.sm[0],
                    color: tokens.colors.text.secondary,
                    marginBottom: tokens.spacing[2],
                    fontWeight: tokens.typography.fontWeight.medium,
                  }}
                >
                  Additional Notes
                </div>
                <div
                  style={{
                    padding: tokens.spacing[4],
                    backgroundColor: tokens.colors.background.secondary,
                    borderRadius: tokens.borderRadius.md,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {booking.notes}
                </div>
              </div>
            )}
          </Card>

          {/* Line Items and Pricing */}
          <Card>
            <SectionHeader title="Pricing Breakdown" />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: tokens.spacing[4],
              }}
            >
              <Table
                columns={[
                  {
                    key: 'label',
                    header: 'Item',
                    render: (row) => <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>{row.label}</div>,
                  },
                  {
                    key: 'amount',
                    header: 'Amount',
                    align: 'right',
                    render: (row) => <div style={{ fontWeight: tokens.typography.fontWeight.semibold }}>{formatCurrency(row.amount)}</div>,
                  },
                ]}
                data={pricingDisplay.breakdown}
                keyExtractor={(row, index) => `${row.label}-${index}`}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: tokens.spacing[4],
                  borderTop: `1px solid ${tokens.colors.border.default}`,
                }}
              >
                <div style={{ fontSize: tokens.typography.fontSize.lg[0], fontWeight: tokens.typography.fontWeight.semibold }}>
                  Total
                </div>
                <div style={{ fontSize: tokens.typography.fontSize.lg[0], fontWeight: tokens.typography.fontWeight.bold }}>
                  {formatCurrency(pricingDisplay.total)}
                </div>
              </div>
              {booking.stripePaymentLinkUrl && (
                <div style={{ marginTop: tokens.spacing[2] }}>
                  <a
                    href={booking.stripePaymentLinkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: tokens.colors.primary.DEFAULT,
                      textDecoration: 'none',
                      fontSize: tokens.typography.fontSize.sm[0],
                    }}
                  >
                    <i className="fas fa-external-link-alt" style={{ marginRight: tokens.spacing[2] }} />
                    View Payment Link
                  </a>
                </div>
              )}
            </div>
          </Card>

          {/* Activity and History */}
          <Card>
            <SectionHeader title="Status History" />
            {statusHistory.length === 0 ? (
              <EmptyState
                icon="📋"
                title="No status history"
                description="Status changes will appear here."
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: tokens.spacing[3],
                }}
              >
                {statusHistory.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      padding: tokens.spacing[3],
                      border: `1px solid ${tokens.colors.border.default}`,
                      borderRadius: tokens.borderRadius.md,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacing[1] }}>
                      <div style={{ display: 'flex', gap: tokens.spacing[2], alignItems: 'center' }}>
                        <Badge variant={getStatusBadgeVariant(entry.fromStatus)}>{entry.fromStatus}</Badge>
                        <i className="fas fa-arrow-right" style={{ color: tokens.colors.text.tertiary }} />
                        <Badge variant={getStatusBadgeVariant(entry.toStatus)}>{entry.toStatus}</Badge>
                      </div>
                      <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                        {formatDateTime(entry.createdAt)}
                      </div>
                    </div>
                    {entry.reason && (
                      <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginTop: tokens.spacing[1] }}>
                        {entry.reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column - Control Panel */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.spacing[6],
          }}
        >
          {/* Status Control */}
          <Card>
            <SectionHeader title="Status" />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: tokens.spacing[4],
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: tokens.typography.fontSize.sm[0],
                    color: tokens.colors.text.secondary,
                    marginBottom: tokens.spacing[2],
                  }}
                >
                  Current Status
                </div>
                <Badge variant={getStatusBadgeVariant(booking.status)} style={{ fontSize: tokens.typography.fontSize.base[0] }}>
                  {booking.status}
                </Badge>
              </div>
              {statusTransitions.length > 0 && (
                <div>
                  <Button
                    variant="primary"
                    style={{ width: '100%' }}
                    onClick={() => {
                      setNewStatus(statusTransitions[0]);
                      setShowStatusModal(true);
                    }}
                  >
                    {statusTransitions[0] === 'confirmed' ? 'Confirm Booking' : statusTransitions[0] === 'completed' ? 'Mark Complete' : `Change to ${statusTransitions[0]}`}
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Assignment Control */}
          <Card>
            <SectionHeader title="Assignment" />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: tokens.spacing[4],
              }}
            >
              {booking.sitter ? (
                <>
                  <div>
                    <div
                      style={{
                        fontSize: tokens.typography.fontSize.sm[0],
                        color: tokens.colors.text.secondary,
                        marginBottom: tokens.spacing[2],
                      }}
                    >
                      Assigned Sitter
                    </div>
                    <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
                      {booking.sitter.firstName} {booking.sitter.lastName}
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    style={{ width: '100%' }}
                    onClick={() => setShowUnassignModal(true)}
                  >
                    Unassign Sitter
                  </Button>
                  <Select
                    label="Reassign to"
                    options={sitters
                      .filter((s) => s.id !== booking.sitter?.id)
                      .map((s) => ({
                        value: s.id,
                        label: `${s.firstName} ${s.lastName}`,
                      }))}
                    onChange={(e) => {
                      if (e.target.value) {
                        handleSitterAssign(e.target.value);
                      }
                    }}
                  />
                </>
              ) : (
                <>
                  <EmptyState
                    icon="👤"
                    title="No sitter assigned"
                    description="Assign a sitter to this booking."
                  />
                  <Select
                    label="Assign Sitter"
                    options={sitters.map((s) => ({
                      value: s.id,
                      label: `${s.firstName} ${s.lastName}`,
                    }))}
                    onChange={(e) => {
                      if (e.target.value) {
                        handleSitterAssign(e.target.value);
                      }
                    }}
                  />
                </>
              )}
            </div>
          </Card>

          {/* Client Information */}
          <Card>
            <SectionHeader title="Client Information" />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: tokens.spacing[3],
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: tokens.typography.fontSize.sm[0],
                    color: tokens.colors.text.secondary,
                    marginBottom: tokens.spacing[1],
                  }}
                >
                  Name
                </div>
                <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
                  {booking.firstName} {booking.lastName}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: tokens.typography.fontSize.sm[0],
                    color: tokens.colors.text.secondary,
                    marginBottom: tokens.spacing[1],
                  }}
                >
                  Phone
                </div>
                <div>
                  <a
                    href={`tel:${booking.phone}`}
                    style={{
                      color: tokens.colors.primary.DEFAULT,
                      textDecoration: 'none',
                    }}
                  >
                    {booking.phone}
                  </a>
                </div>
              </div>
              {booking.email && (
                <div>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.sm[0],
                      color: tokens.colors.text.secondary,
                      marginBottom: tokens.spacing[1],
                    }}
                  >
                    Email
                  </div>
                  <div>
                    <a
                      href={`mailto:${booking.email}`}
                      style={{
                        color: tokens.colors.primary.DEFAULT,
                        textDecoration: 'none',
                      }}
                    >
                      {booking.email}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Status Change Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setNewStatus('');
        }}
        title="Change Booking Status"
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.spacing[4],
          }}
        >
          <div>
            <div
              style={{
                fontSize: tokens.typography.fontSize.sm[0],
                color: tokens.colors.text.secondary,
                marginBottom: tokens.spacing[2],
              }}
            >
              New Status
            </div>
            <Select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              options={statusTransitions.map((status) => ({
                value: status,
                label: status.charAt(0).toUpperCase() + status.slice(1),
              }))}
            />
          </div>
          <div
            style={{
              display: 'flex',
              gap: tokens.spacing[3],
              justifyContent: 'flex-end',
            }}
          >
            <Button
              variant="secondary"
              onClick={() => {
                setShowStatusModal(false);
                setNewStatus('');
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleStatusChange} isLoading={saving}>
              Update Status
            </Button>
          </div>
        </div>
      </Modal>

      {/* Unassign Modal */}
      <Modal
        isOpen={showUnassignModal}
        onClose={() => setShowUnassignModal(false)}
        title="Unassign Sitter"
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.spacing[4],
          }}
        >
          <div>
            Are you sure you want to unassign {booking.sitter?.firstName} {booking.sitter?.lastName} from this booking?
          </div>
          <div
            style={{
              display: 'flex',
              gap: tokens.spacing[3],
              justifyContent: 'flex-end',
            }}
          >
            <Button variant="secondary" onClick={() => setShowUnassignModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleUnassign} isLoading={saving}>
              Unassign
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}

