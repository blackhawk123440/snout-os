  /**
 * Sitter Dashboard Page - Enterprise Rebuild
 * 
 * Complete rebuild using design system and components.
 * Zero legacy styling - all through components and tokens.
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  PageHeader,
  Card,
  StatCard,
  Tabs,
  TabPanel,
  Button,
  Badge,
  EmptyState,
  Skeleton,
  SectionHeader,
  MobileFilterBar,
  Flex,
  Grid,
  GridCol,
  useToast,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';
import { useMobile } from '@/lib/use-mobile';
import { BookingScheduleDisplay } from '@/components/booking';
import { SitterTierBadge } from '@/components/sitter';
import { CalendarGrid, type CalendarDay as CalendarGridDay } from '@/components/calendar';
import { BookingStatusInlineControl } from '@/components/bookings/BookingStatusInlineControl';
import { SitterPoolPicker } from '@/components/bookings/SitterPoolPicker';

interface DashboardJob {
  id: string;
  bookingId: string;
  type: "direct" | "pool";
  status: "needs_response" | "accepted" | "too_late" | "expired" | "completed" | "cancelled";
  poolOfferId?: string;
  clientName: string;
  service: string;
  startAt: string;
  endAt: string;
  timeSlots: Array<{
    id: string;
    startAt: string;
    endAt: string;
    duration: number;
  }>;
  address: string;
  pets: Array<{ species: string; name?: string }>;
  totalPrice: number;
  notes?: string | null;
  expiresAt?: string;
  message?: string;
  createdAt: string;
}

interface DashboardData {
  sitter: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    commissionPercentage: number;
  };
  jobs: {
    needsResponse: DashboardJob[];
    accepted: DashboardJob[];
    tooLate: DashboardJob[];
    archived: DashboardJob[];
  };
  tier: {
    id: string;
    name: string;
    priorityLevel: number;
    pointTarget: number;
    minCompletionRate: number | null;
    minResponseRate: number | null;
    benefits: any;
  } | null;
  performance: {
    points: number;
    completionRate: number;
    responseRate: number;
    jobsReceived: number;
    jobsDeclined: number;
    jobsAccepted: number;
    acceptanceRate: number;
    periodStart: string;
    periodEnd: string;
  };
  nextTier: {
    id: string;
    name: string;
    pointTarget: number;
    minCompletionRate: number | null;
    minResponseRate: number | null;
  } | null;
  improvementAreas: string[];
  tierHistory: Array<{
    id: string;
    tierName: string;
    points: number;
    completionRate: number | null;
    responseRate: number | null;
    periodStart: string;
    periodEnd: string | null;
    createdAt: string;
  }>;
  isAdminView: boolean;
}

type TabType = "pending" | "accepted" | "archived" | "tooLate" | "tier";

function SitterDashboardContent() {
  const isMobile = useMobile();
  const searchParams = useSearchParams();
  const sitterId = searchParams?.get("id") || "";
  const isAdminView = searchParams?.get("admin") === "true";
  
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [viewMode, setViewMode] = useState<"calendar" | "list">("list");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [acceptingJobId, setAcceptingJobId] = useState<string | null>(null);
  const [sendingDelightBookingId, setSendingDelightBookingId] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (sitterId) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [sitterId, isAdminView]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/sitters/${sitterId}/dashboard?admin=${isAdminView}`);
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      } else {
        console.error("Failed to fetch dashboard data");
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendDelight = async (bookingId: string) => {
    setSendingDelightBookingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/daily-delight`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast({ message: data.error || 'Failed to send Daily Delight', variant: 'error' });
        return;
      }
      const report = data.report;
      showToast({
        message: report ? `Daily Delight sent! ${report}` : 'Daily Delight sent to client!',
        variant: 'success',
        duration: 6000,
      });
    } catch {
      showToast({ message: 'Failed to send Daily Delight', variant: 'error' });
    } finally {
      setSendingDelightBookingId(null);
    }
  };

  const acceptJob = async (job: DashboardJob) => {
    if (!job.poolOfferId) {
      alert("This job cannot be accepted");
      return;
    }

    setAcceptingJobId(job.id);
    try {
      const response = await fetch(`/api/sitters/${sitterId}/dashboard/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poolOfferId: job.poolOfferId }),
      });

      if (response.ok) {
        alert("Job accepted successfully!");
        fetchDashboardData();
      } else {
        const error = await response.json();
        alert(`Failed to accept job: ${error.error}`);
      }
    } catch (error) {
      console.error("Failed to accept job:", error);
      alert("Failed to accept job");
    } finally {
      setAcceptingJobId(null);
    }
  };

  // Format functions for simple date/time displays (expires, calendar cells)
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (date: Date | string) => {
    const dateObj = new Date(date);
    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const getCalendarJobs = () => {
    if (!dashboardData) return [];
    return dashboardData.jobs.accepted.map((job) => {
      const startDate = new Date(job.startAt);
      return {
        ...job,
        date: startDate,
        day: startDate.getDate(),
        month: startDate.getMonth(),
        year: startDate.getFullYear(),
      };
    });
  };

  const getJobsForDate = (day: number, month: number, year: number) => {
    const calendarJobs = getCalendarJobs();
    return calendarJobs.filter(
      (job) => job.day === day && job.month === month && job.year === year
    );
  };

  if (loading) {
    return (
      <AppShell>
        <PageHeader title={isAdminView ? "Sitter Dashboard" : "My Dashboard"} />
        <div style={{ padding: tokens.spacing[4] }}> {/* Phase E: Tighter density to match Dashboard */}
          <Skeleton height={200} />
        </div>
      </AppShell>
    );
  }

  if (!dashboardData) {
    return (
      <AppShell>
        <PageHeader title={isAdminView ? "Sitter Dashboard" : "My Dashboard"} />
        <div style={{ padding: tokens.spacing[4] }}> {/* Phase E: Tighter density to match Dashboard */}
          <EmptyState
            title="Failed to load dashboard data"
            description="Please try refreshing the page"
          />
        </div>
      </AppShell>
    );
  }

  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
  const firstDay = getFirstDayOfMonth(selectedMonth, selectedYear);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const tabs: Array<{ id: TabType; label: string; badge?: number }> = [
    { id: "pending", label: "Pending", badge: dashboardData.jobs.needsResponse.length },
    { id: "accepted", label: "Accepted", badge: dashboardData.jobs.accepted.length },
    { id: "archived", label: "Archived", badge: dashboardData.jobs.archived.length },
    { id: "tooLate", label: "Too Late", badge: dashboardData.jobs.tooLate.length },
    { id: "tier", label: "Tier" },
  ];

  return (
    <AppShell>
      <PageHeader
        title={isAdminView ? `Sitter Dashboard: ${dashboardData.sitter.firstName} ${dashboardData.sitter.lastName}` : "My Dashboard"}
        description={isAdminView ? "Read-only admin view" : undefined}
        actions={
          dashboardData.tier ? (
            <SitterTierBadge tier={dashboardData.tier} />
          ) : undefined
        }
      />

      <div style={{ padding: tokens.spacing[4] }}> {/* Phase E: Tighter density to match Dashboard */}
        {isMobile ? (
          <>
            {/* Name/Tier Container - Centered with other containers */}
            {isAdminView && (
              <Card style={{ 
                marginBottom: tokens.spacing[6],
                padding: tokens.spacing[6],
                textAlign: 'center',
              }}>
                <Flex direction="column" align="center">
                <div style={{ 
                  fontSize: tokens.typography.fontSize['2xl'][0], // Made bigger
                  fontWeight: tokens.typography.fontWeight.bold,
                  color: tokens.colors.text.primary,
                  marginBottom: tokens.spacing[3],
                }}>
                  {dashboardData.sitter.firstName} {dashboardData.sitter.lastName}
                </div>
                {dashboardData.tier && (
                  <SitterTierBadge tier={dashboardData.tier} />
                )}
                </Flex>
              </Card>
            )}
            
            <div style={{ width: '100%', marginBottom: tokens.spacing[4], paddingLeft: tokens.spacing[4], paddingRight: tokens.spacing[4] }}>
              <Flex justify="center" align="center">
              <div style={{ width: '100%', maxWidth: '100%' }}>
                <Card style={{ padding: tokens.spacing[4], marginBottom: tokens.spacing[4] }}>
                  <MobileFilterBar
                    activeFilter={activeTab}
                    onFilterChange={(filterId) => setActiveTab(filterId as TabType)}
                    sticky={false}
                    options={tabs.map(tab => ({ 
                      id: tab.id, 
                      label: tab.label, 
                      badge: tab.badge 
                    }))}
                  />
                </Card>
              </div>
              </Flex>
            </div>
            {/* Mobile: Render content based on activeTab */}
            {activeTab === 'pending' && (
              <Card style={{ padding: tokens.spacing[4] }}> {/* Phase E: Match Dashboard density */}
                <SectionHeader title={`Pending Requests (${dashboardData.jobs.needsResponse.length})`} />
                <div>
                  {dashboardData.jobs.needsResponse.length > 0 ? (
                    <Flex direction="column" gap={6}> {/* Batch 3: UI Constitution compliance */}
                      {dashboardData.jobs.needsResponse.map((job) => (
                        <Card key={job.id} style={{ padding: tokens.spacing[6] }}> {/* Increased padding */}
                          <Flex align="flex-start" justify="space-between" gap={4}>
                            <div style={{ flex: 1 }}>
                              <div style={{ marginBottom: tokens.spacing[3] }}>
                                <Flex align="center" gap={3}>
                                <div style={{ fontWeight: tokens.typography.fontWeight.bold, fontSize: tokens.typography.fontSize.xl[0] }}> {/* Made bigger */}
                                  {job.clientName}
                                </div>
                                <Badge variant="warning">Pool Request</Badge>
                                {job.expiresAt && new Date(job.expiresAt) > new Date() && (
                                  <div style={{ fontSize: tokens.typography.fontSize.base[0], color: tokens.colors.text.secondary }}> {/* Made bigger */}
                                    Expires: {formatDate(job.expiresAt)} {formatTime(job.expiresAt)}
                                  </div>
                                )}
                              </Flex>
                              </div>
                              <div style={{ fontSize: tokens.typography.fontSize.base[0], color: tokens.colors.text.secondary }}> {/* Batch 3: UI Constitution compliance */}
                                <Flex direction="column" gap={2}>
                                <div><span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Service:</span> {job.service}</div>
                                <BookingScheduleDisplay
                                  service={job.service}
                                  startAt={job.startAt}
                                  endAt={job.endAt}
                                  timeSlots={job.timeSlots}
                                  address={job.address}
                                />
                                
                                <div>
                                  <span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Pets:</span>{" "}
                                  {job.pets.map((p, idx) => (
                                    <span key={idx}>
                                      {p.name || p.species} ({p.species})
                                      {idx < job.pets.length - 1 ? ", " : ""}
                                    </span>
                                  ))}
                                </div>
                                <div style={{ fontSize: tokens.typography.fontSize.base[0], fontWeight: tokens.typography.fontWeight.semibold }}>
                                  <span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Earnings:</span> ${((job.totalPrice * dashboardData.sitter.commissionPercentage) / 100).toFixed(2)}
                                </div>
                                {job.message && (
                                  <Card style={{ marginTop: tokens.spacing[2], padding: tokens.spacing[2], backgroundColor: tokens.colors.neutral[50] }}>
                                    <div style={{ fontSize: tokens.typography.fontSize.xs[0] }}>{job.message}</div>
                                  </Card>
                                )}
                              </Flex>
                              </div>
                            </div>
                            {!isAdminView && (
                              <div style={{ width: '100%' }}>
                                <Flex direction="column" gap={3}>
                                <Button
                                  variant="primary"
                                  size="md"
                                  onClick={() => acceptJob(job)}
                                  disabled={acceptingJobId === job.id || !!(job.expiresAt && new Date(job.expiresAt) < new Date())}
                                  style={{ width: '100%' }}
                                >
                                  {acceptingJobId === job.id ? "Accepting..." : "Accept"}
                                </Button>
                                <Button variant="tertiary" size="md" disabled style={{ width: '100%' }}>
                                  Decline
                                </Button>
                              </Flex>
                              </div>
                            )}
                        </Flex>
                        </Card>
                      ))}
                    </Flex>
                  ) : (
                    <EmptyState
                      title="No Pending Requests"
                      description="You don't have any pending job requests"
                      icon={<i className="fas fa-inbox" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
                    />
                  )}
                </div>
              </Card>
            )}
            {activeTab === 'accepted' && (
              <>
                <div style={{ marginBottom: tokens.spacing[4] }}>
                  <Flex justify="flex-end">
                    <Button
                      variant={viewMode === "calendar" ? "primary" : "secondary"}
                      size="md"
                      onClick={() => setViewMode(viewMode === "calendar" ? "list" : "calendar")}
                      leftIcon={<i className={viewMode === "calendar" ? "fas fa-list" : "fas fa-calendar"} />}
                    >
                      {viewMode === "calendar" ? "List View" : "Calendar View"}
                    </Button>
                  </Flex>
                </div>
                {viewMode === "calendar" ? (
                  <>
                    <div style={{ marginBottom: tokens.spacing[4] }}>
                      <Flex align="center" justify="space-between">
                        <SectionHeader title="Calendar" />
                        <Flex align="center" gap={2}>
                        <Button
                          variant="tertiary"
                          size="sm"
                          onClick={() => {
                            if (selectedMonth === 0) {
                              setSelectedMonth(11);
                              setSelectedYear(selectedYear - 1);
                            } else {
                              setSelectedMonth(selectedMonth - 1);
                            }
                          }}
                        >
                          ←
                        </Button>
                        <div style={{ fontWeight: tokens.typography.fontWeight.semibold, minWidth: '200px', textAlign: 'center' }}>
                          {new Date(selectedYear, selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </div>
                        <Button
                          variant="tertiary"
                          size="sm"
                          onClick={() => {
                            if (selectedMonth === 11) {
                              setSelectedMonth(0);
                              setSelectedYear(selectedYear + 1);
                            } else {
                              setSelectedMonth(selectedMonth + 1);
                            }
                          }}
                        >
                          →
                        </Button>
                        </Flex>
                      </Flex>
                    </div>
                    {(() => {
                      // Build CalendarGrid-compatible days array
                      const monthStart = new Date(selectedYear, selectedMonth, 1);
                      const monthEnd = new Date(selectedYear, selectedMonth + 1, 0);
                      const firstDayOfWeek = monthStart.getDay();
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);

                      const calendarDays: CalendarGridDay[] = [];

                      // Add previous month's trailing days
                      const prevMonthEnd = new Date(selectedYear, selectedMonth, 0);
                      for (let i = firstDayOfWeek - 1; i >= 0; i--) {
                        const date = new Date(selectedYear, selectedMonth - 1, prevMonthEnd.getDate() - i);
                        date.setHours(0, 0, 0, 0);
                        calendarDays.push({
                          date,
                          isCurrentMonth: false,
                          isToday: false,
                          isPast: date < today,
                          events: [],
                        });
                      }

                      // Add current month's days
                      for (let day = 1; day <= daysInMonth; day++) {
                        const date = new Date(selectedYear, selectedMonth, day);
                        date.setHours(0, 0, 0, 0);
                        const jobsForDay = getJobsForDate(day, selectedMonth, selectedYear);
                        calendarDays.push({
                          date,
                          isCurrentMonth: true,
                          isToday: date.getTime() === today.getTime(),
                          isPast: date < today && date.getTime() !== today.getTime(),
                          events: jobsForDay.map(job => ({
                            id: job.id,
                            clientName: job.clientName,
                            service: job.service,
                            startAt: job.startAt,
                            endAt: job.endAt,
                            timeSlots: job.timeSlots,
                          })),
                        });
                      }

                      // Add next month's leading days to complete the grid
                      const remainingDays = 42 - calendarDays.length;
                      for (let day = 1; day <= remainingDays; day++) {
                        const date = new Date(selectedYear, selectedMonth + 1, day);
                        date.setHours(0, 0, 0, 0);
                        calendarDays.push({
                          date,
                          isCurrentMonth: false,
                          isToday: false,
                          isPast: date < today,
                          events: [],
                        });
                      }

                      return (
                        <CalendarGrid
                          days={calendarDays}
                          selectedDate={null}
                          onDateSelect={() => {}}
                          monthName={new Date(selectedYear, selectedMonth).toLocaleDateString('en-US', { month: 'long' })}
                          year={selectedYear}
                          formatTime={formatTime}
                          renderEventLabel={(event) => event.clientName || event.service}
                        />
                      );
                    })()}
                  </>
                ) : (
                  <Card style={{ padding: tokens.spacing[4] }}> {/* Phase E: Match Dashboard density */}
                    <SectionHeader title={`Accepted Jobs (${dashboardData.jobs.accepted.length})`} />
                    <div>
                      {dashboardData.jobs.accepted.length > 0 ? (
                        <Flex direction="column" gap={6}> {/* Batch 3: UI Constitution compliance */}
                          {dashboardData.jobs.accepted.map((job) => (
                            <Card key={job.id} style={{ padding: tokens.spacing[6] }}> {/* Increased padding */}
                              <Flex align="flex-start" justify="space-between">
                                <div style={{ flex: 1 }}>
                                  <div style={{ marginBottom: tokens.spacing[3] }}>
                                <Flex align="center" gap={3}>
                                    <div style={{ fontWeight: tokens.typography.fontWeight.bold, fontSize: tokens.typography.fontSize.xl[0] }}> {/* Made bigger */}
                                      {job.clientName}
                                    </div>
                                    <Badge variant={job.type === "direct" ? "info" : "success"}>
                                      {job.type === "direct" ? "Direct Assignment" : "Pool Accepted"}
                                    </Badge>
                                  </Flex>
                                </div>
                                </div>
                                  <div style={{ fontSize: tokens.typography.fontSize.base[0], color: tokens.colors.text.secondary }}> {/* Batch 3: UI Constitution compliance */}
                                <Flex direction="column" gap={2}>
                                    <div><span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Service:</span> {job.service}</div>
                                    <div><span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Date:</span> {formatDate(job.startAt)}</div>
                                    {job.timeSlots.length > 0 && (
                                      <div>
                                        <span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Times:</span>{" "}
                                        {job.timeSlots.map((ts, idx) => (
                                          <span key={ts.id}>
                                            {formatTime(ts.startAt)} ({ts.duration} min)
                                            {idx < job.timeSlots.length - 1 ? ", " : ""}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    <div><span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Address:</span> {job.address}</div>
                                    <div>
                                      <span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Pets:</span>{" "}
                                      {job.pets.map((p, idx) => (
                                        <span key={idx}>
                                          {p.name || p.species} ({p.species})
                                          {idx < job.pets.length - 1 ? ", " : ""}
                                        </span>
                                      ))}
                                    </div>
                                    <div style={{ fontSize: tokens.typography.fontSize.base[0], fontWeight: tokens.typography.fontWeight.semibold }}>
                                      <span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Earnings:</span> ${((job.totalPrice * dashboardData.sitter.commissionPercentage) / 100).toFixed(2)}
                                    </div>
                                  </Flex>
                                </div>
                              </Flex>
                            </Card>
                          ))}
                        </Flex>
                      ) : (
                        <EmptyState
                          title="No Accepted Jobs"
                          description="You don't have any accepted jobs yet"
                          icon={<i className="fas fa-check-circle" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
                        />
                      )}
                    </div>
                  </Card>
                )}
              </>
            )}
            {activeTab === 'archived' && (
              <Card style={{ padding: tokens.spacing[4] }}> {/* Phase E: Match Dashboard density */}
                <SectionHeader title={`Archived Jobs (${dashboardData.jobs.archived.length})`} />
                <div>
                  {dashboardData.jobs.archived.length > 0 ? (
                    <Flex direction="column" gap={6}> {/* Batch 3: UI Constitution compliance */}
                      {dashboardData.jobs.archived.map((job) => (
                        <Card key={job.id} style={{ opacity: 0.75, padding: tokens.spacing[6] }}> {/* Increased padding */}
                          <Flex align="flex-start" justify="space-between">
                            <div style={{ flex: 1 }}>
                              <div style={{ marginBottom: tokens.spacing[3] }}>
                                <Flex align="center" gap={3}>
                                <div style={{ fontWeight: tokens.typography.fontWeight.bold, fontSize: tokens.typography.fontSize.xl[0] }}> {/* Made bigger */}
                                  {job.clientName}
                                </div>
                                <Badge variant={job.status === "completed" ? "success" : "neutral"}>
                                  {job.status === "completed" ? "Completed" : "Cancelled"}
                                </Badge>
                              </Flex>
                              </div>
                              </div>
                              <div style={{ fontSize: tokens.typography.fontSize.base[0], color: tokens.colors.text.secondary }}> {/* Batch 3: UI Constitution compliance */}
                                <Flex direction="column" gap={2}>
                                <div><span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Service:</span> {job.service}</div>
                                <div><span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Date:</span> {formatDate(job.startAt)}</div>
                                {job.timeSlots.length > 0 && (
                                  <div>
                                    <span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Times:</span>{" "}
                                    {job.timeSlots.map((ts, idx) => (
                                      <span key={ts.id}>
                                        {formatTime(ts.startAt)} ({ts.duration} min)
                                        {idx < job.timeSlots.length - 1 ? ", " : ""}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <div style={{ fontSize: tokens.typography.fontSize.base[0], fontWeight: tokens.typography.fontWeight.semibold }}>
                                  <span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Earnings:</span> ${((job.totalPrice * dashboardData.sitter.commissionPercentage) / 100).toFixed(2)}
                                </div>
                              </Flex>
                            </div>
                          </Flex>
                        </Card>
                      ))}
                    </Flex>
                  ) : (
                    <EmptyState
                      title="No Archived Jobs"
                      description="You don't have any completed or cancelled jobs"
                      icon={<i className="fas fa-archive" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
                    />
                  )}
                </div>
              </Card>
            )}
            {activeTab === 'tooLate' && (
              <Card style={{ padding: tokens.spacing[4] }}> {/* Phase E: Match Dashboard density */}
                <SectionHeader title={`Too Late / Expired (${dashboardData.jobs.tooLate.length})`} />
                <div>
                  {dashboardData.jobs.tooLate.length > 0 ? (
                    <Flex direction="column" gap={6}> {/* Batch 3: UI Constitution compliance */}
                      {dashboardData.jobs.tooLate.map((job) => (
                        <Card key={job.id} style={{ opacity: 0.6, padding: tokens.spacing[6] }}> {/* Increased padding */}
                          <Flex align="flex-start" justify="space-between">
                            <div style={{ flex: 1 }}>
                              <div style={{ marginBottom: tokens.spacing[3] }}>
                                <Flex align="center" gap={3}>
                                <div style={{ fontWeight: tokens.typography.fontWeight.bold, fontSize: tokens.typography.fontSize.xl[0] }}> {/* Made bigger */}
                                  {job.clientName}
                                </div>
                                <Badge variant="error">
                                  {job.status === "expired" ? "Expired" : "Too Late"}
                                </Badge>
                              </Flex>
                              </div>
                              <div style={{ fontSize: tokens.typography.fontSize.base[0], color: tokens.colors.text.secondary }}> {/* Batch 3: UI Constitution compliance */}
                                <Flex direction="column" gap={2}>
                                <div><span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Service:</span> {job.service}</div>
                                <div><span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Date:</span> {formatDate(job.startAt)}</div>
                                {job.status === "expired" && (
                                  <div style={{ fontSize: tokens.typography.fontSize.base[0], color: tokens.colors.error.DEFAULT }}> {/* Made bigger */}
                                    This job expired before anyone accepted it
                                  </div>
                                )}
                                {job.status === "too_late" && (
                                  <div style={{ fontSize: tokens.typography.fontSize.base[0], color: tokens.colors.error.DEFAULT }}> {/* Made bigger */}
                                    This job was accepted by another sitter
                                  </div>
                                )}
                              </Flex>
                              </div>
                            </div>
                          </Flex>
                        </Card>
                      ))}
                    </Flex>
                  ) : (
                    <EmptyState
                      title="No Missed Jobs"
                      description="You haven't missed any job opportunities"
                      icon={<i className="fas fa-clock" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
                    />
                  )}
                </div>
              </Card>
            )}
            {activeTab === 'tier' && (
              <>
                {dashboardData.tier && (
                  <Card style={{ marginBottom: tokens.spacing[4], padding: tokens.spacing[4] }}> {/* Phase E: Match Dashboard density */}
                    <SectionHeader title="Current Tier & Badge" />
                    <div>
                      <Flex align="center" gap={6}>
                        <div
                          style={{
                            width: '6rem',
                            height: '6rem',
                            borderRadius: tokens.borderRadius.full,
                            backgroundColor: tokens.colors.primary[100],
                            color: tokens.colors.primary.DEFAULT,
                            fontSize: tokens.typography.fontSize['4xl'][0],
                            fontWeight: tokens.typography.fontWeight.bold,
                          }}
                        >
                          <Flex align="center" justify="center">
                            ⭐
                          </Flex>
                        </div>
                        <div>
                          <div style={{ fontSize: tokens.typography.fontSize['3xl'][0], fontWeight: tokens.typography.fontWeight.bold, marginBottom: tokens.spacing[2], color: tokens.colors.primary.DEFAULT }}>
                            {dashboardData.tier.name}
                          </div>
                          <div style={{ fontSize: tokens.typography.fontSize.base[0], color: tokens.colors.text.secondary }}>
                            Priority Level: {dashboardData.tier.priorityLevel}
                          </div>
                          {Object.keys(dashboardData.tier.benefits || {}).length > 0 && (
                            <div style={{ marginTop: tokens.spacing[2] }}>
                              <div style={{ fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.semibold, color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                                Benefits:
                              </div>
                              <ul style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, listStyle: 'disc', listStylePosition: 'inside' }}>
                                {Object.entries(dashboardData.tier.benefits).map(([key, value]) => (
                                  <li key={key}>{key}: {String(value)}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </Flex>
                    </div>
                  </Card>
                )}
                <Card style={{ marginBottom: tokens.spacing[4], padding: tokens.spacing[4] }}> {/* Phase E: Match Dashboard density */}
                  <SectionHeader title="Performance Metrics (Last 30 Days)" />
                  <div>
                    <Grid gap={2}> {/* Batch 3: UI Constitution compliance */}
                      <GridCol span={isMobile ? 12 : undefined} md={6} lg={4}>
                      <div>
                        <StatCard
                          label="Points Earned"
                          value={dashboardData.performance.points}
                        />
                        {dashboardData.nextTier && (
                          <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.tertiary, marginTop: tokens.spacing[1], textAlign: 'center' }}>
                            Target: {dashboardData.nextTier.pointTarget} {/* Phase E: Neutral, operational */}
                          </div>
                        )}
                      </div>
                      <div>
                        <StatCard
                          label="Completion Rate"
                          value={`${dashboardData.performance.completionRate.toFixed(1)}%`}
                        />
                        {dashboardData.nextTier?.minCompletionRate && (
                          <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.tertiary, marginTop: tokens.spacing[1], textAlign: 'center' }}>
                            Target: {dashboardData.nextTier.minCompletionRate}% {/* Phase E: Neutral, operational */}
                          </div>
                        )}
                      </div>
                      <div>
                        <StatCard
                          label="Response Rate"
                          value={`${dashboardData.performance.responseRate.toFixed(1)}%`}
                        />
                        {dashboardData.nextTier?.minResponseRate && (
                          <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.tertiary, marginTop: tokens.spacing[1], textAlign: 'center' }}>
                            Target: {dashboardData.nextTier.minResponseRate}% {/* Phase E: Neutral, operational */}
                          </div>
                        )}
                      </div>
                      </GridCol>
                    </Grid>
                  </div>
                </Card>
                <Card style={{ marginBottom: tokens.spacing[4], padding: tokens.spacing[4] }}> {/* Phase E: Match Dashboard density */}
                  <SectionHeader title="Job Statistics" />
                  <div>
                    <Grid gap={2}> {/* Batch 3: UI Constitution compliance */}
                      <GridCol span={isMobile ? 12 : undefined} md={6} lg={3}>
                      <StatCard label="Jobs Received" value={dashboardData.performance.jobsReceived} />
                      <StatCard label="Jobs Accepted" value={dashboardData.performance.jobsAccepted} />
                      <StatCard label="Jobs Declined" value={dashboardData.performance.jobsDeclined} />
                      <StatCard label="Acceptance Rate" value={`${dashboardData.performance.acceptanceRate.toFixed(1)}%`} />
                      </GridCol>
                    </Grid>
                  </div>
                </Card>
                {dashboardData.improvementAreas.length > 0 && (
                  <Card style={{ marginBottom: tokens.spacing[4], padding: tokens.spacing[4] }}> {/* Phase E: Match Dashboard density */}
                    <SectionHeader title="Tier Requirements" /> {/* Phase E: Neutral, operational tone */}
                    <div>
                      {dashboardData.nextTier && (
                        <Card style={{ marginBottom: tokens.spacing[4], padding: tokens.spacing[4], backgroundColor: tokens.colors.primary[50] }}>
                          <div style={{ fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[2], color: tokens.colors.primary.DEFAULT }}>
                            Next Tier: {dashboardData.nextTier.name}
                          </div>
                        </Card>
                      )}
                      <Flex direction="column" gap={4}> {/* Batch 3: UI Constitution compliance */}
                        {dashboardData.improvementAreas.map((area, idx) => (
                          <Card key={idx} style={{ padding: tokens.spacing[4] }}> {/* Added padding */}
                            <Flex align="flex-start" gap={3}>
                              <div
                                style={{
                                  width: '1.5rem',
                                  height: '1.5rem',
                                  borderRadius: tokens.borderRadius.full,
                                  backgroundColor: tokens.colors.primary[100],
                                  color: tokens.colors.primary.DEFAULT,
                                  flexShrink: 0,
                                  fontSize: tokens.typography.fontSize.xs[0],
                                  fontWeight: tokens.typography.fontWeight.bold,
                                }}
                              >
                                <Flex align="center" justify="center">
                                  {idx + 1}
                                </Flex>
                              </div>
                              <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.primary }}>
                                {area}
                              </div>
                            </Flex>
                          </Card>
                        ))}
                      </Flex>
                    </div>
                  </Card>
                )}
                {dashboardData.tierHistory.length > 0 && (
                  <Card style={{ padding: tokens.spacing[4] }}> {/* Phase E: Match Dashboard density */}
                    <SectionHeader title="Tier History" />
                    <div>
                      <Flex direction="column" gap={4}> {/* Batch 3: UI Constitution compliance */}
                        {dashboardData.tierHistory.map((history) => (
                          <Card key={history.id} style={{ padding: tokens.spacing[4] }}> {/* Added padding */}
                            <div style={{ marginBottom: tokens.spacing[2] }}>
                              <Flex align="center" justify="space-between">
                              <span style={{ fontWeight: tokens.typography.fontWeight.bold, color: tokens.colors.primary.DEFAULT }}>
                                {history.tierName}
                              </span>
                              <span style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                                {new Date(history.createdAt).toLocaleDateString()}
                              </span>
                            </Flex>
                            </div>
                            <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                              <Flex direction="column" gap={1}>
                                <div>Points: {history.points}</div>
                                {history.completionRate !== null && (
                                  <div>Completion Rate: {history.completionRate.toFixed(1)}%</div>
                                )}
                                {history.responseRate !== null && (
                                  <div>Response Rate: {history.responseRate.toFixed(1)}%</div>
                                )}
                              </Flex>
                            </div>
                          </Card>
                        ))}
                      </Flex>
                    </div>
                  </Card>
                )}
              </>
            )}
          </>
        ) : (
          <Grid gap={6}>
            <GridCol span={8}>
            <div style={{ minWidth: 0 }}>
              <Tabs
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={(tab) => setActiveTab(tab as TabType)}
              >
            {/* Pending Tab */}
            <TabPanel id="pending">
            <Card>
              <SectionHeader title={`Pending Requests (${dashboardData.jobs.needsResponse.length})`} />
              <div style={{ padding: tokens.spacing[4] }}> {/* Phase E: Tighter density to match Dashboard */}
                {dashboardData.jobs.needsResponse.length > 0 ? (
                  <Flex direction="column" gap={4}> {/* Batch 3: UI Constitution compliance */}
                    {dashboardData.jobs.needsResponse.map((job) => (
                      <Card key={job.id}>
                        <Flex align="flex-start" justify="space-between" gap={4}>
                          <div style={{ flex: 1 }}>
                            <div style={{ marginBottom: tokens.spacing[2] }}>
                              <Flex align="center" gap={3}>
                              <div style={{ fontWeight: tokens.typography.fontWeight.bold, fontSize: tokens.typography.fontSize.lg[0] }}>
                                {job.clientName}
                              </div>
                              <Badge variant="warning">Pool Request</Badge>
                              {job.expiresAt && new Date(job.expiresAt) > new Date() && (
                                <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary }}>
                                  Expires: {formatDate(job.expiresAt)} {formatTime(job.expiresAt)}
                                </div>
                              )}
                              </Flex>
                            </div>
                            <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                              <Flex direction="column" gap={1}>
                                <div><span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Service:</span> {job.service}</div>
                                <div><span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Date:</span> {formatDate(job.startAt)}</div>
                                {job.timeSlots.length > 0 && (
                                  <div>
                                    <span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Times:</span>{" "}
                                    {job.timeSlots.map((ts, idx) => (
                                      <span key={ts.id}>
                                        {formatTime(ts.startAt)} ({ts.duration} min)
                                        {idx < job.timeSlots.length - 1 ? ", " : ""}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <div><span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Address:</span> {job.address}</div>
                                <div>
                                  <span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Pets:</span>{" "}
                                  {job.pets.map((p, idx) => (
                                    <span key={idx}>
                                      {p.name || p.species} ({p.species})
                                      {idx < job.pets.length - 1 ? ", " : ""}
                                    </span>
                                  ))}
                                </div>
                                <div style={{ fontSize: tokens.typography.fontSize.base[0], fontWeight: tokens.typography.fontWeight.semibold }}>
                                  <span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Earnings:</span> ${((job.totalPrice * dashboardData.sitter.commissionPercentage) / 100).toFixed(2)}
                                </div>
                                {job.message && (
                                  <Card style={{ marginTop: tokens.spacing[2], padding: tokens.spacing[2], backgroundColor: tokens.colors.neutral[50] }}>
                                    <div style={{ fontSize: tokens.typography.fontSize.sm[0] }}>{job.message}</div> {/* Made bigger */}
                                  </Card>
                                )}
                              </Flex>
                            </div>
                          </div>
                          {!isAdminView && (
                            <div style={{ width: '100%' }}>
                              <Flex direction="column" gap={3}>
                                <Button
                                  variant="primary"
                                  size="md"
                                  onClick={() => acceptJob(job)}
                                  disabled={acceptingJobId === job.id || !!(job.expiresAt && new Date(job.expiresAt) < new Date())}
                                  style={{ width: '100%' }}
                                >
                                  {acceptingJobId === job.id ? "Accepting..." : "Accept"}
                                </Button>
                                <Button variant="tertiary" size="md" disabled style={{ width: '100%' }}>
                                  Decline
                                </Button>
                              </Flex>
                            </div>
                          )}
                        </Flex>
                      </Card>
                    ))}
                  </Flex>
                ) : (
                  <EmptyState
                    title="No Pending Requests"
                    description="You don't have any pending job requests"
                    icon={<i className="fas fa-inbox" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
                  />
                )}
              </div>
            </Card>
          </TabPanel>

          {/* Accepted Tab */}
          <TabPanel id="accepted">
                <div style={{ marginBottom: tokens.spacing[4] }}>
                  <Flex justify="flex-end">
                    <Button
                      variant={viewMode === "calendar" ? "primary" : "secondary"}
                      onClick={() => setViewMode(viewMode === "calendar" ? "list" : "calendar")}
                      leftIcon={<i className={viewMode === "calendar" ? "fas fa-list" : "fas fa-calendar"} />}
                    >
                      {viewMode === "calendar" ? "List View" : "Calendar View"}
                    </Button>
                  </Flex>
            </div>

            {/* Calendar View */}
            {viewMode === "calendar" && (
              <Card>
                <div style={{ marginBottom: tokens.spacing[4] }}>
                  <Flex align="center" justify="space-between">
                    <SectionHeader title="Calendar" />
                    <Flex align="center" gap={2}>
                    <Button
                      variant="tertiary"
                      size="sm"
                      onClick={() => {
                        if (selectedMonth === 0) {
                          setSelectedMonth(11);
                          setSelectedYear(selectedYear - 1);
                        } else {
                          setSelectedMonth(selectedMonth - 1);
                        }
                      }}
                    >
                      ←
                    </Button>
                    <div style={{ fontWeight: tokens.typography.fontWeight.semibold, minWidth: '200px', textAlign: 'center' }}>
                      {new Date(selectedYear, selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </div>
                    <Button
                      variant="tertiary"
                      size="sm"
                      onClick={() => {
                        if (selectedMonth === 11) {
                          setSelectedMonth(0);
                          setSelectedYear(selectedYear + 1);
                        } else {
                          setSelectedMonth(selectedMonth + 1);
                        }
                      }}
                    >
                      →
                    </Button>
                    </Flex>
                  </Flex>
                </div>
                <div style={{ padding: tokens.spacing[4] }}> {/* Phase E: Tighter density to match Dashboard */}
                  {/* Batch 3: Calendar uses 7-column grid via 12-column Grid with spans 2,2,2,2,2,1,1 */}
                  <Grid gap={0}>
                    <GridCol span={2}><div style={{ textAlign: 'center', fontWeight: tokens.typography.fontWeight.semibold, fontSize: tokens.typography.fontSize.sm[0], padding: tokens.spacing[2], color: tokens.colors.primary.DEFAULT }}>Sun</div></GridCol>
                    <GridCol span={2}><div style={{ textAlign: 'center', fontWeight: tokens.typography.fontWeight.semibold, fontSize: tokens.typography.fontSize.sm[0], padding: tokens.spacing[2], color: tokens.colors.primary.DEFAULT }}>Mon</div></GridCol>
                    <GridCol span={2}><div style={{ textAlign: 'center', fontWeight: tokens.typography.fontWeight.semibold, fontSize: tokens.typography.fontSize.sm[0], padding: tokens.spacing[2], color: tokens.colors.primary.DEFAULT }}>Tue</div></GridCol>
                    <GridCol span={2}><div style={{ textAlign: 'center', fontWeight: tokens.typography.fontWeight.semibold, fontSize: tokens.typography.fontSize.sm[0], padding: tokens.spacing[2], color: tokens.colors.primary.DEFAULT }}>Wed</div></GridCol>
                    <GridCol span={2}><div style={{ textAlign: 'center', fontWeight: tokens.typography.fontWeight.semibold, fontSize: tokens.typography.fontSize.sm[0], padding: tokens.spacing[2], color: tokens.colors.primary.DEFAULT }}>Thu</div></GridCol>
                    <GridCol span={1}><div style={{ textAlign: 'center', fontWeight: tokens.typography.fontWeight.semibold, fontSize: tokens.typography.fontSize.sm[0], padding: tokens.spacing[2], color: tokens.colors.primary.DEFAULT }}>Fri</div></GridCol>
                    <GridCol span={1}><div style={{ textAlign: 'center', fontWeight: tokens.typography.fontWeight.semibold, fontSize: tokens.typography.fontSize.sm[0], padding: tokens.spacing[2], color: tokens.colors.primary.DEFAULT }}>Sat</div></GridCol>
                    {/* Empty cells for days before month start */}
                    {Array.from({ length: firstDay }).map((_, i) => {
                      const dayOfWeek = i;
                      const span = dayOfWeek < 5 ? 2 : 1;
                      return <GridCol key={`empty-${i}`} span={span}><div style={{ padding: tokens.spacing[2] }}></div></GridCol>;
                    })}
                    
                    {/* Calendar days */}
                    {days.map((day) => {
                      const jobsForDay = getJobsForDate(day, selectedMonth, selectedYear);
                      const isToday = day === new Date().getDate() && 
                                     selectedMonth === new Date().getMonth() && 
                                     selectedYear === new Date().getFullYear();
                      const dayOfWeek = (firstDay + day - 1) % 7;
                      const span = dayOfWeek < 5 ? 2 : 1;
                      
                      return (
                        <GridCol
                          key={day}
                          span={span}
                        >
                          <div
                            style={{
                              minHeight: '100px',
                              borderRight: `1px solid ${tokens.colors.border.default}`,
                              borderBottom: `1px solid ${tokens.colors.border.default}`,
                              padding: tokens.spacing[2],
                              backgroundColor: isToday ? tokens.colors.primary[50] : tokens.colors.background.primary,
                              borderColor: isToday ? tokens.colors.primary.DEFAULT : tokens.colors.border.default,
                              borderWidth: isToday ? '2px' : '1px',
                            }}
                          >
                            <div style={{ fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[1], color: isToday ? tokens.colors.primary.DEFAULT : tokens.colors.text.primary }}>
                              {day}
                            </div>
                            <Flex direction="column" gap={1}>
                              {jobsForDay.map((job) => (
                                <Card
                                  key={job.id}
                                  style={{
                                    padding: tokens.spacing[1],
                                    backgroundColor: tokens.colors.primary[100],
                                    borderColor: tokens.colors.primary[300],
                                  }}
                                >
                                  <div style={{ fontSize: tokens.typography.fontSize.xs[0], fontWeight: tokens.typography.fontWeight.semibold, color: tokens.colors.primary[700] }}>
                                    {job.clientName}
                                  </div>
                                  <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.primary[600] }}>
                                    {job.service}
                                  </div>
                                  {job.timeSlots.length > 0 && (
                                    <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.primary[600] }}>
                                      {formatTime(job.timeSlots[0].startAt)}
                                    </div>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => { e.stopPropagation(); handleSendDelight(job.bookingId); }}
                                    disabled={sendingDelightBookingId === job.bookingId}
                                    className="text-amber-500 border-amber-500 hover:bg-amber-500 hover:text-black"
                                    style={{ marginTop: tokens.spacing[1], fontSize: tokens.typography.fontSize.xs[0], padding: '2px 6px' }}
                                  >
                                    {sendingDelightBookingId === job.bookingId ? '…' : '✨ Delight'}
                                  </Button>
                                </Card>
                              ))}
                            </Flex>
                          </div>
                        </GridCol>
                      );
                    })}
                  </Grid>
                </div>
              </Card>
            )}

            {/* List View */}
            {viewMode === "list" && (
              <Card>
                <SectionHeader title={`Accepted Jobs (${dashboardData.jobs.accepted.length})`} />
                <div style={{ padding: tokens.spacing[4] }}> {/* Phase E: Tighter density to match Dashboard */}
                  {dashboardData.jobs.accepted.length > 0 ? (
                    <Flex direction="column" gap={4}> {/* Batch 3: UI Constitution compliance */}
                      {dashboardData.jobs.accepted.map((job) => (
                        <Card key={job.id}>
                          <Flex align="flex-start" justify="space-between">
                            <div style={{ flex: 1 }}>
                              <div style={{ marginBottom: tokens.spacing[2] }}>
                                <Flex align="center" gap={3}>
                                <div style={{ fontWeight: tokens.typography.fontWeight.bold, fontSize: tokens.typography.fontSize.lg[0] }}>
                                  {job.clientName}
                                </div>
                                <Badge variant={job.type === "direct" ? "info" : "success"}>
                                  {job.type === "direct" ? "Direct Assignment" : "Pool Accepted"}
                                </Badge>
                              </Flex>
                            </div>
                            <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                              <Flex direction="column" gap={1}>
                                <div><span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Service:</span> {job.service}</div>
                                <BookingScheduleDisplay
                                  service={job.service}
                                  startAt={job.startAt}
                                  endAt={job.endAt}
                                  timeSlots={job.timeSlots}
                                  address={job.address}
                                />
                                
                                <div>
                                  <span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Pets:</span>{" "}
                                  {job.pets.map((p, idx) => (
                                    <span key={idx}>
                                      {p.name || p.species} ({p.species})
                                      {idx < job.pets.length - 1 ? ", " : ""}
                                    </span>
                                  ))}
                                </div>
                                <div>
                                  <span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Total Price:</span> ${job.totalPrice.toFixed(2)}
                                </div>
                                <div><span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Earnings:</span> ${((job.totalPrice * dashboardData.sitter.commissionPercentage) / 100).toFixed(2)}</div>
                              </Flex>
                            </div>
                            {/* Status and Sitter Pool Controls - Desktop */}
                            <div style={{ marginTop: tokens.spacing[3] }}>
                              <Flex gap={2} wrap>
                                <Button
                                  onClick={() => handleSendDelight(job.bookingId)}
                                  variant="outline"
                                  disabled={sendingDelightBookingId === job.bookingId}
                                  className="text-amber-500 border-amber-500 hover:bg-amber-500 hover:text-black"
                                >
                                  {sendingDelightBookingId === job.bookingId ? 'Sending…' : '✨ Send Daily Delight'}
                                </Button>
                                <BookingStatusInlineControl
                                  bookingId={job.bookingId}
                                  currentStatus={job.status === "needs_response" ? "pending" : job.status === "accepted" ? "confirmed" : job.status === "completed" ? "completed" : "cancelled"}
                                  onStatusChange={async (bookingId, newStatus) => {
                                    // Handle status change
                                    const response = await fetch(`/api/bookings/${bookingId}`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ status: newStatus }),
                                    });
                                    if (response.ok) {
                                      fetchDashboardData();
                                    }
                                  }}
                                />
                              </Flex>
                            </div>
                          </div>
                        </Flex>
                        </Card>
                      ))}
                    </Flex>
                  ) : (
                    <EmptyState
                      title="No Accepted Jobs"
                      description="You don't have any accepted jobs yet"
                      icon={<i className="fas fa-check-circle" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
                    />
                  )}
                </div>
              </Card>
            )}
          </TabPanel>

          {/* Archived Tab */}
          <TabPanel id="archived">
            <Card>
              <SectionHeader title={`Archived Jobs (${dashboardData.jobs.archived.length})`} />
              <div style={{ padding: tokens.spacing[4] }}> {/* Phase E: Tighter density to match Dashboard */}
                {dashboardData.jobs.archived.length > 0 ? (
                  <Flex direction="column" gap={4}> {/* Batch 3: UI Constitution compliance */}
                    {dashboardData.jobs.archived.map((job) => (
                      <Card key={job.id} style={{ opacity: 0.75 }}>
                        <Flex align="flex-start" justify="space-between">
                          <div style={{ flex: 1 }}>
                            <div style={{ marginBottom: tokens.spacing[2] }}>
                              <Flex align="center" gap={3}>
                              <div style={{ fontWeight: tokens.typography.fontWeight.bold, fontSize: tokens.typography.fontSize.lg[0] }}>
                                {job.clientName}
                              </div>
                              <Badge variant={job.status === "completed" ? "success" : "neutral"}>
                                {job.status === "completed" ? "Completed" : "Cancelled"}
                              </Badge>
                              </Flex>
                            </div>
                            <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                              <Flex direction="column" gap={1}>
                                <div><span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Service:</span> {job.service}</div>
                                <div><span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Date:</span> {formatDate(job.startAt)}</div>
                                {job.timeSlots.length > 0 && (
                                  <div>
                                    <span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Times:</span>{" "}
                                    {job.timeSlots.map((ts, idx) => (
                                      <span key={ts.id}>
                                        {formatTime(ts.startAt)} ({ts.duration} min)
                                        {idx < job.timeSlots.length - 1 ? ", " : ""}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              <div><span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Earnings:</span> ${((job.totalPrice * dashboardData.sitter.commissionPercentage) / 100).toFixed(2)}</div>
                              </Flex>
                            </div>
                          </div>
                        </Flex>
                      </Card>
                    ))}
                  </Flex>
                ) : (
                  <EmptyState
                    title="No Archived Jobs"
                    description="You don't have any completed or cancelled jobs"
                    icon={<i className="fas fa-archive" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
                  />
                )}
              </div>
            </Card>
          </TabPanel>

          {/* Too Late Tab */}
          <TabPanel id="tooLate">
            <Card>
              <SectionHeader title={`Too Late / Expired (${dashboardData.jobs.tooLate.length})`} />
              <div style={{ padding: tokens.spacing[4] }}> {/* Phase E: Tighter density to match Dashboard */}
                {dashboardData.jobs.tooLate.length > 0 ? (
                  <Flex direction="column" gap={4}> {/* Batch 3: UI Constitution compliance */}
                    {dashboardData.jobs.tooLate.map((job) => (
                      <Card key={job.id} style={{ opacity: 0.6 }}>
                        <Flex align="flex-start" justify="space-between">
                          <div style={{ flex: 1 }}>
                            <div style={{ marginBottom: tokens.spacing[2] }}>
                              <Flex align="center" gap={3}>
                              <div style={{ fontWeight: tokens.typography.fontWeight.bold, fontSize: tokens.typography.fontSize.lg[0] }}>
                                {job.clientName}
                              </div>
                              <Badge variant="error">
                                {job.status === "expired" ? "Expired" : "Too Late"}
                              </Badge>
                              </Flex>
                            </div>
                            <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                              <Flex direction="column" gap={1}>
                                <div><span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Service:</span> {job.service}</div>
                                <div><span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Date:</span> {formatDate(job.startAt)}</div>
                                {job.status === "expired" && (
                                  <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.error.DEFAULT }}>
                                    This job expired before anyone accepted it
                                  </div>
                                )}
                                {job.status === "too_late" && (
                                  <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.error.DEFAULT }}>
                                    This job was accepted by another sitter
                                  </div>
                                )}
                              </Flex>
                            </div>
                          </div>
                        </Flex>
                      </Card>
                    ))}
                  </Flex>
                ) : (
                  <EmptyState
                    title="No Missed Jobs"
                    description="You haven't missed any job opportunities"
                    icon={<i className="fas fa-clock" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
                  />
                )}
              </div>
            </Card>
          </TabPanel>

          {/* Tier Tab */}
          <TabPanel id="tier">
            {/* Current Tier */}
            {dashboardData.tier && (
              <Card style={{ marginBottom: tokens.spacing[4] }}> {/* Phase E: Match Dashboard density */}
                <SectionHeader title="Current Tier & Badge" />
                <div style={{ padding: tokens.spacing[4] }}> {/* Phase E: Tighter density to match Dashboard */}
                  <Flex align="center" gap={6}>
                    <div
                      style={{
                        width: '6rem',
                        height: '6rem',
                        borderRadius: tokens.borderRadius.full,
                        backgroundColor: tokens.colors.primary[100],
                        color: tokens.colors.primary.DEFAULT,
                        fontSize: tokens.typography.fontSize['4xl'][0],
                        fontWeight: tokens.typography.fontWeight.bold,
                      }}
                    >
                      <Flex align="center" justify="center">
                        ⭐
                      </Flex>
                    </div>
                    <div>
                      <div style={{ fontSize: tokens.typography.fontSize['3xl'][0], fontWeight: tokens.typography.fontWeight.bold, marginBottom: tokens.spacing[2], color: tokens.colors.primary.DEFAULT }}>
                        {dashboardData.tier.name}
                      </div>
                      <div style={{ fontSize: tokens.typography.fontSize.base[0], color: tokens.colors.text.secondary }}>
                        Priority Level: {dashboardData.tier.priorityLevel}
                      </div>
                      {Object.keys(dashboardData.tier.benefits || {}).length > 0 && (
                        <div style={{ marginTop: tokens.spacing[2] }}>
                          <div style={{ fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.semibold, color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                            Benefits:
                          </div>
                          <ul style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, listStyle: 'disc', listStylePosition: 'inside' }}>
                            {Object.entries(dashboardData.tier.benefits).map(([key, value]) => (
                              <li key={key}>{key}: {String(value)}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </Flex>
                </div>
              </Card>
            )}

            {/* Performance Metrics */}
            <Card style={{ marginBottom: tokens.spacing[4] }}> {/* Phase E: Match Dashboard density */}
              <SectionHeader title="Performance Metrics (Last 30 Days)" />
              <div style={{ padding: tokens.spacing[4] }}> {/* Phase E: Match Dashboard density */}
                <Grid gap={2}> {/* Batch 3: UI Constitution compliance */}
                  <GridCol span={12} md={6} lg={4}>
                    <StatCard
                      label="Points Earned"
                      value={dashboardData.performance.points}
                    />
                    {dashboardData.nextTier && (
                      <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary, marginTop: tokens.spacing[1], textAlign: 'center' }}>
                        Need {dashboardData.nextTier.pointTarget} for next tier
                      </div>
                    )}
                  </GridCol>
                  <GridCol span={12} md={6} lg={4}>
                    <StatCard
                      label="Completion Rate"
                      value={`${dashboardData.performance.completionRate.toFixed(1)}%`}
                    />
                    {dashboardData.nextTier?.minCompletionRate && (
                      <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary, marginTop: tokens.spacing[1], textAlign: 'center' }}>
                        Need {dashboardData.nextTier.minCompletionRate}% for next tier
                      </div>
                    )}
                  </GridCol>
                  <GridCol span={12} md={6} lg={4}>
                    <StatCard
                      label="Response Rate"
                      value={`${dashboardData.performance.responseRate.toFixed(1)}%`}
                    />
                    {dashboardData.nextTier?.minResponseRate && (
                      <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary, marginTop: tokens.spacing[1], textAlign: 'center' }}>
                        Need {dashboardData.nextTier.minResponseRate}% for next tier
                      </div>
                    )}
                  </GridCol>
                </Grid>
              </div>
            </Card>

            {/* Job Statistics */}
            <Card style={{ marginBottom: tokens.spacing[4] }}> {/* Phase E: Match Dashboard density */}
              <SectionHeader title="Job Statistics" />
              <div style={{ padding: tokens.spacing[4] }}> {/* Phase E: Match Dashboard density */}
                <Grid gap={2}> {/* Batch 3: UI Constitution compliance */}
                      <GridCol span={12} md={6} lg={3}>
                        <StatCard label="Jobs Received" value={dashboardData.performance.jobsReceived} />
                      </GridCol>
                      <GridCol span={12} md={6} lg={3}>
                        <StatCard label="Jobs Accepted" value={dashboardData.performance.jobsAccepted} />
                      </GridCol>
                      <GridCol span={12} md={6} lg={3}>
                        <StatCard label="Jobs Declined" value={dashboardData.performance.jobsDeclined} />
                      </GridCol>
                      <GridCol span={12} md={6} lg={3}>
                        <StatCard label="Acceptance Rate" value={`${dashboardData.performance.acceptanceRate.toFixed(1)}%`} />
                      </GridCol>
                    </Grid>
              </div>
            </Card>

            {/* Improvement Areas */}
            {dashboardData.improvementAreas.length > 0 && (
              <Card style={{ marginBottom: tokens.spacing[4] }}> {/* Phase E: Match Dashboard density */}
                <SectionHeader title="How to Rank Higher" />
                <div style={{ padding: tokens.spacing[4] }}> {/* Phase E: Tighter density to match Dashboard */}
                  {dashboardData.nextTier && (
                    <Card style={{ marginBottom: tokens.spacing[4], padding: tokens.spacing[4], backgroundColor: tokens.colors.primary[50] }}>
                      <div style={{ fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[2], color: tokens.colors.primary.DEFAULT }}>
                        Next Tier: {dashboardData.nextTier.name}
                      </div>
                    </Card>
                  )}
                  <Flex direction="column" gap={3}> {/* Batch 3: UI Constitution compliance */}
                    {dashboardData.improvementAreas.map((area, idx) => (
                      <Card key={idx}>
                        <Flex align="flex-start" gap={3}>
                          <div
                            style={{
                              width: '1.5rem',
                              height: '1.5rem',
                              borderRadius: tokens.borderRadius.full,
                              backgroundColor: tokens.colors.primary[100],
                              color: tokens.colors.primary.DEFAULT,
                              flexShrink: 0,
                              fontSize: tokens.typography.fontSize.xs[0],
                              fontWeight: tokens.typography.fontWeight.bold,
                            }}
                          >
                            <Flex align="center" justify="center">
                              {idx + 1}
                            </Flex>
                          </div>
                          <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.primary }}>
                            {area}
                          </div>
                        </Flex>
                      </Card>
                    ))}
                  </Flex>
                </div>
              </Card>
            )}

            {/* Tier History */}
            {dashboardData.tierHistory.length > 0 && (
              <Card>
                <SectionHeader title="Tier History" />
                <div style={{ padding: tokens.spacing[4] }}> {/* Phase E: Tighter density to match Dashboard */}
                  <Flex direction="column" gap={3}> {/* Batch 3: UI Constitution compliance */}
                    {dashboardData.tierHistory.map((history) => (
                      <Card key={history.id}>
                        <div style={{ marginBottom: tokens.spacing[2] }}>
                          <Flex align="center" justify="space-between">
                            <span style={{ fontWeight: tokens.typography.fontWeight.bold, color: tokens.colors.primary.DEFAULT }}>
                              {history.tierName}
                            </span>
                            <span style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                              {new Date(history.createdAt).toLocaleDateString()}
                            </span>
                          </Flex>
                        </div>
                        <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                          <Flex direction="column" gap={1}>
                            <div>Points: {history.points}</div>
                            {history.completionRate !== null && (
                              <div>Completion Rate: {history.completionRate.toFixed(1)}%</div>
                            )}
                            {history.responseRate !== null && (
                              <div>Response Rate: {history.responseRate.toFixed(1)}%</div>
                            )}
                          </Flex>
                        </div>
                      </Card>
                    ))}
                  </Flex>
                </div>
              </Card>
            )}
          </TabPanel>
        </Tabs>
            </div>

            {/* Desktop Right Side Panel */}
            {/* Batch 3: Removed sticky and overflow - single scroll surface only */}
            <Flex direction="column" gap={4}>
              {/* Today Summary */}
              <Card>
                <SectionHeader title="Today" />
                <div style={{ padding: tokens.spacing[4] }}>
                  {(() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const tomorrow = new Date(today);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    
                    const todayJobs = dashboardData.jobs.accepted.filter((job) => {
                      const jobDate = new Date(job.startAt);
                      jobDate.setHours(0, 0, 0, 0);
                      return jobDate >= today && jobDate < tomorrow;
                    });
                    
                    const todayVisits = todayJobs.reduce((count, job) => {
                      if (job.timeSlots && job.timeSlots.length > 0) {
                        return count + job.timeSlots.length;
                      }
                      return count + 1;
                    }, 0);
                    
                    const todayEarnings = todayJobs.reduce((sum, job) => {
                      return sum + ((job.totalPrice * dashboardData.sitter.commissionPercentage) / 100);
                    }, 0);
                    
                    return (
                      <Flex direction="column" gap={3}> {/* Batch 3: UI Constitution compliance */}
                        <div>
                          <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                            Visits
                          </div>
                          <div style={{ fontSize: tokens.typography.fontSize['2xl'][0], fontWeight: tokens.typography.fontWeight.bold }}>
                            {todayVisits}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                            Bookings
                          </div>
                          <div style={{ fontSize: tokens.typography.fontSize['2xl'][0], fontWeight: tokens.typography.fontWeight.bold }}>
                            {todayJobs.length}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                            Earnings Estimate
                          </div>
                          <div style={{ fontSize: tokens.typography.fontSize['2xl'][0], fontWeight: tokens.typography.fontWeight.bold, color: tokens.colors.success.DEFAULT }}>
                            ${todayEarnings.toFixed(2)}
                          </div>
                        </div>
                      </Flex>
                    );
                  })()}
                </div>
              </Card>

              {/* Upcoming Bookings (Next 7 Days) */}
              <Card>
                <SectionHeader title="Upcoming (Next 7 Days)" />
                <div style={{ padding: tokens.spacing[4] }}>
                  {(() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const nextWeek = new Date(today);
                    nextWeek.setDate(nextWeek.getDate() + 7);
                    
                    const upcomingJobs = dashboardData.jobs.accepted
                      .filter((job) => {
                        const jobDate = new Date(job.startAt);
                        jobDate.setHours(0, 0, 0, 0);
                        return jobDate > today && jobDate <= nextWeek;
                      })
                      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
                      .slice(0, 5);
                    
                    if (upcomingJobs.length === 0) {
                      return (
                        <EmptyState
                          title="No upcoming bookings"
                          description="No bookings scheduled in the next 7 days"
                          icon="📅"
                        />
                      );
                    }
                    
                    return (
                      <Flex direction="column" gap={3}> {/* Batch 3: UI Constitution compliance */}
                        {upcomingJobs.map((job) => (
                          <div
                            key={job.id}
                            style={{
                              padding: tokens.spacing[3],
                              border: `1px solid ${tokens.colors.border.default}`,
                              borderRadius: tokens.borderRadius.md,
                            }}
                          >
                            <div style={{ fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[1] }}>
                              {job.clientName}
                            </div>
                            <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                              {formatDate(job.startAt)}
                            </div>
                            <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                              {job.service}
                            </div>
                          </div>
                        ))}
                      </Flex>
                    );
                  })()}
                </div>
              </Card>

              {/* Quick Actions */}
              <Card>
                <SectionHeader title="Quick Actions" />
                <div style={{ padding: tokens.spacing[4] }}>
                  <Flex direction="column" gap={2}>
                    <Button
                      variant="secondary"
                      size="sm"
                      style={{ width: '100%' }}
                      leftIcon={<i className="fas fa-envelope" />}
                      onClick={() => window.location.href = '/messages'}
                    >
                      Messages
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      style={{ width: '100%' }}
                      leftIcon={<i className="fas fa-calendar" />}
                      onClick={() => {
                        setActiveTab('accepted');
                        setViewMode('calendar');
                      }}
                    >
                      View Calendar
                    </Button>
                    {!isAdminView && (
                      <Button
                        variant="secondary"
                        size="sm"
                        style={{ width: '100%' }}
                        leftIcon={<i className="fas fa-list" />}
                        onClick={() => setActiveTab('accepted')}
                      >
                        View All Bookings
                      </Button>
                    )}
                  </Flex>
                </div>
              </Card>

              {/* Earnings Snapshot */}
              <Card>
                <SectionHeader title="Earnings Snapshot" />
                <div style={{ padding: tokens.spacing[4] }}>
                  {(() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const weekStart = new Date(today);
                    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                    
                    const thisWeekEarnings = dashboardData.jobs.accepted
                      .filter((job) => {
                        const jobDate = new Date(job.startAt);
                        return jobDate >= weekStart;
                      })
                      .reduce((sum, job) => sum + ((job.totalPrice * dashboardData.sitter.commissionPercentage) / 100), 0);
                    
                    const thisMonthEarnings = dashboardData.jobs.accepted
                      .filter((job) => {
                        const jobDate = new Date(job.startAt);
                        return jobDate >= monthStart;
                      })
                      .reduce((sum, job) => sum + ((job.totalPrice * dashboardData.sitter.commissionPercentage) / 100), 0);
                    
                    return (
                      <Flex direction="column" gap={4}> {/* Batch 3: UI Constitution compliance */}
                        <div>
                          <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                            This Week
                          </div>
                          <div style={{ fontSize: tokens.typography.fontSize.xl[0], fontWeight: tokens.typography.fontWeight.bold, color: tokens.colors.success.DEFAULT }}>
                            ${thisWeekEarnings.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                            This Month
                          </div>
                          <div style={{ fontSize: tokens.typography.fontSize.xl[0], fontWeight: tokens.typography.fontWeight.bold, color: tokens.colors.success.DEFAULT }}>
                            ${thisMonthEarnings.toFixed(2)}
                          </div>
                        </div>
                      </Flex>
                    );
                  })()}
                </div>
              </Card>
            </Flex>
            </GridCol>
          </Grid>
        )}
      </div>
    </AppShell>
  );
}

export default function SitterDashboardPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <PageHeader title="Sitter Dashboard" />
        <div style={{ padding: tokens.spacing[4] }}> {/* Phase E: Tighter density to match Dashboard */}
          <Skeleton height={200} />
        </div>
      </AppShell>
    }>
      <SitterDashboardContent />
    </Suspense>
  );
}

