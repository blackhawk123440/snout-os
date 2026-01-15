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
  Tabs,
  TabPanel,
} from '@/components/ui';
import { BookingScheduleDisplay, isOvernightRangeService } from '@/components/booking';
import { SitterAssignmentDisplay, SitterTierBadge, SitterInfo } from '@/components/sitter';
import { BookingForm } from '@/components/bookings/BookingForm';
import { bookingToFormValues, BookingFormValues } from '@/lib/bookings/booking-form-mapper';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';
import { getPricingForDisplay } from '@/lib/pricing-display-helpers';
import { useMobile } from '@/lib/use-mobile';

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
  sitterPool?: Array<{
    sitter: SitterInfo;
  }>;
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
  const [activeTab, setActiveTab] = useState<string>('overview');
  const isMobile = useMobile();
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showUnassignModal, setShowUnassignModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedSitterId, setSelectedSitterId] = useState<string>('');
  const [selectedPoolSitterIds, setSelectedPoolSitterIds] = useState<Set<string>>(new Set());
  const [assignMode, setAssignMode] = useState<'direct' | 'pool'>('direct');
  const [showEditModal, setShowEditModal] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [sitters, setSitters] = useState<Sitter[]>([]);
  
  const [showPaymentLinkModal, setShowPaymentLinkModal] = useState(false);
  const [showTipLinkModal, setShowTipLinkModal] = useState(false);
  const [paymentLinkMessage, setPaymentLinkMessage] = useState('');
  const [tipLinkMessage, setTipLinkMessage] = useState('');
  const [showPaymentLinkConfirm, setShowPaymentLinkConfirm] = useState(false);
  const [showTipLinkConfirm, setShowTipLinkConfirm] = useState(false);
  const [showMoreActionsModal, setShowMoreActionsModal] = useState(false);
  

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
        sitterPool: data.booking.sitterPool || [],
      };
      setBooking(bookingData);
      // Update pool selection state when booking loads
      if (data.booking.sitterPool && data.booking.sitterPool.length > 0) {
        setSelectedPoolSitterIds(new Set(data.booking.sitterPool.map((p: any) => p.sitter?.id).filter(Boolean)));
      }
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

  const handleEditBooking = async (formValues: BookingFormValues) => {
    if (!booking) return;
    setSaving(true);
    try {
      // Convert form values to booking update format
      const updates: any = {
        firstName: formValues.firstName,
        lastName: formValues.lastName,
        phone: formValues.phone,
        email: formValues.email || null,
        address: formValues.address || null,
        pickupAddress: formValues.pickupAddress || null,
        dropoffAddress: formValues.dropoffAddress || null,
        service: formValues.service,
        startAt: formValues.startAt,
        endAt: formValues.endAt,
        notes: formValues.notes || null,
        afterHours: formValues.afterHours || false,
        holiday: formValues.holiday || false,
      };

      // Handle pets - need to delete old and create new  
      if (formValues.pets && formValues.pets.length > 0) {
        updates.pets = formValues.pets.map(p => ({
          name: p.name,
          species: p.species,
        }));
      }

      // Handle timeSlots if provided
      if (formValues.selectedDates && formValues.dateTimes) {
        const timeSlots: any[] = [];
        formValues.selectedDates.forEach(dateStr => {
          const times = formValues.dateTimes![dateStr] || [];
          times.forEach((timeEntry: { time: string; duration: number }) => {
            const [hours, minutes] = timeEntry.time.split(':').map(Number);
            const start = new Date(dateStr);
            start.setHours(hours, minutes, 0, 0);
            const end = new Date(start.getTime() + (timeEntry.duration || 30) * 60000);
            timeSlots.push({
              startAt: start.toISOString(),
              endAt: end.toISOString(),
              duration: timeEntry.duration || 30,
            });
          });
        });
        if (timeSlots.length > 0) {
          updates.timeSlots = timeSlots;
        }
      }

      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (response.ok) {
        await fetchBooking();
        await fetchStatusHistory();
        setShowEditModal(false);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update booking');
      }
    } catch (err) {
      throw err;
    } finally {
      setSaving(false);
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

  const handleSitterPoolChange = async (sitterIds: string[]) => {
    if (!booking) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sitterPoolIds: sitterIds }),
      });
      if (response.ok) {
        await fetchBooking();
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Failed to update sitter pool: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to update sitter pool:', err);
      alert('Failed to update sitter pool');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePoolSitter = (sitterId: string) => {
    setSelectedPoolSitterIds(prev => {
      const next = new Set(prev);
      if (next.has(sitterId)) {
        next.delete(sitterId);
      } else {
        next.add(sitterId);
      }
      return next;
    });
  };

  const handleSavePool = async () => {
    await handleSitterPoolChange(Array.from(selectedPoolSitterIds));
    setShowAssignModal(false);
    setSelectedPoolSitterIds(new Set(booking?.sitterPool?.map(p => p.sitter?.id).filter(Boolean) || []));
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

  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
          document.body.removeChild(textArea);
          return true;
        } catch (err) {
          document.body.removeChild(textArea);
          return false;
        }
      }
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      return false;
    }
  };

  const handleCopyBookingId = async () => {
    if (!booking) return;
    const copied = await copyToClipboard(booking.id);
    if (copied) {
      alert('Booking ID copied to clipboard');
    } else {
      alert('Failed to copy Booking ID');
    }
    setShowMoreActionsModal(false);
  };

  const handleCopyBookingDetails = async () => {
    if (!booking) return;
    const details = `Booking Details:
ID: ${booking.id}
Client: ${booking.firstName} ${booking.lastName}
Phone: ${booking.phone}
Email: ${booking.email || 'N/A'}
Service: ${booking.service}
Date: ${formatDate(booking.startAt)} - ${formatDate(booking.endAt)}
Status: ${booking.status}
Total: ${formatCurrency(booking.totalPrice)}`;
    const copied = await copyToClipboard(details);
    if (copied) {
      alert('Booking details copied to clipboard');
    } else {
      alert('Failed to copy booking details');
    }
    setShowMoreActionsModal(false);
  };

  const handleCancelBooking = async () => {
    if (!booking || !confirm('Are you sure you want to cancel this booking?')) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (response.ok) {
        await fetchBooking();
        await fetchStatusHistory();
        setShowMoreActionsModal(false);
        alert('Booking cancelled successfully');
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Failed to cancel booking: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to cancel booking:', err);
      alert('Failed to cancel booking');
    } finally {
      setSaving(false);
    }
  };

  const handlePaymentLinkAction = async (action: 'copy' | 'send') => {
    if (!booking) return;
    
    if (action === 'copy') {
      // Handle copy immediately
      if (!booking.stripePaymentLinkUrl) {
        // Generate payment link first
        try {
          const response = await fetch(`/api/bookings/${bookingId}/payment-link`, {
            method: 'POST',
          });
          if (response.ok) {
            const data = await response.json();
            await fetchBooking();
            const copied = await copyToClipboard(data.link);
            if (copied) {
              alert('Payment link copied to clipboard');
            }
          } else {
            alert('Failed to generate payment link');
          }
        } catch (err) {
          console.error('Failed to generate payment link:', err);
          alert('Failed to generate payment link');
        }
      } else {
        const copied = await copyToClipboard(booking.stripePaymentLinkUrl);
        if (copied) {
          alert('Payment link copied to clipboard');
        }
      }
      setShowPaymentLinkModal(false);
      return;
    }

    // For send action, show preview first
    const link = booking.stripePaymentLinkUrl || '';
    let message = `Hi ${booking.firstName}, here's your payment link for your ${booking.service} booking:\n\n${link || '[Link will be generated]'}`;
    
    if (!booking.stripePaymentLinkUrl) {
      // Generate link first, then show preview
      try {
        const response = await fetch(`/api/bookings/${bookingId}/payment-link`, {
          method: 'POST',
        });
        if (response.ok) {
          const data = await response.json();
          await fetchBooking();
          message = `Hi ${booking.firstName}, here's your payment link for your ${booking.service} booking:\n\n${data.link}`;
          setPaymentLinkMessage(message);
          setShowPaymentLinkConfirm(true);
        } else {
          alert('Failed to generate payment link');
        }
      } catch (err) {
        console.error('Failed to generate payment link:', err);
        alert('Failed to generate payment link');
      }
    } else {
      setPaymentLinkMessage(message);
      setShowPaymentLinkModal(false); // Close payment link modal
      setShowPaymentLinkConfirm(true); // Show confirmation modal
    }
  };

  const handleTipLinkAction = async (action: 'copy' | 'send') => {
    if (!booking) return;
    
    if (action === 'copy') {
      // Handle copy immediately
      if (!booking.tipLinkUrl) {
        // Generate tip link first
        try {
          const response = await fetch(`/api/bookings/${bookingId}/tip-link`, {
            method: 'POST',
          });
          if (response.ok) {
            const data = await response.json();
            await fetchBooking();
            const copied = await copyToClipboard(data.link);
            if (copied) {
              alert('Tip link copied to clipboard');
            }
          } else {
            alert('Failed to generate tip link');
          }
        } catch (err) {
          console.error('Failed to generate tip link:', err);
          alert('Failed to generate tip link');
        }
      } else {
        const copied = await copyToClipboard(booking.tipLinkUrl);
        if (copied) {
          alert('Tip link copied to clipboard');
        }
      }
      setShowTipLinkModal(false);
      return;
    }

    // For send action, show preview first
    const link = booking.tipLinkUrl || '';
    const message = `Hi ${booking.firstName}, here's a tip link for your ${booking.service} booking:\n\n${link || '[Link will be generated]'}`;
    setTipLinkMessage(message);
    
    if (!booking.tipLinkUrl) {
      // Generate link first, then show preview
      try {
        const response = await fetch(`/api/bookings/${bookingId}/tip-link`, {
          method: 'POST',
        });
        if (response.ok) {
          const data = await response.json();
          await fetchBooking();
          const finalMessage = `Hi ${booking.firstName}, here's a tip link for your ${booking.service} booking:\n\n${data.link}`;
          setTipLinkMessage(finalMessage);
          setShowTipLinkModal(false); // Close tip link modal
          setShowTipLinkConfirm(true); // Show confirmation modal
        } else {
          alert('Failed to generate tip link');
        }
      } catch (err) {
        console.error('Failed to generate tip link:', err);
        alert('Failed to generate tip link');
      }
    } else {
      setTipLinkMessage(message);
      setShowTipLinkModal(false); // Close tip link modal
      setShowTipLinkConfirm(true); // Show confirmation modal
    }
  };

  const handleSendPaymentLink = async () => {
    if (!booking) return;
    setSaving(true);
    try {
      // For now, we'll copy the message to clipboard and show success
      // In production, this would call a message API endpoint
      const copied = await copyToClipboard(paymentLinkMessage);
      if (copied) {
        alert('Message copied to clipboard. Send it via your messaging app:\n\n' + paymentLinkMessage);
        // TODO: Implement actual message sending via API
        // await fetch('/api/messages/send', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({
        //     to: booking.phone,
        //     message: paymentLinkMessage,
        //     bookingId: booking.id,
        //   }),
        // });
      }
      setShowPaymentLinkConfirm(false);
      setShowPaymentLinkModal(false);
    } catch (err) {
      console.error('Failed to send payment link message:', err);
      alert('Failed to send message');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTipLink = async () => {
    if (!booking) return;
    setSaving(true);
    try {
      // For now, we'll copy the message to clipboard and show success
      // In production, this would call a message API endpoint
      const copied = await copyToClipboard(tipLinkMessage);
      if (copied) {
        alert('Message copied to clipboard. Send it via your messaging app:\n\n' + tipLinkMessage);
        // TODO: Implement actual message sending via API
        // await fetch('/api/messages/send', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({
        //     to: booking.phone,
        //     message: tipLinkMessage,
        //     bookingId: booking.id,
        //   }),
        // });
      }
      setShowTipLinkConfirm(false);
      setShowTipLinkModal(false);
    } catch (err) {
      console.error('Failed to send tip link message:', err);
      alert('Failed to send message');
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
      <AppShell>
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
      <AppShell>
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
  
  // Ensure breakdown is always an array
  const pricingBreakdown = Array.isArray(pricingDisplay.breakdown) && pricingDisplay.breakdown.length > 0
    ? pricingDisplay.breakdown
    : [{ label: booking.service || 'Service', amount: booking.totalPrice }];

  const statusTransitions = getAvailableStatusTransitions(booking.status);

  return (
    <AppShell>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          ...(isMobile ? {} : {
            height: 'calc(100vh - 64px)',
            overflow: 'hidden',
          }),
        }}
      >
        {/* Mobile: Single scroll page with all sections expanded */}
        {isMobile ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              paddingBottom: tokens.spacing[20], // Space for bottom action bar
            }}
          >
            {/* Summary Header - Card container */}
            <Card style={{ margin: tokens.spacing[3], marginTop: tokens.spacing[3], padding: tokens.spacing[3] }}>
              {/* Back button and Status */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: tokens.spacing[2],
                }}
              >
                <Link href="/bookings">
                  <Button variant="ghost" size="sm" leftIcon={<i className="fas fa-arrow-left" />}>
                    Back
                  </Button>
                </Link>
                <Badge variant={getStatusBadgeVariant(booking.status)}>
                  {booking.status}
                </Badge>
              </div>
              
              {/* Client Name and Service */}
              <div
                style={{
                  marginBottom: tokens.spacing[2],
                }}
              >
                <div
                  style={{
                    fontSize: tokens.typography.fontSize.lg[0],
                    fontWeight: tokens.typography.fontWeight.bold,
                    color: tokens.colors.text.primary,
                    marginBottom: tokens.spacing[1],
                  }}
                >
                  {booking.firstName} {booking.lastName}
                </div>
                <div
                  style={{
                    fontSize: tokens.typography.fontSize.sm[0],
                    color: tokens.colors.text.secondary,
                  }}
                >
                  {booking.service}
                </div>
              </div>

              {/* Total, Payment, and Sitter (if assigned) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: booking.sitter ? '1fr 1fr 1fr' : '1fr 1fr',
                  gap: tokens.spacing[2],
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.xs[0],
                      color: tokens.colors.text.secondary,
                      marginBottom: tokens.spacing[1],
                    }}
                  >
                    Total
                  </div>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.base[0],
                      fontWeight: tokens.typography.fontWeight.bold,
                      color: tokens.colors.text.primary,
                    }}
                  >
                    {formatCurrency(booking.totalPrice)}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.xs[0],
                      color: tokens.colors.text.secondary,
                      marginBottom: tokens.spacing[1],
                    }}
                  >
                    Payment
                  </div>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.sm[0],
                      fontWeight: tokens.typography.fontWeight.semibold,
                      color: booking.paymentStatus === 'Paid' ? tokens.colors.success.DEFAULT : tokens.colors.text.primary,
                    }}
                  >
                    {booking.paymentStatus || 'Pending'}
                  </div>
                </div>
                {booking.sitter && (
                  <div>
                    <div
                      style={{
                        fontSize: tokens.typography.fontSize.xs[0],
                        color: tokens.colors.text.secondary,
                        marginBottom: tokens.spacing[1],
                      }}
                    >
                      Sitter
                    </div>
                    <SitterAssignmentDisplay
                      sitter={booking.sitter}
                      showUnassigned={false}
                      compact={true}
                      showTierBadge={true}
                    />
                  </div>
                )}
              </div>
            </Card>

            {/* All Content - All sections always expanded */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Client Contact Details Section */}
              <Card style={{ margin: tokens.spacing[3], marginTop: tokens.spacing[3], padding: tokens.spacing[3] }}>
                <div style={{ fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.semibold, color: tokens.colors.text.secondary, marginBottom: tokens.spacing[3], textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Contact
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2] }}>
                  <div>
                    <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>Phone</div>
                    <div style={{ fontWeight: tokens.typography.fontWeight.medium, fontSize: tokens.typography.fontSize.base[0] }}>{booking.phone}</div>
                  </div>
                  {booking.email && (
                    <div>
                      <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>Email</div>
                      <div style={{ fontWeight: tokens.typography.fontWeight.medium, fontSize: tokens.typography.fontSize.base[0] }}>{booking.email}</div>
                    </div>
                  )}
                  {booking.address && (
                    <div>
                      <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>Address</div>
                      <div style={{ fontWeight: tokens.typography.fontWeight.medium, fontSize: tokens.typography.fontSize.base[0] }}>{booking.address}</div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Schedule Section - Always expanded */}
              <Card style={{ margin: tokens.spacing[3], marginTop: tokens.spacing[3], padding: tokens.spacing[3] }}>
                <div style={{ fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.semibold, color: tokens.colors.text.secondary, marginBottom: tokens.spacing[3], textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Schedule
                </div>
                <BookingScheduleDisplay
                  service={booking.service}
                  startAt={booking.startAt}
                  endAt={booking.endAt}
                  timeSlots={booking.timeSlots}
                  address={booking.address}
                  compact={false}
                />
              </Card>

              {/* Pets Section - Always expanded */}
              {booking.pets && booking.pets.length > 0 && (
                <Card style={{ margin: tokens.spacing[3], marginTop: 0, padding: tokens.spacing[3] }}>
                  <div style={{ fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.semibold, color: tokens.colors.text.secondary, marginBottom: tokens.spacing[3], textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Pets ({booking.pets.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2] }}>
                    {booking.pets.map((pet) => (
                      <div key={pet.id} style={{ padding: tokens.spacing[3], backgroundColor: tokens.colors.background.secondary, borderRadius: tokens.borderRadius.sm }}>
                        <div style={{ fontWeight: tokens.typography.fontWeight.medium, fontSize: tokens.typography.fontSize.sm[0] }}>{pet.name || 'Unnamed'} • {pet.species}</div>
                        {pet.breed && <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary, marginTop: tokens.spacing[1] }}>{pet.breed}</div>}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Pricing Section - Always expanded */}
              <Card style={{ margin: tokens.spacing[3], marginTop: 0, padding: tokens.spacing[3] }}>
                <div style={{ fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.semibold, color: tokens.colors.text.secondary, marginBottom: tokens.spacing[3], textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Pricing
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2] }}>
                  {pricingBreakdown.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: tokens.spacing[2], borderBottom: idx < pricingBreakdown.length - 1 ? `1px solid ${tokens.colors.border.default}` : 'none' }}>
                      <div style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.sm[0] }}>{item.label}</div>
                      <div style={{ fontWeight: tokens.typography.fontWeight.medium, fontSize: tokens.typography.fontSize.sm[0] }}>{formatCurrency(item.amount)}</div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: tokens.spacing[2], paddingTop: tokens.spacing[2], borderTop: `2px solid ${tokens.colors.border.default}`, fontWeight: tokens.typography.fontWeight.bold, fontSize: tokens.typography.fontSize.base[0] }}>
                    <div>Total</div>
                    <div>{formatCurrency(pricingDisplay.total)}</div>
                  </div>
                </div>
              </Card>
            </div>
            {/* Fixed Bottom Action Bar - Professional Design */}
            <div
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: tokens.colors.background.primary,
                borderTop: `1px solid ${tokens.colors.border.default}`,
                padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
                paddingBottom: `calc(${tokens.spacing[3]} + env(safe-area-inset-bottom))`,
                display: 'flex',
                gap: tokens.spacing[2],
                zIndex: tokens.zIndex.sticky + 1,
                boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.08)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <Button
                variant="primary"
                size="md"
                onClick={() => setShowEditModal(true)}
                style={{ 
                  flex: 1,
                  minHeight: '44px',
                  fontSize: tokens.typography.fontSize.base[0],
                  fontWeight: tokens.typography.fontWeight.semibold,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: tokens.spacing[2],
                }}
              >
                <i className="fas fa-edit" />
                Edit
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setShowPaymentLinkModal(true)}
                style={{ 
                  flex: 1,
                  minHeight: '44px',
                  fontSize: tokens.typography.fontSize.base[0],
                  fontWeight: tokens.typography.fontWeight.medium,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: tokens.spacing[2],
                }}
              >
                <i className="fas fa-dollar-sign" />
                Payment
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setShowTipLinkModal(true)}
                style={{ 
                  flex: 1,
                  minHeight: '44px',
                  fontSize: tokens.typography.fontSize.base[0],
                  fontWeight: tokens.typography.fontWeight.medium,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: tokens.spacing[2],
                }}
              >
                <i className="fas fa-heart" />
                Tip
              </Button>
              <Button
                variant="ghost"
                size="md"
                onClick={() => setShowMoreActionsModal(true)}
                style={{ 
                  minWidth: '60px',
                  minHeight: '44px',
                  fontSize: tokens.typography.fontSize.base[0],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: tokens.spacing[2],
                }}
              >
                <i className="fas fa-ellipsis-h" />
                More
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop: Summary Header - Card container */}
            <Card style={{ marginBottom: tokens.spacing[6], padding: `${tokens.spacing[6]} ${tokens.spacing[8]}` }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: tokens.spacing[6],
                  paddingBottom: tokens.spacing[5],
                  borderBottom: `1px solid ${tokens.colors.border.default}`,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: tokens.spacing[3],
                      marginBottom: tokens.spacing[2],
                    }}
                  >
                    <Link href="/bookings">
                      <Button variant="ghost" size="sm" leftIcon={<i className="fas fa-arrow-left" />}>
                        Back
                      </Button>
                    </Link>
                    <h1
                      style={{
                        fontSize: tokens.typography.fontSize['3xl'][0],
                        fontWeight: tokens.typography.fontWeight.bold,
                        color: tokens.colors.text.primary,
                        margin: 0,
                        letterSpacing: '-0.03em',
                        lineHeight: '1.1',
                      }}
                    >
                      {booking.firstName} {booking.lastName}
                    </h1>
                    <Badge variant={getStatusBadgeVariant(booking.status)}>
                      {booking.status}
                    </Badge>
                    {booking.sitter && (
                      <SitterAssignmentDisplay sitter={booking.sitter} showTierBadge compact />
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.base[0],
                      color: tokens.colors.text.secondary,
                      marginLeft: tokens.spacing[10],
                      marginTop: tokens.spacing[2],
                      fontWeight: tokens.typography.fontWeight.medium,
                    }}
                  >
                    {formatDate(booking.startAt)} - {formatDate(booking.endAt)} • {booking.service}
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: tokens.spacing[3],
                    alignItems: 'center',
                  }}
                >
                  <Button
                    variant="secondary"
                    onClick={() => setShowEditModal(true)}
                    leftIcon={<i className="fas fa-edit" />}
                  >
                    Edit
                  </Button>
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
              </div>

              {/* Desktop KPI Strip - Professional Layout */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: booking.paymentStatus !== 'paid' && booking.pets.length > 0
                    ? 'repeat(5, 1fr)'
                    : booking.paymentStatus !== 'paid' || booking.pets.length > 0
                    ? 'repeat(4, 1fr)'
                    : 'repeat(3, 1fr)',
                  gap: tokens.spacing[4],
                  paddingTop: tokens.spacing[4],
                  borderTop: `1px solid ${tokens.colors.border.default}`,
                }}
              >
                <StatCard
                  label="Total"
                  value={formatCurrency(booking.totalPrice)}
                  icon={<i className="fas fa-dollar-sign" />}
                  compact={true}
                />
                <StatCard
                  label="Payment Status"
                  value={booking.paymentStatus}
                  icon={<i className="fas fa-credit-card" />}
                  compact={true}
                />
                {booking.paymentStatus !== 'paid' && (
                  <StatCard
                    label="Balance"
                    value={formatCurrency(balance)}
                    icon={<i className="fas fa-wallet" />}
                    compact={true}
                  />
                )}
                <StatCard
                  label="Service"
                  value={booking.service}
                  icon={<i className="fas fa-paw" />}
                  compact={true}
                />
                {booking.pets.length > 0 && (
                  <StatCard
                    label="Pets"
                    value={booking.pets.length}
                    icon={<i className="fas fa-dog" />}
                    compact={true}
                  />
                )}
              </div>
            </Card>

        {/* Main Content - Two Column Layout with Internal Scrolling */}
      <div
          className="booking-detail-grid"
        style={{
          display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 400px',
            gap: tokens.spacing[4],
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {/* Left Column - Scrollable */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
              gap: tokens.spacing[4],
              overflowY: 'auto',
              overflowX: 'hidden',
              minHeight: 0,
              minWidth: 0, // Prevent flex child truncation
              paddingRight: tokens.spacing[2],
          }}
        >
          {/* Schedule and Visit Details */}
          <Card>
            <SectionHeader title="Schedule & Service" />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: tokens.spacing[4],
                minWidth: 0, // Prevent flex child truncation
              }}
            >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: tokens.spacing[4],
                    minWidth: 0, // Prevent grid child truncation
                  }}
                >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.xs[0],
                      color: tokens.colors.text.secondary,
                      marginBottom: tokens.spacing[2],
                      fontWeight: tokens.typography.fontWeight.semibold,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Start Date & Time
                  </div>
                  <div style={{ 
                    fontWeight: tokens.typography.fontWeight.bold, 
                    fontSize: tokens.typography.fontSize.base[0],
                    wordBreak: 'break-word',
                    color: tokens.colors.text.primary,
                  }}>
                    {formatDateTime(booking.startAt)}
                  </div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.xs[0],
                      color: tokens.colors.text.secondary,
                      marginBottom: tokens.spacing[2],
                      fontWeight: tokens.typography.fontWeight.semibold,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    End Date & Time
                  </div>
                  <div style={{ 
                    fontWeight: tokens.typography.fontWeight.bold, 
                    fontSize: tokens.typography.fontSize.base[0],
                    wordBreak: 'break-word',
                    color: tokens.colors.text.primary,
                  }}>
                    {formatDateTime(booking.endAt)}
                  </div>
                </div>
              </div>

              {booking.timeSlots.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.xs[0],
                      color: tokens.colors.text.secondary,
                      marginBottom: tokens.spacing[3],
                      fontWeight: tokens.typography.fontWeight.semibold,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
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
                          padding: `${tokens.spacing[2]} ${tokens.spacing[4]}`,
                          backgroundColor: tokens.colors.background.tertiary,
                          border: `1px solid ${tokens.colors.border.default}`,
                          borderRadius: tokens.borderRadius.md,
                          fontSize: tokens.typography.fontSize.sm[0],
                          fontWeight: tokens.typography.fontWeight.medium,
                          color: tokens.colors.text.primary,
                        }}
                      >
                        {formatTime(slot.startAt)} - {formatTime(slot.endAt)} ({slot.duration} min)
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {booking.address && (
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.xs[0],
                      color: tokens.colors.text.secondary,
                      marginBottom: tokens.spacing[2],
                      fontWeight: tokens.typography.fontWeight.semibold,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Address
                  </div>
                  <div style={{ 
                    fontWeight: tokens.typography.fontWeight.medium, 
                    fontSize: tokens.typography.fontSize.base[0],
                    wordBreak: 'break-word',
                    color: tokens.colors.text.primary,
                  }}>
                    {booking.address}
                  </div>
                </div>
              )}

              {booking.pickupAddress && (
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.sm[0],
                      color: tokens.colors.text.secondary,
                      marginBottom: tokens.spacing[1],
                    }}
                  >
                    Pickup Address
                  </div>
                  <div style={{ fontWeight: tokens.typography.fontWeight.medium, wordBreak: 'break-word' }}>
                    {booking.pickupAddress}
                  </div>
                </div>
              )}

              {booking.dropoffAddress && (
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.sm[0],
                      color: tokens.colors.text.secondary,
                      marginBottom: tokens.spacing[1],
                    }}
                  >
                    Dropoff Address
                  </div>
                  <div style={{ fontWeight: tokens.typography.fontWeight.medium, wordBreak: 'break-word' }}>
                    {booking.dropoffAddress}
                  </div>
                </div>
              )}

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: tokens.spacing[4],
                  minWidth: 0, // Prevent grid child truncation
                }}
              >
                {booking.quantity > 1 && (
                  <div style={{ minWidth: 0 }}>
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
                  gap: tokens.spacing[5],
                  minWidth: 0, // Prevent flex child truncation
                  paddingTop: tokens.spacing[2],
                }}
              >
                {booking.pets.map((pet) => (
                  <div
                    key={pet.id}
                    style={{
                      padding: tokens.spacing[4],
                      border: `1px solid ${tokens.colors.border.default}`,
                      borderRadius: tokens.borderRadius.md,
                      minWidth: 0, // Prevent card truncation
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: tokens.spacing[2],
                        minWidth: 0, // Prevent flex container truncation
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ 
                          fontWeight: tokens.typography.fontWeight.bold, 
                          fontSize: tokens.typography.fontSize.xl[0],
                          letterSpacing: '-0.01em',
                          marginBottom: tokens.spacing[2],
                        }}>
                          {pet.name}
                        </div>
                        <div
                          style={{
                            fontSize: tokens.typography.fontSize.base[0],
                            color: tokens.colors.text.secondary,
                            fontWeight: tokens.typography.fontWeight.medium,
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
                          padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
                          backgroundColor: tokens.colors.background.tertiary,
                          border: `1px solid ${tokens.colors.border.default}`,
                          borderRadius: tokens.borderRadius.md,
                          fontSize: tokens.typography.fontSize.sm[0],
                          minWidth: 0,
                          wordBreak: 'break-word',
                          color: tokens.colors.text.primary,
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
              <div style={{ marginTop: tokens.spacing[8] }}>
                <div
                  style={{
                    fontSize: tokens.typography.fontSize.xs[0],
                    color: tokens.colors.text.secondary,
                    marginBottom: tokens.spacing[3],
                    fontWeight: tokens.typography.fontWeight.bold,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Additional Notes
                </div>
                <div
                  style={{
                    padding: `${tokens.spacing[4]} ${tokens.spacing[5]}`,
                    backgroundColor: tokens.colors.background.tertiary,
                    border: `1px solid ${tokens.colors.border.default}`,
                    borderRadius: tokens.borderRadius.md,
                    whiteSpace: 'pre-wrap',
                    minWidth: 0,
                    wordBreak: 'break-word',
                    fontSize: tokens.typography.fontSize.base[0],
                    lineHeight: '1.6',
                    color: tokens.colors.text.primary,
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
                    mobileLabel: 'Item',
                    mobileOrder: 1,
                    render: (row) => <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>{row.label}</div>,
                  },
                  {
                    key: 'amount',
                    header: 'Amount',
                    mobileLabel: 'Amount',
                    mobileOrder: 2,
                    align: 'right',
                    render: (row) => <div style={{ fontWeight: tokens.typography.fontWeight.semibold }}>{formatCurrency(row.amount)}</div>,
                  },
                ]}
                data={pricingBreakdown}
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
                  <div style={{ 
                    fontSize: tokens.typography.fontSize['2xl'][0], 
                    fontWeight: tokens.typography.fontWeight.bold,
                    color: tokens.colors.text.primary,
                    letterSpacing: '-0.02em',
                  }}>
                    Total
                  </div>
                  <div style={{ 
                    fontSize: tokens.typography.fontSize['2xl'][0], 
                    fontWeight: tokens.typography.fontWeight.bold,
                    color: tokens.colors.primary.DEFAULT,
                    letterSpacing: '-0.02em',
                  }}>
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

          {/* Right Column - Control Panel - Scrollable */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
              gap: tokens.spacing[4],
              overflowY: 'auto',
              overflowX: 'hidden',
              minHeight: 0,
              paddingRight: tokens.spacing[2],
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
                      <SitterAssignmentDisplay sitter={booking.sitter} showTierBadge />
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
          </>
        )}
      </div>

      {/* Edit Booking Modal */}
      {booking && (
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit Booking"
          size={isMobile ? 'full' : 'lg'}
        >
          <div style={{ padding: isMobile ? 0 : tokens.spacing[4] }}>
            <BookingForm
              mode="edit"
              bookingId={bookingId}
              initialValues={booking ? bookingToFormValues({
                ...booking,
                pets: booking.pets || [],
                timeSlots: booking.timeSlots || [],
              }) : undefined}
              onSubmit={handleEditBooking}
              onCancel={() => setShowEditModal(false)}
            />
          </div>
        </Modal>
      )}

      {/* Payment Link Modal */}
        <Modal
          isOpen={showPaymentLinkModal}
          onClose={() => setShowPaymentLinkModal(false)}
          title="Payment Link"
          size="full"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            <div>
              <p style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                {booking?.stripePaymentLinkUrl 
                  ? 'Copy or send the payment link to the client.'
                  : 'Generate and send a payment link to the client.'}
              </p>
            </div>
            {booking?.stripePaymentLinkUrl && (
              <div>
                <Input
                  label="Payment Link"
                  value={booking.stripePaymentLinkUrl}
                  readOnly
                  rightIcon={
                    <button
                      onClick={() => handlePaymentLinkAction('copy')}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        padding: tokens.spacing[2],
                      }}
                    >
                      <i className="fas fa-copy" />
                    </button>
                  }
                />
              </div>
            )}
            <div style={{ display: 'flex', gap: tokens.spacing[2], marginTop: tokens.spacing[4] }}>
              <Button
                variant="secondary"
                onClick={() => handlePaymentLinkAction('copy')}
                style={{ flex: 1 }}
                leftIcon={<i className="fas fa-copy" />}
              >
                Copy Link
              </Button>
              <Button
                variant="primary"
                onClick={() => handlePaymentLinkAction('send')}
                style={{ flex: 1 }}
                leftIcon={<i className="fas fa-paper-plane" />}
              >
                Send to Client
              </Button>
            </div>
          </div>
        </Modal>

        {/* Tip Link Modal */}
        <Modal
          isOpen={showTipLinkModal}
          onClose={() => setShowTipLinkModal(false)}
          title="Tip Link"
          size="full"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            <div>
              <p style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                {booking?.tipLinkUrl 
                  ? 'Copy or send the tip link to the client.'
                  : 'Generate and send a tip link to the client.'}
              </p>
            </div>
            {booking?.tipLinkUrl && (
              <div>
                <Input
                  label="Tip Link"
                  value={booking.tipLinkUrl}
                  readOnly
                  rightIcon={
                    <button
                      onClick={() => handleTipLinkAction('copy')}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        padding: tokens.spacing[2],
                      }}
                    >
                      <i className="fas fa-copy" />
                    </button>
                  }
                />
              </div>
            )}
            <div style={{ display: 'flex', gap: tokens.spacing[2], marginTop: tokens.spacing[4] }}>
              <Button
                variant="secondary"
                onClick={() => handleTipLinkAction('copy')}
                style={{ flex: 1 }}
                leftIcon={<i className="fas fa-copy" />}
              >
                Copy Link
              </Button>
              <Button
                variant="primary"
                onClick={() => handleTipLinkAction('send')}
                style={{ flex: 1 }}
                leftIcon={<i className="fas fa-paper-plane" />}
              >
                Send to Client
              </Button>
            </div>
          </div>
        </Modal>

        {/* More Actions Modal */}
        <Modal
          isOpen={showMoreActionsModal}
          onClose={() => setShowMoreActionsModal(false)}
          title="More Actions"
          size="full"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
            {/* Operational Actions */}
            <div>
              <div style={{ fontSize: tokens.typography.fontSize.xs[0], fontWeight: tokens.typography.fontWeight.semibold, color: tokens.colors.text.secondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: tokens.spacing[2] }}>
                Operational
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2] }}>
                {statusTransitions.length > 0 && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setNewStatus(statusTransitions[0]);
                      setShowStatusModal(true);
                      setShowMoreActionsModal(false);
                    }}
                    leftIcon={<i className="fas fa-check-circle" />}
                  >
                    Change Status to {statusTransitions[0]}
                  </Button>
                )}
                {booking?.sitter ? (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSelectedSitterId(booking.sitter?.id || '');
                        setShowAssignModal(true);
                        setShowMoreActionsModal(false);
                      }}
                      leftIcon={<i className="fas fa-user-edit" />}
                    >
                      Change Sitter
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setShowUnassignModal(true);
                        setShowMoreActionsModal(false);
                      }}
                      leftIcon={<i className="fas fa-user-times" />}
                    >
                      Unassign Sitter
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSelectedSitterId('');
                      setShowAssignModal(true);
                      setShowMoreActionsModal(false);
                    }}
                    leftIcon={<i className="fas fa-user-plus" />}
                  >
                    Assign Sitter
                  </Button>
                )}
              </div>
            </div>

            {/* Financial Actions */}
            <div>
              <div style={{ fontSize: tokens.typography.fontSize.xs[0], fontWeight: tokens.typography.fontWeight.semibold, color: tokens.colors.text.secondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: tokens.spacing[2] }}>
                Financial
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2] }}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    window.open(booking?.stripePaymentLinkUrl || '', '_blank');
                    setShowMoreActionsModal(false);
                  }}
                  disabled={!booking?.stripePaymentLinkUrl}
                  leftIcon={<i className="fas fa-external-link-alt" />}
                >
                  View in Stripe
                </Button>
              </div>
            </div>

            {/* Utility Actions */}
            <div>
              <div style={{ fontSize: tokens.typography.fontSize.xs[0], fontWeight: tokens.typography.fontWeight.semibold, color: tokens.colors.text.secondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: tokens.spacing[2] }}>
                Utility
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2] }}>
                <Button
                  variant="ghost"
                  onClick={handleCopyBookingId}
                  leftIcon={<i className="fas fa-copy" />}
                >
                  Copy Booking ID
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleCopyBookingDetails}
                  leftIcon={<i className="fas fa-copy" />}
                >
                  Copy Booking Details
                </Button>
                {booking?.status !== 'cancelled' && (
                  <Button
                    variant="danger"
                    onClick={handleCancelBooking}
                    leftIcon={<i className="fas fa-times-circle" />}
                  >
                    Cancel Booking
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>

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

      {/* Payment Link Confirmation Modal */}
      <Modal
        isOpen={showPaymentLinkConfirm}
        onClose={() => {
          setShowPaymentLinkConfirm(false);
          setPaymentLinkMessage('');
        }}
        title="Confirm Send Payment Link"
        size="full"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
          <div>
            <div style={{ fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.semibold, color: tokens.colors.text.secondary, marginBottom: tokens.spacing[2] }}>
              Recipient
            </div>
            <div style={{ fontSize: tokens.typography.fontSize.base[0], fontWeight: tokens.typography.fontWeight.medium }}>
              {booking?.firstName} {booking?.lastName}
            </div>
            <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginTop: tokens.spacing[1] }}>
              {booking?.phone}
            </div>
          </div>
          
          <div>
            <div style={{ fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.semibold, color: tokens.colors.text.secondary, marginBottom: tokens.spacing[2] }}>
              Message Preview
            </div>
            <div
              style={{
                padding: tokens.spacing[4],
                backgroundColor: tokens.colors.background.secondary,
                borderRadius: tokens.borderRadius.md,
                border: `1px solid ${tokens.colors.border.default}`,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: tokens.typography.fontSize.sm[0],
                lineHeight: 1.6,
                maxHeight: '200px',
                overflowY: 'auto',
              }}
            >
              {paymentLinkMessage}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2], marginTop: tokens.spacing[4] }}>
            <Button
              variant="primary"
              onClick={handleSendPaymentLink}
              isLoading={saving}
              leftIcon={<i className="fas fa-paper-plane" />}
              style={{ width: '100%' }}
            >
              Send Message
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowPaymentLinkConfirm(false);
                setPaymentLinkMessage('');
              }}
              style={{ width: '100%' }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Tip Link Confirmation Modal */}
      <Modal
        isOpen={showTipLinkConfirm}
        onClose={() => {
          setShowTipLinkConfirm(false);
          setTipLinkMessage('');
        }}
        title="Confirm Send Tip Link"
        size="full"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
          <div>
            <div style={{ fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.semibold, color: tokens.colors.text.secondary, marginBottom: tokens.spacing[2] }}>
              Recipient
            </div>
            <div style={{ fontSize: tokens.typography.fontSize.base[0], fontWeight: tokens.typography.fontWeight.medium }}>
              {booking?.firstName} {booking?.lastName}
            </div>
            <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginTop: tokens.spacing[1] }}>
              {booking?.phone}
            </div>
          </div>
          
          <div>
            <div style={{ fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.semibold, color: tokens.colors.text.secondary, marginBottom: tokens.spacing[2] }}>
              Message Preview
            </div>
            <div
              style={{
                padding: tokens.spacing[4],
                backgroundColor: tokens.colors.background.secondary,
                borderRadius: tokens.borderRadius.md,
                border: `1px solid ${tokens.colors.border.default}`,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: tokens.typography.fontSize.sm[0],
                lineHeight: 1.6,
                maxHeight: '200px',
                overflowY: 'auto',
              }}
            >
              {tipLinkMessage}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2], marginTop: tokens.spacing[4] }}>
            <Button
              variant="primary"
              onClick={handleSendTipLink}
              isLoading={saving}
              leftIcon={<i className="fas fa-paper-plane" />}
              style={{ width: '100%' }}
            >
              Send Message
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowTipLinkConfirm(false);
                setTipLinkMessage('');
              }}
              style={{ width: '100%' }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assign Sitter Modal with Tabs for Direct Assignment and Sitter Pool */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setSelectedSitterId('');
          setAssignMode('direct');
          setSelectedPoolSitterIds(new Set(booking?.sitterPool?.map(p => p.sitter?.id).filter(Boolean) || []));
        }}
        title={booking?.sitter ? "Change Sitter Assignment" : "Assign Sitter"}
        size={isMobile ? 'full' : 'lg'}
      >
        <Tabs
          tabs={[
            { id: 'direct', label: 'Direct Assignment' },
            { id: 'pool', label: 'Sitter Pool' },
          ]}
          activeTab={assignMode}
          onTabChange={(tab) => setAssignMode(tab as 'direct' | 'pool')}
        >
          <TabPanel id="direct">
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
              <Select
                label="Select Sitter"
                value={selectedSitterId}
                onChange={(e) => setSelectedSitterId(e.target.value)}
                options={[
                  { value: '', label: 'Select a sitter...' },
                  ...sitters.map(s => ({
                    value: s.id,
                    label: `${s.firstName} ${s.lastName}${(s as any).currentTier ? ` (${(s as any).currentTier.name})` : ''}`,
                  })),
                ]}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: tokens.spacing[3] }}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedSitterId('');
                    setAssignMode('direct');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={async () => {
                    if (selectedSitterId) {
                      await handleSitterAssign(selectedSitterId);
                      setShowAssignModal(false);
                      setSelectedSitterId('');
                      setAssignMode('direct');
                    }
                  }}
                  disabled={!selectedSitterId || saving}
                  isLoading={saving}
                >
                  {booking?.sitter ? "Update Assignment" : "Assign Sitter"}
                </Button>
              </div>
            </div>
          </TabPanel>
          
          <TabPanel id="pool">
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
              <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[2] }}>
                Select one or more sitters for the pool. Multiple sitters can be assigned to this booking.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2], maxHeight: '400px', overflowY: 'auto' }}>
                {sitters.map(sitterOption => {
                  const isSelected = selectedPoolSitterIds.has(sitterOption.id);
                  return (
                    <label
                      key={sitterOption.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: tokens.spacing[3],
                        padding: tokens.spacing[3],
                        cursor: 'pointer',
                        borderRadius: tokens.borderRadius.md,
                        border: `1px solid ${tokens.colors.border.default}`,
                        backgroundColor: isSelected ? tokens.colors.background.secondary : tokens.colors.background.primary,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleTogglePoolSitter(sitterOption.id)}
                        style={{
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer',
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
                          {sitterOption.firstName} {sitterOption.lastName}
                        </div>
                        {(sitterOption as any).currentTier && (
                          <div style={{ marginTop: tokens.spacing[1] }}>
                            <SitterTierBadge tier={(sitterOption as any).currentTier} />
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: tokens.spacing[3] }}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowAssignModal(false);
                    setAssignMode('direct');
                    setSelectedPoolSitterIds(new Set(booking?.sitterPool?.map(p => p.sitter?.id).filter(Boolean) || []));
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSavePool}
                  disabled={saving}
                  isLoading={saving}
                >
                  Save Pool
                </Button>
              </div>
            </div>
          </TabPanel>
        </Tabs>
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

