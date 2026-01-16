/**
 * CalendarGrid Component
 * UI Constitution V1 - Phase 4
 * 
 * Calendar grid display component.
 * Uses tokens only.
 */

'use client';

import { tokens } from '@/lib/design-tokens';
import { SignalBadge } from '@/components/resonance';
import { Flex } from '@/components/ui/Flex';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  bookings: Array<{
    id: string;
    firstName: string;
    lastName: string;
    service: string;
    startAt: Date | string;
    endAt: Date | string;
  }>;
}

interface CalendarGridProps {
  days: CalendarDay[];
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  onEventClick: (booking: CalendarDay['bookings'][0], date: Date) => void;
  formatTime: (date: Date | string) => string;
  getEventSignals?: (eventId: string) => Array<{ id: string; severity: 'info' | 'warning' | 'critical'; label: string }>;
}

export function CalendarGrid({
  days,
  selectedDate,
  onDateSelect,
  onEventClick,
  formatTime,
  getEventSignals,
}: CalendarGridProps) {
  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: tokens.spacing[1], // Phase D: Minimal gap - engineered precision
        padding: tokens.spacing[2], // Phase D: Tighter padding - more disciplined, less float
      }}
    >
      {/* Day headers */}
      {dayHeaders.map((day) => (
        <div
          key={day}
          style={{
            padding: tokens.spacing[2],
            textAlign: 'center',
            fontSize: tokens.typography.fontSize.sm[0],
            fontWeight: tokens.typography.fontWeight.semibold,
            color: tokens.colors.text.secondary,
          }}
        >
          {day}
        </div>
      ))}

      {/* Calendar days - Phase D: Instrument-grade precision */}
      {days.map((day, idx) => {
        const isSelected = selectedDate && day.date.getTime() === selectedDate.getTime();
        return (
          <button
            key={idx}
            onClick={() => onDateSelect(day.date)}
            style={{
              minHeight: '80px',
              padding: tokens.spacing[2], // Phase D: Maintained for touch targets
              border: isSelected
                ? `2px solid ${tokens.colors.primary.DEFAULT}` // Phase D: Deliberate, confident selection
                : day.isToday
                ? `2px solid ${tokens.colors.border.strong}` // Phase D: Clear today state
                : `1px solid ${tokens.colors.border.default}`,
              borderRadius: tokens.radius.sm, // Phase D: Precise, non-soft
              backgroundColor: isSelected
                ? tokens.colors.accent.primary
                : day.isToday
                ? tokens.colors.surface.primary // Phase D: Clean, operational
                : day.isCurrentMonth
                ? tokens.colors.surface.primary
                : tokens.colors.surface.secondary,
              color: day.isCurrentMonth
                ? tokens.colors.text.primary
                : tokens.colors.text.tertiary,
              cursor: 'pointer',
              textAlign: 'left',
              boxShadow: 'none', // Phase D: Flat, engineered feel - no decorative depth
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = `2px solid ${tokens.colors.border.focus}`;
              e.currentTarget.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
          >
            <Flex direction="column" gap={1}>
              <span
                style={{
                  fontSize: day.isToday ? '0.9375rem' : tokens.typography.fontSize.sm[0], // Phase D: Slightly larger for today
                  fontWeight: day.isToday
                    ? tokens.typography.fontWeight.bold
                    : tokens.typography.fontWeight.semibold, // Phase D: Slightly stronger - more operational
                  color: day.isToday 
                    ? tokens.colors.primary.DEFAULT 
                    : day.isCurrentMonth
                    ? tokens.colors.text.primary
                    : tokens.colors.text.tertiary,
                }}
              >
                {day.date.getDate()}
              </span>
              {day.bookings.slice(0, 3).map((booking) => {
                const signals = getEventSignals ? getEventSignals(booking.id) : [];
                const criticalSignal = signals.find(s => s.severity === 'critical');
                return (
                  <div
                    key={booking.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(booking, day.date);
                    }}
                    style={{
                      fontSize: tokens.typography.fontSize.xs[0],
                      padding: `${tokens.spacing[1]} ${tokens.spacing[2]}`,
                      backgroundColor: criticalSignal ? tokens.colors.error.DEFAULT : tokens.colors.primary.DEFAULT,
                      color: tokens.colors.surface.primary,
                      borderRadius: tokens.radius.sm,
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                    }}
                    title={`${booking.firstName} ${booking.lastName} - ${booking.service}${criticalSignal ? ` - ${criticalSignal.label}` : ''}`}
                  >
                    <Flex align="center" gap={1}>
                      {criticalSignal && (
                        <i className="fas fa-exclamation-circle" />
                      )}
                      <span>{formatTime(booking.startAt)} {booking.firstName}</span>
                    </Flex>
                  </div>
                );
              })}
              {day.bookings.length > 3 && (
                <span style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.tertiary }}>
                  +{day.bookings.length - 3} more
                </span>
              )}
            </Flex>
          </button>
        );
      })}
    </div>
  );
}
