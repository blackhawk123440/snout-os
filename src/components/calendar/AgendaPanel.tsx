/**
 * Agenda Panel Component
 * 
 * Desktop side panel that displays bookings for selected date
 */

'use client';

import React from 'react';
import { tokens } from '@/lib/design-tokens';
import { Card, SectionHeader, Button, Badge } from '@/components/ui';
import { BookingScheduleDisplay } from '@/components/booking';
import { SitterAssignmentDisplay } from '@/components/sitter';

export interface AgendaBooking {
  id: string;
  firstName: string;
  lastName: string;
  service: string;
  startAt: Date | string;
  endAt: Date | string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  totalPrice: number;
  sitter?: {
    id: string;
    firstName: string;
    lastName: string;
    currentTier?: {
      id: string;
      name: string;
      priorityLevel?: number;
      color?: string;
    } | null;
  } | null;
  timeSlots?: Array<{
    id: string;
    startAt: Date | string;
    endAt: Date | string;
    duration?: number;
  }>;
}

export interface AgendaPanelProps {
  selectedDate: Date | null;
  bookings: AgendaBooking[];
  onBookingClick: (booking: AgendaBooking) => void;
  formatTime?: (date: Date | string) => string;
}

const getStatusBadgeVariant = (status: string): 'default' | 'info' | 'success' | 'warning' | 'error' => {
  switch (status) {
    case 'confirmed': return 'success';
    case 'pending': return 'warning';
    case 'completed': return 'info';
    case 'cancelled': return 'error';
    default: return 'default';
  }
};

export const AgendaPanel: React.FC<AgendaPanelProps> = ({
  selectedDate,
  bookings,
  onBookingClick,
  formatTime = (date) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
}) => {
  if (!selectedDate) {
    return (
      <Card style={{ height: '100%' }}>
        <SectionHeader title="Agenda" />
        <div style={{ padding: tokens.spacing[6], textAlign: 'center', color: tokens.colors.text.secondary }}>
          Select a date to view bookings
        </div>
      </Card>
    );
  }

  const dateKey = selectedDate.toISOString().split('T')[0];
  const dayBookings = bookings.filter((booking) => {
    const bookingDate = new Date(booking.startAt);
    const bookingDateKey = bookingDate.toISOString().split('T')[0];
    return bookingDateKey === dateKey;
  });

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <SectionHeader title="Agenda" />
      <div style={{ padding: tokens.spacing[4], borderBottom: `1px solid ${tokens.colors.border.default}` }}>
        <div style={{ fontSize: tokens.typography.fontSize.lg[0], fontWeight: tokens.typography.fontWeight.semibold }}>
          {formatDate(selectedDate)}
        </div>
        <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginTop: tokens.spacing[1] }}>
          {dayBookings.length} {dayBookings.length === 1 ? 'booking' : 'bookings'}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: tokens.spacing[4] }}>
        {dayBookings.length === 0 ? (
          <div style={{ textAlign: 'center', color: tokens.colors.text.secondary, padding: tokens.spacing[6] }}>
            No bookings scheduled for this date
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
            {dayBookings.map((booking) => (
              <Card
                key={booking.id}
                style={{
                  cursor: 'pointer',
                  transition: `all ${tokens.transitions.duration.DEFAULT}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = tokens.colors.background.secondary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = tokens.colors.background.primary;
                }}
                onClick={() => onBookingClick(booking)}
              >
                <div style={{ padding: tokens.spacing[3] }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tokens.spacing[2] }}>
                    <div style={{ fontWeight: tokens.typography.fontWeight.bold, fontSize: tokens.typography.fontSize.base[0] }}>
                      {booking.firstName} {booking.lastName}
                    </div>
                    <Badge variant={getStatusBadgeVariant(booking.status)}>
                      {booking.status}
                    </Badge>
                  </div>
                  <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[2] }}>
                    {booking.service}
                  </div>
                  {booking.timeSlots && booking.timeSlots.length > 0 ? (
                    <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                      {booking.timeSlots.map((slot, idx) => (
                        <div key={slot.id}>
                          {formatTime(slot.startAt)} - {formatTime(slot.endAt)}
                          {slot.duration && ` (${slot.duration}m)`}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                      {formatTime(booking.startAt)} - {formatTime(booking.endAt)}
                    </div>
                  )}
                  {booking.sitter && (
                    <div style={{ marginTop: tokens.spacing[2], paddingTop: tokens.spacing[2], borderTop: `1px solid ${tokens.colors.border.default}` }}>
                      <SitterAssignmentDisplay sitter={booking.sitter} showTierBadge compact />
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

