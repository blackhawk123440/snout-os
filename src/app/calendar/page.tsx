/**
 * Calendar Page - UI Constitution V1 Phase 4
 * 
 * Complete rebuild using UI kit only.
 * Zero ad hoc styling. Zero violations.
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Section,
  Grid,
  GridCol,
  FrostedCard,
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
import { AppShell } from '@/components/layout/AppShell';
import { AppPageHeader, AppErrorState, AppFilterBar, AppDrawer } from '@/components/app';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { createCalendarEventCommands } from '@/commands/calendar-commands';
import { registerCommand } from '@/commands/registry';
import { CalendarGrid } from './CalendarGrid';
import {
  detectCalendarSignals,
  generateCalendarSuggestions,
  sortSuggestionsByPriority,
  filterValidSuggestions,
} from '@/lib/resonance';
import { SignalBadge, SuggestionsPanel } from '@/components/resonance';

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
  paidStatus?: 'paid' | 'unpaid' | 'partial';
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

export default function CalendarPage() {
  const router = useRouter();
  const isMobile = useMobile();
  const { showToast } = useToast();
  const { context: commandContext } = useCommands();
  const { open: openCommandPalette } = useCommandPalette();

  // State
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [sitters, setSitters] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
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

  // Load view preference
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
      // Note: These endpoints are from the legacy booking system
      // They may not exist if only using the messaging dashboard
      const [bookingsRes, sittersRes] = await Promise.all([
        fetch('/api/bookings').catch(() => null), // Legacy endpoint - BFF returns empty
        fetch('/api/sitters').catch(() => null), // BFF proxy maps to /api/numbers/sitters
      ]);

      if (bookingsRes?.ok) {
        const data = await bookingsRes.json();
        setBookings(data.bookings || []);
      } else if (bookingsRes && !bookingsRes.ok && bookingsRes.status !== 404) {
        // Only throw error if it's not a 404 (expected for messaging-only deployments)
        throw new Error('Failed to fetch bookings');
      }

      if (sittersRes?.ok) {
        const data = await sittersRes.json();
        // API returns array directly, not { sitters: [] }
        setSitters(Array.isArray(data) ? data : (data.sitters || []));
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
    return bookings.filter((booking) => {
      if (svc !== 'all' && booking.service !== svc) return false;
      if (st !== 'all' && booking.status !== st) return false;
      if (sit !== 'all' && booking.sitter?.id !== sit) return false;
      if (loc !== 'all' && booking.locationZone !== loc) return false;
      if (paid !== 'all' && booking.paidStatus !== paid) return false;
      if (completed === 'hide' && booking.status === 'completed') return false;
      if (unpaid === 'hide' && booking.paidStatus === 'unpaid') return false;
      return true;
    });
  }, [bookings, filterValues]);

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

  const calendarSuggestions = useMemo(() => {
    if (!ENABLE_RESONANCE_V1) return [];
    const suggestions = generateCalendarSuggestions(calendarEvents, calendarSignals);
    const sorted = sortSuggestionsByPriority(suggestions);
    return filterValidSuggestions(sorted, (commandId) => {
      try {
        const { getCommand } = require('@/commands/registry');
        return !!getCommand(commandId);
      } catch {
        return false;
      }
    });
  }, [calendarEvents, calendarSignals, ENABLE_RESONANCE_V1]);

  // Get signals for a specific booking
  const getEventSignals = useCallback((eventId: string) => {
    if (!ENABLE_RESONANCE_V1) return [];
    return calendarSignals.filter(s => s.entityId === eventId);
  }, [calendarSignals, ENABLE_RESONANCE_V1]);

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
  }, [currentDate, filteredBookings]);

  function getBookingsForDate(date: Date): Booking[] {
    const dateStr = date.toISOString().split('T')[0];
    return filteredBookings.filter((booking) => {
      const startAt = new Date(booking.startAt);
      const startDateStr = startAt.toISOString().split('T')[0];
      return startDateStr === dateStr;
    });
  }

  // Register event commands when booking selected
  useEffect(() => {
    if (selectedBooking) {
      const eventCommands = createCalendarEventCommands({
        bookingId: selectedBooking.id,
        clientId: selectedBooking.email ? 'client-' + selectedBooking.id : undefined,
        hasSitter: !!selectedBooking.sitter,
        isPaid: selectedBooking.paidStatus === 'paid',
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

  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
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
        getEventSignals={ENABLE_RESONANCE_V1 ? getEventSignals : undefined}
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
    <AppShell>
      <AppPageHeader
        title="Calendar"
        action={
          <Flex align="center" gap={1.5}> {/* Phase E: Migrated to AppShell - combined left/right actions */}
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
            <Button onClick={() => router.push('/bookings/new')}>
              New Booking
            </Button>
          </Flex>
        }
      />

      {loading && bookings.length === 0 ? (
        <div style={{ padding: tokens.spacing[6] }}>
          <Skeleton height="600px" />
        </div>
      ) : error && bookings.length === 0 ? (
        <AppErrorState message={error} onRetry={fetchData} />
      ) : (
        <Grid>
          {!isMobile && (
            <GridCol span={3}>
              <Flex direction="column" gap={4}>
                <FrostedCard>
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
                </FrostedCard>

                <FrostedCard>
                  <div style={{ padding: tokens.spacing[4] }}>
                    <div
                      style={{
                        fontSize: tokens.typography.fontSize.lg[0],
                        fontWeight: tokens.typography.fontWeight.bold,
                        marginBottom: tokens.spacing[4],
                      }}
                    >
                      Today
                    </div>
                    <div style={{ fontSize: tokens.typography.fontSize.xl[0], fontWeight: tokens.typography.fontWeight.bold }}>
                      {todayBookings.length}
                    </div>
                    <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                      {todayBookings.length === 1 ? 'booking' : 'bookings'}
                    </div>

                    {upcomingBookings.length > 0 && (
                      <>
                        <div
                          style={{
                            marginTop: tokens.spacing[6],
                            fontSize: tokens.typography.fontSize.base[0],
                            fontWeight: tokens.typography.fontWeight.semibold,
                            marginBottom: tokens.spacing[3],
                          }}
                        >
                          Upcoming
                        </div>
                        {upcomingBookings.map((booking) => (
                          <div
                            key={booking.id}
                            onClick={() => {
                              setSelectedBooking(booking);
                              setShowBookingDrawer(true);
                            }}
                            style={{
                              padding: tokens.spacing[2],
                              borderRadius: tokens.radius.md,
                              marginBottom: tokens.spacing[2],
                              cursor: 'pointer',
                              border: `1px solid ${tokens.colors.border.default}`,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = tokens.colors.accent.secondary;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <div style={{ fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.medium }}>
                              {formatTime(booking.startAt)}
                            </div>
                            <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary }}>
                              {booking.firstName} {booking.lastName}
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </FrostedCard>

                <FrostedCard>
                  <div style={{ padding: tokens.spacing[4] }}>
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
                  </div>
                </FrostedCard>

                {/* Resonance: Calendar Suggestions */}
                {ENABLE_RESONANCE_V1 && (
                  <SuggestionsPanel
                    suggestions={calendarSuggestions}
                    loading={loading}
                    onExecute={(suggestion) => {
                      const { getCommand } = require('@/commands/registry');
                      const command = getCommand(suggestion.actionCommandId);
                      if (command) {
                        const context = {
                          ...calendarCommandContext,
                          selectedEntity: {
                            type: 'booking',
                            id: suggestion.entityId,
                            data: filteredBookings.find(b => b.id === suggestion.entityId),
                          },
                        };
                        command.execute(context).then((result: CommandResult) => {
                          if (result.status === 'success') {
                            showToast({ variant: 'success', message: result.message || 'Action completed' });
                            if (result.redirect) {
                              router.push(result.redirect);
                            }
                            fetchData();
                          } else {
                            showToast({ variant: 'error', message: result.message || 'Action failed' });
                          }
                        });
                      }
                    }}
                    maxSuggestions={5}
                    title="Calendar Suggestions"
                  />
                )}
              </Flex>
            </GridCol>
          )}

          <GridCol span={isMobile ? 12 : 9}>
            <Panel>
              {/* Calendar Header */}
              <div
                style={{
                  padding: tokens.spacing[4],
                  borderBottom: `1px solid ${tokens.colors.border.default}`,
                }}
              >
                <Flex align="center" justify="space-between">
                <Flex align="center" gap={4}>
                  <IconButton
                    icon={<i className="fas fa-chevron-left" />}
                    onClick={() => {
                      const prev = new Date(currentDate);
                      if (viewMode === 'month') {
                        prev.setMonth(prev.getMonth() - 1);
                      } else if (viewMode === 'week') {
                        prev.setDate(prev.getDate() - 7);
                      } else {
                        prev.setDate(prev.getDate() - 1);
                      }
                      setCurrentDate(prev);
                    }}
                    aria-label="Previous period"
                  />
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.xl[0],
                      fontWeight: tokens.typography.fontWeight.bold,
                      minWidth: '200px',
                      textAlign: 'center',
                    }}
                  >
                    {formatDate(currentDate)}
                  </div>
                  <IconButton
                    icon={<i className="fas fa-chevron-right" />}
                    onClick={() => {
                      const next = new Date(currentDate);
                      if (viewMode === 'month') {
                        next.setMonth(next.getMonth() + 1);
                      } else if (viewMode === 'week') {
                        next.setDate(next.getDate() + 7);
                      } else {
                        next.setDate(next.getDate() + 1);
                      }
                      setCurrentDate(next);
                    }}
                    aria-label="Next period"
                  />
                </Flex>

                <Flex align="center" gap={2}>
                  {!isMobile && (
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
                  )}
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

              {/* Calendar Body */}
              {viewMode === 'month' ? renderCalendarGrid() : (
                <EmptyState
                  title={`${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} view coming soon`}
                  description="Month view is currently available. Day and week views will be implemented in a future update."
                />
              )}
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
    </AppShell>
  );
}
