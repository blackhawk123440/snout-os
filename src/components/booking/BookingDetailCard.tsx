/**
 * BookingDetailCard Component
 *
 * Unified booking detail card component used across Calendar modal and Bookings page.
 * Compact variant is intentionally dense on desktop (2-column) to keep cards sleek.
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
  showDate?: boolean;
  dateStr?: string;
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
  const isCompactVariant = variant === 'compact';
  const isCompactDesktop = isCompactVariant && !isMobile;
  const showContact = !isCompactDesktop; // hide contact on compact desktop to reduce height

  const pad = isCompactVariant ? (isMobile ? tokens.spacing[3] : tokens.spacing[2]) : tokens.spacing[4];
  const gapY = isCompactDesktop ? tokens.spacing[2] : isMobile ? tokens.spacing[3] : tokens.spacing[4];

  const dayTimeSlots =
    showDate && dateStr && booking.timeSlots && booking.timeSlots.length > 0
      ? booking.timeSlots
          .filter((slot) => new Date(slot.startAt).toISOString().split('T')[0] === dateStr)
          .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      : [];

  const hoverEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile) return;
    e.currentTarget.style.transform = isCompactDesktop ? 'translateY(-1px)' : 'translateY(-2px)';
    e.currentTarget.style.boxShadow = isCompactDesktop ? tokens.shadows.sm : tokens.shadows.md;
  };

  const hoverLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile) return;
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = tokens.shadows.sm;
  };

  const content = isCompactVariant ? (
    <Card
      padding={false}
      onClick={onClick}
      onMouseEnter={hoverEnter}
      onMouseLeave={hoverLeave}
      style={{
        cursor: 'pointer',
        transition: `transform ${tokens.transitions.duration.DEFAULT}, box-shadow ${tokens.transitions.duration.DEFAULT}`,
      }}
    >
      <div style={{ padding: pad }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: tokens.spacing[2],
            marginBottom: gapY,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: isCompactDesktop ? tokens.typography.fontSize.sm[0] : tokens.typography.fontSize.base[0],
                fontWeight: tokens.typography.fontWeight.semibold,
                color: tokens.colors.text.primary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {booking.firstName} {booking.lastName}
            </div>
            <div
              style={{
                fontSize: isCompactDesktop ? tokens.typography.fontSize.xs[0] : tokens.typography.fontSize.sm[0],
                color: tokens.colors.text.secondary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {booking.service}
            </div>
          </div>
          <Badge
            variant={getStatusBadgeVariant(booking.status)}
            style={{
              flexShrink: 0,
              fontSize: tokens.typography.fontSize.xs[0],
              padding: `${tokens.spacing[1]} ${tokens.spacing[2]}`,
            }}
          >
            {booking.status}
          </Badge>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isCompactDesktop ? 'repeat(2, minmax(0, 1fr))' : '1fr',
            gap: isCompactDesktop ? tokens.spacing[2] : tokens.spacing[3],
            marginBottom: showContact ? gapY : 0,
          }}
        >
          <div>
            <div
              style={{
                fontSize: tokens.typography.fontSize.xs[0],
                color: tokens.colors.text.secondary,
                marginBottom: tokens.spacing[1],
                fontWeight: tokens.typography.fontWeight.medium,
              }}
            >
              Time
            </div>
            <div
              style={{
                fontSize: tokens.typography.fontSize.sm[0],
                fontWeight: tokens.typography.fontWeight.medium,
                color: tokens.colors.text.primary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {dayTimeSlots.length > 0
                ? `${formatTime(dayTimeSlots[0]!.startAt)} - ${formatTime(dayTimeSlots[0]!.endAt)}${
                    dayTimeSlots.length > 1 ? ` (+${dayTimeSlots.length - 1})` : ''
                  }`
                : `${formatTime(booking.startAt)} - ${formatTime(booking.endAt)}`}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: tokens.typography.fontSize.xs[0],
                color: tokens.colors.text.secondary,
                marginBottom: tokens.spacing[1],
                fontWeight: tokens.typography.fontWeight.medium,
              }}
            >
              Sitter
            </div>
            <div
              style={{
                fontSize: tokens.typography.fontSize.sm[0],
                fontWeight: booking.sitter ? tokens.typography.fontWeight.semibold : tokens.typography.fontWeight.normal,
                color: booking.sitter ? tokens.colors.text.primary : tokens.colors.text.tertiary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {booking.sitter ? `${booking.sitter.firstName} ${booking.sitter.lastName}` : 'Unassigned'}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: tokens.typography.fontSize.xs[0],
                color: tokens.colors.text.secondary,
                marginBottom: tokens.spacing[1],
                fontWeight: tokens.typography.fontWeight.medium,
              }}
            >
              Pets
            </div>
            <div
              style={{
                fontSize: tokens.typography.fontSize.sm[0],
                fontWeight: tokens.typography.fontWeight.medium,
                color: tokens.colors.text.primary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {formatPetsByQuantity(booking.pets)}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: tokens.typography.fontSize.xs[0],
                color: tokens.colors.text.secondary,
                marginBottom: tokens.spacing[1],
                fontWeight: tokens.typography.fontWeight.medium,
              }}
            >
              Total
            </div>
            <div
              style={{
                fontSize: tokens.typography.fontSize.sm[0],
                fontWeight: tokens.typography.fontWeight.bold,
                color: tokens.colors.text.primary,
              }}
            >
              ${booking.totalPrice.toFixed(2)}
            </div>
          </div>
        </div>

        {showContact && (booking.phone || booking.email) && (
          <div
            style={{
              paddingTop: gapY,
              borderTop: `1px solid ${tokens.colors.border.default}`,
              display: 'flex',
              flexDirection: 'column',
              gap: tokens.spacing[2],
            }}
          >
            {booking.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], minHeight: '44px' }}>
                <i className="fas fa-phone" style={{ width: '16px', color: tokens.colors.text.secondary }} />
                <a
                  href={`tel:${booking.phone}`}
                  style={{ color: tokens.colors.primary.DEFAULT, textDecoration: 'none', flex: 1 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {booking.phone}
                </a>
              </div>
            )}
            {booking.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], minHeight: '44px' }}>
                <i className="fas fa-envelope" style={{ width: '16px', color: tokens.colors.text.secondary }} />
                <a
                  href={`mailto:${booking.email}`}
                  style={{ color: tokens.colors.primary.DEFAULT, textDecoration: 'none', flex: 1 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {booking.email}
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  ) : (
    <Card
      onClick={onClick}
      onMouseEnter={hoverEnter}
      onMouseLeave={hoverLeave}
      style={{
        cursor: 'pointer',
        transition: `transform ${tokens.transitions.duration.DEFAULT}, box-shadow ${tokens.transitions.duration.DEFAULT}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: gapY, gap: tokens.spacing[2] }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              fontSize: tokens.typography.fontSize.xl[0],
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
          <p style={{ fontSize: tokens.typography.fontSize.base[0], color: tokens.colors.text.secondary, margin: 0 }}>{booking.service}</p>
        </div>
        <Badge variant={getStatusBadgeVariant(booking.status)} style={{ flexShrink: 0 }}>
          {booking.status}
        </Badge>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: gapY, marginBottom: gapY }}>
        <div>
          <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1], fontWeight: tokens.typography.fontWeight.medium }}>
            Time
          </div>
          <div style={{ fontSize: tokens.typography.fontSize.base[0], fontWeight: tokens.typography.fontWeight.medium, color: tokens.colors.text.primary }}>
            {dayTimeSlots.length > 0 ? `${formatTime(dayTimeSlots[0]!.startAt)} - ${formatTime(dayTimeSlots[0]!.endAt)}` : `${formatTime(booking.startAt)} - ${formatTime(booking.endAt)}`}
          </div>
        </div>
        <div>
          <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1], fontWeight: tokens.typography.fontWeight.medium }}>
            Assigned Sitter
          </div>
          <div style={{ fontSize: tokens.typography.fontSize.base[0], fontWeight: booking.sitter ? tokens.typography.fontWeight.semibold : tokens.typography.fontWeight.normal, color: booking.sitter ? tokens.colors.text.primary : tokens.colors.text.tertiary }}>
            {booking.sitter ? `${booking.sitter.firstName} ${booking.sitter.lastName}` : 'Not Assigned'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1], fontWeight: tokens.typography.fontWeight.medium }}>
            Pets
          </div>
          <div style={{ fontSize: tokens.typography.fontSize.base[0], fontWeight: tokens.typography.fontWeight.medium, color: tokens.colors.text.primary }}>
            {formatPetsByQuantity(booking.pets)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1], fontWeight: tokens.typography.fontWeight.medium }}>
            Total Price
          </div>
          <div style={{ fontSize: tokens.typography.fontSize.base[0], fontWeight: tokens.typography.fontWeight.bold, color: tokens.colors.text.primary }}>
            ${booking.totalPrice.toFixed(2)}
          </div>
        </div>
      </div>

      {(booking.email || booking.phone) && (
        <div style={{ paddingTop: gapY, borderTop: `1px solid ${tokens.colors.border.default}`, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: tokens.spacing[3], fontSize: tokens.typography.fontSize.sm[0] }}>
          {booking.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], minHeight: '44px' }}>
              <i className="fas fa-phone" style={{ width: '16px', color: tokens.colors.text.secondary }} />
              <a href={`tel:${booking.phone}`} style={{ color: tokens.colors.primary.DEFAULT, textDecoration: 'none', flex: 1 }} onClick={(e) => e.stopPropagation()}>
                {booking.phone}
              </a>
            </div>
          )}
          {booking.email && (
            <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], minHeight: '44px' }}>
              <i className="fas fa-envelope" style={{ width: '16px', color: tokens.colors.text.secondary }} />
              <a href={`mailto:${booking.email}`} style={{ color: tokens.colors.primary.DEFAULT, textDecoration: 'none', flex: 1 }} onClick={(e) => e.stopPropagation()}>
                {booking.email}
              </a>
            </div>
          )}
        </div>
      )}
    </Card>
  );

  if (onClick) return content;
  return (
    <Link href={`/bookings/${booking.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      {content}
    </Link>
  );
};


