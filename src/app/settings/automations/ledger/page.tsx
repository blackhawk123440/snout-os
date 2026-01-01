"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { COLORS } from "@/lib/booking-utils";

interface AutomationRun {
  id: string;
  eventType: string;
  automationType: string | null;
  status: "success" | "failed" | "skipped" | "pending";
  error: string | null;
  metadata: any;
  bookingId: string | null;
  booking: {
    id: string;
    firstName: string;
    lastName: string;
    service: string;
    status: string;
  } | null;
  createdAt: string;
}

export default function AutomationLedgerPage() {
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [automationTypeFilter, setAutomationTypeFilter] = useState<string>("all");
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchRuns();
  }, [statusFilter, automationTypeFilter]);

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (automationTypeFilter !== "all") {
        params.append("automationType", automationTypeFilter);
      }
      params.append("limit", "100");

      const response = await fetch(`/api/automations/ledger?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setRuns(data.runs || []);
        setTotal(data.total || 0);
      } else {
        console.error("Failed to fetch automation runs:", data.error);
      }
    } catch (error) {
      console.error("Failed to fetch automation runs:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800 border-green-300";
      case "failed":
        return "bg-red-100 text-red-800 border-red-300";
      case "skipped":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "pending":
        return "bg-blue-100 text-blue-800 border-blue-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getAutomationTypeLabel = (type: string | null) => {
    if (!type) return "Unknown";
    // Convert camelCase to readable label
    return type
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  return (
    <div className="min-h-screen w-full" style={{ background: COLORS.primaryLighter }}>
      {/* Header */}
      <div className="bg-white border-b shadow-sm" style={{ borderColor: COLORS.border }}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between flex-wrap gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: COLORS.primary }}>
                <i className="fas fa-history text-sm sm:text-base" style={{ color: COLORS.primaryLight }}></i>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold" style={{ color: COLORS.primary }}>
                  Automation Run Ledger
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">View automation execution history and failures</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <Link
                href="/settings"
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border rounded-lg hover:bg-gray-50 transition-colors touch-manipulation min-h-[44px] flex items-center"
                style={{ color: COLORS.primary, borderColor: COLORS.border }}
              >
                <i className="fas fa-arrow-left mr-1 sm:mr-2"></i>
                <span className="hidden sm:inline">Back to Settings</span>
                <span className="sm:hidden">Back</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
        {/* Filters */}
        <div className="bg-white rounded-lg p-4 mb-4 sm:mb-6 border-2" style={{ borderColor: COLORS.primaryLight }}>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2" style={{ color: COLORS.primary }}>
                Filter by Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                style={{ borderColor: COLORS.border }}
              >
                <option value="all">All Statuses</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="skipped">Skipped</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2" style={{ color: COLORS.primary }}>
                Filter by Automation Type
              </label>
              <select
                value={automationTypeFilter}
                onChange={(e) => setAutomationTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                style={{ borderColor: COLORS.border }}
              >
                <option value="all">All Types</option>
                <option value="bookingConfirmation">Booking Confirmation</option>
                <option value="ownerNewBookingAlert">Owner Alert</option>
                <option value="nightBeforeReminder">Night Before Reminder</option>
                <option value="paymentReminder">Payment Reminder</option>
                <option value="sitterAssignment">Sitter Assignment</option>
                <option value="postVisitThankYou">Post Visit Thank You</option>
                <option value="dailySummary">Daily Summary</option>
              </select>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Showing {runs.length} of {total} automation runs
          </div>
        </div>

        {/* Runs List */}
        <div className="bg-white rounded-lg border-2" style={{ borderColor: COLORS.primaryLight }}>
          {loading ? (
            <div className="p-8 text-center">
              <i className="fas fa-spinner fa-spin text-2xl" style={{ color: COLORS.primary }}></i>
              <p className="mt-2 text-gray-600">Loading automation runs...</p>
            </div>
          ) : runs.length === 0 ? (
            <div className="p-8 text-center">
              <i className="fas fa-history text-4xl text-gray-300 mb-4"></i>
              <p className="text-gray-600">No automation runs found</p>
              <p className="text-sm text-gray-500 mt-2">
                {statusFilter !== "all" || automationTypeFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Automation runs will appear here once automations start executing"}
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: COLORS.border }}>
              {runs.map((run) => (
                <div key={run.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`px-2 py-1 text-xs font-bold rounded border ${getStatusColor(run.status)}`}>
                          {run.status.toUpperCase()}
                        </span>
                        <span className="px-2 py-1 text-xs font-medium rounded" style={{ background: COLORS.primaryLight, color: COLORS.primary }}>
                          {getAutomationTypeLabel(run.automationType)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(run.createdAt)}
                        </span>
                      </div>
                      
                      {run.booking && (
                        <div className="text-sm text-gray-600 mb-2">
                          <i className="fas fa-calendar mr-1"></i>
                          Booking: {run.booking.firstName} {run.booking.lastName} - {run.booking.service}
                          {run.bookingId && (
                            <Link
                              href={`/bookings?booking=${run.bookingId}`}
                              className="ml-2 text-xs underline"
                              style={{ color: COLORS.primary }}
                            >
                              View Booking
                            </Link>
                          )}
                        </div>
                      )}

                      {run.error && (
                        <div className="mt-2 p-3 bg-red-50 rounded border border-red-200">
                          <p className="text-sm font-medium text-red-800 mb-1">
                            <i className="fas fa-exclamation-circle mr-1"></i>
                            Error:
                          </p>
                          <p className="text-sm text-red-700 whitespace-pre-wrap">{run.error}</p>
                        </div>
                      )}

                      {run.metadata && Object.keys(run.metadata).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-sm cursor-pointer" style={{ color: COLORS.primary }}>
                            <i className="fas fa-info-circle mr-1"></i>
                            View Details
                          </summary>
                          <div className="mt-2 p-3 bg-gray-50 rounded border text-xs font-mono overflow-x-auto">
                            <pre>{JSON.stringify(run.metadata, null, 2)}</pre>
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

