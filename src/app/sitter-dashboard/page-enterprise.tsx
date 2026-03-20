/**
 * Sitter Dashboard Page - Enterprise Rebuild
 *
 * Complete rebuild using design system and components.
 * Zero legacy styling - all through components and Tailwind classes.
 */

'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Inbox, List, Calendar, CheckCircle2, Archive, Clock } from 'lucide-react';
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
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';

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

  const fetchDashboardData = useCallback(async () => {
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
  }, [sitterId, isAdminView]);

  useEffect(() => {
    if (sitterId) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [sitterId, isAdminView, fetchDashboardData]);

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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
        <div className="p-6">
          <Skeleton height={200} />
        </div>
      </AppShell>
    );
  }

  if (!dashboardData) {
    return (
      <AppShell>
        <PageHeader title={isAdminView ? "Sitter Dashboard" : "My Dashboard"} />
        <div className="p-6">
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
      />

      <div className="p-6">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as TabType)}
        >
          {/* Pending Tab */}
          <TabPanel id="pending">
            <Card>
              <SectionHeader title={`Pending Requests (${dashboardData.jobs.needsResponse.length})`} />
              <div className="p-6">
                {dashboardData.jobs.needsResponse.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {dashboardData.jobs.needsResponse.map((job) => (
                      <Card key={job.id}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="font-bold text-lg">
                                {job.clientName}
                              </div>
                              <Badge variant="warning">Pool Request</Badge>
                              {job.expiresAt && new Date(job.expiresAt) > new Date() && (
                                <div className="text-xs text-text-secondary">
                                  Expires: {formatDate(job.expiresAt)} {formatTime(job.expiresAt)}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-1 text-sm text-text-secondary">
                              <div><span className="font-semibold">Service:</span> {job.service}</div>
                              <div><span className="font-semibold">Date:</span> {formatDate(job.startAt)}</div>
                              {job.timeSlots.length > 0 && (
                                <div>
                                  <span className="font-semibold">Times:</span>{" "}
                                  {job.timeSlots.map((ts, idx) => (
                                    <span key={ts.id}>
                                      {formatTime(ts.startAt)} ({ts.duration} min)
                                      {idx < job.timeSlots.length - 1 ? ", " : ""}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div><span className="font-semibold">Address:</span> {job.address}</div>
                              <div>
                                <span className="font-semibold">Pets:</span>{" "}
                                {job.pets.map((p, idx) => (
                                  <span key={idx}>
                                    {p.name || p.species} ({p.species})
                                    {idx < job.pets.length - 1 ? ", " : ""}
                                  </span>
                                ))}
                              </div>
                              <div><span className="font-semibold">Earnings:</span> ${((job.totalPrice * dashboardData.sitter.commissionPercentage) / 100).toFixed(2)}</div>
                              {job.message && (
                                <Card className="mt-2 p-2 bg-neutral-50">
                                  <div className="text-xs">{job.message}</div>
                                </Card>
                              )}
                            </div>
                          </div>
                          {!isAdminView && (
                            <div className="flex flex-col gap-2">
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
                    icon={<Inbox className="h-12 w-12 text-neutral-300" />}
                  />
                )}
              </div>
            </Card>
          </TabPanel>

          {/* Accepted Tab */}
          <TabPanel id="accepted">
            <div className="mb-4 flex justify-end">
              <Button
                variant={viewMode === "calendar" ? "primary" : "secondary"}
                onClick={() => setViewMode(viewMode === "calendar" ? "list" : "calendar")}
                leftIcon={viewMode === "calendar" ? <List className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
              >
                {viewMode === "calendar" ? "List View" : "Calendar View"}
              </Button>
            </div>

            {/* Calendar View */}
            {viewMode === "calendar" && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <SectionHeader title="Calendar" />
                  <div className="flex items-center gap-2">
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
                    <div className="font-semibold min-w-[200px] text-center">
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
                <div className="p-6">
                  <div className="grid grid-cols-7">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div key={day} className="text-center font-semibold text-sm p-2 text-accent-primary">
                        {day}
                      </div>
                    ))}

                    {Array.from({ length: firstDay }).map((_, i) => (
                      <div key={`empty-${i}`} className="p-2"></div>
                    ))}

                    {days.map((day) => {
                      const jobsForDay = getJobsForDate(day, selectedMonth, selectedYear);
                      const isToday = day === new Date().getDate() &&
                                     selectedMonth === new Date().getMonth() &&
                                     selectedYear === new Date().getFullYear();

                      return (
                        <div
                          key={day}
                          style={{ minHeight: '100px' }}
                          className={`border-r border-b p-2 ${
                            isToday
                              ? 'bg-accent-secondary border-accent-primary border-2'
                              : 'bg-surface-primary border-border-default'
                          }`}
                        >
                          <div className={`font-semibold mb-1 ${isToday ? 'text-accent-primary' : 'text-text-primary'}`}>
                            {day}
                          </div>
                          <div className="flex flex-col gap-1">
                            {jobsForDay.map((job) => (
                              <Card
                                key={job.id}
                                className="p-1 bg-accent-secondary border-primary-300"
                              >
                                <div className="text-xs font-semibold text-primary-700">
                                  {job.clientName}
                                </div>
                                <div className="text-xs text-primary-600">
                                  {job.service}
                                </div>
                                {job.timeSlots.length > 0 && (
                                  <div className="text-xs text-primary-600">
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
                <div className="p-6">
                  {dashboardData.jobs.accepted.length > 0 ? (
                    <div className="flex flex-col gap-4">
                      {dashboardData.jobs.accepted.map((job) => (
                        <Card key={job.id}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="font-bold text-lg">
                                  {job.clientName}
                                </div>
                                <Badge variant={job.type === "direct" ? "info" : "success"}>
                                  {job.type === "direct" ? "Direct Assignment" : "Pool Accepted"}
                                </Badge>
                              </div>
                              <div className="flex flex-col gap-1 text-sm text-text-secondary">
                                <div><span className="font-semibold">Service:</span> {job.service}</div>
                                <div><span className="font-semibold">Date:</span> {formatDate(job.startAt)}</div>
                                {job.timeSlots.length > 0 && (
                                  <div>
                                    <span className="font-semibold">Times:</span>{" "}
                                    {job.timeSlots.map((ts, idx) => (
                                      <span key={ts.id}>
                                        {formatTime(ts.startAt)} ({ts.duration} min)
                                        {idx < job.timeSlots.length - 1 ? ", " : ""}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <div><span className="font-semibold">Address:</span> {job.address}</div>
                                <div>
                                  <span className="font-semibold">Pets:</span>{" "}
                                  {job.pets.map((p, idx) => (
                                    <span key={idx}>
                                      {p.name || p.species} ({p.species})
                                      {idx < job.pets.length - 1 ? ", " : ""}
                                    </span>
                                  ))}
                                </div>
                                <div><span className="font-semibold">Earnings:</span> ${((job.totalPrice * dashboardData.sitter.commissionPercentage) / 100).toFixed(2)}</div>
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
                      icon={<CheckCircle2 className="h-12 w-12 text-neutral-300" />}
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
              <div className="p-6">
                {dashboardData.jobs.archived.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {dashboardData.jobs.archived.map((job) => (
                      <Card key={job.id} className="opacity-75">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="font-bold text-lg">
                                {job.clientName}
                              </div>
                              <Badge variant={job.status === "completed" ? "success" : "neutral"}>
                                {job.status === "completed" ? "Completed" : "Cancelled"}
                              </Badge>
                            </div>
                            <div className="flex flex-col gap-1 text-sm text-text-secondary">
                              <div><span className="font-semibold">Service:</span> {job.service}</div>
                              <div><span className="font-semibold">Date:</span> {formatDate(job.startAt)}</div>
                              {job.timeSlots.length > 0 && (
                                <div>
                                  <span className="font-semibold">Times:</span>{" "}
                                  {job.timeSlots.map((ts, idx) => (
                                    <span key={ts.id}>
                                      {formatTime(ts.startAt)} ({ts.duration} min)
                                      {idx < job.timeSlots.length - 1 ? ", " : ""}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div><span className="font-semibold">Earnings:</span> ${((job.totalPrice * dashboardData.sitter.commissionPercentage) / 100).toFixed(2)}</div>
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
                    icon={<Archive className="h-12 w-12 text-neutral-300" />}
                  />
                )}
              </div>
            </Card>
          </TabPanel>

          {/* Too Late Tab */}
          <TabPanel id="tooLate">
            <Card>
              <SectionHeader title={`Too Late / Expired (${dashboardData.jobs.tooLate.length})`} />
              <div className="p-6">
                {dashboardData.jobs.tooLate.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {dashboardData.jobs.tooLate.map((job) => (
                      <Card key={job.id} className="opacity-60">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="font-bold text-lg">
                                {job.clientName}
                              </div>
                              <Badge variant="error">
                                {job.status === "expired" ? "Expired" : "Too Late"}
                              </Badge>
                            </div>
                            <div className="flex flex-col gap-1 text-sm text-text-secondary">
                              <div><span className="font-semibold">Service:</span> {job.service}</div>
                              <div><span className="font-semibold">Date:</span> {formatDate(job.startAt)}</div>
                              {job.status === "expired" && (
                                <div className="text-xs text-status-danger-fill">
                                  This job expired before anyone accepted it
                                </div>
                              )}
                              {job.status === "too_late" && (
                                <div className="text-xs text-status-danger-fill">
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
                    icon={<Clock className="h-12 w-12 text-neutral-300" />}
                  />
                )}
              </div>
            </Card>
          </TabPanel>

          {/* Tier Tab */}
          <TabPanel id="tier">
            {/* Current Tier */}
            {dashboardData.tier && (
              <Card className="mb-6">
                <SectionHeader title="Current Tier & Badge" />
                <div className="p-6">
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-full bg-accent-secondary text-accent-primary flex items-center justify-center text-4xl font-bold">
                      ⭐
                    </div>
                    <div>
                      <div className="text-3xl font-bold mb-2 text-accent-primary">
                        {dashboardData.tier.name}
                      </div>
                      <div className="text-base text-text-secondary">
                        Priority Level: {dashboardData.tier.priorityLevel}
                      </div>
                      {Object.keys(dashboardData.tier.benefits || {}).length > 0 && (
                        <div className="mt-2">
                          <div className="text-sm font-semibold text-text-secondary mb-1">
                            Benefits:
                          </div>
                          <ul className="text-sm text-text-secondary list-disc list-inside">
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
            <Card className="mb-6">
              <SectionHeader title="Performance Metrics (Last 30 Days)" />
              <div className="p-6">
                <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6">
                  <div>
                    <StatCard
                      label="Points Earned"
                      value={dashboardData.performance.points}
                    />
                    {dashboardData.nextTier && (
                      <div className="text-xs text-text-secondary mt-1 text-center">
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
                      <div className="text-xs text-text-secondary mt-1 text-center">
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
                      <div className="text-xs text-text-secondary mt-1 text-center">
                        Need {dashboardData.nextTier.minResponseRate}% for next tier
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Job Statistics */}
            <Card className="mb-6">
              <SectionHeader title="Job Statistics" />
              <div className="p-6">
                <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4">
                  <StatCard label="Jobs Received" value={dashboardData.performance.jobsReceived} />
                  <StatCard label="Jobs Accepted" value={dashboardData.performance.jobsAccepted} />
                  <StatCard label="Jobs Declined" value={dashboardData.performance.jobsDeclined} />
                  <StatCard label="Acceptance Rate" value={`${dashboardData.performance.acceptanceRate.toFixed(1)}%`} />
                </div>
              </div>
            </Card>

            {/* Improvement Areas */}
            {dashboardData.improvementAreas.length > 0 && (
              <Card className="mb-6">
                <SectionHeader title="How to Rank Higher" />
                <div className="p-6">
                  {dashboardData.nextTier && (
                    <Card className="mb-4 p-4 bg-accent-secondary">
                      <div className="font-semibold mb-2 text-accent-primary">
                        Next Tier: {dashboardData.nextTier.name}
                      </div>
                    </Card>
                  )}
                  <div className="flex flex-col gap-3">
                    {dashboardData.improvementAreas.map((area, idx) => (
                      <Card key={idx}>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-accent-secondary text-accent-primary flex items-center justify-center shrink-0 text-xs font-bold">
                            {idx + 1}
                          </div>
                          <div className="text-sm text-text-primary">
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
                <div className="p-6">
                  <div className="flex flex-col gap-3">
                    {dashboardData.tierHistory.map((history) => (
                      <Card key={history.id}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-accent-primary">
                            {history.tierName}
                          </span>
                          <span className="text-sm text-text-secondary">
                            {new Date(history.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 text-sm text-text-secondary">
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
    </AppShell>
  );
}

export default function SitterDashboardPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <PageHeader title="Sitter Dashboard" />
        <div className="p-6">
          <Skeleton height={200} />
        </div>
      </AppShell>
    }>
      <SitterDashboardContent />
    </Suspense>
  );
}
