/**
 * Exceptions Page (Phase 6.3)
 * 
 * Displays exception queue for unpaid, unassigned, drift, and automation failures.
 * Per Master Spec Phase 6: "Add exception queue for unpaid, unassigned, drift, automation failures"
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { COLORS } from "@/lib/booking-utils";

interface Exception {
  id: string;
  type: string;
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  bookingId?: string;
  booking?: {
    id: string;
    firstName: string;
    lastName: string;
    service: string;
    startAt: Date | string;
    totalPrice?: number;
    paymentStatus?: string;
    sitterId?: string;
    address?: string;
    notes?: string;
    sitter?: any;
  };
  createdAt: Date | string;
  resolvedAt?: Date | string;
  metadata?: any;
}

export default function ExceptionsPage() {
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    fetchExceptions();
  }, [typeFilter]);

  const fetchExceptions = async () => {
    setLoading(true);
    try {
      const url = typeFilter === "all" 
        ? "/api/exceptions" 
        : `/api/exceptions?type=${typeFilter}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch exceptions");
      }
      const data = await response.json();
      setExceptions(data.exceptions || []);
      setSummary(data.summary || null);
    } catch (error) {
      console.error("Failed to fetch exceptions:", error);
      setExceptions([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800 border-red-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "unpaid":
        return "Unpaid";
      case "unassigned":
        return "Unassigned";
      case "automation_failure":
        return "Automation Failure";
      case "at_risk":
        return "At Risk";
      default:
        return type;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "unpaid":
        return "fas fa-dollar-sign";
      case "unassigned":
        return "fas fa-user-times";
      case "automation_failure":
        return "fas fa-exclamation-triangle";
      case "at_risk":
        return "fas fa-exclamation-circle";
      default:
        return "fas fa-info-circle";
    }
  };

  return (
    <div className="min-h-screen w-full" style={{ background: COLORS.primaryLighter }}>
      {/* Header */}
      <div className="bg-white border-b shadow-sm" style={{ borderColor: COLORS.border }}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/bookings" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <i className="fas fa-arrow-left"></i>
                <span>Back to Bookings</span>
              </Link>
              <div>
                <h1 className="text-xl font-bold" style={{ color: COLORS.primary }}>
                  Exception Queue
                </h1>
                <p className="text-xs text-gray-500">Unpaid, unassigned, drift, and automation failures</p>
              </div>
            </div>
            <button
              onClick={fetchExceptions}
              disabled={loading}
              className="px-4 py-2 text-sm font-bold border-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              style={{ color: COLORS.primary, borderColor: COLORS.primaryLight }}
            >
              <i className={`fas fa-sync-alt ${loading ? 'animate-spin' : ''} mr-2`}></i>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-6">
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 border-2" style={{ borderColor: COLORS.primaryLight }}>
              <div className="text-sm text-gray-600 mb-1">Total Exceptions</div>
              <div className="text-2xl font-bold" style={{ color: COLORS.primary }}>
                {summary.total}
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border-2 border-red-300">
              <div className="text-sm text-gray-600 mb-1">High Severity</div>
              <div className="text-2xl font-bold text-red-600">
                {summary.bySeverity?.high || 0}
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border-2 border-yellow-300">
              <div className="text-sm text-gray-600 mb-1">Medium Severity</div>
              <div className="text-2xl font-bold text-yellow-600">
                {summary.bySeverity?.medium || 0}
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border-2 border-blue-300">
              <div className="text-sm text-gray-600 mb-1">Low Severity</div>
              <div className="text-2xl font-bold text-blue-600">
                {summary.bySeverity?.low || 0}
              </div>
            </div>
          </div>
        )}

        {/* Type Filter */}
        <div className="bg-white rounded-lg p-4 border-2 mb-6" style={{ borderColor: COLORS.primaryLight }}>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium" style={{ color: COLORS.primary }}>
              Filter by Type:
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
              style={{ borderColor: COLORS.border }}
            >
              <option value="all">All Types</option>
              <option value="unpaid">Unpaid</option>
              <option value="unassigned">Unassigned</option>
              <option value="automation_failure">Automation Failures</option>
              <option value="at_risk">At Risk</option>
            </select>
          </div>
        </div>

        {/* Exceptions List */}
        <div className="bg-white rounded-lg border-2" style={{ borderColor: COLORS.primaryLight }}>
          <div className="p-4 border-b" style={{ borderColor: COLORS.border }}>
            <h2 className="text-lg font-bold" style={{ color: COLORS.primary }}>
              Exceptions ({exceptions.length})
            </h2>
          </div>

          <div className="divide-y" style={{ borderColor: COLORS.border }}>
            {loading ? (
              <div className="p-8 text-center">
                <i className="fas fa-spinner fa-spin text-2xl mb-4" style={{ color: COLORS.primary }}></i>
                <p className="text-gray-600">Loading exceptions...</p>
              </div>
            ) : exceptions.length === 0 ? (
              <div className="p-8 text-center">
                <i className="fas fa-check-circle text-4xl text-gray-300 mb-4"></i>
                <p className="text-gray-600">No exceptions found</p>
                <p className="text-sm text-gray-500 mt-2">All bookings are in good standing!</p>
              </div>
            ) : (
              exceptions.map((exception) => (
                <div
                  key={exception.id}
                  className={`p-4 hover:bg-gray-50 transition-colors border-l-4 ${
                    exception.severity === "high" ? "border-red-500" :
                    exception.severity === "medium" ? "border-yellow-500" :
                    "border-blue-500"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getSeverityColor(exception.severity).split(" ")[0]}`}>
                        <i className={`${getTypeIcon(exception.type)} text-lg`} style={{ color: COLORS.primary }}></i>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg">{exception.title}</h3>
                          <span className={`px-2 py-1 text-xs font-bold rounded ${getSeverityColor(exception.severity)}`}>
                            {exception.severity.toUpperCase()}
                          </span>
                          <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-700">
                            {getTypeLabel(exception.type)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{exception.description}</p>
                        {exception.booking && (
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>
                              <strong>Booking:</strong> {exception.booking.firstName} {exception.booking.lastName} - {exception.booking.service}
                            </div>
                            {exception.booking.startAt && (
                              <div>
                                <strong>Start:</strong> {formatDate(exception.booking.startAt)}
                              </div>
                            )}
                            {exception.type === "unpaid" && exception.booking.totalPrice && (
                              <div>
                                <strong>Amount:</strong> ${exception.booking.totalPrice.toFixed(2)}
                              </div>
                            )}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-2">
                          Created: {formatDate(exception.createdAt)}
                        </div>
                      </div>
                    </div>
                    {exception.bookingId && (
                      <Link
                        href={`/bookings?booking=${exception.bookingId}`}
                        className="px-3 py-1 text-sm font-semibold rounded bg-blue-100 text-blue-800 hover:bg-blue-200"
                      >
                        View Booking
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

