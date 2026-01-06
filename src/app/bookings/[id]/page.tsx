/**
 * Booking Detail Page - Enterprise Control Surface
 * 
 * Enterprise-grade booking cockpit with separated READ (intelligence) and ACT (controls) modes.
 * Desktop: Two-column layout (left = intelligence, right = controls)
 * Mobile: Tab-based navigation
 * 
 * Design Philosophy:
 * - Booking is immutable by default (read-only)
 * - Editing opens focused modals/drawers
 * - Financial actions are separated and guarded
 * - No vertical form stacking
 * - Feels like Stripe/Linear/Shopify Admin
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  Button,
  Badge,
  Modal,
  Skeleton,
  EmptyState,
  Select,
  Tabs,
  TabPanel,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';
import { getPricingForDisplay } from '@/lib/pricing-display-helpers';
import { EditBookingModal } from '@/components/booking/EditBookingModal';

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
  const [sitters, setSitters] = useState<Sitter[]>([]);
  
  // Modal states
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showUnassignModal, setShowUnassignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaymentLinkModal, setShowPaymentLinkModal] = useState(false);
  const [showPaymentLinkPreview, setShowPaymentLinkPreview] = useState(false);
  const [paymentLinkUrl, setPaymentLinkUrl] = useState<string | null>(null);
  const [paymentLinkMessage, setPaymentLinkMessage] = useState<string>('');
  const [showTipLinkModal, setShowTipLinkModal] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  
  // Collapsible states
  const [scheduleExpanded, setScheduleExpanded] = useState(false);
  const [petsExpanded, setPetsExpanded] = useState(true);
  const [pricingExpanded, setPricingExpanded] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);
  
  // Mobile tab state
  const [mobileTab, setMobileTab] = useState('overview');

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
        pets: (data.booking.pets || []).map((p: any) => ({ ...p })),
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

  const handleStatusChange = async (status?: string) => {
    const statusToUse = status || newStatus;
    if (!statusToUse || !booking) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusToUse }),
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

  const handleCreatePaymentLink = async () => {
    if (!booking) return;
    setSaving(true);
    try {
      const response = await fetch('/api/payments/create-payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      });
      if (response.ok) {
        const data = await response.json();
        setPaymentLinkUrl(data.paymentLink);
        
        // Priority 1: Generate message preview using centralized template
        const { generatePaymentLinkMessage } = await import('@/lib/payment-link-message');
        const petQuantities = booking.pets.map(p => p.species).join(', ');
        const message = await generatePaymentLinkMessage(
          booking.firstName,
          booking.service,
          formatDate(booking.startAt),
          petQuantities,
          booking.totalPrice,
          data.paymentLink
        );
        setPaymentLinkMessage(message);
        
        setShowPaymentLinkModal(false);
        setShowPaymentLinkPreview(true);
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Failed to create payment link: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to create payment link:', err);
      alert('Failed to create payment link');
    } finally {
      setSaving(false);
    }
  };

  const handleSendPaymentLink = async () => {
    if (!booking || !paymentLinkUrl) return;
    
    // Priority 1: Validate phone number before sending
    if (!booking.phone || booking.phone.trim() === '') {
      alert('Cannot send payment link: Client phone number is missing');
      return;
    }
    
    setSaving(true);
    try {
      // Priority 1: Use centralized payment link message template
      const { generatePaymentLinkMessage } = await import('@/lib/payment-link-message');
      const petQuantities = booking.pets.map(p => p.species).join(', ');
      const message = await generatePaymentLinkMessage(
        booking.firstName,
        booking.service,
        formatDate(booking.startAt),
        petQuantities,
        booking.totalPrice,
        paymentLinkUrl
      );
      
      // Send message
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          to: booking.phone,
          message,
          direction: 'outbound',
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          await fetchBooking();
          setShowPaymentLinkPreview(false);
          setPaymentLinkUrl(null);
          setPaymentLinkMessage('');
          alert('Payment link sent to client!');
        } else {
          alert(`Failed to send message: ${result.error || 'Unknown error'}`);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Failed to send message: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to send payment link:', err);
      alert('Failed to send payment link');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTipLink = async () => {
    if (!booking || !booking.sitter) return;
    setSaving(true);
    try {
      const response = await fetch('/api/payments/create-tip-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          bookingId,
          sitterId: booking.sitter.id,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        await fetchBooking();
        setShowTipLinkModal(false);
        if (data.tipLink) {
          navigator.clipboard.writeText(data.tipLink);
          alert('Tip link created and copied to clipboard!');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Failed to create tip link: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to create tip link:', err);
      alert('Failed to create tip link');
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

  if (loading) {
    return (
      <AppShell>
        <div style={{ padding: tokens.spacing[6] }}>
          <Skeleton height="80px" />
          <div style={{ marginTop: tokens.spacing[6], display: 'flex', gap: tokens.spacing[6] }}>
            <div style={{ flex: 1 }}>
              <Skeleton height="400px" />
            </div>
            <div style={{ width: '400px' }}>
              <Skeleton height="300px" />
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !booking) {
    return (
      <AppShell>
        <div style={{ padding: tokens.spacing[6] }}>
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
        </div>
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
  const paidAmount = booking.paymentStatus === 'paid' ? booking.totalPrice : 0;
  const balance = booking.totalPrice - paidAmount;

  // Collapsible Card Component
  const CollapsibleCard = ({ 
    title, 
    expanded, 
    onToggle, 
    children, 
    defaultExpanded = false 
  }: { 
    title: string; 
    expanded: boolean; 
    onToggle: () => void; 
    children: React.ReactNode;
    defaultExpanded?: boolean;
  }) => {
    const isExpanded = expanded || defaultExpanded;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    return (
      <Card
        style={isMobile ? { padding: tokens.spacing[3] } : undefined}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            userSelect: 'none',
          }}
          onClick={onToggle}
        >
          <h3
            style={{
              fontSize: isMobile ? tokens.typography.fontSize.base[0] : tokens.typography.fontSize.lg[0],
              fontWeight: tokens.typography.fontWeight.semibold,
              color: tokens.colors.text.primary,
              margin: 0,
            }}
          >
            {title}
          </h3>
          <i
            className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}
            style={{
              color: tokens.colors.text.secondary,
              transition: `transform ${tokens.transitions.duration.DEFAULT}`,
              flexShrink: 0,
            }}
          />
        </div>
        {isExpanded && (
          <div 
            style={{ 
              marginTop: isMobile ? tokens.spacing[2] : tokens.spacing[4],
            }}
          >
            {children}
          </div>
        )}
      </Card>
    );
  };

  // Booking Summary Header (Sticky on desktop)
  const BookingSummary = () => (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: tokens.zIndex.sticky,
        backgroundColor: tokens.colors.background.primary,
        borderBottom: `1px solid ${tokens.colors.border.default}`,
        padding: `${tokens.spacing[4]} 0`,
        marginBottom: tokens.spacing[6],
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: tokens.spacing[4],
        }}
      >
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing[3],
              marginBottom: tokens.spacing[2],
            }}
          >
            <h1
              style={{
                fontSize: tokens.typography.fontSize['2xl'][0],
                fontWeight: tokens.typography.fontWeight.bold,
                color: tokens.colors.text.primary,
                margin: 0,
              }}
            >
              {booking.firstName} {booking.lastName}
            </h1>
            <Badge variant={getStatusBadgeVariant(booking.status)}>
              {booking.status}
            </Badge>
          </div>
          <div
            style={{
              fontSize: tokens.typography.fontSize.base[0],
              color: tokens.colors.text.secondary,
            }}
          >
            {booking.service} • {formatDate(booking.startAt)} - {formatDate(booking.endAt)}
            {booking.sitter && ` • ${booking.sitter.firstName} ${booking.sitter.lastName}`}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing[3],
            flexWrap: 'wrap',
          }}
        >
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: tokens.typography.fontSize.sm[0],
                color: tokens.colors.text.secondary,
                marginBottom: tokens.spacing[1],
              }}
            >
              Total
            </div>
            <div
              style={{
                fontSize: tokens.typography.fontSize.xl[0],
                fontWeight: tokens.typography.fontWeight.bold,
                color: tokens.colors.text.primary,
              }}
            >
              {formatCurrency(booking.totalPrice)}
            </div>
          </div>
          <Badge variant={getPaymentStatusBadgeVariant(booking.paymentStatus)}>
            {booking.paymentStatus}
          </Badge>
        </div>
      </div>
    </div>
  );

  // Intelligence Column Content (Left side on desktop)
  const IntelligenceColumn = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacing[4],
      }}
    >
      {/* Schedule & Service */}
      <CollapsibleCard
        title="Schedule & Service"
        expanded={scheduleExpanded}
        onToggle={() => setScheduleExpanded(!scheduleExpanded)}
        defaultExpanded={false}
      >
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
                Start
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
                End
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
                  fontWeight: tokens.typography.fontWeight.medium,
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
              display: 'flex',
              gap: tokens.spacing[3],
              flexWrap: 'wrap',
            }}
          >
            {booking.quantity > 1 && (
              <Badge variant="default">Quantity: {booking.quantity}</Badge>
            )}
            {booking.afterHours && <Badge variant="warning">After Hours</Badge>}
            {booking.holiday && <Badge variant="warning">Holiday</Badge>}
          </div>

          <Button
            variant="secondary"
            leftIcon={<i className="fas fa-edit" />}
            onClick={() => setShowEditModal(true)}
            style={{ alignSelf: 'flex-start' }}
          >
            Edit Schedule
          </Button>
        </div>
      </CollapsibleCard>

      {/* Pets & Care Context */}
      <CollapsibleCard
        title="Pets & Care"
        expanded={petsExpanded}
        onToggle={() => setPetsExpanded(!petsExpanded)}
        defaultExpanded={true}
      >
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
                    <div
                      style={{
                        fontWeight: tokens.typography.fontWeight.semibold,
                        fontSize: tokens.typography.fontSize.lg[0],
                      }}
                    >
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
            {booking.notes && (
              <div>
                <div
                  style={{
                    fontSize: tokens.typography.fontSize.sm[0],
                    color: tokens.colors.text.secondary,
                    marginBottom: tokens.spacing[2],
                    fontWeight: tokens.typography.fontWeight.medium,
                  }}
                >
                  Booking Notes
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
          </div>
        )}
      </CollapsibleCard>

      {/* Pricing Breakdown */}
      <CollapsibleCard
        title="Pricing Breakdown"
        expanded={pricingExpanded}
        onToggle={() => setPricingExpanded(!pricingExpanded)}
        defaultExpanded={false}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.spacing[4],
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: tokens.spacing[2],
            }}
          >
            {pricingDisplay.breakdown.map((item: any, index: number) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: tokens.spacing[2],
                }}
              >
                <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
                  {item.label}
                </div>
                <div style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
                  {formatCurrency(item.amount)}
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: tokens.spacing[4],
              borderTop: `1px solid ${tokens.colors.border.default}`,
            }}
          >
            <div
              style={{
                fontSize: tokens.typography.fontSize.lg[0],
                fontWeight: tokens.typography.fontWeight.semibold,
              }}
            >
              Total
            </div>
            <div
              style={{
                fontSize: tokens.typography.fontSize.lg[0],
                fontWeight: tokens.typography.fontWeight.bold,
              }}
            >
              {formatCurrency(pricingDisplay.total)}
            </div>
          </div>
        </div>
      </CollapsibleCard>

      {/* Notes & History */}
      <CollapsibleCard
        title="Notes & History"
        expanded={notesExpanded}
        onToggle={() => setNotesExpanded(!notesExpanded)}
        defaultExpanded={false}
      >
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
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: tokens.spacing[1],
                  }}
                >
                  <div style={{ display: 'flex', gap: tokens.spacing[2], alignItems: 'center' }}>
                    <Badge variant={getStatusBadgeVariant(entry.fromStatus || 'pending')}>
                      {entry.fromStatus || 'New'}
                    </Badge>
                    <i className="fas fa-arrow-right" style={{ color: tokens.colors.text.tertiary }} />
                    <Badge variant={getStatusBadgeVariant(entry.toStatus)}>
                      {entry.toStatus}
                    </Badge>
                  </div>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.sm[0],
                      color: tokens.colors.text.secondary,
                    }}
                  >
                    {formatDateTime(entry.createdAt)}
                  </div>
                </div>
                {entry.reason && (
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.sm[0],
                      color: tokens.colors.text.secondary,
                      marginTop: tokens.spacing[1],
                    }}
                  >
                    {entry.reason}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CollapsibleCard>
    </div>
  );

  // Control Panel Column Content (Right side on desktop)
  const ControlPanel = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacing[4],
      }}
    >
      {/* Status & Assignment */}
      <Card>
        <div
          style={{
            fontSize: tokens.typography.fontSize.lg[0],
            fontWeight: tokens.typography.fontWeight.semibold,
            color: tokens.colors.text.primary,
            marginBottom: tokens.spacing[4],
          }}
        >
          Status & Assignment
        </div>
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
            <Badge
              variant={getStatusBadgeVariant(booking.status)}
              style={{ fontSize: tokens.typography.fontSize.base[0] }}
            >
              {booking.status}
            </Badge>
          </div>
          {statusTransitions.length > 0 && (
            <Button
              variant="primary"
              style={{ width: '100%' }}
              onClick={() => {
                setNewStatus(statusTransitions[0]);
                setShowStatusModal(true);
              }}
            >
              {statusTransitions[0] === 'confirmed'
                ? 'Confirm Booking'
                : statusTransitions[0] === 'completed'
                ? 'Mark Complete'
                : `Change to ${statusTransitions[0]}`}
            </Button>
          )}

          <div
            style={{
              borderTop: `1px solid ${tokens.colors.border.default}`,
              paddingTop: tokens.spacing[4],
              marginTop: tokens.spacing[2],
            }}
          >
            {booking.sitter ? (
              <>
                <div
                  style={{
                    fontSize: tokens.typography.fontSize.sm[0],
                    color: tokens.colors.text.secondary,
                    marginBottom: tokens.spacing[2],
                  }}
                >
                  Assigned Sitter
                </div>
                <div style={{ fontWeight: tokens.typography.fontWeight.medium, marginBottom: tokens.spacing[3] }}>
                  {booking.sitter.firstName} {booking.sitter.lastName}
                </div>
                <Button
                  variant="secondary"
                  style={{ width: '100%', marginBottom: tokens.spacing[3] }}
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
        </div>
      </Card>

      {/* Financial Actions - Separated and Guarded */}
      <Card>
        <div
          style={{
            fontSize: tokens.typography.fontSize.lg[0],
            fontWeight: tokens.typography.fontWeight.semibold,
            color: tokens.colors.text.primary,
            marginBottom: tokens.spacing[2],
          }}
        >
          Financial Actions
        </div>
        <div
          style={{
            fontSize: tokens.typography.fontSize.sm[0],
            color: tokens.colors.text.secondary,
            marginBottom: tokens.spacing[4],
          }}
        >
          Payment and tip links for this booking
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.spacing[3],
          }}
        >
          {/* Priority 1: Send Payment Link Button - Always visible */}
          <Button
            variant="primary"
            style={{ width: '100%' }}
            onClick={async () => {
              // If payment link exists, use it; otherwise create it first
              if (booking.stripePaymentLinkUrl) {
                // Payment link exists - show preview and send
                setPaymentLinkUrl(booking.stripePaymentLinkUrl);
                const { generatePaymentLinkMessage } = await import('@/lib/payment-link-message');
                const petQuantities = booking.pets.map(p => p.species).join(', ');
                const message = await generatePaymentLinkMessage(
                  booking.firstName,
                  booking.service,
                  formatDate(booking.startAt),
                  petQuantities,
                  booking.totalPrice,
                  booking.stripePaymentLinkUrl
                );
                setPaymentLinkMessage(message);
                setShowPaymentLinkPreview(true);
              } else {
                // No payment link - create it first
                setShowPaymentLinkModal(true);
              }
            }}
            leftIcon={<i className="fas fa-paper-plane" />}
          >
            {booking.stripePaymentLinkUrl ? 'Send Payment Link' : 'Create & Send Payment Link'}
          </Button>

          {/* Show existing payment link if it exists */}
          {booking.stripePaymentLinkUrl && (
            <div>
              <div
                style={{
                  fontSize: tokens.typography.fontSize.sm[0],
                  color: tokens.colors.text.secondary,
                  marginBottom: tokens.spacing[2],
                }}
              >
                Payment Link
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: tokens.spacing[2],
                  alignItems: 'center',
                }}
              >
                <a
                  href={booking.stripePaymentLinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    padding: tokens.spacing[2],
                    backgroundColor: tokens.colors.background.secondary,
                    borderRadius: tokens.borderRadius.md,
                    fontSize: tokens.typography.fontSize.sm[0],
                    color: tokens.colors.primary.DEFAULT,
                    textDecoration: 'none',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {booking.stripePaymentLinkUrl}
                </a>
                <Button
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(booking.stripePaymentLinkUrl!);
                    alert('Payment link copied to clipboard!');
                  }}
                >
                  <i className="fas fa-copy" />
                </Button>
              </div>
            </div>
          )}

          {booking.sitter && (
            <>
              {booking.tipLinkUrl ? (
                <div>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.sm[0],
                      color: tokens.colors.text.secondary,
                      marginBottom: tokens.spacing[2],
                    }}
                  >
                    Tip Link
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: tokens.spacing[2],
                      alignItems: 'center',
                    }}
                  >
                    <a
                      href={booking.tipLinkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        flex: 1,
                        padding: tokens.spacing[2],
                        backgroundColor: tokens.colors.background.secondary,
                        borderRadius: tokens.borderRadius.md,
                        fontSize: tokens.typography.fontSize.sm[0],
                        color: tokens.colors.primary.DEFAULT,
                        textDecoration: 'none',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {booking.tipLinkUrl}
                    </a>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        navigator.clipboard.writeText(booking.tipLinkUrl!);
                        alert('Tip link copied to clipboard!');
                      }}
                    >
                      <i className="fas fa-copy" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  style={{ width: '100%' }}
                  onClick={() => setShowTipLinkModal(true)}
                  leftIcon={<i className="fas fa-heart" />}
                >
                  Create Tip Link
                </Button>
              )}
            </>
          )}

          {booking.stripePaymentLinkUrl && (
            <Button
              variant="secondary"
              style={{ width: '100%' }}
              onClick={() => {
                window.open(`https://dashboard.stripe.com/payment_links`, '_blank');
              }}
              leftIcon={<i className="fas fa-external-link-alt" />}
            >
              View in Stripe
            </Button>
          )}
        </div>
      </Card>

      {/* Quick Utilities */}
      <Card>
        <div
          style={{
            fontSize: tokens.typography.fontSize.lg[0],
            fontWeight: tokens.typography.fontWeight.semibold,
            color: tokens.colors.text.primary,
            marginBottom: tokens.spacing[4],
          }}
        >
          Quick Actions
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.spacing[3],
          }}
        >
          <Button
            variant="secondary"
            style={{ width: '100%' }}
            onClick={() => {
              navigator.clipboard.writeText(booking.id);
              alert('Booking ID copied to clipboard!');
            }}
            leftIcon={<i className="fas fa-copy" />}
          >
            Copy Booking ID
          </Button>
          <Button
            variant="secondary"
            style={{ width: '100%' }}
            onClick={() => {
              const details = `${booking.firstName} ${booking.lastName}\n${booking.service}\n${formatDate(booking.startAt)} - ${formatDate(booking.endAt)}\n${formatCurrency(booking.totalPrice)}`;
              navigator.clipboard.writeText(details);
              alert('Booking details copied to clipboard!');
            }}
            leftIcon={<i className="fas fa-clipboard" />}
          >
            Copy Booking Details
          </Button>
          {booking.status !== 'cancelled' && booking.status !== 'completed' && (
            <Button
              variant="danger"
              style={{ width: '100%' }}
              onClick={() => {
                if (confirm('Are you sure you want to cancel this booking?')) {
                  handleStatusChange('cancelled');
                }
              }}
              leftIcon={<i className="fas fa-times" />}
            >
              Cancel Booking
            </Button>
          )}
        </div>
      </Card>

      {/* Client Information */}
      <Card>
        <div
          style={{
            fontSize: tokens.typography.fontSize.lg[0],
            fontWeight: tokens.typography.fontWeight.semibold,
            color: tokens.colors.text.primary,
            marginBottom: tokens.spacing[4],
          }}
        >
          Client Information
        </div>
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
  );

  return (
    <AppShell>
      <div style={{ padding: tokens.spacing[6] }}>
        {/* Back Button */}
        <div style={{ marginBottom: tokens.spacing[4] }}>
          <Link href="/bookings">
            <Button variant="secondary" leftIcon={<i className="fas fa-arrow-left" />}>
              Back to Bookings
            </Button>
          </Link>
        </div>

        {/* Booking Summary Header */}
        <BookingSummary />

        {/* Desktop: Two-Column Layout */}
        <div
          style={{
            display: 'none',
            '@media (min-width: 1024px)': {
              display: 'grid',
              gridTemplateColumns: '1fr 400px',
              gap: tokens.spacing[6],
            },
          } as React.CSSProperties & { '@media (min-width: 1024px)': React.CSSProperties }}
        >
          {/* Left Column: Intelligence */}
          <IntelligenceColumn />

          {/* Right Column: Controls */}
          <ControlPanel />
        </div>

        {/* Mobile: Tab-Based Layout */}
        <div
          style={{
            display: 'block',
            '@media (min-width: 1024px)': {
              display: 'none',
            },
          } as React.CSSProperties & { '@media (min-width: 1024px)': React.CSSProperties }}
        >
          <Tabs
            tabs={[
              { id: 'overview', label: 'Overview' },
              { id: 'schedule', label: 'Schedule' },
              { id: 'pets', label: 'Pets' },
              { id: 'pricing', label: 'Pricing' },
              { id: 'actions', label: 'Actions' },
            ]}
            activeTab={mobileTab}
            onTabChange={setMobileTab}
          >
            <TabPanel id="overview">
              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
                <ControlPanel />
              </div>
            </TabPanel>
            <TabPanel id="schedule">
              <Card>
                <div
                  style={{
                    fontSize: tokens.typography.fontSize.lg[0],
                    fontWeight: tokens.typography.fontWeight.semibold,
                    color: tokens.colors.text.primary,
                    marginBottom: tokens.spacing[4],
                  }}
                >
                  Schedule & Service
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: tokens.spacing[4] }}>
                    <div>
                      <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                        Start
                      </div>
                      <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>{formatDateTime(booking.startAt)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                        End
                      </div>
                      <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>{formatDateTime(booking.endAt)}</div>
                    </div>
                  </div>
                  {booking.timeSlots.length > 0 && (
                    <div>
                      <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[2], fontWeight: tokens.typography.fontWeight.medium }}>
                        Time Slots
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2] }}>
                        {booking.timeSlots.map((slot) => (
                          <div key={slot.id} style={{ padding: tokens.spacing[3], backgroundColor: tokens.colors.background.secondary, borderRadius: tokens.borderRadius.md, fontSize: tokens.typography.fontSize.sm[0] }}>
                            {formatTime(slot.startAt)} - {formatTime(slot.endAt)} ({slot.duration} min)
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {booking.address && (
                    <div>
                      <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>Address</div>
                      <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>{booking.address}</div>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: tokens.spacing[3], flexWrap: 'wrap' }}>
                    {booking.quantity > 1 && <Badge variant="default">Quantity: {booking.quantity}</Badge>}
                    {booking.afterHours && <Badge variant="warning">After Hours</Badge>}
                    {booking.holiday && <Badge variant="warning">Holiday</Badge>}
                  </div>
                </div>
              </Card>
            </TabPanel>
            <TabPanel id="pets">
              <Card>
                <div style={{ fontSize: tokens.typography.fontSize.lg[0], fontWeight: tokens.typography.fontWeight.semibold, color: tokens.colors.text.primary, marginBottom: tokens.spacing[4] }}>
                  Pets & Care
                </div>
                {booking.pets.length === 0 ? (
                  <EmptyState icon="🐾" title="No pets" description="No pets have been added to this booking." />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
                    {booking.pets.map((pet) => (
                      <div key={pet.id} style={{ padding: tokens.spacing[4], border: `1px solid ${tokens.colors.border.default}`, borderRadius: tokens.borderRadius.md }}>
                        <div style={{ fontWeight: tokens.typography.fontWeight.semibold, fontSize: tokens.typography.fontSize.lg[0] }}>{pet.name}</div>
                        <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginTop: tokens.spacing[1] }}>
                          {pet.species}{pet.breed && ` • ${pet.breed}`}{pet.age && ` • ${pet.age} ${pet.age === 1 ? 'year' : 'years'} old`}
                        </div>
                        {pet.notes && (
                          <div style={{ marginTop: tokens.spacing[2], padding: tokens.spacing[3], backgroundColor: tokens.colors.background.secondary, borderRadius: tokens.borderRadius.sm, fontSize: tokens.typography.fontSize.sm[0] }}>
                            {pet.notes}
                          </div>
                        )}
                      </div>
                    ))}
                    {booking.notes && (
                      <div>
                        <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[2], fontWeight: tokens.typography.fontWeight.medium }}>
                          Booking Notes
                        </div>
                        <div style={{ padding: tokens.spacing[4], backgroundColor: tokens.colors.background.secondary, borderRadius: tokens.borderRadius.md, whiteSpace: 'pre-wrap' }}>
                          {booking.notes}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </TabPanel>
            <TabPanel id="pricing">
              <Card>
                <div style={{ fontSize: tokens.typography.fontSize.lg[0], fontWeight: tokens.typography.fontWeight.semibold, color: tokens.colors.text.primary, marginBottom: tokens.spacing[4] }}>
                  Pricing Breakdown
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2] }}>
                    {pricingDisplay.breakdown.map((item: any, index: number) => (
                      <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: tokens.spacing[2] }}>
                        <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>{item.label}</div>
                        <div style={{ fontWeight: tokens.typography.fontWeight.semibold }}>{formatCurrency(item.amount)}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: tokens.spacing[4], borderTop: `1px solid ${tokens.colors.border.default}` }}>
                    <div style={{ fontSize: tokens.typography.fontSize.lg[0], fontWeight: tokens.typography.fontWeight.semibold }}>Total</div>
                    <div style={{ fontSize: tokens.typography.fontSize.lg[0], fontWeight: tokens.typography.fontWeight.bold }}>{formatCurrency(pricingDisplay.total)}</div>
                  </div>
                </div>
              </Card>
            </TabPanel>
            <TabPanel id="actions">
              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
                <ControlPanel />
              </div>
            </TabPanel>
          </Tabs>
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
            <Button variant="primary" onClick={() => handleStatusChange()} isLoading={saving}>
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

      {/* Payment Link Modal */}
      <Modal
        isOpen={showPaymentLinkModal}
        onClose={() => setShowPaymentLinkModal(false)}
        title="Create Payment Link"
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.spacing[4],
          }}
        >
          <div>
            This will create a Stripe payment link for {formatCurrency(booking.totalPrice)}.
          </div>
          <div
            style={{
              display: 'flex',
              gap: tokens.spacing[3],
              justifyContent: 'flex-end',
            }}
          >
            <Button variant="secondary" onClick={() => setShowPaymentLinkModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreatePaymentLink} isLoading={saving}>
              Create Payment Link
            </Button>
          </div>
        </div>
      </Modal>

      {/* Payment Link Preview Modal */}
      <Modal
        isOpen={showPaymentLinkPreview}
        onClose={() => {
          setShowPaymentLinkPreview(false);
          setPaymentLinkUrl(null);
          setPaymentLinkMessage('');
        }}
        title="Send Payment Link"
        size="lg"
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.spacing[6],
          }}
        >
          {/* Booking Summary */}
          <div>
            <div
              style={{
                fontSize: tokens.typography.fontSize.sm[0],
                color: tokens.colors.text.secondary,
                marginBottom: tokens.spacing[2],
                fontWeight: tokens.typography.fontWeight.medium,
              }}
            >
              Booking Summary
            </div>
            <div
              style={{
                padding: tokens.spacing[4],
                backgroundColor: tokens.colors.background.secondary,
                borderRadius: tokens.borderRadius.md,
              }}
            >
              <div style={{ marginBottom: tokens.spacing[2] }}>
                <strong>Client:</strong> {booking.firstName} {booking.lastName}
              </div>
              <div style={{ marginBottom: tokens.spacing[2] }}>
                <strong>Service:</strong> {booking.service}
              </div>
              <div style={{ marginBottom: tokens.spacing[2] }}>
                <strong>Date:</strong> {formatDate(booking.startAt)}
              </div>
              <div>
                <strong>Total:</strong> {formatCurrency(booking.totalPrice)}
              </div>
            </div>
          </div>

          {/* Message Preview */}
          <div>
            <div
              style={{
                fontSize: tokens.typography.fontSize.sm[0],
                color: tokens.colors.text.secondary,
                marginBottom: tokens.spacing[2],
                fontWeight: tokens.typography.fontWeight.medium,
              }}
            >
              Message Preview
            </div>
            <div
              style={{
                padding: tokens.spacing[4],
                backgroundColor: tokens.colors.background.secondary,
                borderRadius: tokens.borderRadius.md,
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                fontSize: tokens.typography.fontSize.sm[0],
                border: `1px solid ${tokens.colors.border.default}`,
              }}
            >
              {paymentLinkMessage || 'Loading message preview...'}
            </div>
          </div>

          {/* Payment Link */}
          {paymentLinkUrl && (
            <div>
              <div
                style={{
                  fontSize: tokens.typography.fontSize.sm[0],
                  color: tokens.colors.text.secondary,
                  marginBottom: tokens.spacing[2],
                  fontWeight: tokens.typography.fontWeight.medium,
                }}
              >
                Payment Link
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: tokens.spacing[2],
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    flex: 1,
                    padding: tokens.spacing[2],
                    backgroundColor: tokens.colors.background.secondary,
                    borderRadius: tokens.borderRadius.md,
                    fontSize: tokens.typography.fontSize.sm[0],
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {paymentLinkUrl}
                </div>
                <Button
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(paymentLinkUrl);
                    alert('Payment link copied to clipboard!');
                  }}
                >
                  <i className="fas fa-copy" />
                </Button>
              </div>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              gap: tokens.spacing[3],
              justifyContent: 'flex-end',
              paddingTop: tokens.spacing[4],
              borderTop: `1px solid ${tokens.colors.border.default}`,
            }}
          >
            <Button
              variant="secondary"
              onClick={() => {
                setShowPaymentLinkPreview(false);
                setPaymentLinkUrl(null);
                setPaymentLinkMessage('');
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSendPaymentLink} isLoading={saving}>
              Send Payment Link
            </Button>
          </div>
        </div>
      </Modal>

      {/* Tip Link Modal */}
      <Modal
        isOpen={showTipLinkModal}
        onClose={() => setShowTipLinkModal(false)}
        title="Create Tip Link"
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.spacing[4],
          }}
        >
          <div>
            This will create a tip link for {booking.sitter?.firstName} {booking.sitter?.lastName}.
          </div>
          <div
            style={{
              display: 'flex',
              gap: tokens.spacing[3],
              justifyContent: 'flex-end',
            }}
          >
            <Button variant="secondary" onClick={() => setShowTipLinkModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateTipLink} isLoading={saving}>
              Create Tip Link
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Booking Modal */}
      <EditBookingModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        booking={booking}
        onSave={async (updates) => {
          setSaving(true);
          try {
            const response = await fetch(`/api/bookings/${bookingId}/edit`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updates),
            });
            const result = await response.json();
            if (result.success) {
              await fetchBooking();
              await fetchStatusHistory();
              return { success: true, changes: result.changes };
            } else {
              return { success: false, error: result.error || 'Failed to save booking' };
            }
          } catch (error) {
            console.error('Failed to save booking:', error);
            return { success: false, error: 'Failed to save booking' };
          } finally {
            setSaving(false);
          }
        }}
      />
    </AppShell>
  );
}
