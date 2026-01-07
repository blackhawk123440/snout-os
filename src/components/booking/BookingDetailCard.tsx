/**
 * BookingDetailCard Component
 * 
 * Unified booking detail card component used across Calendar modal and Bookings page.
 * Clean, professional layout with consistent spacing and typography.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Card, Badge } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';

interface Pet {
  species: string;
  name?: string;
  breed?: string;
  age?: number;
}

interface TimeSlot {
  startAt: Date | string;
  endAt: Date | string;
  duration?: number;
}

interface Booking {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  service: string;
  startAt: Date | string;
  endAt: Date | string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  totalPrice: number;
  pets: Pet[];
  sitter?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  timeSlots?: TimeSlot[];
}

interface BookingDetailCardProps {
  booking: Booking;
  variant?: 'compact' | 'full';
  showDate?: boolean; // Show date-specific time slots (for Calendar modal)
  dateStr?: string; // Filter time slots for specific date
  onClick?: () => void;
}

const getStatusBadgeVariant = (status: string): 'default' | 'success' | 'warning' | 'error' => {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'confirmed':
      return 'success';
    case 'completed':
      return 'default';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
};

const formatTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatPetsByQuantity = (pets: Pet[]): string => {
  const counts: Record<string, number> = {};
  pets.forEach((pet) => {
    counts[pet.species] = (counts[pet.species] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([species, count]) => `${count} ${species}${count > 1 ? 's' : ''}`)
    .join(', ');
};

export const BookingDetailCard: React.FC<BookingDetailCardProps> = ({
  booking,
  variant = 'full',
  showDate = false,
  dateStr,
  onClick,
}) => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const isCompact = variant === 'compact' || isMobile;

  // Filter time slots for specific date if provided
  const dayTimeSlots = showDate && dateStr && booking.timeSlots && booking.timeSlots.length > 0
    ? booking.timeSlots
        .filter((slot) => {
          const slotDate = new Date(slot.startAt).toISOString().split('T')[0];
          return slotDate === dateStr;
        })
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    : [];

  const cardContent = (
    <Card
      style={{
        cursor: 'pointer',
        transition: `transform ${tokens.transitions.duration.DEFAULT}, box-shadow ${tokens.transitions.duration.DEFAULT}`,
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = tokens.shadows.md;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = tokens.shadows.sm;
      }}
    >
      {/* Header: Name + Status Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: isCompact ? tokens.spacing[3] : tokens.spacing[4],
          gap: tokens.spacing[2],
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              fontSize: isCompact 
                ? tokens.typography.fontSize.base[0]
                : tokens.typography.fontSize.xl[0],
              fontWeight: tokens.typography.fontWeight.bold,
              color: tokens.colors.text.primary,
              margin: 0,
              marginBottom: tokens.spacing[1],
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {booking.firstName} {booking.lastName}
          </h3>
          <p
            style={{
              fontSize: isCompact
                ? tokens.typography.fontSize.sm[0]
                : tokens.typography.fontSize.base[0],
              color: tokens.colors.text.secondary,
              margin: 0,
            }}
          >
            {booking.service}
          </p>
        </div>
        <Badge variant={getStatusBadgeVariant(booking.status)} style={{ flexShrink: 0 }}>
          {booking.status}
        </Badge>
      </div>

      {/* Details Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isCompact 
            ? '1fr'
            : 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: isCompact ? tokens.spacing[3] : tokens.spacing[4],
          marginBottom: isCompact ? tokens.spacing[3] : tokens.spacing[4],
        }}
      >
        {/* Time Slots or Time */}
        {dayTimeSlots.length > 0 ? (
          <div>
            <div
              style={{
                fontSize: tokens.typography.fontSize.sm[0],
                color: tokens.colors.text.secondary,
                marginBottom: tokens.spacing[1],
                fontWeight: tokens.typography.fontWeight.medium,
              }}
            >
              Time Slots
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: tokens.spacing[1],
              }}
            >
              {dayTimeSlots.map((slot, idx) => (
                <div
                  key={idx}
                  style={{
                    fontSize: tokens.typography.fontSize.base[0],
                    fontWeight: tokens.typography.fontWeight.medium,
                    color: tokens.colors.text.primary,
                  }}
                >
                  {formatTime(slot.startAt)} - {formatTime(slot.endAt)}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div
              style={{
                fontSize: tokens.typography.fontSize.sm[0],
                color: tokens.colors.text.secondary,
                marginBottom: tokens.spacing[1],
                fontWeight: tokens.typography.fontWeight.medium,
              }}
            >
              Time
            </div>
            <div
              style={{
                fontSize: tokens.typography.fontSize.base[0],
                fontWeight: tokens.typography.fontWeight.medium,
                color: tokens.colors.text.primary,
              }}
            >
              {formatTime(booking.startAt)} - {formatTime(booking.endAt)}
            </div>
          </div>
        )}

        {/* Assigned Sitter */}
        {booking.sitter ? (
          <div>
            <div
              style={{
                fontSize: tokens.typography.fontSize.sm[0],
                color: tokens.colors.text.secondary,
                marginBottom: tokens.spacing[1],
                fontWeight: tokens.typography.fontWeight.medium,
              }}
            >
              Assigned Sitter
            </div>
            <div
              style={{
                fontSize: tokens.typography.fontSize.base[0],
                fontWeight: tokens.typography.fontWeight.semibold,
                color: tokens.colors.text.primary,
              }}
            >
              {booking.sitter.firstName} {booking.sitter.lastName}
            </div>
          </div>
        ) : (
          <div>
            <div
              style={{
                fontSize: tokens.typography.fontSize.sm[0],
                color: tokens.colors.text.secondary,
                marginBottom: tokens.spacing[1],
                fontWeight: tokens.typography.fontWeight.medium,
              }}
            >
              Assigned Sitter
            </div>
            <div
              style={{
                fontSize: tokens.typography.fontSize.base[0],
                color: tokens.colors.text.tertiary,
              }}
            >
              Not Assigned
            </div>
          </div>
        )}

        {/* Pets */}
        <div>
          <div
            style={{
              fontSize: tokens.typography.fontSize.sm[0],
              color: tokens.colors.text.secondary,
              marginBottom: tokens.spacing[1],
              fontWeight: tokens.typography.fontWeight.medium,
            }}
          >
            Pets
          </div>
          <div
            style={{
              fontSize: tokens.typography.fontSize.base[0],
              fontWeight: tokens.typography.fontWeight.medium,
              color: tokens.colors.text.primary,
            }}
          >
            {formatPetsByQuantity(booking.pets)}
          </div>
        </div>

        {/* Total Price */}
        <div>
          <div
            style={{
              fontSize: tokens.typography.fontSize.sm[0],
              color: tokens.colors.text.secondary,
              marginBottom: tokens.spacing[1],
              fontWeight: tokens.typography.fontWeight.medium,
            }}
          >
            Total Price
          </div>
          <div
            style={{
              fontSize: tokens.typography.fontSize.base[0],
              fontWeight: tokens.typography.fontWeight.bold,
              color: tokens.colors.text.primary,
            }}
          >
            ${booking.totalPrice.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Phone and Email (if available) */}
      {(booking.email || booking.phone) && (
        <div
          style={{
            paddingTop: isCompact ? tokens.spacing[3] : tokens.spacing[4],
            borderTop: `1px solid ${tokens.colors.border.default}`,
            display: 'grid',
            gridTemplateColumns: isCompact 
              ? '1fr'
              : 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: tokens.spacing[3],
            fontSize: tokens.typography.fontSize.sm[0],
          }}
        >
          {booking.phone && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: tokens.spacing[2],
                minHeight: '44px', // Touch target
              }}
            >
              <i className="fas fa-phone" style={{ width: '16px', color: tokens.colors.text.secondary }} />
              <a 
                href={`tel:${booking.phone}`} 
                style={{ 
                  color: tokens.colors.primary.DEFAULT,
                  textDecoration: 'none',
                  flex: 1,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {booking.phone}
              </a>
            </div>
          )}
          {booking.email && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: tokens.spacing[2],
                minHeight: '44px', // Touch target
              }}
            >
              <i className="fas fa-envelope" style={{ width: '16px', color: tokens.colors.text.secondary }} />
              <a 
                href={`mailto:${booking.email}`} 
                style={{ 
                  color: tokens.colors.primary.DEFAULT,
                  textDecoration: 'none',
                  flex: 1,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {booking.email}
              </a>
            </div>
          )}
        </div>
      )}
    </Card>
  );

  // Wrap in Link if no custom onClick handler
  if (onClick) {
    return cardContent;
  }

  return (
    <Link href={`/bookings/${booking.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      {cardContent}
    </Link>
  );
};

