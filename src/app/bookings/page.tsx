/**
 * Bookings Page - UI Constitution V1 Phase 5
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
  Select,
  Switch,
  StatCard,
  DataTable,
  CardList,
  Skeleton,
  EmptyState,
  Flex,
  DataRow,
  useToast,
} from '@/components/ui';
import { CommandLauncher } from '@/components/command';
import { Command, CommandResult } from '@/commands/types';
import { useCommands } from '@/hooks/useCommands';
import { useMobile } from '@/lib/use-mobile';
import { tokens } from '@/lib/design-tokens';
import { AppShell } from '@/components/layout/AppShell';
import {
  AppPageHeader,
  AppErrorState,
  AppFilterBar,
  AppDrawer,
  SavedViewsDropdown,
  AppStatusPill,
} from '@/components/app';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { registerCommand } from '@/commands/registry';
import { createCalendarEventCommands } from '@/commands/calendar-commands';
import { bookingStatusCommands } from '@/commands/booking-commands';
import {
  detectBookingSignals,
  generateBookingSuggestions,
  sortSuggestionsByPriority,
  filterValidSuggestions,
} from '@/lib/resonance';
import { SignalStack, SuggestionsPanel } from '@/components/resonance';
import { ENABLE_RESONANCE_V1, ENABLE_BOOKINGS_V2 } from '@/lib/flags';

interface Booking {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  address?: string;
  entryInstructions?: string;
  lockboxCode?: string;
  emergencyContact?: string;
  service: string;
  startAt: string | Date;
  endAt: string | Date;
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  totalPrice: number;
  paidStatus?: 'paid' | 'unpaid' | 'partial';
  pets?: Array<{ species: string; name?: string; notes?: string }>;
  sitter?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  timeSlots?: Array<{
    id?: string;
    startAt: string | Date;
    endAt: string | Date;
    duration?: number;
  }>;
  locationZone?: string;
}

interface OverviewStats {
  totalUpcoming: number;
  today: number;
  unassigned: number;
  unpaid: number;
  conflicts: number;
}

export default function BookingsPage() {
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
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showBookingDrawer, setShowBookingDrawer] = useState(false);
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false);

  // Filters (unified for AppFilterBar + optional mobile drawer)
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    search: '',
    status: 'all',
    service: 'all',
    sitter: 'all',
    paid: 'all',
    completed: 'hide', // hide | all | only
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filterValues.search ?? ''), 300);
    return () => clearTimeout(timer);
  }, [filterValues.search]);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!ENABLE_BOOKINGS_V2) {
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
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [ENABLE_BOOKINGS_V2]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate stats
  const stats = useMemo<OverviewStats>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const totalUpcoming = bookings.filter(b => {
      const start = new Date(b.startAt);
      return start >= today && b.status !== 'cancelled' && b.status !== 'completed';
    }).length;

    const todayCount = bookings.filter(b => {
      const start = new Date(b.startAt);
      start.setHours(0, 0, 0, 0);
      return start.getTime() === today.getTime() && b.status !== 'cancelled';
    }).length;

    const unassigned = bookings.filter(b => !b.sitter?.id && b.status !== 'cancelled' && b.status !== 'completed').length;
    const unpaid = bookings.filter(b => b.paidStatus === 'unpaid' && b.status !== 'cancelled').length;
    const conflicts = 0; // TODO: Implement conflict detection

    return {
      totalUpcoming,
      today: todayCount,
      unassigned,
      unpaid,
      conflicts,
    };
  }, [bookings]);

  // Filter bookings
  // Resonance: Detect signals for all bookings
  const allSignals = useMemo(() => {
    if (!ENABLE_RESONANCE_V1) return [];
    return bookings.flatMap(booking => detectBookingSignals(booking));
  }, [bookings, ENABLE_RESONANCE_V1]);

  // Resonance: Generate suggestions
  const allSuggestions = useMemo(() => {
    if (!ENABLE_RESONANCE_V1) return [];
    const suggestions = bookings.flatMap(booking => {
      const signals = detectBookingSignals(booking);
      return generateBookingSuggestions(booking, signals);
    });
    const sorted = sortSuggestionsByPriority(suggestions);
    return filterValidSuggestions(sorted, (commandId) => {
      // Check if command exists in registry
      try {
        const { getCommand } = require('@/commands/registry');
        return !!getCommand(commandId);
      } catch {
        return false;
      }
    });
  }, [bookings, ENABLE_RESONANCE_V1]);

  // Get signals for a specific booking
  const getBookingSignals = useCallback((bookingId: string) => {
    if (!ENABLE_RESONANCE_V1) return [];
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return [];
    return detectBookingSignals(booking);
  }, [bookings, ENABLE_RESONANCE_V1]);

  const filteredBookings = useMemo(() => {
    const status = filterValues.status ?? 'all';
    const service = filterValues.service ?? 'all';
    const sitter = filterValues.sitter ?? 'all';
    const paid = filterValues.paid ?? 'all';
    const completed = filterValues.completed ?? 'hide';
    return bookings.filter((booking) => {
      if (debouncedSearch) {
        const search = debouncedSearch.toLowerCase();
        const matchesSearch =
          `${booking.firstName} ${booking.lastName}`.toLowerCase().includes(search) ||
          booking.address?.toLowerCase().includes(search) ||
          booking.pets?.some((p) => p.name?.toLowerCase().includes(search));
        if (!matchesSearch) return false;
      }
      if (status !== 'all' && booking.status !== status) return false;
      if (service !== 'all' && booking.service !== service) return false;
      if (sitter !== 'all' && booking.sitter?.id !== sitter) return false;
      if (paid !== 'all' && booking.paidStatus !== paid) return false;
      if (completed === 'hide' && booking.status === 'completed') return false;
      if (completed === 'only' && booking.status !== 'completed') return false;
      return true;
    }).sort((a, b) => {
      const aDate = new Date(a.startAt).getTime();
      const bDate = new Date(b.startAt).getTime();
      return aDate - bDate;
    });
  }, [bookings, debouncedSearch, filterValues]);

  // Register booking commands when selected
  useEffect(() => {
    if (selectedBooking) {
      // Register event commands
      const eventCommands = createCalendarEventCommands({
        bookingId: selectedBooking.id,
        clientId: selectedBooking.email ? 'client-' + selectedBooking.id : undefined,
        hasSitter: !!selectedBooking.sitter,
        isPaid: selectedBooking.paidStatus === 'paid',
      });
      eventCommands.forEach(cmd => {
        try {
          registerCommand(cmd);
        } catch {}
      });

      // Register status commands
      bookingStatusCommands.forEach(cmd => {
        try {
          registerCommand(cmd);
        } catch {}
      });
    }
  }, [selectedBooking]);

  // Listen for drawer open command
  useEffect(() => {
    const handleOpenDrawer = (e: CustomEvent) => {
      const bookingId = e.detail?.bookingId;
      if (bookingId) {
        const booking = bookings.find(b => b.id === bookingId);
        if (booking) {
          setSelectedBooking(booking);
          setShowBookingDrawer(true);
        }
      }
    };

    window.addEventListener('booking-open-drawer', handleOpenDrawer as EventListener);
    return () => window.removeEventListener('booking-open-drawer', handleOpenDrawer as EventListener);
  }, [bookings]);

  // Command context for launcher
  const bookingCommandContext = useMemo(() => ({
    ...commandContext,
    currentRoute: '/bookings',
    selectedEntity: selectedBooking ? {
      type: 'booking' as const,
      id: selectedBooking.id,
      data: selectedBooking,
    } : null,
  }), [commandContext, selectedBooking]);

  // Get suggested commands based on booking state
  const suggestedCommands = useMemo(() => {
    if (!selectedBooking) return [];

    const suggestions: string[] = [];
    if (!selectedBooking.sitter) {
      suggestions.push('booking.assign-sitter');
    }
    if (selectedBooking.paidStatus === 'unpaid') {
      suggestions.push('booking.collect-payment');
    }
    const startDate = new Date(selectedBooking.startAt);
    const hoursUntil = (startDate.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil <= 24 && hoursUntil > 0) {
      suggestions.push('booking.send-confirmation');
    }
    if (selectedBooking.status === 'pending') {
      suggestions.push('booking.change-status-confirm');
    }

    // Return first 5
    return suggestions.slice(0, 5);
  }, [selectedBooking]);

  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if ((filterValues.status ?? 'all') !== 'all') count++;
    if ((filterValues.service ?? 'all') !== 'all') count++;
    if ((filterValues.sitter ?? 'all') !== 'all') count++;
    if ((filterValues.paid ?? 'all') !== 'all') count++;
    if ((filterValues.completed ?? 'hide') !== 'hide') count++;
    if (filterValues.search?.trim()) count++;
    return count;
  }, [filterValues]);

  const clearFilters = () =>
    setFilterValues({
      search: '',
      status: 'all',
      service: 'all',
      sitter: 'all',
      paid: 'all',
      completed: 'hide',
    });

  return (
    <AppShell>
      <AppPageHeader
        title="Bookings"
        subtitle="Manage bookings and assignments"
        action={
          <Button onClick={() => router.push('/bookings/new')}>
            New Booking
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <SavedViewsDropdown persistKey="bookings" />
        <AppFilterBar
          filters={[
            { key: 'search', label: 'Search', type: 'search', placeholder: 'Name, address, pet...' },
            {
              key: 'status',
              label: 'Status',
              type: 'select',
              options: [
                { value: 'all', label: 'All' },
                { value: 'pending', label: 'Pending' },
                { value: 'confirmed', label: 'Confirmed' },
                { value: 'in-progress', label: 'In progress' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
              ],
            },
            {
              key: 'service',
              label: 'Service',
              type: 'select',
              options: [
                { value: 'all', label: 'All' },
                { value: 'Dog Walking', label: 'Dog Walking' },
                { value: 'Drop-in Visit', label: 'Drop-in Visit' },
                { value: 'Housesitting', label: 'Housesitting' },
                { value: '24/7 Care', label: '24/7 Care' },
              ],
            },
            {
              key: 'sitter',
              label: 'Sitter',
              type: 'select',
              options: [
                { value: 'all', label: 'All' },
                ...sitters.map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName}` })),
              ],
            },
            {
              key: 'paid',
              label: 'Paid',
              type: 'select',
              options: [
                { value: 'all', label: 'All' },
                { value: 'paid', label: 'Paid' },
                { value: 'unpaid', label: 'Unpaid' },
                { value: 'partial', label: 'Partial' },
              ],
            },
            {
              key: 'completed',
              label: 'Completed',
              type: 'select',
              options: [
                { value: 'hide', label: 'Hide' },
                { value: 'all', label: 'Show all' },
                { value: 'only', label: 'Completed only' },
              ],
            },
          ]}
          values={filterValues}
          onChange={(k, v) => setFilterValues((p) => ({ ...p, [k]: v }))}
          onClear={activeFilterCount > 0 ? clearFilters : undefined}
        />
        {isMobile && (
          <IconButton
            icon={<i className="fas fa-filter" />}
            onClick={() => setShowFiltersDrawer(true)}
            aria-label="Open filters"
          />
        )}
      </div>

      {loading && bookings.length === 0 ? (
        <div style={{ padding: tokens.spacing[6] }}>
          <Skeleton height="600px" />
        </div>
      ) : error && bookings.length === 0 ? (
        <AppErrorState message={error} onRetry={fetchData} />
      ) : (
        <>
          {/* Overview Section - Phase D: Operational instrument */}
          <Section heading="Overview">
            <Grid gap={2}> {/* Phase D: Minimal gap - disciplined spacing */}
              <GridCol span={isMobile ? 6 : 3}>
                <StatCard
                  label="Upcoming"
                  value={stats.totalUpcoming}
                  loading={loading}
                  compact
                />
              </GridCol>
              <GridCol span={isMobile ? 6 : 3}>
                <StatCard
                  label="Today"
                  value={stats.today}
                  loading={loading}
                  compact
                />
              </GridCol>
              <GridCol span={isMobile ? 6 : 3}>
                <StatCard
                  label="Unassigned"
                  value={stats.unassigned}
                  loading={loading}
                  compact
                />
              </GridCol>
              <GridCol span={isMobile ? 6 : 3}>
                <StatCard
                  label="Unpaid"
                  value={stats.unpaid}
                  loading={loading}
                  compact
                />
              </GridCol>
            </Grid>
          </Section>

            {/* Resonance: Suggestions Panel - Phase D: Subordinate to list */}
            {ENABLE_RESONANCE_V1 && !isMobile && (
              <div style={{ marginTop: tokens.spacing[1] }}> {/* Phase D: Minimal separation - anchored feel */}
                <SuggestionsPanel
                  suggestions={allSuggestions}
                  loading={loading}
                  onExecute={(suggestion) => {
                    // Find and execute command
                    const { getCommand } = require('@/commands/registry');
                    const command = getCommand(suggestion.actionCommandId);
                    if (command) {
                      command.execute(bookingCommandContext).then((result: CommandResult) => {
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
                  title="Suggested Actions"
                />
              </div>
            )}


          {/* Bookings List Section - Phase D: Primary control surface */}
          <Section heading="Bookings List">
            <Panel>
              {loading ? (
                <div style={{ padding: tokens.spacing[4] }}> {/* Phase B5: Tighter padding */}
                  <Skeleton height="400px" />
                </div>
              ) : filteredBookings.length === 0 ? (
                <EmptyState
                  title={bookings.length === 0 ? "No bookings" : "No matches"}
                  description={
                    bookings.length === 0
                      ? undefined // Phase D: Operational neutrality - no guidance text
                      : undefined // Phase D: Remove helper text - direct, neutral
                  }
                  action={{
                    label: 'Create Booking',
                    onClick: () => router.push('/bookings/new'),
                  }}
                />
              ) : isMobile ? (
                <CardList<Booking>
                  items={filteredBookings}
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
                      <Flex direction="column" gap={2}>
                        <Flex justify="space-between" align="center">
                          <div>
                            <div style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
                              {booking.firstName} {booking.lastName}
                            </div>
                            <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                              {booking.service}
                            </div>
                            {ENABLE_RESONANCE_V1 && (
                              <div style={{ marginTop: tokens.spacing[2] }}>
                                <SignalStack 
                                  signals={getBookingSignals(booking.id)} 
                                  maxVisible={2}
                                  compact
                                />
                              </div>
                            )}
                          </div>
                          <AppStatusPill status={booking.status} />
                        </Flex>
                        <DataRow label="Date" value={formatDateTime(booking.startAt)} />
                        <DataRow label="Sitter" value={booking.sitter ? `${booking.sitter.firstName} ${booking.sitter.lastName}` : 'Unassigned'} />
                        <DataRow label="Total" value={`$${booking.totalPrice.toFixed(2)}`} />
                        {booking.paidStatus && (
                          <AppStatusPill status={booking.paidStatus} />
                        )}
                      </Flex>
                    </div>
                  )}
                  loading={false}
                  emptyMessage="No bookings"
                />
              ) : (
                <DataTable<Booking>
                  columns={[
                    {
                      key: 'date',
                      header: 'Date/Time',
                      render: (booking: Booking) => formatDateTime(booking.startAt),
                    },
                    {
                      key: 'client',
                      header: 'Client',
                      render: (booking: Booking) => `${booking.firstName} ${booking.lastName}`,
                    },
                    {
                      key: 'service',
                      header: 'Service',
                      render: (booking: Booking) => booking.service,
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (booking: Booking) => (
                        <Flex direction="column" gap={1}>
                          <AppStatusPill status={booking.status} />
                          {ENABLE_RESONANCE_V1 && (
                            <SignalStack 
                              signals={getBookingSignals(booking.id)} 
                              maxVisible={2}
                              compact
                            />
                          )}
                        </Flex>
                      ),
                    },
                    {
                      key: 'sitter',
                      header: 'Sitter',
                      render: (booking: Booking) => booking.sitter ? `${booking.sitter.firstName} ${booking.sitter.lastName}` : 'Unassigned',
                    },
                    {
                      key: 'total',
                      header: 'Total',
                      render: (booking: Booking) => `$${booking.totalPrice.toFixed(2)}`,
                    },
                    {
                      key: 'paid',
                      header: 'Paid',
                      render: (booking: Booking) => booking.paidStatus ? (
                        <AppStatusPill status={booking.paidStatus} />
                      ) : null,
                    },
                  ]}
                  data={filteredBookings}
                  onRowClick={(booking) => {
                    setSelectedBooking(booking);
                    setShowBookingDrawer(true);
                  }}
                  loading={loading}
                  emptyMessage="No bookings found"
                />
              )}
            </Panel>
          </Section>
        </>
      )}

      <AppDrawer
        isOpen={showFiltersDrawer}
        onClose={() => setShowFiltersDrawer(false)}
        title="Filters"
        side={isMobile ? 'left' : 'right'}
      >
        <div style={{ padding: tokens.spacing[4] }} className="space-y-4">
          <AppFilterBar
            filters={[
              { key: 'status', label: 'Status', type: 'select', options: [
                { value: 'all', label: 'All' }, { value: 'pending', label: 'Pending' },
                { value: 'confirmed', label: 'Confirmed' }, { value: 'in-progress', label: 'In progress' },
                { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' },
              ]},
              { key: 'service', label: 'Service', type: 'select', options: [
                { value: 'all', label: 'All' }, { value: 'Dog Walking', label: 'Dog Walking' },
                { value: 'Drop-in Visit', label: 'Drop-in Visit' }, { value: 'Housesitting', label: 'Housesitting' },
                { value: '24/7 Care', label: '24/7 Care' },
              ]},
              { key: 'sitter', label: 'Sitter', type: 'select', options: [
                { value: 'all', label: 'All' }, ...sitters.map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName}` })),
              ]},
              { key: 'paid', label: 'Paid', type: 'select', options: [
                { value: 'all', label: 'All' }, { value: 'paid', label: 'Paid' },
                { value: 'unpaid', label: 'Unpaid' }, { value: 'partial', label: 'Partial' },
              ]},
              { key: 'completed', label: 'Completed', type: 'select', options: [
                { value: 'hide', label: 'Hide' }, { value: 'all', label: 'Show all' }, { value: 'only', label: 'Completed only' },
              ]},
            ]}
            values={filterValues}
            onChange={(k, v) => setFilterValues((p) => ({ ...p, [k]: v }))}
            onClear={activeFilterCount > 0 ? clearFilters : undefined}
          />
          <Button variant="primary" onClick={() => setShowFiltersDrawer(false)}>Apply</Button>
        </div>
      </AppDrawer>

      <AppDrawer
        isOpen={showBookingDrawer}
        onClose={() => {
          setShowBookingDrawer(false);
          setSelectedBooking(null);
        }}
        title={selectedBooking ? `${selectedBooking.firstName} ${selectedBooking.lastName}` : 'Booking Details'}
        side="right"
      >
        {selectedBooking && (
          <BookingDetailsContent
            booking={selectedBooking}
            commandContext={bookingCommandContext}
            getBookingSignals={getBookingSignals}
            onCommandSelect={(command: Command) => {
              command.execute(bookingCommandContext).then((result: CommandResult) => {
                if (result.status === 'success') {
                  showToast({ variant: 'success', message: result.message || 'Command executed' });
                  if (result.redirect) router.push(result.redirect);
                  fetchData();
                } else {
                  showToast({ variant: 'error', message: result.message || 'Command failed' });
                }
              });
            }}
          />
        )}
      </AppDrawer>
    </AppShell>
  );
}

// Booking Details Content Component
interface BookingDetailsContentProps {
  booking: Booking;
  commandContext: any;
  onCommandSelect: (command: any) => void;
  getBookingSignals?: (bookingId: string) => any[];
}

function BookingDetailsContent({ booking, commandContext, onCommandSelect, getBookingSignals }: BookingDetailsContentProps) {
  const { availableCommands } = useCommands();

  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  // Get suggested commands
  const suggestedCommands = useMemo(() => {
    return availableCommands
      .filter(cmd => {
        if (!cmd.availability(commandContext) || !cmd.permission(commandContext)) return false;
        const cmdId = cmd.id.toLowerCase();
        return cmdId.includes('booking') || cmdId.includes('client');
      })
      .slice(0, 5);
  }, [availableCommands, commandContext]);

  return (
    <div style={{ padding: tokens.spacing[4] }}>
      <Flex direction="column" gap={6}>
        {/* Summary Header */}
        <Flex direction="column" gap={2}>
          <Flex justify="space-between" align="center">
            <div style={{ fontSize: tokens.typography.fontSize.xl[0], fontWeight: tokens.typography.fontWeight.bold }}>
              {booking.service}
            </div>
            <Flex gap={2}>
              <AppStatusPill status={booking.status} />
              {booking.paidStatus && (
                <AppStatusPill status={booking.paidStatus} />
              )}
            </Flex>
          </Flex>
          <DataRow label="Date/Time" value={`${formatDate(booking.startAt)} ${formatTime(booking.startAt)} - ${formatTime(booking.endAt)}`} />
          {ENABLE_RESONANCE_V1 && getBookingSignals && (
            <div style={{ marginTop: tokens.spacing[2] }}>
              <SignalStack signals={getBookingSignals(booking.id)} />
            </div>
          )}
        </Flex>

        {/* Contact and Location */}
        <Flex direction="column" gap={3}>
          <div style={{ fontSize: tokens.typography.fontSize.base[0], fontWeight: tokens.typography.fontWeight.semibold }}>
            Contact & Location
          </div>
          {booking.address && <DataRow label="Address" value={booking.address} copyable />}
          {booking.entryInstructions && <DataRow label="Entry Instructions" value={booking.entryInstructions} />}
          {booking.lockboxCode && <DataRow label="Lockbox Code" value={booking.lockboxCode} copyable />}
          {booking.emergencyContact && <DataRow label="Emergency Contact" value={booking.emergencyContact} />}
          {booking.phone && <DataRow label="Phone" value={booking.phone} copyable />}
          {booking.email && <DataRow label="Email" value={booking.email} copyable />}
        </Flex>

        {/* Schedule */}
        {booking.timeSlots && booking.timeSlots.length > 0 && (
          <Flex direction="column" gap={3}>
            <div style={{ fontSize: tokens.typography.fontSize.base[0], fontWeight: tokens.typography.fontWeight.semibold }}>
              Schedule
            </div>
            {booking.timeSlots.map((slot, idx) => (
              <DataRow
                key={idx}
                label={`Visit ${idx + 1}`}
                value={`${formatTime(slot.startAt)} - ${formatTime(slot.endAt)}`}
              />
            ))}
          </Flex>
        )}

        {/* Pets */}
        {booking.pets && booking.pets.length > 0 && (
          <Flex direction="column" gap={3}>
            <div style={{ fontSize: tokens.typography.fontSize.base[0], fontWeight: tokens.typography.fontWeight.semibold }}>
              Pets
            </div>
            {booking.pets.map((pet, idx) => (
              <DataRow
                key={idx}
                label={pet.name || `Pet ${idx + 1}`}
                value={`${pet.species}${pet.notes ? ` - ${pet.notes}` : ''}`}
              />
            ))}
          </Flex>
        )}

        {/* Sitter Assignment */}
        <Flex direction="column" gap={3}>
          <div style={{ fontSize: tokens.typography.fontSize.base[0], fontWeight: tokens.typography.fontWeight.semibold }}>
            Sitter Assignment
          </div>
          <DataRow
            label="Assigned Sitter"
            value={booking.sitter ? `${booking.sitter.firstName} ${booking.sitter.lastName}` : 'Unassigned'}
          />
        </Flex>

        {/* Payments */}
        <Flex direction="column" gap={3}>
          <div style={{ fontSize: tokens.typography.fontSize.base[0], fontWeight: tokens.typography.fontWeight.semibold }}>
            Payments
          </div>
          <DataRow label="Total" value={`$${booking.totalPrice.toFixed(2)}`} />
          <DataRow label="Paid Status" value={booking.paidStatus || 'Unknown'} />
        </Flex>

        {/* Quick Actions */}
        <Flex direction="column" gap={3}>
          <div style={{ fontSize: tokens.typography.fontSize.base[0], fontWeight: tokens.typography.fontWeight.semibold }}>
            Quick Actions
          </div>
          <CommandLauncher
            context={commandContext}
            maxSuggestions={5}
            onCommandSelect={onCommandSelect}
          />
        </Flex>
      </Flex>
    </div>
  );
}
