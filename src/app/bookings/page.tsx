"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { COLORS, formatPetsByQuantity } from "@/lib/booking-utils";

interface Booking {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  service: string;
  startAt: Date;
  endAt: Date;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  totalPrice: number;
  pets: Array<{ species: string }>;
  sitter?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface Sitter {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  isActive: boolean;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [sitters, setSitters] = useState<Sitter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "name" | "price">("date");
  const [showArchived, setShowArchived] = useState(false);
  const [selectedSitterFilter, setSelectedSitterFilter] = useState<string>("all");

  // Multi-select states
  const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Edit mode states
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedBooking, setEditedBooking] = useState<Partial<Booking>>({});
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(false);

  // Dashboard sections visibility
  const [showStats, setShowStats] = useState(true);
  const [showUpcoming, setShowUpcoming] = useState(true);
  const [showPending, setShowPending] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);

  useEffect(() => {
    fetchBookings();
    fetchSitters();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/bookings");
      const data = await response.json();
      setBookings(data.bookings || []);
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
    }
    setLoading(false);
  };

  const fetchSitters = async () => {
    try {
      const response = await fetch("/api/sitters");
      const data = await response.json();
      setSitters(data.sitters || []);
    } catch (error) {
      console.error("Failed to fetch sitters:", error);
    }
  };

  const activeBookings = useMemo(() => {
    return bookings.filter(booking => booking.status !== "cancelled");
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    let filtered = activeBookings;

    // Filter by status
    if (filter !== "all") {
      filtered = filtered.filter(booking => booking.status === filter);
    }

    // Filter by sitter
    if (selectedSitterFilter !== "all") {
      filtered = filtered.filter(booking => 
        booking.sitter?.id === selectedSitterFilter
      );
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(booking =>
        booking.firstName.toLowerCase().includes(term) ||
        booking.lastName.toLowerCase().includes(term) ||
        booking.phone.includes(term) ||
        booking.service.toLowerCase().includes(term)
      );
    }

    // Sort bookings
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        case "price":
          return b.totalPrice - a.totalPrice;
        case "date":
        default:
          return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
      }
    });

    return filtered;
  }, [activeBookings, filter, selectedSitterFilter, searchTerm, sortBy]);

  const stats = useMemo(() => {
    const total = activeBookings.length;
    const pending = activeBookings.filter(b => b.status === "pending").length;
    const confirmed = activeBookings.filter(b => b.status === "confirmed").length;
    const completed = activeBookings.filter(b => b.status === "completed").length;
    const revenue = activeBookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const paid = activeBookings.filter(b => b.status === "completed").length;
    const paidAmount = activeBookings.filter(b => b.status === "completed").reduce((sum, b) => sum + b.totalPrice, 0);

    return {
      total,
      pending,
      confirmed,
      completed,
      revenue,
      paid,
      paidAmount,
    };
  }, [activeBookings]);

  const todayBookings = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return activeBookings.filter(booking => {
      const bookingDate = new Date(booking.startAt);
      return bookingDate >= today && bookingDate < tomorrow;
    });
  }, [activeBookings]);

  const upcomingBookings = useMemo(() => {
    const now = new Date();
    return activeBookings
      .filter(booking => new Date(booking.startAt) > now)
      .slice(0, 5);
  }, [activeBookings]);

  const pendingBookings = useMemo(() => {
    return activeBookings
      .filter(booking => booking.status === "pending")
      .slice(0, 5);
  }, [activeBookings]);

  const completedBookings = useMemo(() => {
    return activeBookings
      .filter(booking => booking.status === "completed")
      .slice(0, 5);
  }, [activeBookings]);

  const handleBookingSelect = (booking: Booking) => {
    setSelectedBooking(booking);
    setEditedBooking(booking);
    setIsEditMode(false);
    setPendingChanges(false);
  };

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchBookings();
        if (selectedBooking?.id === bookingId) {
          setSelectedBooking({ ...selectedBooking, status: newStatus as any });
        }
      }
    } catch (error) {
      console.error("Failed to update booking status:", error);
    }
  };

  const handleSitterAssign = async (bookingId: string, sitterId: string) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sitterId }),
      });

      if (response.ok) {
        fetchBookings();
        if (selectedBooking?.id === bookingId) {
          const sitter = sitters.find(s => s.id === sitterId);
          if (sitter) {
            setSelectedBooking({ ...selectedBooking, sitter });
          }
        }
      }
    } catch (error) {
      console.error("Failed to assign sitter:", error);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedBookingIds.length === 0) return;

    try {
      const promises = selectedBookingIds.map(id => {
        switch (action) {
          case "confirm":
            return fetch(`/api/bookings/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "confirmed" }),
            });
          case "complete":
            return fetch(`/api/bookings/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "completed" }),
            });
          case "cancel":
            return fetch(`/api/bookings/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "cancelled" }),
            });
          default:
            return Promise.resolve();
        }
      });

      await Promise.all(promises);
      fetchBookings();
      setSelectedBookingIds([]);
      setShowBulkActions(false);
    } catch (error) {
      console.error("Failed to perform bulk action:", error);
    }
  };

  const toggleBookingSelection = (bookingId: string) => {
    setSelectedBookingIds(prev => {
      const newSelection = prev.includes(bookingId)
        ? prev.filter(id => id !== bookingId)
        : [...prev, bookingId];
      
      setShowBulkActions(newSelection.length > 0);
      return newSelection;
    });
  };

  const selectAllBookings = () => {
    const allIds = filteredBookings.map(b => b.id);
    setSelectedBookingIds(allIds);
    setShowBulkActions(allIds.length > 0);
  };

  const clearSelection = () => {
    setSelectedBookingIds([]);
    setShowBulkActions(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "confirmed": return "bg-blue-100 text-blue-800";
      case "completed": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  return (
    <div className="min-h-screen" style={{ background: COLORS.primaryLighter }}>
      {/* Header */}
      <div className="bg-white border-b shadow-sm" style={{ borderColor: COLORS.border }}>
        <div className="max-w-[1400px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: COLORS.primary }}>
                <img 
                  src="/logo.png" 
                  alt="Snout Services Logo" 
                  className="w-12 h-12 object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: COLORS.primary }}>
                  Snout Services
                </h1>
                <p className="text-xs text-gray-700 font-medium">Owner Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  fetchBookings();
                  fetchSitters();
                }}
                disabled={loading}
                className="px-4 py-2.5 text-sm font-bold border-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ color: COLORS.primary, borderColor: COLORS.primaryLight }}
                title="Refresh data"
              >
                <i className={`fas fa-sync-alt ${loading ? 'animate-spin' : ''}`}></i>
              </button>
              <a
                href="/payments"
                className="px-4 py-2.5 text-sm font-bold border-2 rounded-lg hover:opacity-90 transition-all"
                style={{ color: COLORS.primary, borderColor: COLORS.primaryLight }}
              >
                <i className="fas fa-credit-card mr-2"></i>Payments
              </a>
              <a
                href="/calendar"
                className="px-4 py-2.5 text-sm font-bold rounded-lg hover:opacity-90 transition-all shadow-sm"
                style={{ background: COLORS.primary, color: COLORS.primaryLight }}
              >
                <i className="fas fa-calendar-alt mr-2"></i>Calendar
              </a>
              <a
                href="/clients"
                className="px-4 py-2.5 text-sm font-bold border-2 rounded-lg hover:opacity-90 transition-all"
                style={{ color: COLORS.primary, borderColor: COLORS.primaryLight }}
              >
                <i className="fas fa-users mr-2"></i>Clients
              </a>
              <a
                href="/automation"
                className="px-4 py-2.5 text-sm font-bold border-2 rounded-lg hover:opacity-90 transition-all"
                style={{ color: COLORS.primary, borderColor: COLORS.primaryLight }}
              >
                <i className="fas fa-robot mr-2"></i>Automation
              </a>
              <a
                href="/settings"
                className="px-4 py-2.5 text-sm font-bold border-2 rounded-lg hover:opacity-90 transition-all"
                style={{ color: COLORS.primary, borderColor: COLORS.primaryLight }}
              >
                <i className="fas fa-cog mr-2"></i>Settings
              </a>
              <a
                href="/bookings/sitters"
                className="px-4 py-2.5 text-sm font-bold border-2 rounded-lg hover:opacity-90 transition-all"
                style={{ color: COLORS.primary, borderColor: COLORS.primaryLight }}
              >
                <i className="fas fa-user-friends mr-2"></i>Sitters
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-8 py-6">
        {/* Stats Cards */}
        {showStats && (
          <div className="grid grid-cols-7 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 border-2" style={{ borderColor: COLORS.primaryLight }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                  <p className="text-2xl font-bold" style={{ color: COLORS.primary }}>{stats.total}</p>
                </div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                  <i className="fas fa-calendar" style={{ color: COLORS.primary }}></i>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border-2" style={{ borderColor: COLORS.primaryLight }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold" style={{ color: COLORS.primary }}>{stats.pending}</p>
                </div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                  <i className="fas fa-clock" style={{ color: COLORS.primary }}></i>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border-2" style={{ borderColor: COLORS.primaryLight }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Confirmed</p>
                  <p className="text-2xl font-bold" style={{ color: COLORS.primary }}>{stats.confirmed}</p>
                </div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                  <i className="fas fa-check-circle" style={{ color: COLORS.primary }}></i>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border-2" style={{ borderColor: COLORS.primaryLight }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold" style={{ color: COLORS.primary }}>{stats.completed}</p>
                </div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                  <i className="fas fa-check-double" style={{ color: COLORS.primary }}></i>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border-2" style={{ borderColor: COLORS.primaryLight }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Revenue</p>
                  <p className="text-2xl font-bold" style={{ color: COLORS.primary }}>${stats.revenue.toFixed(2)}</p>
                </div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                  <i className="fas fa-dollar-sign" style={{ color: COLORS.primary }}></i>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border-2" style={{ borderColor: COLORS.primaryLight }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Paid</p>
                  <p className="text-2xl font-bold" style={{ color: COLORS.primary }}>{stats.paid}</p>
                </div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                  <i className="fas fa-credit-card" style={{ color: COLORS.primary }}></i>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border-2" style={{ borderColor: COLORS.primaryLight }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Paid Amount</p>
                  <p className="text-2xl font-bold" style={{ color: COLORS.primary }}>${stats.paidAmount.toFixed(2)}</p>
                </div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                  <i className="fas fa-money-bill-wave" style={{ color: COLORS.primary }}></i>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Today's Summary */}
        <div className="bg-white rounded-lg border-2 mb-6" style={{ borderColor: COLORS.primaryLight }}>
          <div className="p-4 border-b" style={{ borderColor: COLORS.border }}>
            <h2 className="text-lg font-bold" style={{ color: COLORS.primary }}>
              Today's Summary
            </h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold mb-1" style={{ color: COLORS.primary }}>
                  {todayBookings.length}
                </div>
                <div className="text-sm text-gray-600">Today's Bookings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold mb-1" style={{ color: COLORS.primary }}>
                  {todayBookings.filter(b => b.status === 'pending').length}
                </div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold mb-1" style={{ color: COLORS.primary }}>
                  {todayBookings.filter(b => b.status === 'confirmed').length}
                </div>
                <div className="text-sm text-gray-600">Confirmed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold mb-1" style={{ color: COLORS.primary }}>
                  ${todayBookings.reduce((sum, b) => sum + b.totalPrice, 0).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Today's Revenue</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg p-4 border-2 mb-6" style={{ borderColor: COLORS.primaryLight }}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium" style={{ color: COLORS.primary }}>Status:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-1 border rounded-lg text-sm"
                style={{ borderColor: COLORS.border }}
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium" style={{ color: COLORS.primary }}>Sitter:</label>
              <select
                value={selectedSitterFilter}
                onChange={(e) => setSelectedSitterFilter(e.target.value)}
                className="px-3 py-1 border rounded-lg text-sm"
                style={{ borderColor: COLORS.border }}
              >
                <option value="all">All Sitters</option>
                {sitters.map(sitter => (
                  <option key={sitter.id} value={sitter.id}>
                    {sitter.firstName} {sitter.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium" style={{ color: COLORS.primary }}>Sort:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1 border rounded-lg text-sm"
                style={{ borderColor: COLORS.border }}
              >
                <option value="date">Date</option>
                <option value="name">Name</option>
                <option value="price">Price</option>
              </select>
            </div>

            <div className="flex-1">
              <input
                type="text"
                placeholder="Search bookings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-1 border rounded-lg text-sm"
                style={{ borderColor: COLORS.border }}
              />
            </div>

            {selectedBookingIds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{selectedBookingIds.length} selected</span>
                <button
                  onClick={() => handleBulkAction("confirm")}
                  className="px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
                >
                  Confirm
                </button>
                <button
                  onClick={() => handleBulkAction("complete")}
                  className="px-3 py-1 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600"
                >
                  Complete
                </button>
                <button
                  onClick={() => handleBulkAction("cancel")}
                  className="px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600"
                >
                  Cancel
                </button>
                <button
                  onClick={clearSelection}
                  className="px-3 py-1 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bookings List */}
        <div className="bg-white rounded-lg border-2" style={{ borderColor: COLORS.primaryLight }}>
          <div className="p-4 border-b" style={{ borderColor: COLORS.border }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold" style={{ color: COLORS.primary }}>
                Bookings ({filteredBookings.length})
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAllBookings}
                  className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50"
                  style={{ color: COLORS.primary, borderColor: COLORS.border }}
                >
                  Select All
                </button>
                <button
                  onClick={() => setShowStats(!showStats)}
                  className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50"
                  style={{ color: COLORS.primary, borderColor: COLORS.border }}
                >
                  {showStats ? "Hide" : "Show"} Stats
                </button>
              </div>
            </div>
          </div>

          <div className="divide-y" style={{ borderColor: COLORS.border }}>
            {loading ? (
              <div className="p-8 text-center">
                <i className="fas fa-spinner fa-spin text-2xl" style={{ color: COLORS.primary }}></i>
                <p className="mt-2 text-gray-600">Loading bookings...</p>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="p-8 text-center">
                <i className="fas fa-calendar text-4xl text-gray-300 mb-4"></i>
                <p className="text-gray-600">No bookings found</p>
              </div>
            ) : (
              filteredBookings.map((booking) => (
                <div
                  key={booking.id}
                  className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                    selectedBooking?.id === booking.id ? "bg-blue-50" : ""
                  }`}
                  onClick={() => handleBookingSelect(booking)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={selectedBookingIds.includes(booking.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleBookingSelection(booking.id);
                        }}
                        className="w-4 h-4"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">
                            {booking.firstName} {booking.lastName}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-bold rounded ${getStatusColor(booking.status)}`}>
                            {booking.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          <div className="flex items-center gap-4">
                            <span><i className="fas fa-calendar mr-1"></i>{formatDate(booking.startAt)}</span>
                            <span><i className="fas fa-clock mr-1"></i>{formatTime(booking.startAt)}</span>
                            <span><i className="fas fa-paw mr-1"></i>{formatPetsByQuantity(booking.pets)}</span>
                            <span><i className="fas fa-dollar-sign mr-1"></i>${booking.totalPrice.toFixed(2)}</span>
                          </div>
                          <div className="mt-1">
                            <span><i className="fas fa-map-marker-alt mr-1"></i>{booking.address}</span>
                            {booking.sitter && (
                              <span className="ml-4"><i className="fas fa-user mr-1"></i>{booking.sitter.firstName} {booking.sitter.lastName}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={booking.status}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleStatusChange(booking.id, e.target.value);
                        }}
                        className="px-2 py-1 text-sm border rounded"
                        style={{ borderColor: COLORS.border }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <select
                        value={booking.sitter?.id || ""}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (e.target.value) {
                            handleSitterAssign(booking.id, e.target.value);
                          }
                        }}
                        className="px-2 py-1 text-sm border rounded"
                        style={{ borderColor: COLORS.border }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="">Assign Sitter</option>
                        {sitters.map(sitter => (
                          <option key={sitter.id} value={sitter.id}>
                            {sitter.firstName} {sitter.lastName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Booking Detail Modal */}
        {selectedBooking && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-5xl w-full max-h-[95vh] overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="px-8 py-6 border-b" style={{ borderColor: COLORS.border, background: `linear-gradient(135deg, ${COLORS.primaryLight} 0%, ${COLORS.primaryLighter} 100%)` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg" style={{ background: COLORS.primary }}>
                      <i className="fas fa-calendar-check text-lg" style={{ color: COLORS.primaryLight }}></i>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold" style={{ color: COLORS.primary }}>
                        Booking #{selectedBooking.id.slice(-8).toUpperCase()}
                      </h2>
                      <p className="font-medium" style={{ color: COLORS.primary }}>
                        {selectedBooking.firstName} {selectedBooking.lastName} • {selectedBooking.service}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedBooking(null)}
                    className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all duration-200"
                    style={{ color: COLORS.primary }}
                  >
                    <i className="fas fa-times text-lg"></i>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-8 overflow-y-auto max-h-[calc(95vh-120px)]">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column - Client & Service Info */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Client Information */}
                    <div className="bg-white border-2 rounded-xl p-6 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                          <i className="fas fa-user text-sm" style={{ color: COLORS.primary }}></i>
                        </div>
                        <h3 className="text-lg font-bold" style={{ color: COLORS.primary }}>Client Information</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Full Name</label>
                          <p className="text-lg font-semibold text-gray-900">{selectedBooking.firstName} {selectedBooking.lastName}</p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Phone Number</label>
                          <p className="text-lg font-semibold text-gray-900">{formatPhoneNumber(selectedBooking.phone)}</p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Email Address</label>
                          <p className="text-lg font-semibold text-gray-900">{selectedBooking.email || "Not provided"}</p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Service Address</label>
                          <p className="text-lg font-semibold text-gray-900">{selectedBooking.address}</p>
                        </div>
                      </div>
                    </div>

                    {/* Service Information */}
                    <div className="bg-white border-2 rounded-xl p-6 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                          <i className="fas fa-calendar-alt text-sm" style={{ color: COLORS.primary }}></i>
                        </div>
                        <h3 className="text-lg font-bold" style={{ color: COLORS.primary }}>Service Details</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Service Type</label>
                          <p className="text-lg font-semibold text-gray-900">{selectedBooking.service}</p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Status</label>
                          <div className="mt-1">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${getStatusColor(selectedBooking.status)}`}>
                              {selectedBooking.status.charAt(0).toUpperCase() + selectedBooking.status.slice(1)}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Start Date & Time</label>
                          <p className="text-lg font-semibold text-gray-900">{formatDate(selectedBooking.startAt)} at {formatTime(selectedBooking.startAt)}</p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">End Date & Time</label>
                          <p className="text-lg font-semibold text-gray-900">{formatDate(selectedBooking.endAt)} at {formatTime(selectedBooking.endAt)}</p>
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Price</label>
                          <p className="text-3xl font-bold" style={{ color: COLORS.primary }}>${selectedBooking.totalPrice.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Pet Information */}
                    <div className="bg-white border-2 rounded-xl p-6 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                          <i className="fas fa-paw text-sm" style={{ color: COLORS.primary }}></i>
                        </div>
                        <h3 className="text-lg font-bold" style={{ color: COLORS.primary }}>Pet Information</h3>
                      </div>
                      <div className="space-y-4">
                        {/* Pet Quantities by Type */}
                        {(() => {
                          const petCounts: Record<string, number> = {};
                          selectedBooking.pets.forEach(pet => {
                            petCounts[pet.species] = (petCounts[pet.species] || 0) + 1;
                          });
                          return Object.entries(petCounts).map(([species, count]) => (
                            <div key={species} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm" style={{ background: COLORS.primaryLight }}>
                                  <i className="fas fa-paw text-lg" style={{ color: COLORS.primary }}></i>
                                </div>
                                <div>
                                  <p className="text-xl font-bold text-gray-900 capitalize">{species}s</p>
                                  <p className="text-sm text-gray-600">Pet Species</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-3xl font-bold" style={{ color: COLORS.primary }}>{count}</p>
                                <p className="text-sm text-gray-600">Total</p>
                              </div>
                            </div>
                          ));
                        })()}
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-2">
                            <i className="fas fa-info-circle text-blue-600"></i>
                            <p className="font-semibold text-blue-800">
                              Total Pets: {formatPetsByQuantity(selectedBooking.pets)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Sitter & Actions */}
                  <div className="space-y-6">
                    {/* Sitter Assignment */}
                    <div className="bg-white border-2 rounded-xl p-6 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                          <i className="fas fa-user-friends text-sm" style={{ color: COLORS.primary }}></i>
                        </div>
                        <h3 className="text-lg font-bold" style={{ color: COLORS.primary }}>Sitter Assignment</h3>
                      </div>
                      {selectedBooking.sitter ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm bg-green-100">
                              <i className="fas fa-user-check text-green-600 text-lg"></i>
                            </div>
                            <div>
                              <p className="font-bold text-green-800">{selectedBooking.sitter.firstName} {selectedBooking.sitter.lastName}</p>
                              <p className="text-sm text-green-600">Assigned Sitter</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleSitterAssign(selectedBooking.id, "")}
                            className="w-full px-4 py-3 text-sm font-semibold border-2 rounded-lg hover:bg-gray-50 transition-colors"
                            style={{ color: COLORS.primary, borderColor: COLORS.border }}
                          >
                            <i className="fas fa-times mr-2"></i>Remove Sitter
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                            <div className="flex items-center gap-2">
                              <i className="fas fa-exclamation-triangle text-yellow-600"></i>
                              <p className="font-semibold text-yellow-800">No sitter assigned</p>
                            </div>
                          </div>
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleSitterAssign(selectedBooking.id, e.target.value);
                              }
                            }}
                            className="w-full px-4 py-3 border-2 rounded-lg font-semibold"
                            style={{ borderColor: COLORS.border }}
                          >
                            <option value="">Select a sitter...</option>
                            {sitters.map(sitter => (
                              <option key={sitter.id} value={sitter.id}>
                                {sitter.firstName} {sitter.lastName}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white border-2 rounded-xl p-6 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                          <i className="fas fa-cogs text-sm" style={{ color: COLORS.primary }}></i>
                        </div>
                        <h3 className="text-lg font-bold" style={{ color: COLORS.primary }}>Quick Actions</h3>
                      </div>
                      <div className="space-y-3">
                        <select
                          value={selectedBooking.status}
                          onChange={(e) => handleStatusChange(selectedBooking.id, e.target.value)}
                          className="w-full px-4 py-3 border-2 rounded-lg font-semibold"
                          style={{ borderColor: COLORS.border }}
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`Booking ID: ${selectedBooking.id}`);
                            alert('Booking ID copied to clipboard!');
                          }}
                          className="w-full px-4 py-3 text-sm font-semibold border-2 rounded-lg hover:bg-gray-50 transition-colors"
                          style={{ color: COLORS.primary, borderColor: COLORS.border }}
                        >
                          <i className="fas fa-copy mr-2"></i>Copy Booking ID
                        </button>
                        <button
                          onClick={() => {
                            const message = `Booking Details:\nClient: ${selectedBooking.firstName} ${selectedBooking.lastName}\nService: ${selectedBooking.service}\nDate: ${formatDate(selectedBooking.startAt)}\nTime: ${formatTime(selectedBooking.startAt)}\nPets: ${formatPetsByQuantity(selectedBooking.pets)}\nPrice: $${selectedBooking.totalPrice.toFixed(2)}`;
                            navigator.clipboard.writeText(message);
                            alert('Booking details copied to clipboard!');
                          }}
                          className="w-full px-4 py-3 text-sm font-semibold border-2 rounded-lg hover:bg-gray-50 transition-colors"
                          style={{ color: COLORS.primary, borderColor: COLORS.border }}
                        >
                          <i className="fas fa-clipboard mr-2"></i>Copy Details
                        </button>
                      </div>
                    </div>

                    {/* Booking Timeline */}
                    <div className="bg-white border-2 rounded-xl p-6 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                          <i className="fas fa-history text-sm" style={{ color: COLORS.primary }}></i>
                        </div>
                        <h3 className="text-lg font-bold" style={{ color: COLORS.primary }}>Timeline</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-100 shadow-sm">
                            <i className="fas fa-plus text-green-600"></i>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">Booking Created</p>
                            <p className="text-sm text-gray-600">{formatDate(selectedBooking.createdAt)} at {formatTime(selectedBooking.createdAt)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 shadow-sm">
                            <i className="fas fa-edit text-blue-600"></i>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">Last Updated</p>
                            <p className="text-sm text-gray-600">{formatDate(selectedBooking.updatedAt)} at {formatTime(selectedBooking.updatedAt)}</p>
                          </div>
                        </div>
                        {selectedBooking.status === 'completed' && (
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-100 shadow-sm">
                              <i className="fas fa-check text-green-600"></i>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">Service Completed</p>
                              <p className="text-sm text-gray-600">Service has been completed</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}