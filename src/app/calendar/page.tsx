"use client";

import { useState, useEffect } from "react";
import { COLORS } from "@/lib/booking-utils";

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
}

export default function CalendarPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSitterFilter, setSelectedSitterFilter] = useState<string>("all");

  useEffect(() => {
    fetchBookings();
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

  const filteredBookings = bookings.filter(booking => {
    if (selectedSitterFilter !== "all") {
      return booking.sitter?.id === selectedSitterFilter;
    }
    return true;
  });

  const formatPetsByQuantity = (pets: Array<{ species: string }>): string => {
    const counts: Record<string, number> = {};
    
    pets.forEach(pet => {
      counts[pet.species] = (counts[pet.species] || 0) + 1;
    });
    
    return Object.entries(counts)
      .map(([species, count]) => `${count} ${species}${count > 1 ? 's' : ''}`)
      .join(', ');
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

  return (
    <div className="min-h-screen" style={{ background: "#f5f5f5" }}>
      {/* Header */}
      <div className="bg-white border-b shadow-sm" style={{ borderColor: "#e0e0e0" }}>
        <div className="max-w-[1400px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: COLORS.primary }}>
                <i className="fas fa-calendar-alt" style={{ color: COLORS.primaryLight }}></i>
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: COLORS.primary }}>
                  Calendar View
                </h1>
                <p className="text-xs text-gray-500">View all bookings in calendar format</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="/calendar/accounts"
                className="px-4 py-2 text-sm font-bold border-2 rounded-lg hover:opacity-90 transition-all"
                style={{ color: COLORS.primary, borderColor: COLORS.primaryLight }}
              >
                <i className="fas fa-cog mr-2"></i>Calendar Settings
              </a>
              <a
                href="/bookings"
                className="px-4 py-2 text-sm font-medium border rounded-lg hover:bg-gray-50 transition-colors"
                style={{ color: COLORS.primary, borderColor: COLORS.border }}
              >
                <i className="fas fa-arrow-left mr-2"></i>Back to Bookings
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-8 py-6">
        {/* Filters */}
        <div className="bg-white rounded-lg p-4 border-2 mb-6" style={{ borderColor: COLORS.primaryLight }}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium" style={{ color: COLORS.primary }}>Sitter:</label>
              <select
                value={selectedSitterFilter}
                onChange={(e) => setSelectedSitterFilter(e.target.value)}
                className="px-3 py-1 border rounded-lg text-sm"
                style={{ borderColor: COLORS.border }}
              >
                <option value="all">All Sitters</option>
                {/* Add sitter options here */}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium" style={{ color: COLORS.primary }}>Date:</label>
              <input
                type="date"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="px-3 py-1 border rounded-lg text-sm"
                style={{ borderColor: COLORS.border }}
              />
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-lg border-2" style={{ borderColor: COLORS.primaryLight }}>
          <div className="p-4 border-b" style={{ borderColor: COLORS.border }}>
            <h2 className="text-lg font-bold" style={{ color: COLORS.primary }}>
              Bookings Calendar
            </h2>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <i className="fas fa-spinner fa-spin text-2xl" style={{ color: COLORS.primary }}></i>
                <p className="mt-2 text-gray-600">Loading calendar...</p>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-8">
                <i className="fas fa-calendar-alt text-4xl text-gray-300 mb-4"></i>
                <p className="text-gray-600">No bookings found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="p-4 border rounded-lg hover:shadow-md transition-all"
                    style={{ borderColor: COLORS.border }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-lg">
                            {booking.firstName} {booking.lastName}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-bold rounded ${getStatusColor(booking.status)}`}>
                            {booking.status}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600">
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
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}