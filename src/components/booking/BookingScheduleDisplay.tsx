/**
 * BookingScheduleDisplay Component
 * 
 * Shared primitive for rendering booking schedules consistently across the app.
 * Handles two schedule models:
 * - Overnight range services (Housesitting, 24/7 Care): start/end date/time + nights count
 * - Multi-visit services (Drop-ins, Dog walking, Pet taxi): per-date entries with duration labels
 * 
 * Universal Law: ONE SCHEDULE RENDERING ENGINE
 */

'use client';

import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { tokens } from '@/lib/design-tokens';

export interface TimeSlot {
  id?: string;
  startAt: Date | string;
  endAt: Date | string;
  duration?: number;
}

export interface BookingScheduleDisplayProps {
  service: string;
  startAt: Date | string;
  endAt: Date | string;
  timeSlots?: TimeSlot[];
  address?: string | null;
  compact?: boolean; // For use in lists/cards
}

/**
 * Determines if a service uses the overnight range model
 */
export function isOvernightRangeService(service: string): boolean {
  return service === 'Housesitting' || service === '24/7 Care';
}

/**
 * Formats a date for display
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Formats a time for display
 */
function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Calculates number of nights between two dates
 */
function calculateNights(startAt: Date | string, endAt: Date | string): number {
  const start = new Date(startAt);
  const end = new Date(endAt);
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

/**
 * Calculates duration in minutes between two times
 */
function calculateDurationMinutes(startAt: Date | string, endAt: Date | string): number {
  const start = new Date(startAt);
  const end = new Date(endAt);
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

export const BookingScheduleDisplay: React.FC<BookingScheduleDisplayProps> = ({
  service,
  startAt,
  endAt,
  timeSlots = [],
  address,
  compact = false,
}) => {
  const isOvernight = isOvernightRangeService(service);

  if (isOvernight) {
    // Overnight range services: Housesitting, 24/7 Care
    const nights = calculateNights(startAt, endAt);

    if (compact) {
      // Compact version for lists/cards - Made bigger per requirements
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[1] }}>
          <div style={{ fontSize: tokens.typography.fontSize.base[0], fontWeight: tokens.typography.fontWeight.semibold }}>
            Scheduled
          </div>
          <div style={{ fontSize: tokens.typography.fontSize.base[0], fontWeight: tokens.typography.fontWeight.medium }}>
            {formatDate(startAt)} - {formatDate(endAt)}
          </div>
          <div style={{ fontSize: tokens.typography.fontSize.base[0], color: tokens.colors.text.secondary, fontWeight: tokens.typography.fontWeight.medium }}>
            {formatTime(startAt)} - {formatTime(endAt)} • {nights} {nights === 1 ? 'Night' : 'Nights'}
          </div>
        </div>
      );
    }

    // Full version for detail pages
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing[3], fontSize: tokens.typography.fontSize.sm[0], marginBottom: tokens.spacing[3] }}>
          <div>
            <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>Start</div>
            <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>{formatDate(startAt)}</div>
            <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary, marginTop: tokens.spacing[1] }}>{formatTime(startAt)}</div>
          </div>
          <div>
            <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>End</div>
            <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>{formatDate(endAt)}</div>
            <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary, marginTop: tokens.spacing[1] }}>{formatTime(endAt)}</div>
          </div>
        </div>
        <div style={{ 
          padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
          backgroundColor: tokens.colors.background.tertiary,
          border: `1px solid ${tokens.colors.border.default}`,
          borderRadius: tokens.borderRadius.md,
          marginBottom: tokens.spacing[4],
        }}>
          <div style={{ 
            fontSize: tokens.typography.fontSize.xs[0], 
            color: tokens.colors.text.secondary, 
            marginBottom: tokens.spacing[2],
            fontWeight: tokens.typography.fontWeight.medium,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Duration
          </div>
          <div style={{ fontWeight: tokens.typography.fontWeight.bold, fontSize: tokens.typography.fontSize.lg[0] }}>
            {nights} {nights === 1 ? 'Night' : 'Nights'}
          </div>
        </div>
        {address && (
          <div style={{ marginTop: tokens.spacing[3], paddingTop: tokens.spacing[3], borderTop: `1px solid ${tokens.colors.border.default}` }}>
            <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>Address</div>
            <div style={{ fontSize: tokens.typography.fontSize.sm[0] }}>{address}</div>
          </div>
        )}
      </div>
    );
  }

  // Multi-visit services: Drop-ins, Dog walking, Pet taxi
  if (timeSlots && timeSlots.length > 0) {
    // Group visits by date
    const visitsByDate = timeSlots.reduce((acc, slot) => {
      const dateKey = formatDate(slot.startAt);
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(slot);
      return acc;
    }, {} as Record<string, TimeSlot[]>);

    if (compact) {
      // Compact version: show first date and total visit count
      const firstDate = Object.keys(visitsByDate)[0];
      const totalVisits = timeSlots.length;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[1] }}>
          <div style={{ fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.medium }}>
            {firstDate}
            {Object.keys(visitsByDate).length > 1 && ` +${Object.keys(visitsByDate).length - 1} more`}
          </div>
          <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary }}>
            {totalVisits} {totalVisits === 1 ? 'visit' : 'visits'}
          </div>
        </div>
      );
    }

    // Full version: show all visits grouped by date
    return (
      <div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
          {Object.entries(visitsByDate).map(([date, visits]) => (
            <div key={date} style={{ 
              padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
              backgroundColor: tokens.colors.background.tertiary,
              border: `1px solid ${tokens.colors.border.default}`,
              borderRadius: tokens.borderRadius.md,
            }}>
              <div style={{ 
                fontSize: tokens.typography.fontSize.xs[0], 
                fontWeight: tokens.typography.fontWeight.bold, 
                color: tokens.colors.text.secondary, 
                marginBottom: tokens.spacing[3], 
                textTransform: 'uppercase', 
                letterSpacing: '0.08em' 
              }}>
                {date}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2] }}>
                {visits.map((slot, index) => {
                  const duration = slot.duration || calculateDurationMinutes(slot.startAt, slot.endAt);
                  return (
                    <div key={slot.id || index} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      gap: tokens.spacing[2],
                      padding: `${tokens.spacing[2]} ${tokens.spacing[3]}`,
                      backgroundColor: tokens.colors.background.primary,
                      borderRadius: tokens.borderRadius.sm,
                      border: `1px solid ${tokens.colors.border.muted}`,
                    }}>
                      <div>
                        <div style={{ fontWeight: tokens.typography.fontWeight.semibold, fontSize: tokens.typography.fontSize.base[0] }}>
                          {formatTime(slot.startAt)} - {formatTime(slot.endAt)}
                        </div>
                      </div>
                      <Badge variant="default">
                        {duration}m
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {address && (
          <div style={{ marginTop: tokens.spacing[3], paddingTop: tokens.spacing[3], borderTop: `1px solid ${tokens.colors.border.default}` }}>
            <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>Address</div>
            <div style={{ fontSize: tokens.typography.fontSize.sm[0] }}>{address}</div>
          </div>
        )}
      </div>
    );
  }

  // No time slots scheduled
  return (
    <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
      No time slots scheduled
    </div>
  );
};

