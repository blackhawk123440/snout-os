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
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';
import { useMobile } from '@/lib/use-mobile';
import { BookingScheduleDisplay } from '@/components/booking';
import { SitterTierBadge } from '@/components/sitter';
import { CalendarGrid, type CalendarDay as CalendarGridDay } from '@/components/calendar';

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
        <div style={{ padding: tokens.spacing[6] }}>
          <Skeleton height={200} />
        </div>
      </AppShell>
    );
  }

  if (!dashboardData) {
    return (
      <AppShell>
        <PageHeader title={isAdminView ? "Sitter Dashboard" : "My Dashboard"} />
        <div style={{ padding: tokens.spacing[6] }}>
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

      <div style={{ padding: tokens.spacing[6] }}>
        {isMobile ? (
          <>
            <MobileFilterBar
              activeFilter={activeTab}
              onFilterChange={(filterId) => setActiveTab(filterId as TabType)}
              sticky
              options={tabs.map(tab => ({ 
                id: tab.id, 
                label: tab.label, 
                badge: tab.badge 
              }))}
            />
            {/* Mobile: Render content based on activeTab */}
            {activeTab === 'pending' && (
              <Card>
                <SectionHeader title={`Pending Requests (${dashboardData.jobs.needsResponse.length})`} />
                <div style={{ padding: tokens.spacing[6] }}>
                  {dashboardData.jobs.needsResponse.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
                      {dashboardData.jobs.needsResponse.map((job) => (
                        <Card key={job.id}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: tokens.spacing[4] }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3], marginBottom: tokens.spacing[2] }}>
                                <div style={{ fontWeight: tokens.typography.fontWeight.bold, fontSize: tokens.typography.fontSize.lg[0] }}>
                                  {job.clientName}
                                </div>
                                <Badge variant="warning">Pool Request</Badge>
                                {job.expiresAt && new Date(job.expiresAt) > new Date() && (
                                  <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary }}>
                                    Expires: {formatDate(job.expiresAt)} {formatTime(job.expiresAt)}
                                  </div>
                                )}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[1], fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
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
                                <div><span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Earnings:</span> ${((job.totalPrice * dashboardData.sitter.commissionPercentage) / 100).toFixed(2)}</div>
                                {job.message && (
                                  <Card style={{ marginTop: tokens.spacing[2], padding: tokens.spacing[2], backgroundColor: tokens.colors.neutral[50] }}>
                                    <div style={{ fontSize: tokens.typography.fontSize.xs[0] }}>{job.message}</div>
                                  </Card>
                                )}
                              </div>
                            </div>
                            {!isAdminView && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2] }}>
                                <Button
                                  variant="primary"
                                  onClick={() => acceptJob(job)}
                                  disabled={acceptingJobId === job.id || !!(job.expiresAt && new Date(job.expiresAt) < new Date())}
                                >
                                  {acceptingJobId === job.id ? "Accepting..." : "Accept"}
                                </Button>
                                <Button variant="tertiary" disabled>
                                  Decline
                                </Button>
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
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
                <div style={{ marginBottom: tokens.spacing[4], display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant={viewMode === "calendar" ? "primary" : "secondary"}
                    onClick={() => setViewMode(viewMode === "calendar" ? "list" : "calendar")}
                    leftIcon={<i className={viewMode === "calendar" ? "fas fa-list" : "fas fa-calendar"} />}
                  >
                    {viewMode === "calendar" ? "List View" : "Calendar View"}
                  </Button>
                </div>
                {viewMode === "calendar" ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tokens.spacing[4] }}>
                      <SectionHeader title="Calendar" />
                      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
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
                      </div>
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
                  <Card>
                    <SectionHeader title={`Accepted Jobs (${dashboardData.jobs.accepted.length})`} />
                    <div style={{ padding: tokens.spacing[6] }}>
                      {dashboardData.jobs.accepted.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
                          {dashboardData.jobs.accepted.map((job) => (
                            <Card key={job.id}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3], marginBottom: tokens.spacing[2] }}>
                                    <div style={{ fontWeight: tokens.typography.fontWeight.bold, fontSize: tokens.typography.fontSize.lg[0] }}>
                                      {job.clientName}
                                    </div>
                                    <Badge variant={job.type === "direct" ? "info" : "success"}>
                                      {job.type === "direct" ? "Direct Assignment" : "Pool Accepted"}
                                    </Badge>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[1], fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
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
                                    <div><span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Earnings:</span> ${((job.totalPrice * dashboardData.sitter.commissionPercentage) / 100).toFixed(2)}</div>
                                  </div>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
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
              <Card>
                <SectionHeader title={`Archived Jobs (${dashboardData.jobs.archived.length})`} />
                <div style={{ padding: tokens.spacing[6] }}>
                  {dashboardData.jobs.archived.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
                      {dashboardData.jobs.archived.map((job) => (
                        <Card key={job.id} style={{ opacity: 0.75 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3], marginBottom: tokens.spacing[2] }}>
                                <div style={{ fontWeight: tokens.typography.fontWeight.bold, fontSize: tokens.typography.fontSize.lg[0] }}>
                                  {job.clientName}
                                </div>
                                <Badge variant={job.status === "completed" ? "success" : "neutral"}>
                                  {job.status === "completed" ? "Completed" : "Cancelled"}
                                </Badge>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[1], fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
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
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
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
              <Card>
                <SectionHeader title={`Too Late / Expired (${dashboardData.jobs.tooLate.length})`} />
                <div style={{ padding: tokens.spacing[6] }}>
                  {dashboardData.jobs.tooLate.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
                      {dashboardData.jobs.tooLate.map((job) => (
                        <Card key={job.id} style={{ opacity: 0.6 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3], marginBottom: tokens.spacing[2] }}>
                                <div style={{ fontWeight: tokens.typography.fontWeight.bold, fontSize: tokens.typography.fontSize.lg[0] }}>
                                  {job.clientName}
                                </div>
                                <Badge variant="error">
                                  {job.status === "expired" ? "Expired" : "Too Late"}
                                </Badge>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[1], fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
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
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
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
                  <Card style={{ marginBottom: tokens.spacing[6] }}>
                    <SectionHeader title="Current Tier & Badge" />
                    <div style={{ padding: tokens.spacing[6] }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[6] }}>
                        <div
                          style={{
                            width: '6rem',
                            height: '6rem',
                            borderRadius: tokens.borderRadius.full,
                            backgroundColor: tokens.colors.primary[100],
                            color: tokens.colors.primary.DEFAULT,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: tokens.typography.fontSize['4xl'][0],
                            fontWeight: tokens.typography.fontWeight.bold,
                          }}
                        >
                          ⭐
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
                      </div>
                    </div>
                  </Card>
                )}
                <Card style={{ marginBottom: tokens.spacing[6] }}>
                  <SectionHeader title="Performance Metrics (Last 30 Days)" />
                  <div style={{ padding: tokens.spacing[6] }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: tokens.spacing[6] }}>
                      <div>
                        <StatCard
                          label="Points Earned"
                          value={dashboardData.performance.points}
                        />
                        {dashboardData.nextTier && (
                          <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary, marginTop: tokens.spacing[1], textAlign: 'center' }}>
                            Need {dashboardData.nextTier.pointTarget} for next tier
                          </div>
                        )}
                      </div>
                      <div>
                        <StatCard
                          label="Completion Rate"
                          value={`${dashboardData.performance.completionRate.toFixed(1)}%`}
                        />
                        {dashboardData.nextTier?.minCompletionRate && (
                          <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary, marginTop: tokens.spacing[1], textAlign: 'center' }}>
                            Need {dashboardData.nextTier.minCompletionRate}% for next tier
                          </div>
                        )}
                      </div>
                      <div>
                        <StatCard
                          label="Response Rate"
                          value={`${dashboardData.performance.responseRate.toFixed(1)}%`}
                        />
                        {dashboardData.nextTier?.minResponseRate && (
                          <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary, marginTop: tokens.spacing[1], textAlign: 'center' }}>
                            Need {dashboardData.nextTier.minResponseRate}% for next tier
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
                <Card style={{ marginBottom: tokens.spacing[6] }}>
                  <SectionHeader title="Job Statistics" />
                  <div style={{ padding: tokens.spacing[6] }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(150px, 1fr))', gap: tokens.spacing[4] }}>
                      <StatCard label="Jobs Received" value={dashboardData.performance.jobsReceived} />
                      <StatCard label="Jobs Accepted" value={dashboardData.performance.jobsAccepted} />
                      <StatCard label="Jobs Declined" value={dashboardData.performance.jobsDeclined} />
                      <StatCard label="Acceptance Rate" value={`${dashboardData.performance.acceptanceRate.toFixed(1)}%`} />
                    </div>
                  </div>
                </Card>
                {dashboardData.improvementAreas.length > 0 && (
                  <Card style={{ marginBottom: tokens.spacing[6] }}>
                    <SectionHeader title="How to Rank Higher" />
                    <div style={{ padding: tokens.spacing[6] }}>
                      {dashboardData.nextTier && (
                        <Card style={{ marginBottom: tokens.spacing[4], padding: tokens.spacing[4], backgroundColor: tokens.colors.primary[50] }}>
                          <div style={{ fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[2], color: tokens.colors.primary.DEFAULT }}>
                            Next Tier: {dashboardData.nextTier.name}
                          </div>
                        </Card>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
                        {dashboardData.improvementAreas.map((area, idx) => (
                          <Card key={idx}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: tokens.spacing[3] }}>
                              <div
                                style={{
                                  width: '1.5rem',
                                  height: '1.5rem',
                                  borderRadius: tokens.borderRadius.full,
                                  backgroundColor: tokens.colors.primary[100],
                                  color: tokens.colors.primary.DEFAULT,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  fontSize: tokens.typography.fontSize.xs[0],
                                  fontWeight: tokens.typography.fontWeight.bold,
                                }}
                              >
                                {idx + 1}
                              </div>
                              <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.primary }}>
                                {area}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </Card>
                )}
                {dashboardData.tierHistory.length > 0 && (
                  <Card>
                    <SectionHeader title="Tier History" />
                    <div style={{ padding: tokens.spacing[6] }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
                        {dashboardData.tierHistory.map((history) => (
                          <Card key={history.id}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tokens.spacing[2] }}>
                              <span style={{ fontWeight: tokens.typography.fontWeight.bold, color: tokens.colors.primary.DEFAULT }}>
                                {history.tierName}
                              </span>
                              <span style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                                {new Date(history.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[1], fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                              <div>Points: {history.points}</div>
                              {history.completionRate !== null && (
                                <div>Completion Rate: {history.completionRate.toFixed(1)}%</div>
                              )}
                              {history.responseRate !== null && (
                                <div>Response Rate: {history.responseRate.toFixed(1)}%</div>
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </Card>
                )}
              </>
            )}
          </>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 400px',
              gap: tokens.spacing[6],
            }}
          >
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
              <div style={{ padding: tokens.spacing[6] }}>
                {dashboardData.jobs.needsResponse.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
                    {dashboardData.jobs.needsResponse.map((job) => (
                      <Card key={job.id}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: tokens.spacing[4] }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3], marginBottom: tokens.spacing[2] }}>
                              <div style={{ fontWeight: tokens.typography.fontWeight.bold, fontSize: tokens.typography.fontSize.lg[0] }}>
                                {job.clientName}
                              </div>
                              <Badge variant="warning">Pool Request</Badge>
                              {job.expiresAt && new Date(job.expiresAt) > new Date() && (
                                <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary }}>
                                  Expires: {formatDate(job.expiresAt)} {formatTime(job.expiresAt)}
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[1], fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
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
                              <div><span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Earnings:</span> ${((job.totalPrice * dashboardData.sitter.commissionPercentage) / 100).toFixed(2)}</div>
                              {job.message && (
                                <Card style={{ marginTop: tokens.spacing[2], padding: tokens.spacing[2], backgroundColor: tokens.colors.neutral[50] }}>
                                  <div style={{ fontSize: tokens.typography.fontSize.xs[0] }}>{job.message}</div>
                                </Card>
                              )}
                            </div>
                          </div>
                          {!isAdminView && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2] }}>
                              <Button
                                variant="primary"
                                onClick={() => acceptJob(job)}
                                disabled={acceptingJobId === job.id || !!(job.expiresAt && new Date(job.expiresAt) < new Date())}
                              >
                                {acceptingJobId === job.id ? "Accepting..." : "Accept"}
                              </Button>
                              <Button variant="tertiary" disabled>
                                Decline
                              </Button>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
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
            <div style={{ marginBottom: tokens.spacing[4], display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant={viewMode === "calendar" ? "primary" : "secondary"}
                onClick={() => setViewMode(viewMode === "calendar" ? "list" : "calendar")}
                leftIcon={<i className={viewMode === "calendar" ? "fas fa-list" : "fas fa-calendar"} />}
              >
                {viewMode === "calendar" ? "List View" : "Calendar View"}
              </Button>
            </div>

            {/* Calendar View */}
            {viewMode === "calendar" && (
              <Card>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tokens.spacing[4] }}>
                  <SectionHeader title="Calendar" />
                  <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
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
                  </div>
                </div>
                <div style={{ padding: tokens.spacing[6] }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div key={day} style={{ textAlign: 'center', fontWeight: tokens.typography.fontWeight.semibold, fontSize: tokens.typography.fontSize.sm[0], padding: tokens.spacing[2], color: tokens.colors.primary.DEFAULT }}>
                        {day}
                      </div>
                    ))}
                    
                    {Array.from({ length: firstDay }).map((_, i) => (
                      <div key={`empty-${i}`} style={{ padding: tokens.spacing[2] }}></div>
                    ))}
                    
                    {days.map((day) => {
                      const jobsForDay = getJobsForDate(day, selectedMonth, selectedYear);
                      const isToday = day === new Date().getDate() && 
                                     selectedMonth === new Date().getMonth() && 
                                     selectedYear === new Date().getFullYear();
                      
                      return (
                        <div
                          key={day}
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
                          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[1] }}>
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
                              </Card>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            )}

            {/* List View */}
            {viewMode === "list" && (
              <Card>
                <SectionHeader title={`Accepted Jobs (${dashboardData.jobs.accepted.length})`} />
                <div style={{ padding: tokens.spacing[6] }}>
                  {dashboardData.jobs.accepted.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
                      {dashboardData.jobs.accepted.map((job) => (
                        <Card key={job.id}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3], marginBottom: tokens.spacing[2] }}>
                                <div style={{ fontWeight: tokens.typography.fontWeight.bold, fontSize: tokens.typography.fontSize.lg[0] }}>
                                  {job.clientName}
                                </div>
                                <Badge variant={job.type === "direct" ? "info" : "success"}>
                                  {job.type === "direct" ? "Direct Assignment" : "Pool Accepted"}
                                </Badge>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[1], fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
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
                                <div><span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Earnings:</span> ${((job.totalPrice * dashboardData.sitter.commissionPercentage) / 100).toFixed(2)}</div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
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
              <div style={{ padding: tokens.spacing[6] }}>
                {dashboardData.jobs.archived.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
                    {dashboardData.jobs.archived.map((job) => (
                      <Card key={job.id} style={{ opacity: 0.75 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3], marginBottom: tokens.spacing[2] }}>
                              <div style={{ fontWeight: tokens.typography.fontWeight.bold, fontSize: tokens.typography.fontSize.lg[0] }}>
                                {job.clientName}
                              </div>
                              <Badge variant={job.status === "completed" ? "success" : "neutral"}>
                                {job.status === "completed" ? "Completed" : "Cancelled"}
                              </Badge>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[1], fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
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
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
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
              <div style={{ padding: tokens.spacing[6] }}>
                {dashboardData.jobs.tooLate.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
                    {dashboardData.jobs.tooLate.map((job) => (
                      <Card key={job.id} style={{ opacity: 0.6 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3], marginBottom: tokens.spacing[2] }}>
                              <div style={{ fontWeight: tokens.typography.fontWeight.bold, fontSize: tokens.typography.fontSize.lg[0] }}>
                                {job.clientName}
                              </div>
                              <Badge variant="error">
                                {job.status === "expired" ? "Expired" : "Too Late"}
                              </Badge>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[1], fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
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
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
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
              <Card style={{ marginBottom: tokens.spacing[6] }}>
                <SectionHeader title="Current Tier & Badge" />
                <div style={{ padding: tokens.spacing[6] }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[6] }}>
                    <div
                      style={{
                        width: '6rem',
                        height: '6rem',
                        borderRadius: tokens.borderRadius.full,
                        backgroundColor: tokens.colors.primary[100],
                        color: tokens.colors.primary.DEFAULT,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: tokens.typography.fontSize['4xl'][0],
                        fontWeight: tokens.typography.fontWeight.bold,
                      }}
                    >
                      ⭐
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
                  </div>
                </div>
              </Card>
            )}

            {/* Performance Metrics */}
            <Card style={{ marginBottom: tokens.spacing[6] }}>
              <SectionHeader title="Performance Metrics (Last 30 Days)" />
              <div style={{ padding: tokens.spacing[6] }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: tokens.spacing[6] }}>
                  <div>
                    <StatCard
                      label="Points Earned"
                      value={dashboardData.performance.points}
                    />
                    {dashboardData.nextTier && (
                      <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary, marginTop: tokens.spacing[1], textAlign: 'center' }}>
                        Need {dashboardData.nextTier.pointTarget} for next tier
                      </div>
                    )}
                  </div>
                  <div>
                    <StatCard
                      label="Completion Rate"
                      value={`${dashboardData.performance.completionRate.toFixed(1)}%`}
                    />
                    {dashboardData.nextTier?.minCompletionRate && (
                      <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary, marginTop: tokens.spacing[1], textAlign: 'center' }}>
                        Need {dashboardData.nextTier.minCompletionRate}% for next tier
                      </div>
                    )}
                  </div>
                  <div>
                    <StatCard
                      label="Response Rate"
                      value={`${dashboardData.performance.responseRate.toFixed(1)}%`}
                    />
                    {dashboardData.nextTier?.minResponseRate && (
                      <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary, marginTop: tokens.spacing[1], textAlign: 'center' }}>
                        Need {dashboardData.nextTier.minResponseRate}% for next tier
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Job Statistics */}
            <Card style={{ marginBottom: tokens.spacing[6] }}>
              <SectionHeader title="Job Statistics" />
              <div style={{ padding: tokens.spacing[6] }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: tokens.spacing[4] }}>
                  <StatCard label="Jobs Received" value={dashboardData.performance.jobsReceived} />
                  <StatCard label="Jobs Accepted" value={dashboardData.performance.jobsAccepted} />
                  <StatCard label="Jobs Declined" value={dashboardData.performance.jobsDeclined} />
                  <StatCard label="Acceptance Rate" value={`${dashboardData.performance.acceptanceRate.toFixed(1)}%`} />
                </div>
              </div>
            </Card>

            {/* Improvement Areas */}
            {dashboardData.improvementAreas.length > 0 && (
              <Card style={{ marginBottom: tokens.spacing[6] }}>
                <SectionHeader title="How to Rank Higher" />
                <div style={{ padding: tokens.spacing[6] }}>
                  {dashboardData.nextTier && (
                    <Card style={{ marginBottom: tokens.spacing[4], padding: tokens.spacing[4], backgroundColor: tokens.colors.primary[50] }}>
                      <div style={{ fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[2], color: tokens.colors.primary.DEFAULT }}>
                        Next Tier: {dashboardData.nextTier.name}
                      </div>
                    </Card>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
                    {dashboardData.improvementAreas.map((area, idx) => (
                      <Card key={idx}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: tokens.spacing[3] }}>
                          <div
                            style={{
                              width: '1.5rem',
                              height: '1.5rem',
                              borderRadius: tokens.borderRadius.full,
                              backgroundColor: tokens.colors.primary[100],
                              color: tokens.colors.primary.DEFAULT,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              fontSize: tokens.typography.fontSize.xs[0],
                              fontWeight: tokens.typography.fontWeight.bold,
                            }}
                          >
                            {idx + 1}
                          </div>
                          <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.primary }}>
                            {area}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* Tier History */}
            {dashboardData.tierHistory.length > 0 && (
              <Card>
                <SectionHeader title="Tier History" />
                <div style={{ padding: tokens.spacing[6] }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
                    {dashboardData.tierHistory.map((history) => (
                      <Card key={history.id}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tokens.spacing[2] }}>
                          <span style={{ fontWeight: tokens.typography.fontWeight.bold, color: tokens.colors.primary.DEFAULT }}>
                            {history.tierName}
                          </span>
                          <span style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                            {new Date(history.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[1], fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                          <div>Points: {history.points}</div>
                          {history.completionRate !== null && (
                            <div>Completion Rate: {history.completionRate.toFixed(1)}%</div>
                          )}
                          {history.responseRate !== null && (
                            <div>Response Rate: {history.responseRate.toFixed(1)}%</div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </TabPanel>
        </Tabs>
            </div>

            {/* Desktop Right Side Panel */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: tokens.spacing[4],
                position: 'sticky',
                top: 0,
                alignSelf: 'flex-start',
                maxHeight: 'calc(100vh - 200px)',
                overflowY: 'auto',
              }}
            >
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
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
                      </div>
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
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
                      </div>
                    );
                  })()}
                </div>
              </Card>

              {/* Quick Actions */}
              <Card>
                <SectionHeader title="Quick Actions" />
                <div style={{ padding: tokens.spacing[4], display: 'flex', flexDirection: 'column', gap: tokens.spacing[2] }}>
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
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
                      </div>
                    );
                  })()}
                </div>
              </Card>
            </div>
          </div>
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
        <div style={{ padding: tokens.spacing[6] }}>
          <Skeleton height={200} />
        </div>
      </AppShell>
    }>
      <SitterDashboardContent />
    </Suspense>
  );
}

