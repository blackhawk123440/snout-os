/**
 * Booking Drawer Component
 * 
 * Desktop right-side drawer for booking details
 * Reuses booking detail components and logic
 */

'use client';

import React, { useState, useEffect } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Card, SectionHeader, Button, Badge, Modal } from '@/components/ui';
import { BookingScheduleDisplay } from '@/components/booking';
import { SitterAssignmentDisplay } from '@/components/sitter';

export interface BookingDrawerBooking {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  address: string;
  service: string;
  startAt: Date | string;
  endAt: Date | string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  paymentStatus: string;
  totalPrice: number;
  notes?: string | null;
  pets: Array<{ species: string; name?: string }>;
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

export interface BookingDrawerProps {
  isOpen: boolean;
  booking: BookingDrawerBooking | null;
  onClose: () => void;
  onEdit?: () => void;
  onViewFull?: () => void;
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

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const BookingDrawer: React.FC<BookingDrawerProps> = ({
  isOpen,
  booking,
  onClose,
  onEdit,
  onViewFull,
}) => {
  if (!isOpen || !booking) return null;

  return (
    <div
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        bottom: 0,
        width: '480px',
        backgroundColor: tokens.colors.background.primary,
        boxShadow: tokens.shadows.lg,
        zIndex: tokens.zIndex.modal,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: tokens.spacing[4],
          borderBottom: `1px solid ${tokens.colors.border.default}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: tokens.colors.background.primary,
          position: 'sticky',
          top: 0,
          zIndex: tokens.zIndex.sticky,
        }}
      >
        <div>
          <h2 style={{ fontSize: tokens.typography.fontSize.xl[0], fontWeight: tokens.typography.fontWeight.bold, margin: 0, marginBottom: tokens.spacing[1] }}>
            {booking.firstName} {booking.lastName}
          </h2>
          <Badge variant={getStatusBadgeVariant(booking.status)}>
            {booking.status}
          </Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <i className="fas fa-times" />
        </Button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: tokens.spacing[4] }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
          {/* Schedule */}
          <Card>
            <SectionHeader title="Schedule & Service" />
            <div style={{ padding: tokens.spacing[4] }}>
              <BookingScheduleDisplay
                service={booking.service}
                startAt={booking.startAt}
                endAt={booking.endAt}
                timeSlots={booking.timeSlots}
                address={booking.address}
              />
            </div>
          </Card>

          {/* Client Info */}
          <Card>
            <SectionHeader title="Client" />
            <div style={{ padding: tokens.spacing[4], display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
              <div>
                <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                  Name
                </div>
                <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
                  {booking.firstName} {booking.lastName}
                </div>
              </div>
              <div>
                <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                  Phone
                </div>
                <a href={`tel:${booking.phone}`} style={{ color: tokens.colors.primary.DEFAULT, textDecoration: 'none' }}>
                  {booking.phone}
                </a>
              </div>
              {booking.email && (
                <div>
                  <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                    Email
                  </div>
                  <a href={`mailto:${booking.email}`} style={{ color: tokens.colors.primary.DEFAULT, textDecoration: 'none' }}>
                    {booking.email}
                  </a>
                </div>
              )}
            </div>
          </Card>

          {/* Assignment */}
          <Card>
            <SectionHeader title="Assignment" />
            <div style={{ padding: tokens.spacing[4] }}>
              {booking.sitter ? (
                <SitterAssignmentDisplay sitter={booking.sitter} showTierBadge />
              ) : (
                <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                  No sitter assigned
                </div>
              )}
            </div>
          </Card>

          {/* Pricing */}
          <Card>
            <SectionHeader title="Pricing" />
            <div style={{ padding: tokens.spacing[4] }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                  Total
                </div>
                <div style={{ fontSize: tokens.typography.fontSize.xl[0], fontWeight: tokens.typography.fontWeight.bold }}>
                  {formatCurrency(booking.totalPrice)}
                </div>
              </div>
              <div style={{ marginTop: tokens.spacing[2], fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                Payment Status: {booking.paymentStatus}
              </div>
            </div>
          </Card>

          {/* Pets */}
          {booking.pets.length > 0 && (
            <Card>
              <SectionHeader title="Pets" />
              <div style={{ padding: tokens.spacing[4] }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2] }}>
                  {booking.pets.map((pet, idx) => (
                    <div key={idx} style={{ fontSize: tokens.typography.fontSize.sm[0] }}>
                      {pet.name || 'Unnamed'} ({pet.species})
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Notes */}
          {booking.notes && (
            <Card>
              <SectionHeader title="Notes" />
              <div style={{ padding: tokens.spacing[4] }}>
                <div style={{ fontSize: tokens.typography.fontSize.sm[0], whiteSpace: 'pre-wrap' }}>
                  {booking.notes}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Actions */}
      <div
        style={{
          padding: tokens.spacing[4],
          borderTop: `1px solid ${tokens.colors.border.default}`,
          display: 'flex',
          gap: tokens.spacing[2],
        }}
      >
        {onViewFull && (
          <Button variant="primary" style={{ flex: 1 }} onClick={onViewFull}>
            View Full Details
          </Button>
        )}
        {onEdit && (
          <Button variant="secondary" onClick={onEdit}>
            Edit
          </Button>
        )}
      </div>
    </div>
  );
};

