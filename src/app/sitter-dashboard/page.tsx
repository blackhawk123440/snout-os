"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { COLORS, formatClientNameForSitter } from "@/lib/booking-utils";

interface DashboardJob {
  id: string;
  bookingId: string;
  type: "direct" | "pool";
  status: "needs_response" | "accepted" | "too_late" | "expired";
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
  };
  isAdminView: boolean;
}

function SitterDashboardContent() {
  const searchParams = useSearchParams();
  const sitterId = searchParams?.get("id") || "";
  const isAdminView = searchParams?.get("admin") === "true";
  
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2" style={{ color: COLORS.primary }}>
                {isAdminView ? `Sitter Dashboard: ${dashboardData.sitter.firstName} ${dashboardData.sitter.lastName}` : "My Dashboard"}
              </h1>
              {isAdminView && (
                <p className="text-sm text-gray-600">Read-only admin view</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("calendar")}
                className={`px-4 py-2 rounded-lg font-semibold ${
                  viewMode === "calendar"
                    ? "text-white"
                    : "bg-gray-200 text-gray-800"
                }`}
                style={viewMode === "calendar" ? { background: COLORS.primary } : {}}
              >
                Calendar
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-4 py-2 rounded-lg font-semibold ${
                  viewMode === "list"
                    ? "text-white"
                    : "bg-gray-200 text-gray-800"
                }`}
                style={viewMode === "list" ? { background: COLORS.primary } : {}}
              >
                Job List
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border-2" style={{ borderColor: COLORS.primaryLight }}>
            <div className="text-sm font-medium text-gray-600">Needs Response</div>
            <div className="text-2xl font-bold" style={{ color: COLORS.primary }}>
              {dashboardData.jobs.needsResponse.length}
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border-2" style={{ borderColor: COLORS.primaryLight }}>
            <div className="text-sm font-medium text-gray-600">Accepted</div>
            <div className="text-2xl font-bold" style={{ color: COLORS.primary }}>
              {dashboardData.jobs.accepted.length}
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border-2" style={{ borderColor: COLORS.primaryLight }}>
            <div className="text-sm font-medium text-gray-600">Too Late / Expired</div>
            <div className="text-2xl font-bold" style={{ color: COLORS.primary }}>
              {dashboardData.jobs.tooLate.length}
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border-2" style={{ borderColor: COLORS.primaryLight }}>
            <div className="text-sm font-medium text-gray-600">Total Earnings</div>
            <div className="text-2xl font-bold" style={{ color: COLORS.primary }}>
              ${dashboardData.jobs.accepted.reduce((sum, job) => {
                const earnings = (job.totalPrice * dashboardData.sitter.commissionPercentage) / 100;
                return sum + earnings;
              }, 0).toFixed(2)}
            </div>
          </div>
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

        {/* Job List View */}
        {viewMode === "list" && (
          <div className="space-y-6">
            {/* Needs Response */}
            {dashboardData.jobs.needsResponse.length > 0 && (
              <div className="bg-white rounded-xl p-6 border-2 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
                <h2 className="text-2xl font-bold mb-4" style={{ color: COLORS.primary }}>
                  Needs Response ({dashboardData.jobs.needsResponse.length})
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
            )}

            {/* Accepted Jobs */}
            {dashboardData.jobs.accepted.length > 0 && (
              <div className="bg-white rounded-xl p-6 border-2 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
                <h2 className="text-2xl font-bold mb-4" style={{ color: COLORS.primary }}>
                  Accepted ({dashboardData.jobs.accepted.length})
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

            {/* Too Late / Expired */}
            {dashboardData.jobs.tooLate.length > 0 && (
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
            )}

            {/* Empty States */}
            {dashboardData.jobs.needsResponse.length === 0 &&
             dashboardData.jobs.accepted.length === 0 &&
             dashboardData.jobs.tooLate.length === 0 && (
              <div className="bg-white rounded-xl p-12 text-center border-2" style={{ borderColor: COLORS.primaryLight }}>
                <div className="text-6xl mb-4">📅</div>
                <h3 className="text-2xl font-bold mb-2" style={{ color: COLORS.primary }}>
                  No Jobs Yet
                </h3>
                <p className="text-gray-600">You don't have any jobs assigned or available</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

