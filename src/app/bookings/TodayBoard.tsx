/**
 * Today Board Component - Enterprise Rebuild
 * 
 * Complete rebuild using design system and components.
 * Zero legacy styling - all through components and tokens.
 */

'use client';

import { 
  assignSitterToBooking, 
  sendPaymentLinkToBooking, 
  resendConfirmation, 
  markBookingComplete 
} from '@/lib/today-board-helpers';
import {
  Card,
  Button,
  Badge,
  Select,
  StatCard,
  useToast,
} from '@/components/ui';
import { tokens } from '@/lib/design-tokens';
import { CalendarCheck, Users, DollarSign, AlertTriangle } from 'lucide-react';

interface Booking {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  service: string;
  startAt: Date | string;
  endAt: Date | string;
  status: string;
  paymentStatus: string;
  totalPrice: number;
  sitterId?: string | null;
  sitter?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  pets: Array<{ species: string; name?: string }>;
  notes?: string | null;
}

interface TodayBoardProps {
  todayBoardData: {
    today: Booking[];
    unassigned: Booking[];
    unpaid: Booking[];
    atRisk: Booking[];
    stats: {
      todayCount: number;
      unassignedCount: number;
      unpaidCount: number;
      atRiskCount: number;
    };
  };
  sitters: Array<{ id: string; firstName: string; lastName: string }>;
  onRefresh: () => void;
  onBookingClick: (booking: Booking) => void;
}

export default function TodayBoard({ 
  todayBoardData, 
  sitters, 
  onRefresh,
  onBookingClick 
}: TodayBoardProps) {
  const { showToast } = useToast();
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString();
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatPets = (pets: Array<{ species: string }>) => {
    const counts: Record<string, number> = {};
    pets.forEach(pet => {
      counts[pet.species] = (counts[pet.species] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([species, count]) => `${count} ${species}${count > 1 ? 's' : ''}`)
      .join(', ');
  };

  const handleQuickAction = async (
    action: 'assign' | 'payment' | 'resend' | 'complete',
    booking: Booking,
    sitterId?: string
  ) => {
    try {
      let result;
      switch (action) {
        case 'assign':
          if (!sitterId) {
            showToast({ variant: 'warning', message: 'Please select a sitter first' });
            return;
          }
          result = await assignSitterToBooking(booking.id, sitterId);
          break;
        case 'payment':
          result = await sendPaymentLinkToBooking(booking.id);
          if (result.success) {
            showToast({ variant: 'success', message: 'Payment link sent to client.' });
          }
          break;
        case 'resend':
          result = await resendConfirmation(booking.id);
          break;
        case 'complete':
          result = await markBookingComplete(booking.id);
          break;
      }

      if (result?.success) {
        onRefresh();
      } else {
        showToast({ variant: 'error', message: result?.error || 'Action failed' });
      }
    } catch (error) {
      console.error('Quick action failed:', error);
      showToast({ variant: 'error', message: 'Action failed. Please try again.' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="success">confirmed</Badge>;
      case 'pending':
        return <Badge variant="warning">pending</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const renderBookingCard = (booking: Booking, section: string) => {
    const isUnassigned = !booking.sitterId;
    const isUnpaid = booking.paymentStatus === 'unpaid';
    const isAtRisk = section === 'atRisk';

    const borderColor = isAtRisk 
      ? tokens.colors.error[300]
      : isUnpaid 
      ? tokens.colors.warning[300]
      : isUnassigned 
      ? tokens.colors.warning[400]
      : tokens.colors.border.default;

    const backgroundColor = isAtRisk 
      ? tokens.colors.error[50]
      : isUnpaid 
      ? tokens.colors.warning[50]
      : isUnassigned 
      ? tokens.colors.warning[50]
      : tokens.colors.background.primary;

    return (
      <Card
        key={booking.id}
        style={{
          borderColor,
          backgroundColor,
          marginBottom: tokens.spacing[3],
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: tokens.spacing[3] }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], marginBottom: tokens.spacing[2], flexWrap: 'wrap' }}>
              <div
                style={{
                  fontWeight: tokens.typography.fontWeight.bold,
                  fontSize: tokens.typography.fontSize.lg[0],
                  color: tokens.colors.text.primary,
                }}
              >
                {booking.firstName} {booking.lastName}
              </div>
              {getStatusBadge(booking.status)}
              {isUnpaid && (
                <Badge variant="error">Unpaid</Badge>
              )}
              {isUnassigned && (
                <Badge variant="warning">Unassigned</Badge>
              )}
            </div>
            <div
              style={{
                fontSize: tokens.typography.fontSize.sm[0],
                color: tokens.colors.text.secondary,
                display: 'flex',
                flexDirection: 'column',
                gap: tokens.spacing[1],
              }}
            >
              <div><strong>Service:</strong> {booking.service}</div>
              <div><strong>Date:</strong> {formatDate(booking.startAt)} at {formatTime(booking.startAt)}</div>
              <div><strong>Pets:</strong> {formatPets(booking.pets)}</div>
              <div><strong>Total:</strong> ${booking.totalPrice.toFixed(2)}</div>
              {booking.sitter && (
                <div><strong>Sitter:</strong> {booking.sitter.firstName} {booking.sitter.lastName}</div>
              )}
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onBookingClick(booking)}
            style={{ marginLeft: tokens.spacing[4] }}
          >
            Details
          </Button>
        </div>

        {/* Quick Action Buttons */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: tokens.spacing[2],
            paddingTop: tokens.spacing[3],
            borderTop: `1px solid ${tokens.colors.border.default}`,
          }}
        >
          {isUnassigned && sitters.length > 0 && (
            <Select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  handleQuickAction('assign', booking, e.target.value);
                }
              }}
              options={[
                { value: '', label: 'Assign Sitter...' },
                ...sitters.map(sitter => ({
                  value: sitter.id,
                  label: `${sitter.firstName} ${sitter.lastName}`,
                })),
              ]}
              style={{ minWidth: '150px' }}
            />
          )}
          {isUnpaid && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleQuickAction('payment', booking)}
            >
              Send Payment Link
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleQuickAction('resend', booking)}
          >
            Resend Confirmation
          </Button>
          {booking.status !== 'completed' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleQuickAction('complete', booking)}
            >
              Mark Complete
            </Button>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[6] }}>
      {/* Stats Summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: tokens.spacing[4],
        }}
      >
        <StatCard
          label="Today's Bookings"
          value={todayBoardData.stats.todayCount}
          icon={<CalendarCheck className="w-4 h-4" />}
        />
        <StatCard
          label="Unassigned"
          value={todayBoardData.stats.unassignedCount}
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          label="Unpaid"
          value={todayBoardData.stats.unpaidCount}
          icon={<DollarSign className="w-4 h-4" />}
        />
        <StatCard
          label="At Risk"
          value={todayBoardData.stats.atRiskCount}
          icon={<AlertTriangle className="w-4 h-4" />}
        />
      </div>

      {/* Today's Bookings */}
      {todayBoardData.today.length > 0 && (
        <Card>
          <div
            style={{
              fontWeight: tokens.typography.fontWeight.bold,
              fontSize: tokens.typography.fontSize.lg[0],
              color: tokens.colors.text.primary,
              marginBottom: tokens.spacing[4],
            }}
          >
            Today's Bookings ({todayBoardData.today.length})
          </div>
          {todayBoardData.today.map(booking => renderBookingCard(booking, 'today'))}
        </Card>
      )}

      {/* Unassigned Bookings */}
      {todayBoardData.unassigned.length > 0 && (
        <Card style={{ borderColor: tokens.colors.warning[300] }}>
          <div
            style={{
              fontWeight: tokens.typography.fontWeight.bold,
              fontSize: tokens.typography.fontSize.lg[0],
              color: tokens.colors.warning[700],
              marginBottom: tokens.spacing[4],
            }}
          >
            Unassigned Bookings ({todayBoardData.unassigned.length})
          </div>
          {todayBoardData.unassigned.map(booking => renderBookingCard(booking, 'unassigned'))}
        </Card>
      )}

      {/* Unpaid Bookings */}
      {todayBoardData.unpaid.length > 0 && (
        <Card style={{ borderColor: tokens.colors.warning[300] }}>
          <div
            style={{
              fontWeight: tokens.typography.fontWeight.bold,
              fontSize: tokens.typography.fontSize.lg[0],
              color: tokens.colors.warning[700],
              marginBottom: tokens.spacing[4],
            }}
          >
            Unpaid Bookings ({todayBoardData.unpaid.length})
          </div>
          {todayBoardData.unpaid.map(booking => renderBookingCard(booking, 'unpaid'))}
        </Card>
      )}

      {/* At Risk Bookings */}
      {todayBoardData.atRisk.length > 0 && (
        <Card style={{ borderColor: tokens.colors.error[300] }}>
          <div
            style={{
              fontWeight: tokens.typography.fontWeight.bold,
              fontSize: tokens.typography.fontSize.lg[0],
              color: tokens.colors.error[700],
              marginBottom: tokens.spacing[4],
            }}
          >
            At Risk Bookings ({todayBoardData.atRisk.length})
          </div>
          {todayBoardData.atRisk.map(booking => renderBookingCard(booking, 'atRisk'))}
        </Card>
      )}

      {/* Empty State */}
      {todayBoardData.today.length === 0 && 
       todayBoardData.unassigned.length === 0 && 
       todayBoardData.unpaid.length === 0 && 
       todayBoardData.atRisk.length === 0 && (
        <Card>
          <div style={{ textAlign: 'center', padding: tokens.spacing[8] }}>
            <CalendarCheck className="w-12 h-12 text-neutral-300 mb-4" />
            <div style={{ color: tokens.colors.text.secondary }}>
              No bookings for today. Great job!
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
