/**
 * Calendar Page - Enterprise Rebuild
 * 
 * Complete rebuild using design system and components.
 * Zero legacy styling - all through components and tokens.
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  PageHeader,
  Card,
  Button,
  Select,
  Badge,
  Modal,
  Skeleton,
  EmptyState,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';

interface Booking {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  service: string;
  startAt: string | Date;
  endAt: string | Date;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  totalPrice: number;
  pets: Array<{ species: string }>;
  sitter?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  timeSlots?: Array<{
    startAt: string | Date;
    endAt: string | Date;
  }>;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  bookings: Booking[];
}

interface Sitter {
  id: string;
  firstName: string;
  lastName: string;
}

export default function CalendarPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [sitters, setSitters] = useState<Sitter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSitterFilter, setSelectedSitterFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedDate && viewMode !== 'month') {
      setSelectedDate(null);
    }
  }, [viewMode]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bookingsRes, sittersRes] = await Promise.all([
        fetch('/api/bookings').catch(() => null),
        fetch('/api/sitters').catch(() => null),
      ]);

      if (bookingsRes?.ok) {
        const data = await bookingsRes.json();
        setBookings(data.bookings || []);
      } else if (bookingsRes && !bookingsRes.ok) {
        throw new Error('Failed to fetch bookings');
      }

      if (sittersRes?.ok) {
        const data = await sittersRes.json();
        setSitters(data.sitters || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      if (selectedSitterFilter !== 'all') {
        return booking.sitter?.id === selectedSitterFilter;
      }
      return true;
    });
  }, [bookings, selectedSitterFilter]);

  const agendaBookings = useMemo(() => {
    const now = new Date();
    return [...filteredBookings]
      .filter((booking) => new Date(booking.endAt) >= now)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [filteredBookings]);

  const agendaGrouped = useMemo(() => {
    const groups = new Map<string, Booking[]>();
    agendaBookings.forEach((booking) => {
      const dateKey = new Date(booking.startAt).toISOString().split('T')[0];
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(booking);
    });

    return Array.from(groups.entries()).map(([date, items]) => ({
      date,
      bookings: items.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    }));
  }, [agendaBookings]);

  const getBookingsForDate = (date: Date): Booking[] => {
    const dateStr = date.toISOString().split('T')[0];
    const bookings = filteredBookings.filter((booking) => {
      const startAt = new Date(booking.startAt);
      const startDateStr = startAt.toISOString().split('T')[0];

      if (booking.timeSlots && booking.timeSlots.length > 0) {
        return booking.timeSlots.some((slot) => {
          const slotDate = new Date(slot.startAt);
          return slotDate.toISOString().split('T')[0] === dateStr;
        });
      }

      if (booking.service === 'Housesitting' || booking.service === '24/7 Care') {
        const endAt = new Date(booking.endAt);
        const dateOnly = new Date(date);
        dateOnly.setHours(0, 0, 0, 0);
        const startOnly = new Date(startAt);
        startOnly.setHours(0, 0, 0, 0);
        const endOnly = new Date(endAt);
        endOnly.setHours(0, 0, 0, 0);
        return dateOnly >= startOnly && dateOnly <= endOnly;
      }

      return startDateStr === dateStr;
    });

    return bookings.sort((a, b) => {
      const aTime =
        a.timeSlots && a.timeSlots.length > 0
          ? Math.min(...a.timeSlots.map((s: any) => new Date(s.startAt).getTime()))
          : new Date(a.startAt).getTime();
      const bTime =
        b.timeSlots && b.timeSlots.length > 0
          ? Math.min(...b.timeSlots.map((s: any) => new Date(s.startAt).getTime()))
          : new Date(b.startAt).getTime();
      return aTime - bTime;
    });
  };

  const calendarDays = useMemo((): CalendarDay[] => {
    const year = currentYear;
    const month = currentMonth;

    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay();
    const lastDay = new Date(year, month + 1, 0);
    const lastDate = lastDay.getDate();
    const prevMonthLastDay = new Date(year, month, 0);
    const prevMonthLastDate = prevMonthLastDay.getDate();

    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDate - i);
      const dateOnly = new Date(date);
      dateOnly.setHours(0, 0, 0, 0);
      days.push({
        date: dateOnly,
        isCurrentMonth: false,
        isToday: false,
        isPast: dateOnly < today,
        bookings: getBookingsForDate(dateOnly),
      });
    }

    for (let day = 1; day <= lastDate; day++) {
      const date = new Date(year, month, day);
      const dateOnly = new Date(date);
      dateOnly.setHours(0, 0, 0, 0);
      const isToday = dateOnly.getTime() === today.getTime();
      days.push({
        date: dateOnly,
        isCurrentMonth: true,
        isToday,
        isPast: dateOnly < today && !isToday,
        bookings: getBookingsForDate(dateOnly),
      });
    }

    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      const dateOnly = new Date(date);
      dateOnly.setHours(0, 0, 0, 0);
      days.push({
        date: dateOnly,
        isCurrentMonth: false,
        isToday: false,
        isPast: dateOnly < today,
        bookings: getBookingsForDate(dateOnly),
      });
    }

    return days;
  }, [currentMonth, currentYear, filteredBookings]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDate(null);
  };

  const formatPetsByQuantity = (pets: Array<{ species: string }>): string => {
    const counts: Record<string, number> = {};
    pets.forEach((pet) => {
      counts[pet.species] = (counts[pet.species] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([species, count]) => `${count} ${species}${count > 1 ? 's' : ''}`)
      .join(', ');
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

  const selectedDateBookings = selectedDate ? getBookingsForDate(selectedDate) : [];

  if (loading) {
    return (
      <AppShell>
        <PageHeader title="Calendar" description="View bookings in calendar format" />
        <Card>
          <Skeleton height="600px" />
        </Card>
      </AppShell>
    );
  }

  if (error && bookings.length === 0) {
    return (
      <AppShell>
        <PageHeader title="Calendar" description="View bookings in calendar format" />
        <Card>
          <EmptyState
            icon="⚠️"
            title="Failed to Load Calendar"
            description={error}
            action={{
              label: 'Retry',
              onClick: fetchData,
              variant: 'primary',
            }}
          />
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Calendar"
        description="View bookings in calendar format"
        actions={
          <>
            <Link href="/calendar/accounts">
              <Button variant="secondary" leftIcon={<i className="fas fa-cog" />}>
                Calendar Settings
              </Button>
            </Link>
            <Link href="/bookings">
              <Button variant="secondary" leftIcon={<i className="fas fa-arrow-left" />}>
                Back to Bookings
              </Button>
            </Link>
          </>
        }
      />

      {/* Filters and Navigation */}
      <Card
        style={{
          marginBottom: tokens.spacing[6],
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.spacing[4],
          }}
        >
          {/* Month Navigation */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: tokens.spacing[4],
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: tokens.spacing[2],
                flexWrap: 'wrap',
                flex: 1,
                minWidth: 0,
              }}
            >
              <Button variant="ghost" size="sm" onClick={() => navigateMonth('prev')}>
                <i className="fas fa-chevron-left" />
              </Button>
              <h2
                style={{
                  fontSize: tokens.typography.fontSize.xl[0],
                  fontWeight: tokens.typography.fontWeight.semibold,
                  color: tokens.colors.text.primary,
                  minWidth: 0,
                  flex: '1 1 auto',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {monthNames[currentMonth]} {currentYear}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => navigateMonth('next')}>
                <i className="fas fa-chevron-right" />
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={goToToday}
                style={{
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                Today
              </Button>
            </div>

            {/* View Mode Toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: tokens.spacing[2],
              }}
            >
              <Button
                variant={viewMode === 'month' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setViewMode('month')}
                leftIcon={<i className="fas fa-table" />}
              >
                Month
              </Button>
              <Button
                variant={viewMode === 'agenda' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setViewMode('agenda')}
                leftIcon={<i className="fas fa-list" />}
              >
                Agenda
              </Button>
            </div>
          </div>

          {/* Sitter Filter */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing[3],
            }}
          >
            <label
              style={{
                fontSize: tokens.typography.fontSize.sm[0],
                fontWeight: tokens.typography.fontWeight.medium,
                color: tokens.colors.text.primary,
              }}
            >
              Sitter:
            </label>
            <Select
              options={[
                { value: 'all', label: 'All Sitters' },
                ...sitters.map((s) => ({
                  value: s.id,
                  label: `${s.firstName} ${s.lastName}`,
                })),
              ]}
              value={selectedSitterFilter}
              onChange={(e) => setSelectedSitterFilter(e.target.value)}
              style={{ minWidth: '200px' }}
            />
          </div>
        </div>
      </Card>

      {/* Calendar View */}
      {viewMode === 'month' ? (
        <Card
          padding={false}
          style={{
            overflow: 'hidden',
            width: '100%',
            maxWidth: '100%',
            margin: 0,
          }}
        >
          {/* Day Names Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              borderBottom: `1px solid ${tokens.colors.border.default}`,
              width: '100%',
              overflow: 'hidden',
            }}
          >
            {dayNames.map((day) => (
              <div
                key={day}
                style={{
                  padding: typeof window !== 'undefined' && window.innerWidth < 768
                    ? `${tokens.spacing[2]} ${tokens.spacing[1]}`
                    : tokens.spacing[3],
                  textAlign: 'center',
                  fontSize: typeof window !== 'undefined' && window.innerWidth < 768
                    ? tokens.typography.fontSize.xs[0]
                    : tokens.typography.fontSize.sm[0],
                  fontWeight: tokens.typography.fontWeight.semibold,
                  color: tokens.colors.text.primary,
                  backgroundColor: tokens.colors.background.secondary,
                  borderRight: day !== 'Sat' ? `1px solid ${tokens.colors.border.default}` : 'none',
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
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              width: '100%',
              overflow: 'hidden',
              maxWidth: '100%',
              boxSizing: 'border-box',
            }}
          >
            {calendarDays.map((day, index) => {
              const maxVisibleBookings = 2;
              const remainingCount = Math.max(0, day.bookings.length - maxVisibleBookings);
              const isSelected = selectedDate && selectedDate.getTime() === day.date.getTime();

              return (
                <div
                  key={index}
                  onClick={() => day.isCurrentMonth && setSelectedDate(day.date)}
                  style={{
                    minHeight: typeof window !== 'undefined' && window.innerWidth < 768 ? '60px' : '80px',
                    '@media (min-width: 768px)': {
                      minHeight: '120px',
                    },
                    borderRight: index % 7 !== 6 ? `1px solid ${tokens.colors.border.default}` : 'none',
                    borderBottom: `1px solid ${tokens.colors.border.default}`,
                    padding: typeof window !== 'undefined' && window.innerWidth < 768
                      ? tokens.spacing[1]
                      : tokens.spacing[2],
                    backgroundColor: day.isCurrentMonth
                      ? isSelected
                        ? tokens.colors.primary[50]
                        : day.isPast
                        ? tokens.colors.background.tertiary
                        : tokens.colors.background.primary
                      : tokens.colors.background.secondary,
                    cursor: day.isCurrentMonth ? 'pointer' : 'default',
                    opacity: day.isCurrentMonth ? 1 : 0.5,
                    transition: `background-color ${tokens.transitions.duration.DEFAULT}`,
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                    position: 'relative',
                  } as React.CSSProperties & { '@media (min-width: 768px)': React.CSSProperties }}
                  onMouseEnter={(e) => {
                    if (day.isCurrentMonth && !day.isPast) {
                      e.currentTarget.style.backgroundColor = tokens.colors.background.secondary;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = day.isCurrentMonth
                        ? day.isPast
                          ? tokens.colors.background.tertiary
                          : tokens.colors.background.primary
                        : tokens.colors.background.secondary;
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

                  {/* Bookings */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: tokens.spacing[1],
                    }}
                  >
                    {day.bookings.slice(0, maxVisibleBookings).map((booking) => {
                      const dateStr = day.date.toISOString().split('T')[0];
                      let displayTime = '';

                      if (booking.timeSlots && booking.timeSlots.length > 0) {
                        const daySlots = booking.timeSlots.filter((slot) => {
                          const slotDate = new Date(slot.startAt);
                          return slotDate.toISOString().split('T')[0] === dateStr;
                        });
                        if (daySlots.length > 0) {
                          const start = formatTime(new Date(daySlots[0].startAt));
                          displayTime = daySlots.length > 1 ? `${daySlots.length} slots` : start;
                        }
                      } else if (
                        booking.service === 'Housesitting' ||
                        booking.service === '24/7 Care'
                      ) {
                        const startAt = new Date(booking.startAt);
                        const startDateStr = startAt.toISOString().split('T')[0];
                        if (dateStr === startDateStr) {
                          displayTime = formatTime(startAt);
                        } else {
                          displayTime = 'All day';
                        }
                      } else {
                        displayTime = formatTime(new Date(booking.startAt));
                      }

                      // Get status color for indicator
                      const getStatusColor = (status: string) => {
                        switch (status) {
                          case 'confirmed': return tokens.colors.success.DEFAULT;
                          case 'pending': return tokens.colors.warning.DEFAULT;
                          case 'completed': return tokens.colors.primary.DEFAULT;
                          case 'cancelled': return tokens.colors.error.DEFAULT;
                          default: return tokens.colors.primary.DEFAULT;
                        }
                      };

                      return (
                        <div
                          key={booking.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `/bookings/${booking.id}`;
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: tokens.spacing[1],
                            padding: `${tokens.spacing[1]} ${tokens.spacing[1]} ${tokens.spacing[1]} ${tokens.spacing[2]}`,
                            borderRadius: tokens.borderRadius.sm,
                            fontSize: tokens.typography.fontSize.xs[0],
                            backgroundColor: tokens.colors.background.primary,
                            color: tokens.colors.text.primary,
                            cursor: 'pointer',
                            border: `1px solid ${tokens.colors.border.default}`,
                            width: '100%',
                            minWidth: 0,
                          }}
                          title={`${booking.firstName} ${booking.lastName} - ${booking.service}`}
                        >
                          {/* Text content on the left */}
                          <div
                            style={{
                              flex: 1,
                              minWidth: 0,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 1,
                            }}
                          >
                            <div
                              style={{
                                fontWeight: tokens.typography.fontWeight.medium,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontSize: tokens.typography.fontSize.xs[0],
                              }}
                            >
                              {booking.firstName} {booking.lastName.charAt(0)}.
                            </div>
                            {displayTime && (
                              <div
                                style={{
                                  fontSize: tokens.typography.fontSize.xs[0],
                                  opacity: 0.7,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {displayTime}
                              </div>
                            )}
                          </div>
                          {/* Status indicator dot on the right */}
                          <div
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: tokens.borderRadius.full,
                              backgroundColor: getStatusColor(booking.status),
                              flexShrink: 0,
                            }}
                          />
                        </div>
                      );
                    })}

                    {remainingCount > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDate(day.date);
                        }}
                        style={{
                          padding: `${tokens.spacing[1]} ${tokens.spacing[2]}`,
                          borderRadius: tokens.borderRadius.sm,
                          fontSize: tokens.typography.fontSize.xs[0],
                          backgroundColor: tokens.colors.primary[50],
                          color: tokens.colors.primary.DEFAULT,
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
        </Card>
      ) : (
        /* Agenda View */
        <Card>
          {agendaGrouped.length === 0 ? (
            <EmptyState
              icon="📅"
              title="No Upcoming Bookings"
              description="Adjust your filters or switch back to month view to see more bookings."
            />
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: tokens.spacing[4],
              }}
            >
              {agendaGrouped.map((group) => {
                const dateObj = new Date(group.date);
                return (
                  <Card key={group.date} padding={false}>
                    <div
                      style={{
                        padding: tokens.spacing[4],
                        borderBottom: `1px solid ${tokens.colors.border.default}`,
                        backgroundColor: tokens.colors.background.secondary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div
                        style={{
                          fontSize: tokens.typography.fontSize.base[0],
                          fontWeight: tokens.typography.fontWeight.semibold,
                          color: tokens.colors.text.primary,
                        }}
                      >
                        {dateObj.toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </div>
                      <Badge variant="default">{group.bookings.length} booking{group.bookings.length > 1 ? 's' : ''}</Badge>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      {group.bookings.map((booking) => {
                        const start = new Date(booking.startAt);
                        const end = new Date(booking.endAt);
                        const getStatusColor = (status: string) => {
                          switch (status) {
                            case 'confirmed': return tokens.colors.success.DEFAULT;
                            case 'pending': return tokens.colors.warning.DEFAULT;
                            case 'completed': return tokens.colors.primary.DEFAULT;
                            case 'cancelled': return tokens.colors.error.DEFAULT;
                            default: return tokens.colors.primary.DEFAULT;
                          }
                        };
                        return (
                          <Link
                            key={booking.id}
                            href={`/bookings/${booking.id}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: tokens.spacing[3],
                              padding: tokens.spacing[3],
                              borderBottom: `1px solid ${tokens.colors.border.muted}`,
                              textDecoration: 'none',
                              color: 'inherit',
                            }}
                          >
                            {/* Status indicator dot on the left */}
                            <div
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: tokens.borderRadius.full,
                                backgroundColor: getStatusColor(booking.status),
                                flexShrink: 0,
                              }}
                            />
                            {/* Text content */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: tokens.typography.fontSize.base[0],
                                  fontWeight: tokens.typography.fontWeight.semibold,
                                  color: tokens.colors.text.primary,
                                  marginBottom: tokens.spacing[1],
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {booking.firstName} {booking.lastName}
                              </div>
                              <div
                                style={{
                                  fontSize: tokens.typography.fontSize.sm[0],
                                  color: tokens.colors.text.secondary,
                                  marginBottom: tokens.spacing[1],
                                }}
                              >
                                {booking.service}
                              </div>
                              <div
                                style={{
                                  fontSize: tokens.typography.fontSize.xs[0],
                                  color: tokens.colors.text.secondary,
                                  opacity: 0.8,
                                }}
                              >
                                {formatTime(start)} - {formatTime(end)}
                              </div>
                            </div>
                            {/* Price on the right */}
                            <div
                              style={{
                                fontSize: tokens.typography.fontSize.base[0],
                                fontWeight: tokens.typography.fontWeight.semibold,
                                color: tokens.colors.text.primary,
                                flexShrink: 0,
                              }}
                            >
                              ${booking.totalPrice.toFixed(2)}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Selected Date Modal */}
      {viewMode === 'month' && selectedDate && (
        <Modal
          isOpen={!!selectedDate}
          onClose={() => setSelectedDate(null)}
          title={`Bookings for ${formatDate(selectedDate)}`}
          size="lg"
        >
          {selectedDateBookings.length === 0 ? (
            <EmptyState
              icon="📅"
              title="No Bookings"
              description="No bookings scheduled for this date."
            />
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: tokens.spacing[4],
              }}
            >
              {selectedDateBookings.map((booking) => {
                const dateStr = selectedDate.toISOString().split('T')[0];
                const dayTimeSlots =
                  booking.timeSlots && booking.timeSlots.length > 0
                    ? booking.timeSlots
                        .filter((slot) => {
                          const slotDate = new Date(slot.startAt).toISOString().split('T')[0];
                          return slotDate === dateStr;
                        })
                        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
                    : [];

                return (
                  <Card key={booking.id}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        marginBottom: tokens.spacing[4],
                      }}
                    >
                      <div>
                        <h3
                          style={{
                            fontSize: tokens.typography.fontSize.xl[0],
                            fontWeight: tokens.typography.fontWeight.bold,
                            color: tokens.colors.text.primary,
                            margin: 0,
                            marginBottom: tokens.spacing[1],
                          }}
                        >
                          {booking.firstName} {booking.lastName}
                        </h3>
                        <p
                          style={{
                            fontSize: tokens.typography.fontSize.base[0],
                            color: tokens.colors.text.secondary,
                            margin: 0,
                          }}
                        >
                          {booking.service}
                        </p>
                      </div>
                      <Badge variant={getStatusBadgeVariant(booking.status)}>
                        {booking.status}
                      </Badge>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: tokens.spacing[4],
                        marginBottom: tokens.spacing[4],
                      }}
                    >
                      {dayTimeSlots.length > 0 ? (
                        <div>
                          <div
                            style={{
                              fontSize: tokens.typography.fontSize.sm[0],
                              color: tokens.colors.text.secondary,
                              marginBottom: tokens.spacing[1],
                            }}
                          >
                            Time Slots
                          </div>
                          {dayTimeSlots.map((slot, idx) => (
                            <div
                              key={idx}
                              style={{
                                fontSize: tokens.typography.fontSize.base[0],
                                fontWeight: tokens.typography.fontWeight.medium,
                              }}
                            >
                              {formatTime(new Date(slot.startAt))} - {formatTime(new Date(slot.endAt))}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div>
                          <div
                            style={{
                              fontSize: tokens.typography.fontSize.sm[0],
                              color: tokens.colors.text.secondary,
                              marginBottom: tokens.spacing[1],
                            }}
                          >
                            Time
                          </div>
                          <div
                            style={{
                              fontSize: tokens.typography.fontSize.base[0],
                              fontWeight: tokens.typography.fontWeight.medium,
                            }}
                          >
                            {formatTime(new Date(booking.startAt))} - {formatTime(new Date(booking.endAt))}
                          </div>
                        </div>
                      )}

                      {booking.sitter ? (
                        <div>
                          <div
                            style={{
                              fontSize: tokens.typography.fontSize.sm[0],
                              color: tokens.colors.text.secondary,
                              marginBottom: tokens.spacing[1],
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

                      <div>
                        <div
                          style={{
                            fontSize: tokens.typography.fontSize.sm[0],
                            color: tokens.colors.text.secondary,
                            marginBottom: tokens.spacing[1],
                          }}
                        >
                          Pets
                        </div>
                        <div
                          style={{
                            fontSize: tokens.typography.fontSize.base[0],
                            fontWeight: tokens.typography.fontWeight.medium,
                          }}
                        >
                          {formatPetsByQuantity(booking.pets)}
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

                    {(booking.email || booking.phone) && (
                      <div
                        style={{
                          paddingTop: tokens.spacing[4],
                          borderTop: `1px solid ${tokens.colors.border.default}`,
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: tokens.spacing[3],
                          fontSize: tokens.typography.fontSize.sm[0],
                        }}
                      >
                        {booking.phone && (
                          <div>
                            <i className="fas fa-phone" style={{ marginRight: tokens.spacing[2] }} />
                            <a href={`tel:${booking.phone}`} style={{ color: tokens.colors.primary.DEFAULT }}>
                              {booking.phone}
                            </a>
                          </div>
                        )}
                        {booking.email && (
                          <div>
                            <i className="fas fa-envelope" style={{ marginRight: tokens.spacing[2] }} />
                            <a href={`mailto:${booking.email}`} style={{ color: tokens.colors.primary.DEFAULT }}>
                              {booking.email}
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </Modal>
      )}
    </AppShell>
  );
}

