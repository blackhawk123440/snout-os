"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { COLORS, formatClientNameForSitter } from "@/lib/booking-utils";

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

function SitterDashboardContent() {
  const searchParams = useSearchParams();
  const sitterId = searchParams?.get("id") || "";
  const isAdminView = searchParams?.get("admin") === "true";
  
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "accepted" | "archived" | "tooLate" | "tier">("pending");
  const [viewMode, setViewMode] = useState<"calendar" | "list">("list");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [acceptingJobId, setAcceptingJobId] = useState<string | null>(null);

  useEffect(() => {
    if (sitterId) {
      fetchDashboardData();
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
      <div className="min-h-screen p-8" style={{ background: COLORS.primaryLighter }}>
        <div className="text-center py-20">Loading dashboard...</div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen p-8" style={{ background: COLORS.primaryLighter }}>
        <div className="text-center py-20">
          <p className="text-red-600">Failed to load dashboard data</p>
        </div>
      </div>
    );
  }

  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
  const firstDay = getFirstDayOfMonth(selectedMonth, selectedYear);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="min-h-screen p-8" style={{ background: COLORS.primaryLighter }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4">
            <h1 className="text-4xl font-bold mb-2" style={{ color: COLORS.primary }}>
              {isAdminView ? `Sitter Dashboard: ${dashboardData.sitter.firstName} ${dashboardData.sitter.lastName}` : "My Dashboard"}
            </h1>
            {isAdminView && (
              <p className="text-sm text-gray-600">Read-only admin view</p>
            )}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 border-b-2" style={{ borderColor: COLORS.border }}>
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
                activeTab === "pending"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-800"
              }`}
            >
              Pending Requests ({dashboardData.jobs.needsResponse.length})
            </button>
            <button
              onClick={() => setActiveTab("accepted")}
              className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
                activeTab === "accepted"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-800"
              }`}
            >
              Accepted ({dashboardData.jobs.accepted.length})
            </button>
            <button
              onClick={() => setActiveTab("archived")}
              className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
                activeTab === "archived"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-800"
              }`}
            >
              Archived ({dashboardData.jobs.archived.length})
            </button>
            <button
              onClick={() => setActiveTab("tooLate")}
              className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
                activeTab === "tooLate"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-800"
              }`}
            >
              Too Late / Expired ({dashboardData.jobs.tooLate.length})
            </button>
            <button
              onClick={() => setActiveTab("tier")}
              className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
                activeTab === "tier"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-800"
              }`}
            >
              Tier & Insights
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "pending" && (
          <div className="space-y-6">
            {dashboardData.jobs.needsResponse.length > 0 ? (
              <div className="bg-white rounded-xl p-6 border-2 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
                <h2 className="text-2xl font-bold mb-4" style={{ color: COLORS.primary }}>
                  Pending Requests ({dashboardData.jobs.needsResponse.length})
                </h2>
                <div className="space-y-4">
                  {dashboardData.jobs.needsResponse.map((job) => (
                    <div
                      key={job.id}
                      className="p-4 border-2 rounded-lg"
                      style={{ borderColor: COLORS.border }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold">{job.clientName}</h3>
                            <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">
                              Pool Request
                            </span>
                            {job.expiresAt && new Date(job.expiresAt) > new Date() && (
                              <span className="text-xs text-gray-600">
                                Expires: {formatDate(job.expiresAt)} {formatTime(job.expiresAt)}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
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
                              <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                                {job.message}
                              </div>
                            )}
                          </div>
                        </div>
                        {!isAdminView && (
                          <div className="ml-4 flex flex-col gap-2">
                            <button
                              onClick={() => acceptJob(job)}
                              disabled={acceptingJobId === job.id || !!(job.expiresAt && new Date(job.expiresAt) < new Date())}
                              className="px-4 py-2 rounded-lg font-semibold text-white disabled:opacity-50"
                              style={{ background: COLORS.primary }}
                            >
                              {acceptingJobId === job.id ? "Accepting..." : "Accept"}
                            </button>
                            <button
                              className="px-4 py-2 rounded-lg font-semibold bg-gray-200 text-gray-800"
                              disabled
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-12 text-center border-2" style={{ borderColor: COLORS.primaryLight }}>
                <div className="text-6xl mb-4">📬</div>
                <h3 className="text-2xl font-bold mb-2" style={{ color: COLORS.primary }}>
                  No Pending Requests
                </h3>
                <p className="text-gray-600">You don't have any pending job requests</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "accepted" && (
          <div className="space-y-6">
            {/* Calendar Toggle */}
            <div className="flex items-center justify-end mb-4">
              <button
                onClick={() => setViewMode(viewMode === "calendar" ? "list" : "calendar")}
                className="px-4 py-2 rounded-lg font-semibold border-2"
                style={{ 
                  background: viewMode === "calendar" ? COLORS.primary : "white",
                  color: viewMode === "calendar" ? "white" : COLORS.primary,
                  borderColor: COLORS.primaryLight 
                }}
              >
                {viewMode === "calendar" ? "📋 List View" : "📅 Calendar View"}
              </button>
            </div>

            {/* Calendar View */}
            {viewMode === "calendar" && (
              <div className="bg-white rounded-xl p-6 border-2 shadow-sm mb-6" style={{ borderColor: COLORS.primaryLight }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold" style={{ color: COLORS.primary }}>
                    Calendar
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (selectedMonth === 0) {
                          setSelectedMonth(11);
                          setSelectedYear(selectedYear - 1);
                        } else {
                          setSelectedMonth(selectedMonth - 1);
                        }
                      }}
                      className="px-3 py-1 rounded border"
                    >
                      ←
                    </button>
                    <span className="font-semibold">
                      {new Date(selectedYear, selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                    <button
                      onClick={() => {
                        if (selectedMonth === 11) {
                          setSelectedMonth(0);
                          setSelectedYear(selectedYear + 1);
                        } else {
                          setSelectedMonth(selectedMonth + 1);
                        }
                      }}
                      className="px-3 py-1 rounded border"
                    >
                      →
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="text-center font-semibold text-sm p-2" style={{ color: COLORS.primary }}>
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
                        className={`min-h-[100px] p-2 border rounded ${
                          isToday ? "border-2 border-blue-500 bg-blue-50" : "border-gray-200"
                        }`}
                      >
                        <div className={`font-semibold mb-1 ${isToday ? "text-blue-600" : ""}`}>
                          {day}
                        </div>
                        <div className="space-y-1">
                          {jobsForDay.map((job) => (
                            <div
                              key={job.id}
                              className="text-xs p-1 rounded"
                              style={{ background: COLORS.primaryLight, color: COLORS.primary }}
                            >
                              <div className="font-semibold">{job.clientName}</div>
                              <div>{job.service}</div>
                              {job.timeSlots.length > 0 && (
                                <div>{formatTime(job.timeSlots[0].startAt)}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* List View */}
            {viewMode === "list" && dashboardData.jobs.accepted.length > 0 && (
              <div className="bg-white rounded-xl p-6 border-2 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
                <h2 className="text-2xl font-bold mb-4" style={{ color: COLORS.primary }}>
                  Accepted Jobs ({dashboardData.jobs.accepted.length})
                </h2>
                <div className="space-y-4">
                  {dashboardData.jobs.accepted.map((job) => (
                    <div
                      key={job.id}
                      className="p-4 border-2 rounded-lg"
                      style={{ borderColor: COLORS.border }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold">{job.clientName}</h3>
                            <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                              {job.type === "direct" ? "Direct Assignment" : "Pool Accepted"}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
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
                    </div>
                  ))}
                </div>
              </div>
            )}

            {viewMode === "list" && dashboardData.jobs.accepted.length === 0 && (
              <div className="bg-white rounded-xl p-12 text-center border-2" style={{ borderColor: COLORS.primaryLight }}>
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-2xl font-bold mb-2" style={{ color: COLORS.primary }}>
                  No Accepted Jobs
                </h3>
                <p className="text-gray-600">You don't have any accepted jobs yet</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "archived" && (
          <div className="space-y-6">
            {dashboardData.jobs.archived.length > 0 ? (
              <div className="bg-white rounded-xl p-6 border-2 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
                <h2 className="text-2xl font-bold mb-4" style={{ color: COLORS.primary }}>
                  Archived Jobs ({dashboardData.jobs.archived.length})
                </h2>
                <div className="space-y-4">
                  {dashboardData.jobs.archived.map((job) => (
                    <div
                      key={job.id}
                      className="p-4 border-2 rounded-lg opacity-75"
                      style={{ borderColor: COLORS.border }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold">{job.clientName}</h3>
                            <span className={`px-2 py-1 rounded text-xs ${
                              job.status === "completed" 
                                ? "bg-green-100 text-green-800" 
                                : "bg-gray-100 text-gray-800"
                            }`}>
                              {job.status === "completed" ? "Completed" : "Cancelled"}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
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
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-12 text-center border-2" style={{ borderColor: COLORS.primaryLight }}>
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-2xl font-bold mb-2" style={{ color: COLORS.primary }}>
                  No Archived Jobs
                </h3>
                <p className="text-gray-600">You don't have any completed or cancelled jobs</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "tooLate" && (
          <div className="space-y-6">
            {dashboardData.jobs.tooLate.length > 0 ? (
              <div className="bg-white rounded-xl p-6 border-2 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
                <h2 className="text-2xl font-bold mb-4" style={{ color: COLORS.primary }}>
                  Too Late / Expired ({dashboardData.jobs.tooLate.length})
                </h2>
                <div className="space-y-4">
                  {dashboardData.jobs.tooLate.map((job) => (
                    <div
                      key={job.id}
                      className="p-4 border-2 rounded-lg opacity-60"
                      style={{ borderColor: COLORS.border }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold">{job.clientName}</h3>
                            <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">
                              {job.status === "expired" ? "Expired" : "Too Late"}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div><span className="font-semibold">Service:</span> {job.service}</div>
                            <div><span className="font-semibold">Date:</span> {formatDate(job.startAt)}</div>
                            {job.status === "expired" && (
                              <div className="text-xs text-red-600">This job expired before anyone accepted it</div>
                            )}
                            {job.status === "too_late" && (
                              <div className="text-xs text-red-600">This job was accepted by another sitter</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-12 text-center border-2" style={{ borderColor: COLORS.primaryLight }}>
                <div className="text-6xl mb-4">⏰</div>
                <h3 className="text-2xl font-bold mb-2" style={{ color: COLORS.primary }}>
                  No Missed Jobs
                </h3>
                <p className="text-gray-600">You haven't missed any job opportunities</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "tier" && (
          <div className="space-y-6">
            {/* Current Tier */}
            <div className="bg-white rounded-xl p-6 border-2 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
              <h2 className="text-2xl font-bold mb-4" style={{ color: COLORS.primary }}>
                Current Tier & Badge
              </h2>
              {dashboardData.tier ? (
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold"
                       style={{ background: COLORS.primaryLight, color: COLORS.primary }}>
                    ⭐
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold mb-2" style={{ color: COLORS.primary }}>
                      {dashboardData.tier.name}
                    </h3>
                    <p className="text-gray-600">Priority Level: {dashboardData.tier.priorityLevel}</p>
                    {Object.keys(dashboardData.tier.benefits).length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-semibold text-gray-700">Benefits:</p>
                        <ul className="text-sm text-gray-600 list-disc list-inside">
                          {Object.entries(dashboardData.tier.benefits).map(([key, value]) => (
                            <li key={key}>{key}: {String(value)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">No tier assigned yet</p>
                </div>
              )}
            </div>

            {/* Performance Metrics */}
            <div className="bg-white rounded-xl p-6 border-2 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
              <h2 className="text-2xl font-bold mb-4" style={{ color: COLORS.primary }}>
                Performance Metrics (Last 30 Days)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 border-2 rounded-lg" style={{ borderColor: COLORS.border }}>
                  <div className="text-sm font-medium text-gray-600 mb-1">Points Earned</div>
                  <div className="text-3xl font-bold" style={{ color: COLORS.primary }}>
                    {dashboardData.performance.points}
                  </div>
                  {dashboardData.nextTier && (
                    <div className="text-xs text-gray-500 mt-1">
                      Need {dashboardData.nextTier.pointTarget} for next tier
                    </div>
                  )}
                </div>
                <div className="p-4 border-2 rounded-lg" style={{ borderColor: COLORS.border }}>
                  <div className="text-sm font-medium text-gray-600 mb-1">Completion Rate</div>
                  <div className="text-3xl font-bold" style={{ color: COLORS.primary }}>
                    {dashboardData.performance.completionRate.toFixed(1)}%
                  </div>
                  {dashboardData.nextTier?.minCompletionRate && (
                    <div className="text-xs text-gray-500 mt-1">
                      Need {dashboardData.nextTier.minCompletionRate}% for next tier
                    </div>
                  )}
                </div>
                <div className="p-4 border-2 rounded-lg" style={{ borderColor: COLORS.border }}>
                  <div className="text-sm font-medium text-gray-600 mb-1">Response Rate</div>
                  <div className="text-3xl font-bold" style={{ color: COLORS.primary }}>
                    {dashboardData.performance.responseRate.toFixed(1)}%
                  </div>
                  {dashboardData.nextTier?.minResponseRate && (
                    <div className="text-xs text-gray-500 mt-1">
                      Need {dashboardData.nextTier.minResponseRate}% for next tier
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Job Statistics */}
            <div className="bg-white rounded-xl p-6 border-2 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
              <h2 className="text-2xl font-bold mb-4" style={{ color: COLORS.primary }}>
                Job Statistics
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 border-2 rounded-lg" style={{ borderColor: COLORS.border }}>
                  <div className="text-sm font-medium text-gray-600 mb-1">Jobs Received</div>
                  <div className="text-2xl font-bold" style={{ color: COLORS.primary }}>
                    {dashboardData.performance.jobsReceived}
                  </div>
                </div>
                <div className="p-4 border-2 rounded-lg" style={{ borderColor: COLORS.border }}>
                  <div className="text-sm font-medium text-gray-600 mb-1">Jobs Accepted</div>
                  <div className="text-2xl font-bold" style={{ color: COLORS.primary }}>
                    {dashboardData.performance.jobsAccepted}
                  </div>
                </div>
                <div className="p-4 border-2 rounded-lg" style={{ borderColor: COLORS.border }}>
                  <div className="text-sm font-medium text-gray-600 mb-1">Jobs Declined</div>
                  <div className="text-2xl font-bold" style={{ color: COLORS.primary }}>
                    {dashboardData.performance.jobsDeclined}
                  </div>
                </div>
                <div className="p-4 border-2 rounded-lg" style={{ borderColor: COLORS.border }}>
                  <div className="text-sm font-medium text-gray-600 mb-1">Acceptance Rate</div>
                  <div className="text-2xl font-bold" style={{ color: COLORS.primary }}>
                    {dashboardData.performance.acceptanceRate.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            {/* What You Need to Improve */}
            {dashboardData.improvementAreas.length > 0 && (
              <div className="bg-white rounded-xl p-6 border-2 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
                <h2 className="text-2xl font-bold mb-4" style={{ color: COLORS.primary }}>
                  How to Rank Higher
                </h2>
                {dashboardData.nextTier && (
                  <div className="mb-4 p-4 rounded-lg" style={{ background: COLORS.primaryLight }}>
                    <p className="font-semibold mb-2" style={{ color: COLORS.primary }}>
                      Next Tier: {dashboardData.nextTier.name}
                    </p>
                  </div>
                )}
                <div className="space-y-3">
                  {dashboardData.improvementAreas.map((area, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 border-2 rounded-lg" style={{ borderColor: COLORS.border }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                           style={{ background: COLORS.primaryLight, color: COLORS.primary }}>
                        {idx + 1}
                      </div>
                      <p className="text-gray-700">{area}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tier History */}
            {dashboardData.tierHistory.length > 0 && (
              <div className="bg-white rounded-xl p-6 border-2 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
                <h2 className="text-2xl font-bold mb-4" style={{ color: COLORS.primary }}>
                  Tier History
                </h2>
                <div className="space-y-3">
                  {dashboardData.tierHistory.map((history) => (
                    <div key={history.id} className="p-4 border-2 rounded-lg" style={{ borderColor: COLORS.border }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold" style={{ color: COLORS.primary }}>
                          {history.tierName}
                        </span>
                        <span className="text-sm text-gray-600">
                          {new Date(history.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Points: {history.points}</div>
                        {history.completionRate !== null && (
                          <div>Completion Rate: {history.completionRate.toFixed(1)}%</div>
                        )}
                        {history.responseRate !== null && (
                          <div>Response Rate: {history.responseRate.toFixed(1)}%</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SitterDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen p-8" style={{ background: COLORS.primaryLighter }}>
        <div className="text-center py-20">Loading dashboard...</div>
      </div>
    }>
      <SitterDashboardContent />
    </Suspense>
  );
}
