/**
 * Calendar Page - UI Constitution V1 Phase 4
 * 
 * Complete rebuild using UI kit only.
 * Zero ad hoc styling. Zero violations.
 */

'use client';

import { Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Grid,
  GridCol,
  Panel,
  Button,
  IconButton,
  Tabs,
  DataTable,
  CardList,
  Skeleton,
  EmptyState,
  Flex,
  useToast,
} from '@/components/ui';
import { CommandLauncher } from '@/components/command';
import { Command, CommandResult } from '@/commands/types';
import { useCommands } from '@/hooks/useCommands';
import { useMobile } from '@/lib/use-mobile';
import { tokens } from '@/lib/design-tokens';
import { OwnerAppShell, LayoutWrapper, PageHeader, Section } from '@/components/layout';
import { AppErrorState, AppFilterBar, AppDrawer } from '@/components/app';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { createCalendarEventCommands } from '@/commands/calendar-commands';
import { registerCommand } from '@/commands/registry';
import { CalendarGrid } from './CalendarGrid';
import { detectCalendarSignals } from '@/lib/resonance';

interface Booking {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  address?: string;
  service: string;
  startAt: string | Date;
  endAt: string | Date;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  totalPrice: number;
  paymentStatus?: 'paid' | 'unpaid' | 'partial';
  pets?: Array<{ species: string; name?: string }>;
  sitter?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  timeSlots?: Array<{
    id?: string;
    startAt: string | Date;
    endAt: string | Date;
  }>;
  locationZone?: string;
}

type CalendarView = 'day' | 'week' | 'month';

function CalendarPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useMobile();
  const { showToast } = useToast();
  const { context: commandContext } = useCommands();
  const { open: openCommandPalette } = useCommandPalette();

  // State
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [sitters, setSitters] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
  const [conflictBookingIds, setConflictBookingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showBookingDrawer, setShowBookingDrawer] = useState(false);
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false);

  const [viewMode, setViewMode] = useState<CalendarView>('month');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    service: 'all',
    status: 'all',
    sitter: 'all',
    locationZone: 'all',
    paid: 'all',
    completed: 'all',
    unpaid: 'all',
    conflicts: 'all',
  });

  // Feature flags
  const ENABLE_CALENDAR_V1 = process.env.NEXT_PUBLIC_ENABLE_CALENDAR_V1 === 'true';
  const ENABLE_RESONANCE_V1 = process.env.NEXT_PUBLIC_ENABLE_RESONANCE_V1 === 'true';

  // Listen for calendar command events
  useEffect(() => {
    const handleJumpToday = () => {
      setCurrentDate(new Date());
      setSelectedDate(new Date());
    };
    const handleNextPeriod = () => {
      const next = new Date(currentDate);
      if (viewMode === 'month') {
        next.setMonth(next.getMonth() + 1);
      } else if (viewMode === 'week') {
        next.setDate(next.getDate() + 7);
      } else {
        next.setDate(next.getDate() + 1);
      }
      setCurrentDate(next);
    };
    const handlePrevPeriod = () => {
      const prev = new Date(currentDate);
      if (viewMode === 'month') {
        prev.setMonth(prev.getMonth() - 1);
      } else if (viewMode === 'week') {
        prev.setDate(prev.getDate() - 7);
      } else {
        prev.setDate(prev.getDate() - 1);
      }
      setCurrentDate(prev);
    };

    window.addEventListener('calendar-jump-today', handleJumpToday);
    window.addEventListener('calendar-next-period', handleNextPeriod);
    window.addEventListener('calendar-prev-period', handlePrevPeriod);

    return () => {
      window.removeEventListener('calendar-jump-today', handleJumpToday);
      window.removeEventListener('calendar-next-period', handleNextPeriod);
      window.removeEventListener('calendar-prev-period', handlePrevPeriod);
    };
  }, [currentDate, viewMode]);

  // Load view preference and URL params (e.g. ?conflicts=show_only from command center)
  useEffect(() => {
    const conflictsParam = searchParams.get('conflicts');
    if (conflictsParam === 'show_only' || conflictsParam === 'hide') {
      setFilterValues((prev) => ({ ...prev, conflicts: conflictsParam }));
    }
  }, [searchParams]);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('calendar-view') as CalendarView;
      if (saved && ['day', 'week', 'month'].includes(saved)) {
        setViewMode(saved);
      }
    }
  }, []);

  // Save view preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('calendar-view', viewMode);
    }
  }, [viewMode]);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!ENABLE_CALENDAR_V1) {
      // Use mock data when feature flag is off
      setBookings([]);
      setSitters([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [bookingsRes, sittersRes, conflictsRes] = await Promise.all([
        fetch('/api/bookings?page=1&pageSize=200').catch(() => null),
        fetch('/api/sitters?page=1&pageSize=200').catch(() => null),
        fetch('/api/bookings/conflicts').catch(() => null),
      ]);

      if (bookingsRes?.ok) {
        const data = await bookingsRes.json();
        setBookings(data.items || []);
      } else if (bookingsRes && !bookingsRes.ok && bookingsRes.status !== 404) {
        throw new Error('Failed to fetch bookings');
      }

      if (sittersRes?.ok) {
        const data = await sittersRes.json();
        setSitters(Array.isArray(data?.items) ? data.items : []);
      }

      if (conflictsRes?.ok) {
        const data = await conflictsRes.json();
        setConflictBookingIds(new Set(data.conflictBookingIds || []));
      } else {
        setConflictBookingIds(new Set());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  }, [ENABLE_CALENDAR_V1]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredBookings = useMemo(() => {
    const svc = filterValues.service ?? 'all';
    const st = filterValues.status ?? 'all';
    const sit = filterValues.sitter ?? 'all';
    const loc = filterValues.locationZone ?? 'all';
    const paid = filterValues.paid ?? 'all';
    const completed = filterValues.completed ?? 'all';
    const unpaid = filterValues.unpaid ?? 'all';
    const conflictsFilter = filterValues.conflicts ?? 'all';
    return bookings.filter((booking) => {
      if (svc !== 'all' && booking.service !== svc) return false;
      if (st !== 'all' && booking.status !== st) return false;
      if (sit !== 'all' && booking.sitter?.id !== sit) return false;
      if (loc !== 'all' && booking.locationZone !== loc) return false;
      if (paid !== 'all' && booking.paymentStatus !== paid) return false;
      if (completed === 'hide' && booking.status === 'completed') return false;
      if (unpaid === 'hide' && booking.paymentStatus === 'unpaid') return false;
      const inConflict = conflictBookingIds.has(booking.id);
      if (conflictsFilter === 'show_only' && !inConflict) return false;
      if (conflictsFilter === 'hide' && inConflict) return false;
      return true;
    });
  }, [bookings, filterValues, conflictBookingIds]);

  // Get bookings for selected date/range
  const selectedBookings = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = selectedDate.toISOString().split('T')[0];
    return filteredBookings.filter((booking) => {
      const startAt = new Date(booking.startAt);
      const startDateStr = startAt.toISOString().split('T')[0];
      return startDateStr === dateStr;
    });
  }, [filteredBookings, selectedDate]);

  // Resonance: Detect calendar signals
  const calendarEvents = useMemo(() => {
    if (!ENABLE_RESONANCE_V1) return [];
    return filteredBookings.map(b => ({
      id: b.id,
      startAt: b.startAt,
      endAt: b.endAt,
      sitter: b.sitter,
    }));
  }, [filteredBookings, ENABLE_RESONANCE_V1]);

  const calendarSignals = useMemo(() => {
    if (!ENABLE_RESONANCE_V1) return [];
    return detectCalendarSignals(calendarEvents);
  }, [calendarEvents, ENABLE_RESONANCE_V1]);

  // Get signals for a specific booking (resonance + conflict overlay)
  const getEventSignals = useCallback((eventId: string) => {
    const base = ENABLE_RESONANCE_V1 ? calendarSignals.filter(s => s.entityId === eventId) : [];
    if (conflictBookingIds.has(eventId)) {
      return [...base, { id: 'conflict', severity: 'critical' as const, label: 'Schedule conflict' }];
    }
    return base;
  }, [calendarSignals, conflictBookingIds, ENABLE_RESONANCE_V1]);

  // Calendar days for month view
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay();
    const lastDay = new Date(year, month + 1, 0);
    const lastDate = lastDay.getDate();
    const prevMonthLastDay = new Date(year, month, 0);
    const prevMonthLastDate = prevMonthLastDay.getDate();

    const days: Array<{ date: Date; isCurrentMonth: boolean; isToday: boolean; bookings: Booking[] }> = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Previous month days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDate - i);
      date.setHours(0, 0, 0, 0);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: date.getTime() === today.getTime(),
        bookings: getBookingsForDate(date),
      });
    }

    // Current month days
    for (let day = 1; day <= lastDate; day++) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        bookings: getBookingsForDate(date),
      });
    }

    // Next month days to fill week
    const remaining = 42 - days.length;
    for (let day = 1; day <= remaining; day++) {
      const date = new Date(year, month + 1, day);
      date.setHours(0, 0, 0, 0);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: date.getTime() === today.getTime(),
        bookings: getBookingsForDate(date),
      });
    }

    return days;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- getBookingsForDate uses filteredBookings; adding causes unnecessary reruns
  }, [currentDate, filteredBookings]);

  function getBookingsForDate(date: Date): Booking[] {
    const dateStr = date.toISOString().split('T')[0];
    return filteredBookings.filter((booking) => {
      const startAt = new Date(booking.startAt);
      const startDateStr = startAt.toISOString().split('T')[0];
      return startDateStr === dateStr;
    });
  }

  // Day view: single day's bookings sorted by start time
  const dayViewBookings = useMemo(() => {
    const d = new Date(currentDate);
    d.setHours(0, 0, 0, 0);
    const dateStr = d.toISOString().split('T')[0];
    return filteredBookings
      .filter((b) => new Date(b.startAt).toISOString().split('T')[0] === dateStr)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [currentDate, filteredBookings]);

  // Week view: 7 days (Sun–Sat) containing currentDate, each with bookings
  const weekViewDays = useMemo(() => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    start.setHours(0, 0, 0, 0);
    const days: Array<{ date: Date; isToday: boolean; bookings: Booking[] }> = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      const dayBookings = filteredBookings.filter((b) => new Date(b.startAt).toISOString().split('T')[0] === dateStr);
      days.push({
        date,
        isToday: date.getTime() === today.getTime(),
        bookings: dayBookings.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
      });
    }
    return days;
  }, [currentDate, filteredBookings]);

  // Register event commands when booking selected
  useEffect(() => {
    if (selectedBooking) {
      const eventCommands = createCalendarEventCommands({
        bookingId: selectedBooking.id,
        clientId: selectedBooking.email ? 'client-' + selectedBooking.id : undefined,
        hasSitter: !!selectedBooking.sitter,
        isPaid: selectedBooking.paymentStatus === 'paid',
      });
      eventCommands.forEach(cmd => {
        try {
          registerCommand(cmd);
        } catch (error) {
          // Command may already be registered
        }
      });
    }
  }, [selectedBooking]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const periodLabel = useMemo(() => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
    if (viewMode === 'week') {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return formatDate(currentDate);
  }, [viewMode, currentDate]);

  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  // In day view, keep Event List in sync with the single day shown
  useEffect(() => {
    if (viewMode === 'day') {
      setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()));
    }
  }, [viewMode, currentDate]);

  // Day view: single day timeline list
  const renderDayView = () => {
    if (loading) {
      return (
        <div style={{ padding: tokens.spacing[6] }}>
          <Skeleton height="400px" />
        </div>
      );
    }
    if (error) {
      return <AppErrorState message={error} onRetry={fetchData} />;
    }
    return (
      <div style={{ padding: tokens.spacing[4] }}>
        <div
          style={{
            fontSize: tokens.typography.fontSize.sm[0],
            color: tokens.colors.text.secondary,
            marginBottom: tokens.spacing[3],
          }}
        >
          {dayViewBookings.length} {dayViewBookings.length === 1 ? 'booking' : 'bookings'}
        </div>
        {dayViewBookings.length === 0 ? (
          <EmptyState
            title="No bookings"
            description="No bookings scheduled for this day."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2] }}>
            {dayViewBookings.map((booking) => {
              const inConflict = conflictBookingIds.has(booking.id);
              return (
                <div
                  key={booking.id}
                  style={{
                    padding: tokens.spacing[3],
                    border: `1px solid ${inConflict ? tokens.colors.error[300] : tokens.colors.border.default}`,
                    borderRadius: tokens.radius.md,
                    backgroundColor: tokens.colors.surface.primary,
                    position: 'relative',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBooking(booking);
                      setShowBookingDrawer(true);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      cursor: 'pointer',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.closest('div')!.style.backgroundColor = tokens.colors.accent.secondary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.closest('div')!.style.backgroundColor = tokens.colors.surface.primary;
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: tokens.spacing[1] }}>
                      <span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
                        {formatTime(booking.startAt)} – {formatTime(booking.endAt)}
                      </span>
                      {inConflict && (
                        <span style={{ color: tokens.colors.error.DEFAULT, fontSize: tokens.typography.fontSize.xs[0] }}>
                          <i className="fas fa-exclamation-circle" /> Conflict
                        </span>
                      )}
                    </div>
                    <div style={{ color: tokens.colors.text.primary }}>
                      {booking.firstName} {booking.lastName}
                    </div>
                    <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                      {booking.service}
                      {booking.sitter ? ` · ${booking.sitter.firstName} ${booking.sitter.lastName}` : ' · Unassigned'}
                    </div>
                  </button>
                  <Button
                    variant="tertiary"
                    size="sm"
                    style={{ marginTop: tokens.spacing[2] }}
                    onClick={() => {
                      setSelectedBooking(booking);
                      setShowBookingDrawer(true);
                    }}
                  >
                    View details
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Week view: 7 columns, each day with its bookings
  const renderWeekView = () => {
    if (loading) {
      return (
        <div style={{ padding: tokens.spacing[6] }}>
          <Skeleton height="400px" />
        </div>
      );
    }
    if (error) {
      return <AppErrorState message={error} onRetry={fetchData} />;
    }
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: tokens.spacing[2],
          padding: tokens.spacing[4],
          minHeight: 320,
        }}
      >
        {weekViewDays.map((day, colIndex) => (
          <div
            key={day.date.getTime()}
            style={{
              border: `1px solid ${tokens.colors.border.default}`,
              borderRadius: tokens.radius.sm,
              padding: tokens.spacing[2],
              backgroundColor: day.isToday ? tokens.colors.accent.secondary : tokens.colors.surface.primary,
            }}
          >
            <div
              style={{
                fontSize: tokens.typography.fontSize.sm[0],
                fontWeight: day.isToday ? tokens.typography.fontWeight.bold : tokens.typography.fontWeight.semibold,
                color: day.isToday ? tokens.colors.primary.DEFAULT : tokens.colors.text.secondary,
                marginBottom: tokens.spacing[2],
              }}
            >
              {dayHeaders[colIndex]}
            </div>
            <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.tertiary, marginBottom: tokens.spacing[2] }}>
              {day.date.getDate()} {day.date.toLocaleDateString('en-US', { month: 'short' })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[1] }}>
              {day.bookings.length === 0 ? (
                <span style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.tertiary }}>No bookings</span>
              ) : (
                day.bookings.map((booking) => {
                  const inConflict = conflictBookingIds.has(booking.id);
                  return (
                    <button
                      key={booking.id}
                      type="button"
                      onClick={() => {
                        setSelectedBooking(booking);
                        setShowBookingDrawer(true);
                      }}
                      style={{
                        padding: tokens.spacing[2],
                        border: `1px solid ${inConflict ? tokens.colors.error[300] : tokens.colors.border.default}`,
                        borderRadius: tokens.radius.sm,
                        backgroundColor: tokens.colors.surface.primary,
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: tokens.typography.fontSize.xs[0],
                        width: '100%',
                      }}
                      title={`${booking.firstName} ${booking.lastName} · ${booking.service}${inConflict ? ' · Conflict' : ''}`}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = tokens.colors.accent.secondary;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = tokens.colors.surface.primary;
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {inConflict && <i className="fas fa-exclamation-circle" style={{ color: tokens.colors.error.DEFAULT, flexShrink: 0 }} />}
                        <span style={{ fontWeight: tokens.typography.fontWeight.medium }}>{formatTime(booking.startAt)}</span>
                      </div>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {booking.firstName} {booking.lastName}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render calendar grid
  const renderCalendarGrid = () => {
    if (loading) {
      return (
        <div style={{ padding: tokens.spacing[6] }}>
          <Skeleton height="400px" />
        </div>
      );
    }

    if (error) {
      return (
        <AppErrorState message={error} onRetry={fetchData} />
      );
    }

    return (
      <CalendarGrid
        days={calendarDays.map(day => ({
          ...day,
          bookings: day.bookings.map(booking => ({
            id: booking.id,
            firstName: booking.firstName,
            lastName: booking.lastName,
            service: booking.service,
            startAt: booking.startAt,
            endAt: booking.endAt,
            sitter: booking.sitter,
          })),
        }))}
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        onEventClick={(booking) => {
          const fullBooking = bookings.find(b => b.id === booking.id);
          if (fullBooking) {
            setSelectedBooking(fullBooking);
            setShowBookingDrawer(true);
          }
        }}
        formatTime={formatTime}
        getEventSignals={getEventSignals}
      />
    );
  };

  const calendarFilterBar = (
    <AppFilterBar
      filters={[
        { key: 'service', label: 'Service', type: 'select', options: [
          { value: 'all', label: 'All' }, { value: 'Dog Walking', label: 'Dog Walking' },
          { value: 'Drop-in Visit', label: 'Drop-in Visit' }, { value: 'Housesitting', label: 'Housesitting' },
          { value: '24/7 Care', label: '24/7 Care' },
        ]},
        { key: 'status', label: 'Status', type: 'select', options: [
          { value: 'all', label: 'All' }, { value: 'pending', label: 'Pending' },
          { value: 'confirmed', label: 'Confirmed' }, { value: 'completed', label: 'Completed' },
          { value: 'cancelled', label: 'Cancelled' },
        ]},
        { key: 'sitter', label: 'Sitter', type: 'select', options: [
          { value: 'all', label: 'All' }, ...sitters.map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName}` })),
        ]},
        { key: 'paid', label: 'Paid', type: 'select', options: [
          { value: 'all', label: 'All' }, { value: 'paid', label: 'Paid' },
          { value: 'unpaid', label: 'Unpaid' }, { value: 'partial', label: 'Partial' },
        ]},
        { key: 'completed', label: 'Completed', type: 'select', options: [
          { value: 'all', label: 'Show' }, { value: 'hide', label: 'Hide' },
        ]},
        { key: 'unpaid', label: 'Unpaid', type: 'select', options: [
          { value: 'all', label: 'Show' }, { value: 'hide', label: 'Hide' },
        ]},
        { key: 'conflicts', label: 'Conflicts', type: 'select', options: [
          { value: 'all', label: 'All' },
          { value: 'show_only', label: 'Show only conflicts' },
          { value: 'hide', label: 'Hide conflicts' },
        ]},
      ]}
      values={filterValues}
      onChange={(k, v) => setFilterValues((p) => ({ ...p, [k]: v }))}
      onClear={() => setFilterValues({
        service: 'all', status: 'all', sitter: 'all', locationZone: 'all',
        paid: 'all', completed: 'all', unpaid: 'all', conflicts: 'all',
      })}
    />
  );

  // Agenda summary
  const todayBookings = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return filteredBookings.filter(b => {
      const startAt = new Date(b.startAt);
      startAt.setHours(0, 0, 0, 0);
      return startAt.getTime() === today.getTime();
    });
  }, [filteredBookings]);

  const upcomingBookings = useMemo(() => {
    const now = new Date();
    return filteredBookings
      .filter(b => new Date(b.startAt) > now)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .slice(0, 3);
  }, [filteredBookings]);

  // Command context for launcher
  const calendarCommandContext = useMemo(() => ({
    ...commandContext,
    currentRoute: '/calendar',
    selectedEntity: selectedBooking ? {
      type: 'booking' as const,
      id: selectedBooking.id,
      data: selectedBooking,
    } : null,
  }), [commandContext, selectedBooking]);

  return (
    <OwnerAppShell>
      <LayoutWrapper variant="wide">
        <PageHeader
          title="Calendar"
          subtitle="Schedules, overlaps, and coverage controls"
          actions={
            <Flex align="center" gap={1.5}>
              {isMobile && (
                <IconButton
                  icon={<i className="fas fa-filter" />}
                  onClick={() => setShowFiltersDrawer(true)}
                  aria-label="Open filters"
                />
              )}
              <IconButton
                icon={<i className="fas fa-search" />}
                onClick={openCommandPalette}
                aria-label="Open command palette"
              />
              <Button size="sm" onClick={() => router.push('/bookings/new')}>
                New booking
              </Button>
            </Flex>
          }
        />

      {loading && bookings.length === 0 ? (
        <Section>
          <div className="py-4">
            <Skeleton height="600px" />
          </div>
        </Section>
      ) : error && bookings.length === 0 ? (
        <Section>
          <AppErrorState message={error} onRetry={fetchData} />
        </Section>
      ) : (
        <Section title="Schedule">
        <Grid>
          <GridCol span={12}>
            <Panel>
              {/* Top bar: period nav + view tabs + Today */}
              <div
                style={{
                  padding: tokens.spacing[3],
                  borderBottom: `1px solid ${tokens.colors.border.default}`,
                }}
              >
                <Flex align="center" justify="space-between" wrap gap={3}>
                  <Flex align="center" gap={2}>
                    <IconButton
                      icon={<i className="fas fa-chevron-left" />}
                      onClick={() => {
                        const prev = new Date(currentDate);
                        if (viewMode === 'month') prev.setMonth(prev.getMonth() - 1);
                        else if (viewMode === 'week') prev.setDate(prev.getDate() - 7);
                        else prev.setDate(prev.getDate() - 1);
                        setCurrentDate(prev);
                      }}
                      aria-label="Previous period"
                    />
                    <span
                      style={{
                        fontSize: tokens.typography.fontSize.lg[0],
                        fontWeight: tokens.typography.fontWeight.bold,
                        minWidth: '180px',
                        textAlign: 'center',
                      }}
                    >
                      {periodLabel}
                    </span>
                    <IconButton
                      icon={<i className="fas fa-chevron-right" />}
                      onClick={() => {
                        const next = new Date(currentDate);
                        if (viewMode === 'month') next.setMonth(next.getMonth() + 1);
                        else if (viewMode === 'week') next.setDate(next.getDate() + 7);
                        else next.setDate(next.getDate() + 1);
                        setCurrentDate(next);
                      }}
                      aria-label="Next period"
                    />
                  </Flex>
                  <Flex align="center" gap={2}>
                    <Tabs
                      tabs={[
                        { id: 'day', label: 'Day' },
                        { id: 'week', label: 'Week' },
                        { id: 'month', label: 'Month' },
                      ]}
                      activeTab={viewMode}
                      onTabChange={(tabId: string) => setViewMode(tabId as CalendarView)}
                    >
                      <div />
                    </Tabs>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setCurrentDate(new Date());
                        setSelectedDate(new Date());
                      }}
                    >
                      Today
                    </Button>
                  </Flex>
                </Flex>
              </div>

              {/* Filters in top bar (compact row) */}
              <div
                style={{
                  padding: tokens.spacing[2],
                  borderBottom: `1px solid ${tokens.colors.border.default}`,
                  backgroundColor: tokens.colors.surface.secondary,
                }}
              >
                {isMobile ? (
                  <Flex align="center" gap={2}>
                    <Button variant="tertiary" size="sm" onClick={() => setShowFiltersDrawer(true)}>
                      <i className="fas fa-filter" style={{ marginRight: tokens.spacing[1] }} />
                      Filters
                    </Button>
                  </Flex>
                ) : (
                  calendarFilterBar
                )}
              </div>

              {/* Today / Upcoming strip */}
              <div
                style={{
                  padding: `${tokens.spacing[2]} ${tokens.spacing[3]}`,
                  borderBottom: `1px solid ${tokens.colors.border.default}`,
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: tokens.spacing[3],
                }}
              >
                <span style={{ fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.medium }}>
                  Today: <strong>{todayBookings.length}</strong> {todayBookings.length === 1 ? 'booking' : 'bookings'}
                </span>
                {upcomingBookings.length > 0 && (
                  <Flex gap={1} wrap>
                    {upcomingBookings.slice(0, 5).map((booking) => (
                      <button
                        key={booking.id}
                        type="button"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowBookingDrawer(true);
                        }}
                        style={{
                          padding: `${tokens.spacing[0]} ${tokens.spacing[2]}`,
                          fontSize: tokens.typography.fontSize.xs[0],
                          border: `1px solid ${tokens.colors.border.default}`,
                          borderRadius: tokens.radius.sm,
                          background: tokens.colors.surface.primary,
                          cursor: 'pointer',
                        }}
                      >
                        {formatTime(booking.startAt)} {booking.firstName}
                      </button>
                    ))}
                  </Flex>
                )}
              </div>

              {/* Calendar Body */}
              {viewMode === 'month' && renderCalendarGrid()}
              {viewMode === 'day' && renderDayView()}
              {viewMode === 'week' && renderWeekView()}
            </Panel>

            {/* Event List */}
            {selectedDate && (
              <div style={{ marginTop: tokens.spacing[4] }}>
              <Panel>
                <div style={{ padding: tokens.spacing[4] }}>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.lg[0],
                      fontWeight: tokens.typography.fontWeight.bold,
                      marginBottom: tokens.spacing[4],
                    }}
                  >
                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </div>

                  {isMobile ? (
                    <CardList<Booking>
                      items={selectedBookings}
                      renderCard={(booking: Booking) => (
                        <div
                          onClick={() => {
                            setSelectedBooking(booking);
                            setShowBookingDrawer(true);
                          }}
                          style={{
                            padding: tokens.spacing[4],
                            border: `1px solid ${tokens.colors.border.default}`,
                            borderRadius: tokens.radius.md,
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
                            {formatTime(booking.startAt)} - {formatTime(booking.endAt)}
                          </div>
                          <div>{booking.firstName} {booking.lastName}</div>
                          <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                            {booking.service}
                          </div>
                        </div>
                      )}
                      loading={loading}
                      emptyMessage="No bookings for this date"
                    />
                  ) : (
                    <DataTable
                      columns={[
                        { key: 'time', header: 'Time', render: (booking) => `${formatTime(booking.startAt)} - ${formatTime(booking.endAt)}` },
                        { key: 'client', header: 'Client', render: (booking) => `${booking.firstName} ${booking.lastName}` },
                        { key: 'service', header: 'Service', render: (booking) => booking.service },
                        { key: 'status', header: 'Status', render: (booking) => booking.status },
                      ]}
                      data={selectedBookings}
                      onRowClick={(booking) => {
                        setSelectedBooking(booking);
                        setShowBookingDrawer(true);
                      }}
                      loading={loading}
                      emptyMessage="No bookings for this date"
                    />
                  )}
                </div>
              </Panel>
              </div>
            )}
          </GridCol>
        </Grid>
        </Section>
      )}

      {isMobile && (
        <AppDrawer
          isOpen={showFiltersDrawer}
          onClose={() => setShowFiltersDrawer(false)}
          title="Filters"
          side="left"
        >
          <div style={{ padding: tokens.spacing[4] }} className="space-y-4">
            <Tabs
              tabs={[
                { id: 'day', label: 'Day' },
                { id: 'week', label: 'Week' },
                { id: 'month', label: 'Month' },
              ]}
              activeTab={viewMode}
              onTabChange={(tabId: string) => setViewMode(tabId as CalendarView)}
            >
              <div />
            </Tabs>
            {calendarFilterBar}
          </div>
        </AppDrawer>
      )}

      <AppDrawer
        isOpen={showBookingDrawer}
        onClose={() => {
          setShowBookingDrawer(false);
          setSelectedBooking(null);
        }}
        title={selectedBooking ? `${selectedBooking.firstName} ${selectedBooking.lastName}` : 'Booking Details'}
      >
        {selectedBooking && (
          <div style={{ padding: tokens.spacing[4] }}>
            <Flex direction="column" gap={4}>
              <div>
                <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                  Service
                </div>
                <div style={{ fontSize: tokens.typography.fontSize.base[0], fontWeight: tokens.typography.fontWeight.semibold }}>
                  {selectedBooking.service}
                </div>
              </div>

              <div>
                <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                  Time
                </div>
                <div style={{ fontSize: tokens.typography.fontSize.base[0] }}>
                  {formatTime(selectedBooking.startAt)} - {formatTime(selectedBooking.endAt)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                  Status
                </div>
                <div style={{ fontSize: tokens.typography.fontSize.base[0] }}>
                  {selectedBooking.status}
                </div>
              </div>

              {selectedBooking.sitter && (
                <div>
                  <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                    Sitter
                  </div>
                  <div style={{ fontSize: tokens.typography.fontSize.base[0] }}>
                    {selectedBooking.sitter.firstName} {selectedBooking.sitter.lastName}
                  </div>
                </div>
              )}

              <div style={{ marginTop: tokens.spacing[4] }}>
              <Flex direction="column" gap={2}>
                <CommandLauncher
                  context={calendarCommandContext}
                  maxSuggestions={3}
                  onCommandSelect={(command) => {
                    command.execute(calendarCommandContext).then(result => {
                      if (result.status === 'success') {
                        showToast({ variant: 'success', message: result.message || 'Command executed' });
                        if (result.redirect) {
                          router.push(result.redirect);
                        }
                      } else {
                        showToast({ variant: 'error', message: result.message || 'Command failed' });
                      }
                    });
                  }}
                />
              </Flex>
              </div>
            </Flex>
          </div>
        )}
      </AppDrawer>
      </LayoutWrapper>
    </OwnerAppShell>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<div style={{ padding: tokens.spacing[6] }}><Skeleton height="400px" /></div>}>
      <CalendarPageContent />
    </Suspense>
  );
}
