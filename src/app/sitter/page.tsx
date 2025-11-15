"use client";

import { useState, useEffect } from "react";
import { COLORS } from "@/lib/booking-utils";
import {
  bookingToCanonical,
  groupSelectionsByDate,
} from "@/lib/booking-format";

interface Booking {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  service: string;
  startAt: Date | string;
  endAt: Date | string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  totalPrice: number;
  pets: Array<{ species: string; name?: string }>;
  timeSlots?: Array<{
    startAt: Date | string;
    endAt: Date | string;
    duration: number;
  }>;
  sitter?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export default function SitterPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [sitterId, setSitterId] = useState<string>("");
  const [commissionPercentage, setCommissionPercentage] = useState<number>(80.0);

  useEffect(() => {
    // Get sitter ID from URL params or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id') || localStorage.getItem('sitterId') || '';
    setSitterId(id);
    
    if (id) {
      fetchSitterBookings(id);
    }
  }, []);

  const fetchSitterBookings = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/sitter/${id}/bookings`);
      const data = await response.json();
      setBookings(data.bookings || []);
      if (data.sitter?.commissionPercentage) {
        setCommissionPercentage(data.sitter.commissionPercentage);
      }
    } catch {
      setBookings([]);
    } finally {
    setLoading(false);
    }
  };
  
  // Calculate sitter earnings based on commission percentage
  const calculateSitterEarnings = (totalPrice: number): number => {
    return (totalPrice * commissionPercentage) / 100;
  };

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

  // Get service label from service type
  const getServiceLabel = (service: string): string => {
    const serviceLower = service.toLowerCase();
    if (serviceLower.includes("walk")) return "Dog walking";
    if (serviceLower.includes("drop")) return "Drop-in";
    if (serviceLower.includes("taxi")) return "Pet Taxi";
    return "Pet sitting";
  };

  // Format pets summary
  const formatPetsSummary = (pets: Array<{ species: string }>): string => {
    const counts: Record<string, number> = {};
    pets.forEach(pet => {
      const species = pet.species.toLowerCase();
      let key = "other";
      if (species.includes("dog")) key = "dog";
      else if (species.includes("cat")) key = "cat";
      else if (species.includes("farm") || species.includes("horse")) key = "farm";
      else if (species.includes("reptile")) key = "reptile";
      counts[key] = (counts[key] || 0) + 1;
    });

    const parts: string[] = [];
    if (counts.dog) parts.push(`${counts.dog} dog${counts.dog > 1 ? "s" : ""}`);
    if (counts.cat) parts.push(`${counts.cat} cat${counts.cat > 1 ? "s" : ""}`);
    if (counts.farm) parts.push(`${counts.farm} farm animal${counts.farm > 1 ? "s" : ""}`);
    if (counts.reptile) parts.push(`${counts.reptile} reptile${counts.reptile > 1 ? "s" : ""}`);
    if (counts.other) parts.push(`${counts.other} other`);

    return parts.length > 0 ? parts.join(", ") : "No pets";
  };

  const upcomingBookings = bookings.filter(booking => 
    new Date(booking.startAt) > new Date() && booking.status !== "cancelled"
  );

  const completedBookings = bookings.filter(booking => 
    booking.status === "completed"
  );

  return (
    <div className="min-h-screen w-full" style={{ background: COLORS.primaryLighter }}>
      {/* Header */}
      <div className="bg-white border-b shadow-sm" style={{ borderColor: COLORS.border }}>
        <div className="max-w-[1400px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: COLORS.primary }}>
                <i className="fas fa-user-friends" style={{ color: COLORS.primaryLight }}></i>
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: COLORS.primary }}>
                  Sitter Dashboard
                </h1>
                <p className="text-xs text-gray-500">Your pet care assignments</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchSitterBookings(sitterId)}
                disabled={loading}
                className="px-4 py-2 text-sm font-bold border-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ color: COLORS.primary, borderColor: COLORS.primaryLight }}
                title="Refresh bookings"
              >
                <i className={`fas fa-sync-alt ${loading ? 'animate-spin' : ''}`}></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-8 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg p-6 border-2" style={{ borderColor: COLORS.primaryLight }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Upcoming</p>
                <p className="text-3xl font-bold" style={{ color: COLORS.primary }}>
                  {upcomingBookings.length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                <i className="fas fa-calendar text-2xl" style={{ color: COLORS.primary }}></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border-2" style={{ borderColor: COLORS.primaryLight }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-3xl font-bold" style={{ color: COLORS.primary }}>
                  {completedBookings.length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                <i className="fas fa-check-circle text-2xl" style={{ color: COLORS.primary }}></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border-2" style={{ borderColor: COLORS.primaryLight }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Earnings ({commissionPercentage}%)</p>
                <p className="text-3xl font-bold" style={{ color: COLORS.primary }}>
                  ${completedBookings.reduce((sum, b) => sum + calculateSitterEarnings(b.totalPrice), 0).toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                <i className="fas fa-dollar-sign text-2xl" style={{ color: COLORS.primary }}></i>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Bookings */}
        <div className="bg-white rounded-lg border-2 mb-6" style={{ borderColor: COLORS.primaryLight }}>
          <div className="p-4 border-b" style={{ borderColor: COLORS.border }}>
            <h2 className="text-lg font-bold" style={{ color: COLORS.primary }}>
              Upcoming Bookings ({upcomingBookings.length})
            </h2>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <i className="fas fa-spinner fa-spin text-2xl" style={{ color: COLORS.primary }}></i>
                <p className="mt-2 text-gray-600">Loading bookings...</p>
              </div>
            ) : upcomingBookings.length === 0 ? (
              <div className="text-center py-8">
                <i className="fas fa-calendar text-4xl text-gray-300 mb-4"></i>
                <p className="text-gray-600">No upcoming bookings</p>
              </div>
            ) : (
              <div className="space-y-6">
                {upcomingBookings.map((booking) => {
                  // Convert to canonical format
                  const canonical = bookingToCanonical({
                    id: booking.id,
                    service: booking.service,
                    firstName: booking.firstName,
                    lastName: booking.lastName,
                    phone: booking.phone,
                    email: booking.email,
                    notes: null,
                    createdAt: new Date(),
                    startAt: booking.startAt,
                    endAt: booking.endAt,
                    pets: booking.pets,
                    timeSlots: booking.timeSlots || [],
                  });

                  // Group selections by date
                  const grouped = groupSelectionsByDate(canonical.selections);

                  return (
                    <div
                      key={booking.id}
                      className="p-4 border rounded-lg hover:shadow-md transition-all"
                      style={{ borderColor: COLORS.border }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-bold text-lg">
                              {booking.firstName} {booking.lastName}
                            </h3>
                            <span className={`px-2 py-1 text-xs font-bold rounded ${getStatusColor(booking.status)}`}>
                              {booking.status}
                            </span>
                          </div>
                          {booking.address && (
                            <div className="text-sm text-gray-600">
                              <i className="fas fa-map-marker-alt mr-1"></i>{booking.address}
                            </div>
                          )}
                        </div>
                        <div className="text-sm font-semibold" style={{ color: COLORS.primary }}>
                          ${booking.totalPrice.toFixed(2)}
                        </div>
                      </div>

                      {/* Dates and Times */}
                      <div className="space-y-4 mb-3">
                        {grouped.map((group, groupIdx) => (
                          <div key={groupIdx} className="border-l-2 pl-3" style={{ borderColor: COLORS.primaryLight }}>
                            <div className="font-semibold text-base mb-2" style={{ color: COLORS.primary }}>
                              {group.dateLabel}
                            </div>
                            <div className="space-y-1 ml-2">
                              {group.slots.map((slot, slotIdx) => (
                                <div key={slotIdx} className="text-sm text-gray-700">
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                                    <span className="font-medium">{slot.combined}</span>
                                    <span className="text-gray-500 sm:before:content-['·'] sm:before:mx-2">
                                      {getServiceLabel(booking.service)} · {formatPetsSummary(booking.pets)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Completed Bookings */}
        <div className="bg-white rounded-lg border-2" style={{ borderColor: COLORS.primaryLight }}>
          <div className="p-4 border-b" style={{ borderColor: COLORS.border }}>
            <h2 className="text-lg font-bold" style={{ color: COLORS.primary }}>
              Completed Bookings ({completedBookings.length})
            </h2>
          </div>

          <div className="p-6">
            {completedBookings.length === 0 ? (
              <div className="text-center py-8">
                <i className="fas fa-check-circle text-4xl text-gray-300 mb-4"></i>
                <p className="text-gray-600">No completed bookings</p>
              </div>
            ) : (
              <div className="space-y-4">
                {completedBookings.slice(0, 5).map((booking) => {
                  // Convert to canonical format
                  const canonical = bookingToCanonical({
                    id: booking.id,
                    service: booking.service,
                    firstName: booking.firstName,
                    lastName: booking.lastName,
                    phone: booking.phone,
                    email: booking.email,
                    notes: null,
                    createdAt: new Date(),
                    startAt: booking.startAt,
                    endAt: booking.endAt,
                    pets: booking.pets,
                    timeSlots: booking.timeSlots || [],
                  });

                  // Group selections by date
                  const grouped = groupSelectionsByDate(canonical.selections);

                  return (
                    <div
                      key={booking.id}
                      className="p-4 border rounded-lg hover:shadow-md transition-all"
                      style={{ borderColor: COLORS.border }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-lg">
                              {booking.firstName} {booking.lastName}
                            </h3>
                            <span className={`px-2 py-1 text-xs font-bold rounded ${getStatusColor(booking.status)}`}>
                              {booking.status}
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-600 space-y-1">
                            {grouped.length > 0 && (
                              <div>
                                <span className="font-medium">{grouped[0].dateLabel}</span>
                                {grouped[0].slots.length > 0 && (
                                  <span className="ml-2">{grouped[0].slots[0].combined}</span>
                                )}
                              </div>
                            )}
                            <div className="flex items-center gap-4 flex-wrap">
                              <span><i className="fas fa-paw mr-1"></i>{formatPetsSummary(booking.pets)}</span>
                              <span><i className="fas fa-dollar-sign mr-1"></i>${booking.totalPrice.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {completedBookings.length > 5 && (
                  <div className="text-center text-sm text-gray-500">
                    +{completedBookings.length - 5} more completed bookings
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}