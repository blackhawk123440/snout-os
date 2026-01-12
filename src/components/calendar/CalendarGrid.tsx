/**
 * CalendarGrid Component
 * 
 * Shared primitive for calendar month grid rendering.
 * Universal Law: ONE CALENDAR RENDERING SYSTEM (Universal Law K)
 * 
 * Supports intentional horizontal scroll on mobile when grid needs more space.
 */

'use client';

import React from 'react';
import { tokens } from '@/lib/design-tokens';
import { Card } from '@/components/ui';
import { useMobile } from '@/lib/use-mobile';

export interface CalendarEvent {
  id: string;
  firstName?: string;
  lastName?: string;
  clientName?: string;
  service: string;
  startAt: Date | string;
  endAt?: Date | string;
  timeSlots?: Array<{
    id: string;
    startAt: Date | string;
    endAt: Date | string;
    duration?: number;
  }>;
}

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  events: CalendarEvent[];
}

export interface CalendarGridProps {
  days: CalendarDay[];
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  onEventClick?: (event: CalendarEvent, date: Date) => void;
  monthName: string;
  year: number;
  formatTime?: (date: Date | string) => string;
  renderEventLabel?: (event: CalendarEvent) => string;
}

const defaultFormatTime = (date: Date | string) => {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const defaultRenderEventLabel = (event: CalendarEvent) => {
  if (event.clientName) {
    return event.clientName;
  }
  if (event.firstName && event.lastName) {
    return `${event.firstName} ${event.lastName.charAt(0)}.`;
  }
  return event.service;
};

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  days,
  selectedDate,
  onDateSelect,
  onEventClick,
  monthName,
  year,
  formatTime = defaultFormatTime,
  renderEventLabel = defaultRenderEventLabel,
}) => {
  const isMobile = useMobile();

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calculate minimum width for calendar grid to preserve column widths
  const minGridWidth = isMobile ? 490 : '100%'; // ~70px per column * 7 columns on mobile

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '100%',
        margin: 0,
        overflowX: 'auto',
        overflowY: 'visible',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div
        style={{
          width: '100%',
          minWidth: minGridWidth,
          margin: 0,
          backgroundColor: tokens.colors.background.primary,
          border: `1px solid ${tokens.colors.neutral[200]}`,
          borderRadius: tokens.borderRadius.md,
          overflow: 'hidden',
        }}
      >
        {/* Day Names Header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            borderBottom: `1px solid ${tokens.colors.neutral[200]}`,
            width: '100%',
            minWidth: minGridWidth,
            backgroundColor: tokens.colors.background.primary,
          }}
        >
        {dayNames.map((day) => (
          <div
            key={day}
            style={{
              padding: isMobile
                ? `${tokens.spacing[2]} ${tokens.spacing[1]}`
                : tokens.spacing[3],
              textAlign: 'center',
              fontSize: isMobile
                ? tokens.typography.fontSize.xs[0]
                : tokens.typography.fontSize.sm[0],
              fontWeight: tokens.typography.fontWeight.semibold,
              color: tokens.colors.text.secondary,
              backgroundColor: tokens.colors.background.primary,
              borderRight: day !== 'Sat' ? `1px solid ${tokens.colors.neutral[200]}` : 'none',
            }}
          >
            {day}
          </div>
        ))}
      </div>

        {/* Calendar Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            width: '100%',
            minWidth: minGridWidth,
          }}
        >
        {days.map((day, index) => {
          const maxVisibleEvents = 2;
          const remainingCount = Math.max(0, day.events.length - maxVisibleEvents);
          const isSelected = selectedDate && selectedDate.getTime() === day.date.getTime();

          return (
            <div
              key={index}
              onClick={() => day.isCurrentMonth && onDateSelect(day.date)}
              style={{
                minHeight: isMobile ? '60px' : '150px',
                borderRight: index % 7 !== 6 ? `1px solid ${tokens.colors.neutral[200]}` : 'none',
                borderBottom: `1px solid ${tokens.colors.neutral[200]}`,
                padding: isMobile ? tokens.spacing[2] : tokens.spacing[3],
                backgroundColor: day.isCurrentMonth
                  ? isSelected
                    ? tokens.colors.primary[50]
                    : day.isPast
                    ? tokens.colors.neutral[50]
                    : tokens.colors.background.primary
                  : tokens.colors.neutral[50],
                cursor: day.isCurrentMonth ? 'pointer' : 'default',
                opacity: day.isCurrentMonth ? 1 : 0.4,
                transition: `background-color ${tokens.transitions.duration.DEFAULT}`,
                overflow: 'hidden',
                wordBreak: 'break-word',
                position: 'relative',
                minWidth: 0,
              }}
              onMouseEnter={(e) => {
                if (day.isCurrentMonth && !day.isPast && !isSelected) {
                  e.currentTarget.style.backgroundColor = tokens.colors.neutral[50];
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = day.isCurrentMonth
                    ? day.isPast
                      ? tokens.colors.neutral[50]
                      : tokens.colors.background.primary
                    : tokens.colors.neutral[50];
                }
              }}
            >
              {/* Date Number */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: tokens.spacing[1],
                }}
              >
                <span
                  style={{
                    fontSize: tokens.typography.fontSize.sm[0],
                    fontWeight: day.isToday
                      ? tokens.typography.fontWeight.bold
                      : tokens.typography.fontWeight.normal,
                    color: day.isToday
                      ? tokens.colors.primary.DEFAULT
                      : tokens.colors.text.primary,
                  }}
                >
                  {day.date.getDate()}
                </span>
                {day.isToday && (
                  <div
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: tokens.borderRadius.full,
                      backgroundColor: tokens.colors.primary.DEFAULT,
                    }}
                  />
                )}
              </div>

              {/* Events */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: tokens.spacing[1],
                }}
              >
                {day.events.slice(0, maxVisibleEvents).map((event) => {
                  const dateStr = day.date.toISOString().split('T')[0];
                  let displayTime = '';

                  if (event.timeSlots && event.timeSlots.length > 0) {
                    const daySlots = event.timeSlots.filter((slot) => {
                      const slotDate = new Date(slot.startAt);
                      return slotDate.toISOString().split('T')[0] === dateStr;
                    });
                    if (daySlots.length > 0) {
                      const start = formatTime(daySlots[0].startAt);
                      displayTime = daySlots.length > 1 ? `${daySlots.length} slots` : start;
                    }
                  } else if (
                    event.service === 'Housesitting' ||
                    event.service === '24/7 Care'
                  ) {
                    const startAt = new Date(event.startAt);
                    const startDateStr = startAt.toISOString().split('T')[0];
                    if (dateStr === startDateStr) {
                      displayTime = formatTime(startAt);
                    } else {
                      displayTime = 'All day';
                    }
                  } else {
                    displayTime = formatTime(event.startAt);
                  }

                  return (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onEventClick) {
                          onEventClick(event, day.date);
                        } else {
                          onDateSelect(day.date);
                        }
                      }}
                      style={{
                        padding: `${tokens.spacing[1]} ${tokens.spacing[2]}`,
                        borderRadius: tokens.borderRadius.sm,
                        fontSize: tokens.typography.fontSize.xs[0],
                        backgroundColor: tokens.colors.primary[50],
                        color: tokens.colors.text.primary,
                        cursor: 'pointer',
                        borderLeft: `3px solid ${tokens.colors.primary.DEFAULT}`,
                        fontWeight: tokens.typography.fontWeight.medium,
                      }}
                      title={`${renderEventLabel(event)} - ${event.service}`}
                    >
                      <div
                        style={{
                          fontWeight: tokens.typography.fontWeight.semibold,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {renderEventLabel(event)}
                      </div>
                      {displayTime && (
                        <div
                          style={{
                            fontSize: tokens.typography.fontSize.xs[0],
                            opacity: 0.8,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {displayTime}
                        </div>
                      )}
                    </div>
                  );
                })}

                {remainingCount > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDateSelect(day.date);
                    }}
                    style={{
                      padding: `${tokens.spacing[1]} ${tokens.spacing[2]}`,
                      borderRadius: tokens.borderRadius.sm,
                      fontSize: tokens.typography.fontSize.xs[0],
                      backgroundColor: tokens.colors.neutral[100],
                      color: tokens.colors.text.secondary,
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: tokens.typography.fontWeight.medium,
                      textAlign: 'left',
                    }}
                  >
                    {remainingCount} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
};

