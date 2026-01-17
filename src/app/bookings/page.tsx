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
  PageHeader,
  Section,
  Grid,
  GridCol,
  FrostedCard,
  Panel,
  Button,
  IconButton,
  Input,
  Select,
  Switch,
  Badge,
  StatCard,
  DataTable,
  CardList,
  Skeleton,
  EmptyState,
  ErrorState,
  Drawer,
  BottomSheet,
  Flex,
  DataRow,
  Tooltip,
  useToast,
} from '@/components/ui';
import { CommandLauncher } from '@/components/command';
import { Command, CommandResult } from '@/commands/types';
import { useCommands } from '@/hooks/useCommands';
import { useMobile } from '@/lib/use-mobile';
import { tokens } from '@/lib/design-tokens';
import { AppShell } from '@/components/layout/AppShell';
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
  const [showSearchBar, setShowSearchBar] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterService, setFilterService] = useState<string>('all');
  const [filterSitter, setFilterSitter] = useState<string>('all');
  const [filterPaidStatus, setFilterPaidStatus] = useState<string>('all');
  const [showCompleted, setShowCompleted] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

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
    return bookings.filter((booking) => {
      // Search
      if (debouncedSearchTerm) {
        const search = debouncedSearchTerm.toLowerCase();
        const matchesSearch = 
          `${booking.firstName} ${booking.lastName}`.toLowerCase().includes(search) ||
          booking.address?.toLowerCase().includes(search) ||
          booking.pets?.some(p => p.name?.toLowerCase().includes(search));
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filterStatus !== 'all' && booking.status !== filterStatus) return false;

      // Service filter
      if (filterService !== 'all' && booking.service !== filterService) return false;

      // Sitter filter
      if (filterSitter !== 'all' && booking.sitter?.id !== filterSitter) return false;

      // Paid status filter
      if (filterPaidStatus !== 'all' && booking.paidStatus !== filterPaidStatus) return false;

      // Show completed
      if (!showCompleted && booking.status === 'completed') return false;

      return true;
    }).sort((a, b) => {
      const aDate = new Date(a.startAt).getTime();
      const bDate = new Date(b.startAt).getTime();
      return aDate - bDate;
    });
  }, [bookings, debouncedSearchTerm, filterStatus, filterService, filterSitter, filterPaidStatus, showCompleted]);

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

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterStatus !== 'all') count++;
    if (filterService !== 'all') count++;
    if (filterSitter !== 'all') count++;
    if (filterPaidStatus !== 'all') count++;
    if (showCompleted) count++;
    return count;
  }, [filterStatus, filterService, filterSitter, filterPaidStatus, showCompleted]);

  // Filters panel (for drawer) - Phase F2: Tighter spacing for premium feel
  const filtersPanel = (
    <Flex direction="column" gap={3}> {/* Phase F2: Reduced gap from 4 to 3 for density */}
      <Select
        label="Status"
        value={filterStatus}
        onChange={(e) => setFilterStatus(e.target.value)}
        size="md"
        options={[
          { value: 'all', label: 'All Statuses' },
          { value: 'pending', label: 'Pending' },
          { value: 'confirmed', label: 'Confirmed' },
          { value: 'in-progress', label: 'In Progress' },
          { value: 'completed', label: 'Completed' },
          { value: 'cancelled', label: 'Cancelled' },
        ]}
      />

      <Select
        label="Service Type"
        value={filterService}
        onChange={(e) => setFilterService(e.target.value)}
        size="md"
        options={[
          { value: 'all', label: 'All Services' },
          { value: 'Dog Walking', label: 'Dog Walking' },
          { value: 'Drop-in Visit', label: 'Drop-in Visit' },
          { value: 'Housesitting', label: 'Housesitting' },
          { value: '24/7 Care', label: '24/7 Care' },
        ]}
      />

      <Select
        label="Sitter"
        value={filterSitter}
        onChange={(e) => setFilterSitter(e.target.value)}
        size="md"
        options={[
          { value: 'all', label: 'All Sitters' },
          ...sitters.map(s => ({ value: s.id, label: `${s.firstName} ${s.lastName}` })),
        ]}
      />

      <Select
        label="Paid Status"
        value={filterPaidStatus}
        onChange={(e) => setFilterPaidStatus(e.target.value)}
        size="md"
        options={[
          { value: 'all', label: 'All' },
          { value: 'paid', label: 'Paid' },
          { value: 'unpaid', label: 'Unpaid' },
          { value: 'partial', label: 'Partial' },
        ]}
      />

      <Switch
        label="Show Completed"
        checked={showCompleted}
        onChange={setShowCompleted}
      />
    </Flex>
  );

  return (
    <AppShell>
      <PageHeader
        title="Bookings"
        actions={
          <Flex align="center" gap={1}> {/* Phase F2: Tighter control bar spacing for command feel */}
            <IconButton
              icon={<i className="fas fa-search" />}
              onClick={() => setShowSearchBar(!showSearchBar)}
              aria-label="Toggle search"
            />
            <Flex align="center" gap={0.5}> {/* Phase F2: Tighter badge integration */}
              <IconButton
                icon={<i className="fas fa-filter" />}
                onClick={() => setShowFiltersDrawer(true)}
                aria-label="Open filters"
              />
              {activeFilterCount > 0 && (
                <Badge variant="default">{activeFilterCount}</Badge>
              )}
            </Flex>
            <Button size="md" onClick={() => router.push('/bookings/new')}>
              New Booking
            </Button>
          </Flex>
        }
      />

      {/* Inline Search Bar - Phase F2.1: Premium feel - clear text, high contrast */}
      {showSearchBar && (
        <div style={{ padding: `${tokens.spacing[2]} ${tokens.spacing[4]}` }}> {/* Phase F2.1: Tighter vertical padding */}
          <Input
            placeholder="Search by name, phone, or service..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
            size="md"
            style={{ 
              color: tokens.colors.text.primary, // Phase F2.1: Ensure primary text color for readability
            }}
          />
        </div>
      )}

      {loading && bookings.length === 0 ? (
        <div style={{ padding: tokens.spacing[6] }}>
          <Skeleton height="600px" />
        </div>
      ) : error && bookings.length === 0 ? (
        <ErrorState
          title="Failed to load bookings"
          message={error}
          action={
            <Button onClick={fetchData}>
              Retry
            </Button>
          }
        />
      ) : (
        <>
          {/* Overview Section - Phase F2.1: Secondary - reduced visual weight */}
          <Section heading="Overview">
            <Grid gap={2}> {/* Phase F2: Maintain disciplined spacing */}
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

            {/* Resonance: Suggestions Panel - Phase F2: Subordinate, minimal separation */}
            {ENABLE_RESONANCE_V1 && !isMobile && (
              <div style={{ marginTop: tokens.spacing[1] }}> {/* Phase F2: Maintain minimal separation */}
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


          {/* Bookings List Section - Phase F2.1: Primary anchor - strongest visual hierarchy */}
          <Section heading="Bookings List">
            <div style={{ 
            border: `1px solid ${tokens.colors.border.default}`, 
            boxShadow: tokens.shadow.lg,
            borderRadius: tokens.radius.md,
            backgroundColor: tokens.colors.surface.primary // Phase F2.1: Neutral white primary surface
          }}> {/* Phase F2.1: Stronger border and shadow for primary surface dominance - DataTable handles its own overflow */}
            <Panel padding={false}>
              {loading ? (
                <div style={{ padding: tokens.spacing[3] }}> {/* Phase F2: Tighter padding for density */}
                  <Skeleton height="400px" />
                </div>
              ) : filteredBookings.length === 0 ? (
                <div style={{ padding: tokens.spacing[5] }}> {/* Phase F2: Balanced empty state padding */}
                  <EmptyState
                    title={bookings.length === 0 ? "No bookings" : "No matches"}
                    description={
                      bookings.length === 0
                        ? undefined // Phase F2: Operational neutrality
                        : undefined // Phase F2: Direct, neutral
                    }
                    action={{
                      label: 'Create Booking',
                      onClick: () => router.push('/bookings/new'),
                    }}
                  />
                </div>
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
                        padding: tokens.spacing[3], // Phase F2: Tighter mobile card padding for density
                        border: `1px solid ${tokens.colors.border.default}`,
                        borderRadius: tokens.radius.md,
                        cursor: 'pointer',
                        transition: `all ${tokens.motion.duration.fast} ${tokens.motion.easing.standard}`, // Phase F2.1: Smooth interaction states
                        backgroundColor: tokens.colors.surface.primary,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = tokens.colors.border.strong;
                        e.currentTarget.style.boxShadow = tokens.shadow.md;
                        e.currentTarget.style.backgroundColor = tokens.colors.accent.tertiary;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = tokens.colors.border.default;
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.backgroundColor = tokens.colors.surface.primary;
                      }}
                      onTouchStart={(e) => {
                        e.currentTarget.style.backgroundColor = tokens.colors.accent.secondary;
                      }}
                      onTouchEnd={(e) => {
                        e.currentTarget.style.backgroundColor = tokens.colors.surface.primary;
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.outline = `2px solid ${tokens.colors.border.focus}`;
                        e.currentTarget.style.outlineOffset = '2px';
                        e.currentTarget.style.borderColor = tokens.colors.border.strong;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.outline = 'none';
                        e.currentTarget.style.borderColor = tokens.colors.border.default;
                      }}
                    >
                      <Flex direction="column" gap={2}>
                        <Flex justify="space-between" align="center">
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Tooltip content={`${booking.firstName} ${booking.lastName}`} placement="top">
                              <div style={{ 
                                fontWeight: tokens.typography.fontWeight.semibold,
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {booking.firstName} {booking.lastName}
                              </div>
                            </Tooltip>
                            <Tooltip content={booking.service} placement="top">
                              <div style={{ 
                                fontSize: tokens.typography.fontSize.sm[0], 
                                color: tokens.colors.text.secondary,
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {booking.service}
                              </div>
                            </Tooltip>
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
                          <Badge variant={booking.status === 'confirmed' ? 'success' : booking.status === 'pending' ? 'warning' : 'default'}>
                            {booking.status}
                          </Badge>
                        </Flex>
                        <DataRow label="Date" value={formatDateTime(booking.startAt)} />
                        <DataRow label="Sitter" value={booking.sitter ? `${booking.sitter.firstName} ${booking.sitter.lastName}` : 'Unassigned'} />
                        <DataRow label="Total" value={`$${booking.totalPrice.toFixed(2)}`} />
                        {/* Phase F2: Ensure all mobile card text is readable and not clipped */}
                        {booking.paidStatus && (
                          <Badge variant={booking.paidStatus === 'paid' ? 'success' : 'warning'}>
                            {booking.paidStatus}
                          </Badge>
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
                      render: (booking: Booking) => (
                        <div style={{ 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap',
                          maxWidth: '200px'
                        }} title={formatDateTime(booking.startAt)}>
                          {formatDateTime(booking.startAt)}
                        </div>
                      ),
                    },
                    {
                      key: 'client',
                      header: 'Client',
                      render: (booking: Booking) => {
                        const clientName = `${booking.firstName} ${booking.lastName}`;
                        return (
                          <Tooltip content={clientName} placement="top">
                            <div style={{ 
                              textOverflow: 'ellipsis', 
                              whiteSpace: 'nowrap',
                              maxWidth: '180px'
                            }}>
                              {clientName}
                            </div>
                          </Tooltip>
                        );
                      },
                    },
                    {
                      key: 'service',
                      header: 'Service',
                      render: (booking: Booking) => (
                        <Tooltip content={booking.service} placement="top">
                          <div style={{ 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap',
                            maxWidth: '150px'
                          }}>
                            {booking.service}
                          </div>
                        </Tooltip>
                      ),
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (booking: Booking) => (
                        <Flex direction="column" gap={1}>
                          <Badge variant={booking.status === 'confirmed' ? 'success' : booking.status === 'pending' ? 'warning' : 'default'}>
                            {booking.status}
                          </Badge>
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
                      render: (booking: Booking) => {
                        const sitterName = booking.sitter ? `${booking.sitter.firstName} ${booking.sitter.lastName}` : 'Unassigned';
                        return (
                          <Tooltip content={sitterName} placement="top">
                          <div style={{ 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap',
                            maxWidth: '150px',
                            color: booking.sitter ? tokens.colors.text.primary : tokens.colors.text.secondary
                          }}>
                              {sitterName}
                            </div>
                          </Tooltip>
                        );
                      },
                    },
                    {
                      key: 'total',
                      header: 'Total',
                      render: (booking: Booking) => (
                        <div style={{ 
                          fontVariantNumeric: 'tabular-nums',
                          fontWeight: tokens.typography.fontWeight.medium,
                          color: tokens.colors.text.primary
                        }}>
                          ${booking.totalPrice.toFixed(2)}
                        </div>
                      ),
                    },
                    {
                      key: 'paid',
                      header: 'Paid',
                      render: (booking: Booking) => booking.paidStatus ? (
                        <Badge variant={booking.paidStatus === 'paid' ? 'success' : 'warning'}>
                          {booking.paidStatus}
                        </Badge>
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
          </div>
          </Section>
        </>
      )}

      {/* Filters Drawer - Phase F2: Premium feel, compact spacing */}
      <Drawer
        isOpen={showFiltersDrawer}
        onClose={() => setShowFiltersDrawer(false)}
        placement={isMobile ? "left" : "right"}
        title="Filters"
      >
        <div style={{ padding: tokens.spacing[3] }}> {/* Phase F2: Tighter drawer padding */}
          {filtersPanel}
          <div style={{ marginTop: tokens.spacing[3] }}> {/* Phase F2: Reduced spacing */}
          <Flex direction="column" gap={2}>
            <Button 
              variant="primary" 
              size="md"
              onClick={() => setShowFiltersDrawer(false)}
            >
              Apply Filters
            </Button>
            {activeFilterCount > 0 && (
              <Button 
                variant="ghost" 
                size="md"
                onClick={() => {
                  setFilterStatus('all');
                  setFilterService('all');
                  setFilterSitter('all');
                  setFilterPaidStatus('all');
                  setShowCompleted(false);
                }}
              >
                Clear All Filters
              </Button>
            )}
          </Flex>
          </div>
        </div>
      </Drawer>

      {/* Booking Details Drawer */}
      {isMobile ? (
        <BottomSheet
          isOpen={showBookingDrawer}
          onClose={() => {
            setShowBookingDrawer(false);
            setSelectedBooking(null);
          }}
          title={selectedBooking ? `${selectedBooking.firstName} ${selectedBooking.lastName}` : 'Booking Details'}
          dragHandle
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
                    if (result.redirect) {
                      router.push(result.redirect);
                    }
                    fetchData(); // Refresh data
                  } else {
                    showToast({ variant: 'error', message: result.message || 'Command failed' });
                  }
                });
              }}
            />
          )}
        </BottomSheet>
      ) : (
        <Drawer
          isOpen={showBookingDrawer}
          onClose={() => {
            setShowBookingDrawer(false);
            setSelectedBooking(null);
          }}
          placement="right"
          title={selectedBooking ? `${selectedBooking.firstName} ${selectedBooking.lastName}` : 'Booking Details'}
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
                    if (result.redirect) {
                      router.push(result.redirect);
                    }
                    fetchData(); // Refresh data
                  } else {
                    showToast({ variant: 'error', message: result.message || 'Command failed' });
                  }
                });
              }}
            />
          )}
        </Drawer>
      )}
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
    <div style={{ padding: tokens.spacing[3] }}> {/* Phase F2: Tighter drawer content padding */}
      <Flex direction="column" gap={4}> {/* Phase F2: Reduced gap for density */}
        {/* Summary Header - Phase F2.1: Instrument panel style */}
        <Flex direction="column" gap={3}>
          <div style={{ 
            borderBottom: `1px solid ${tokens.colors.border.muted}`, 
            paddingBottom: tokens.spacing[3],
            marginBottom: tokens.spacing[2]
          }}> {/* Phase F2.1: Intentional divider */}
            <Flex justify="space-between" align="center" gap={3}>
              <div style={{ 
                fontSize: tokens.typography.fontSize.xl[0], 
                fontWeight: tokens.typography.fontWeight.bold,
                color: tokens.colors.text.primary,
                flex: 1,
                minWidth: 0,
                // Phase F2.1: Text truncation with title attribute (no overflow property)
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '100%'
              }} title={booking.service}>
                {booking.service}
              </div>
              <Flex gap={2}> {/* Phase F2.1: Badge container */}
                <Badge variant={booking.status === 'confirmed' ? 'success' : booking.status === 'pending' ? 'warning' : 'default'}>
                  {booking.status}
                </Badge>
                {booking.paidStatus && (
                  <Badge variant={booking.paidStatus === 'paid' ? 'success' : 'warning'}>
                    {booking.paidStatus}
                  </Badge>
                )}
              </Flex>
            </Flex>
          </div>
          <DataRow label="Date/Time" value={`${formatDate(booking.startAt)} ${formatTime(booking.startAt)} - ${formatTime(booking.endAt)}`} />
          {ENABLE_RESONANCE_V1 && getBookingSignals && (
            <div style={{ marginTop: tokens.spacing[2] }}>
              <SignalStack signals={getBookingSignals(booking.id)} />
            </div>
          )}
        </Flex>

        {/* Contact and Location - Phase F2.1: Section with divider */}
        <div style={{ borderTop: `1px solid ${tokens.colors.border.muted}`, paddingTop: tokens.spacing[3] }}>
          <Flex direction="column" gap={3}>
            <div style={{ 
              fontSize: tokens.typography.fontSize.base[0], 
              fontWeight: tokens.typography.fontWeight.semibold,
              color: tokens.colors.text.primary // Phase F2.1: Ensure primary color for section headers
            }}>
              Contact & Location
            </div>
          {booking.address && <DataRow label="Address" value={booking.address} copyable />}
          {booking.entryInstructions && <DataRow label="Entry Instructions" value={booking.entryInstructions} />}
          {booking.lockboxCode && <DataRow label="Lockbox Code" value={booking.lockboxCode} copyable />}
          {booking.emergencyContact && <DataRow label="Emergency Contact" value={booking.emergencyContact} />}
          {booking.phone && <DataRow label="Phone" value={booking.phone} copyable />}
          {booking.email && <DataRow label="Email" value={booking.email} copyable />}
          </Flex>
        </div>

        {/* Schedule - Phase F2.1: Section with divider */}
        {booking.timeSlots && booking.timeSlots.length > 0 && (
          <div style={{ borderTop: `1px solid ${tokens.colors.border.muted}`, paddingTop: tokens.spacing[3] }}>
            <Flex direction="column" gap={3}>
              <div style={{ 
                fontSize: tokens.typography.fontSize.base[0], 
                fontWeight: tokens.typography.fontWeight.semibold,
                color: tokens.colors.text.primary // Phase F2.1: Ensure primary color
              }}>
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
          </div>
        )}

        {/* Pets - Phase F2.1: Section with divider */}
        {booking.pets && booking.pets.length > 0 && (
          <div style={{ borderTop: `1px solid ${tokens.colors.border.muted}`, paddingTop: tokens.spacing[3] }}>
            <Flex direction="column" gap={3}>
              <div style={{ 
                fontSize: tokens.typography.fontSize.base[0], 
                fontWeight: tokens.typography.fontWeight.semibold,
                color: tokens.colors.text.primary // Phase F2.1: Ensure primary color
              }}>
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
          </div>
        )}

        {/* Sitter Assignment - Phase F2.1: Section with divider */}
        <div style={{ borderTop: `1px solid ${tokens.colors.border.muted}`, paddingTop: tokens.spacing[3] }}>
          <Flex direction="column" gap={3}>
            <div style={{ 
              fontSize: tokens.typography.fontSize.base[0], 
              fontWeight: tokens.typography.fontWeight.semibold,
              color: tokens.colors.text.primary // Phase F2.1: Ensure primary color
            }}>
              Sitter Assignment
            </div>
          <DataRow
            label="Assigned Sitter"
            value={booking.sitter ? `${booking.sitter.firstName} ${booking.sitter.lastName}` : 'Unassigned'}
          />
          </Flex>
        </div>

        {/* Payments - Phase F2.1: Section with divider */}
        <div style={{ borderTop: `1px solid ${tokens.colors.border.muted}`, paddingTop: tokens.spacing[3] }}>
          <Flex direction="column" gap={3}>
            <div style={{ 
              fontSize: tokens.typography.fontSize.base[0], 
              fontWeight: tokens.typography.fontWeight.semibold,
              color: tokens.colors.text.primary // Phase F2.1: Ensure primary color
            }}>
              Payments
            </div>
          <DataRow label="Total" value={`$${booking.totalPrice.toFixed(2)}`} />
          <DataRow label="Paid Status" value={booking.paidStatus || 'Unknown'} />
          </Flex>
        </div>

        {/* Quick Actions - Phase F2.1: Section with divider */}
        <div style={{ borderTop: `1px solid ${tokens.colors.border.muted}`, paddingTop: tokens.spacing[3] }}>
          <Flex direction="column" gap={3}>
            <div style={{ 
              fontSize: tokens.typography.fontSize.base[0], 
              fontWeight: tokens.typography.fontWeight.semibold,
              color: tokens.colors.text.primary // Phase F2.1: Ensure primary color
            }}>
              Quick Actions
            </div>
          <CommandLauncher
            context={commandContext}
            maxSuggestions={5}
            onCommandSelect={onCommandSelect}
          />
          </Flex>
        </div>
      </Flex>
    </div>
  );
}
