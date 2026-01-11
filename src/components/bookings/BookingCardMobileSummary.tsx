/**
 * BookingCardMobileSummary Component
 * 
 * Mobile booking card with exact field order and inline controls.
 * Part B requirement: Exact order - Service+Status, Client name, Schedule, Pets+Total, Address, Inline controls
 */

'use client';

import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { tokens } from '@/lib/design-tokens';
import { BookingScheduleDisplay } from '@/components/booking/BookingScheduleDisplay';
import { BookingStatusInlineControl } from './BookingStatusInlineControl';
import { SitterPoolPicker } from './SitterPoolPicker';
import { SitterInfo } from '@/components/sitter';
import { formatPetsByQuantity } from '@/lib/booking-utils';

export interface BookingCardMobileSummaryProps {
  booking: {
    id: string;
    service: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    firstName: string;
    lastName: string;
    startAt: Date | string;
    endAt: Date | string;
    timeSlots?: Array<{
      id?: string;
      startAt: Date | string;
      endAt: Date | string;
      duration?: number;
    }>;
    pets: Array<{ species: string }>;
    totalPrice: number;
    address?: string | null;
    sitterPool?: Array<{
      sitter: SitterInfo;
    }>;
  };
  onOpen?: () => void;
  onStatusChange: (bookingId: string, newStatus: string) => Promise<void>;
  onSitterPoolChange: (bookingId: string, sitterIds: string[]) => Promise<void>;
  availableSitters: SitterInfo[];
  showSelection?: boolean;
  selected?: boolean;
  onToggleSelected?: () => void;
}

const getStatusVariant = (status: string): 'default' | 'success' | 'warning' | 'error' | 'neutral' => {
  switch (status) {
    case 'confirmed':
      return 'success';
    case 'pending':
      return 'warning';
    case 'completed':
      return 'default';
    case 'cancelled':
      return 'error';
    default:
      return 'neutral';
  }
};

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

export const BookingCardMobileSummary: React.FC<BookingCardMobileSummaryProps> = ({
  booking,
  onOpen,
  onStatusChange,
  onSitterPoolChange,
  availableSitters,
  showSelection = false,
  selected = false,
  onToggleSelected,
}) => {
  const sitterPool = booking.sitterPool || [];
  const sitterPoolSitters = sitterPool.map(p => p.sitter);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't open if clicking checkbox or inline controls
    const target = e.target as HTMLElement;
    if (target.closest('[data-checkbox]') || target.closest('[data-inline-control]')) {
      e.stopPropagation();
      return;
    }
    onOpen?.();
  };

  return (
    <div
      onClick={handleCardClick}
      style={{
        width: '100%',
        padding: tokens.spacing[4],
        backgroundColor: tokens.colors.background.primary,
        border: `1px solid ${tokens.colors.border.default}`,
        borderRadius: tokens.borderRadius.lg,
        cursor: onOpen ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacing[4],
        position: 'relative',
      }}
    >
      {/* Selection Checkbox */}
      {showSelection && onToggleSelected && (
        <div
          data-checkbox
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelected();
          }}
          style={{
            position: 'absolute',
            top: tokens.spacing[3],
            left: tokens.spacing[3],
            zIndex: 10,
          }}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelected();
            }}
            style={{
              width: '20px',
              height: '20px',
              cursor: 'pointer',
              accentColor: tokens.colors.brand.pink,
            }}
          />
        </div>
      )}

      {/* Line 1: Service (left) + Status badge (right) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: tokens.spacing[2],
          paddingRight: showSelection ? tokens.spacing[6] : 0,
        }}
      >
        <div
          style={{
            fontSize: tokens.typography.fontSize.base[0], // Reduced from lg to base (secondary)
            fontWeight: tokens.typography.fontWeight.medium,
            color: tokens.colors.text.secondary, // Lighter color
            lineHeight: 1.4,
          }}
        >
          {booking.service}
        </div>
        <Badge variant={getStatusVariant(booking.status)}>{booking.status}</Badge>
      </div>

      {/* Line 2: Client name (dominant anchor) */}
      <div
        style={{
          fontSize: tokens.typography.fontSize['2xl'][0], // Larger, dominant
          fontWeight: tokens.typography.fontWeight.bold,
          color: tokens.colors.text.primary,
          lineHeight: 1.3,
        }}
      >
        {booking.firstName} {booking.lastName}
      </div>

      {/* Line 3: Date and time summary (secondary) */}
      <div
        style={{
          fontSize: tokens.typography.fontSize.sm[0], // Reduced from base to sm
          color: tokens.colors.text.secondary,
          lineHeight: 1.4,
        }}
      >
        <BookingScheduleDisplay
          service={booking.service}
          startAt={booking.startAt}
          endAt={booking.endAt}
          timeSlots={booking.timeSlots}
          compact={true}
        />
      </div>

      {/* Compact info stack: Pets count, Total, Address, Sitter pool summary */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: tokens.spacing[2],
        }}
      >
        {/* Pets count + Total on same line */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: tokens.spacing[2],
          }}
        >
          <div
            style={{
              fontSize: tokens.typography.fontSize.base[0],
              color: tokens.colors.text.secondary,
            }}
          >
            {formatPetsByQuantity(booking.pets)}
          </div>
          <div
            style={{
              fontSize: tokens.typography.fontSize.lg[0],
              fontWeight: tokens.typography.fontWeight.bold,
              color: tokens.colors.text.primary,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatCurrency(booking.totalPrice)}
          </div>
        </div>

        {/* Address */}
        {booking.address && (
          <div
            style={{
              fontSize: tokens.typography.fontSize.sm[0],
              color: tokens.colors.text.secondary,
              wordBreak: 'break-word',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              lineHeight: 1.4,
            }}
          >
            {booking.address}
          </div>
        )}

        {/* Sitter pool summary */}
        {sitterPoolSitters.length > 0 && (
          <div
            style={{
              fontSize: tokens.typography.fontSize.sm[0],
              color: tokens.colors.text.secondary,
            }}
          >
            Pool: {sitterPoolSitters.map(s => s.firstName).join(', ')}
            {sitterPoolSitters.length > 2 && ` +${sitterPoolSitters.length - 2}`}
          </div>
        )}
      </div>

      {/* Inline controls: Status control + Sitter pool control */}
      <div
        data-inline-control
        style={{
          display: 'flex',
          gap: tokens.spacing[2],
          marginTop: tokens.spacing[2],
          flexWrap: 'wrap',
        }}
      >
        <BookingStatusInlineControl
          bookingId={booking.id}
          currentStatus={booking.status}
          onStatusChange={onStatusChange}
          compact={true}
        />
        <SitterPoolPicker
          bookingId={booking.id}
          currentPool={sitterPoolSitters}
          availableSitters={availableSitters}
          onPoolChange={onSitterPoolChange}
          compact={true}
        />
      </div>
    </div>
  );
};
