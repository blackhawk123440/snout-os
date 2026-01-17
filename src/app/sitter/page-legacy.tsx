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
  pets: Array<{ species: string; name?: string; notes?: string }>;
  sitter?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  timeSlots?: Array<{
    id: string;
    startAt: Date;
    endAt: Date;
    duration: number;
  }>;
  notes?: string | null;
}

export default function SitterPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [sitterId, setSitterId] = useState<string>("");
  const [commissionPercentage, setCommissionPercentage] = useState<number>(80.0);
  const [activeTab, setActiveTab] = useState<"today" | "upcoming" | "completed" | "earnings" | "settings" | "tier">("today");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [sitterTier, setSitterTier] = useState<any>(null);
  const [tierProgress, setTierProgress] = useState<any>(null);
  const [earningsData, setEarningsData] = useState<any>(null);

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
      
      // Fetch sitter tier info
      const sitterResponse = await fetch(`/api/sitters/${id}`);
      const sitterData = await sitterResponse.json();
      if (sitterData.sitter?.currentTier) {
        setSitterTier(sitterData.sitter.currentTier);
      }

      // Phase 5.3: Fetch tier progress data from dashboard API
      try {
        const dashboardResponse = await fetch(`/api/sitters/${id}/dashboard`);
        const dashboardData = await dashboardResponse.json();
        if (dashboardData.tier || dashboardData.performance || dashboardData.nextTier) {
          setTierProgress({
            tier: dashboardData.tier,
            performance: dashboardData.performance,
            nextTier: dashboardData.nextTier,
            improvementAreas: dashboardData.improvementAreas || [],
          });
        }
      } catch (error) {
        console.error("Failed to fetch tier progress:", error);
      }

      // Phase 5.3: Fetch earnings data
      try {
        const earningsResponse = await fetch(`/api/sitter/${id}/earnings`);
        const earningsDataResponse = await earningsResponse.json();
        if (earningsDataResponse.summary) {
          setEarningsData(earningsDataResponse);
        }
      } catch (error) {
        console.error("Failed to fetch earnings data:", error);
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

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayBookings = bookings
    .filter(booking => {
      const bookingDate = new Date(booking.startAt);
      bookingDate.setHours(0, 0, 0, 0);
      return bookingDate.getTime() === today.getTime() && 
             booking.status !== "cancelled" &&
             (booking.status === "confirmed" || booking.status === "pending");
    })
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  const upcomingBookings = bookings.filter(booking => 
    new Date(booking.startAt) > new Date() && booking.status !== "cancelled"
  );

  const completedBookings = bookings.filter(booking => 
    booking.status === "completed"
  );

  const isOverdue = (booking: Booking) => {
    return new Date(booking.startAt) < new Date() && booking.status === "confirmed";
  };

  const checkIn = async (bookingId: string) => {
    try {
      // Emit check-in event
      await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed" }),
      });
      // In a real implementation, this would call the check-in API
      alert("Checked in successfully!");
      fetchSitterBookings(sitterId);
    } catch (error) {
      console.error("Failed to check in:", error);
      alert("Failed to check in");
    }
  };

  const calculateTravelTime = (booking1: Booking | null, booking2: Booking) => {
    if (!booking1) return 0;
    // Simplified - in production use real distance API
    return 15; // Default 15 minutes
  };

  return (
    <div className="min-h-screen w-full" style={{ background: COLORS.primaryLighter }}>
      {/* Header */}
      <div className="bg-white border-b shadow-sm" style={{ borderColor: COLORS.border }}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-4">
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
              <a
                href={`/sitter-dashboard?id=${sitterId}`}
                className="px-4 py-2 text-sm font-semibold rounded-lg text-white"
                style={{ background: COLORS.primary }}
              >
                <i className="fas fa-calendar-alt mr-2"></i>Full Dashboard
              </a>
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

      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-4 sm:py-6">
        {/* Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 mb-4 sm:mb-6 border-b overflow-x-auto" style={{ borderColor: COLORS.border }}>
          <button
            onClick={() => setActiveTab("today")}
            className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
              activeTab === "today" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-600"
            }`}
          >
            Today ({todayBookings.length})
          </button>
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
              activeTab === "upcoming" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-600"
            }`}
          >
            Upcoming ({upcomingBookings.length})
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
              activeTab === "completed" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-600"
            }`}
          >
            Completed ({completedBookings.length})
          </button>
          <button
            onClick={() => setActiveTab("earnings")}
            className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
              activeTab === "earnings" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-600"
            }`}
          >
            Earnings
          </button>
          <button
            onClick={() => setActiveTab("tier")}
            className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
              activeTab === "tier" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-600"
            }`}
          >
            Tier Progress
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
              activeTab === "settings" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-600"
            }`}
          >
            Settings
          </button>
        </div>

        {/* Tier Badge */}
        {sitterTier && (
          <div className="mb-6 bg-white rounded-lg p-4 border-2" style={{ borderColor: COLORS.primaryLight }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                <i className="fas fa-star text-xl" style={{ color: COLORS.primary }}></i>
              </div>
              <div>
                <div className="font-bold" style={{ color: COLORS.primary }}>
                  Current Tier: {sitterTier.name}
                </div>
                <div className="text-sm text-gray-600">Priority Level: {sitterTier.priorityLevel}</div>
              </div>
            </div>
          </div>
        )}

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

        {/* Today View */}
        {activeTab === "today" && (
          <div className="bg-white rounded-lg border-2 mb-6" style={{ borderColor: COLORS.primaryLight }}>
            <div className="p-4 border-b" style={{ borderColor: COLORS.border }}>
              <h2 className="text-lg font-bold" style={{ color: COLORS.primary }}>
                Today's Visits ({todayBookings.length})
              </h2>
            </div>
            <div className="p-6">
              {todayBookings.length === 0 ? (
                <div className="text-center py-8">
                  <i className="fas fa-calendar text-4xl text-gray-300 mb-4"></i>
                  <p className="text-gray-600">No visits scheduled for today</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {todayBookings.map((booking, index) => {
                    const previousBooking = index > 0 ? todayBookings[index - 1] : null;
                    const travelTime = calculateTravelTime(previousBooking, booking);
                    const overdue = isOverdue(booking);
                    
                    return (
                      <div
                        key={booking.id}
                        className={`p-4 border-2 rounded-lg ${overdue ? "border-red-500 bg-red-50" : ""}`}
                        style={{ borderColor: overdue ? "#ef4444" : COLORS.border }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-bold text-lg">
                                {booking.firstName} {booking.lastName.charAt(0)}.
                              </h3>
                              {overdue && (
                                <span className="px-2 py-1 text-xs font-bold rounded bg-red-100 text-red-800">
                                  OVERDUE
                                </span>
                              )}
                              <span className={`px-2 py-1 text-xs font-bold rounded ${getStatusColor(booking.status)}`}>
                                {booking.status}
                              </span>
                            </div>
                            
                            <div className="text-sm text-gray-600 space-y-1">
                              <div className="flex items-center gap-4">
                                <span><i className="fas fa-clock mr-1"></i>{formatTime(booking.startAt)}</span>
                                <span><i className="fas fa-paw mr-1"></i>{formatPetsByQuantity(booking.pets)}</span>
                                <span><i className="fas fa-map-marker-alt mr-1"></i>{booking.address}</span>
                              </div>
                              {previousBooking && (
                                <div className="text-xs text-blue-600">
                                  <i className="fas fa-route mr-1"></i>~{travelTime} min travel from previous visit
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedBooking(booking)}
                              className="px-3 py-1 text-sm font-semibold rounded bg-blue-100 text-blue-800"
                            >
                              Details
                            </button>
                            <button
                              onClick={() => checkIn(booking.id)}
                              className="px-3 py-1 text-sm font-semibold rounded text-white"
                              style={{ background: COLORS.primary }}
                            >
                              Check In
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upcoming Bookings */}
        {activeTab === "upcoming" && (
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
              <div className="space-y-4">
                {upcomingBookings.map((booking) => (
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
        )}

        {/* Completed Bookings */}
        {activeTab === "completed" && (
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
                {completedBookings.slice(0, 5).map((booking) => (
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
                            <span><i className="fas fa-paw mr-1"></i>{formatPetsByQuantity(booking.pets)}</span>
                            <span><i className="fas fa-dollar-sign mr-1"></i>${booking.totalPrice.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {completedBookings.length > 5 && (
                  <div className="text-center text-sm text-gray-500">
                    +{completedBookings.length - 5} more completed bookings
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        )}

        {/* Earnings View - Phase 5.3 Enhanced */}
        {activeTab === "earnings" && (
          <div className="bg-white rounded-lg border-2" style={{ borderColor: COLORS.primaryLight }}>
            <div className="p-4 border-b" style={{ borderColor: COLORS.border }}>
              <h2 className="text-lg font-bold" style={{ color: COLORS.primary }}>
                Earnings Breakdown
              </h2>
            </div>
            <div className="p-6">
              {earningsData ? (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-lg p-4 border-2" style={{ borderColor: COLORS.primaryLight }}>
                      <div className="text-sm text-gray-600 mb-1">Total Earnings</div>
                      <div className="text-2xl font-bold" style={{ color: COLORS.primary }}>
                        ${earningsData.summary.totalEarnings.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {earningsData.summary.totalBookings} bookings ({earningsData.summary.commissionPercentage}% commission)
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border-2" style={{ borderColor: COLORS.primaryLight }}>
                      <div className="text-sm text-gray-600 mb-1">Last 30 Days</div>
                      <div className="text-2xl font-bold" style={{ color: COLORS.primary }}>
                        ${earningsData.summary.earningsLast30Days.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border-2" style={{ borderColor: COLORS.primaryLight }}>
                      <div className="text-sm text-gray-600 mb-1">Last 90 Days</div>
                      <div className="text-2xl font-bold" style={{ color: COLORS.primary }}>
                        ${earningsData.summary.earningsLast90Days.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Earnings by Service Type */}
                  {earningsData.earningsByService && earningsData.earningsByService.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-bold mb-3" style={{ color: COLORS.primary }}>Earnings by Service Type</h3>
                      <div className="space-y-2">
                        {earningsData.earningsByService.map((service: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-semibold">{service.service}</div>
                              <div className="text-sm text-gray-600">{service.bookingCount} booking{service.bookingCount !== 1 ? 's' : ''}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold" style={{ color: COLORS.primary }}>
                                ${service.totalEarnings.toFixed(2)}
                              </div>
                              <div className="text-xs text-gray-500">from ${service.totalRevenue.toFixed(2)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Earnings by Booking */}
                  <div>
                    <h3 className="text-lg font-bold mb-3" style={{ color: COLORS.primary }}>Earnings by Booking</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {earningsData.earningsByBooking.map((item: any) => (
                        <div key={item.bookingId} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-semibold">{item.clientName}</div>
                            <div className="text-sm text-gray-600">{formatDate(item.date)} - {item.service}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold" style={{ color: COLORS.primary }}>
                              ${item.earnings.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">from ${item.totalPrice.toFixed(2)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-600">Loading earnings data...</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tier Progress View - Phase 5.3 */}
        {activeTab === "tier" && (
          <div className="bg-white rounded-lg border-2" style={{ borderColor: COLORS.primaryLight }}>
            <div className="p-4 border-b" style={{ borderColor: COLORS.border }}>
              <h2 className="text-lg font-bold" style={{ color: COLORS.primary }}>
                Tier Progress
              </h2>
            </div>
            <div className="p-6">
              {tierProgress ? (
                <>
                  {/* Current Tier */}
                  {tierProgress.tier && (
                    <div className="mb-6 bg-gray-50 rounded-lg p-4 border-2" style={{ borderColor: COLORS.primaryLight }}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                          <i className="fas fa-star text-xl" style={{ color: COLORS.primary }}></i>
                        </div>
                        <div>
                          <div className="font-bold text-lg" style={{ color: COLORS.primary }}>
                            Current Tier: {tierProgress.tier.name}
                          </div>
                          <div className="text-sm text-gray-600">Priority Level: {tierProgress.tier.priorityLevel}</div>
                        </div>
                      </div>
                      {tierProgress.tier.benefits && (
                        <div className="text-sm text-gray-700 mt-2">
                          Benefits: {typeof tierProgress.tier.benefits === 'string' ? tierProgress.tier.benefits : JSON.stringify(tierProgress.tier.benefits)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Performance Metrics */}
                  {tierProgress.performance && (
                    <div className="mb-6">
                      <h3 className="text-lg font-bold mb-3" style={{ color: COLORS.primary }}>Performance Metrics</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-50 rounded-lg p-4 border-2" style={{ borderColor: COLORS.primaryLight }}>
                          <div className="text-sm text-gray-600 mb-1">Points</div>
                          <div className="text-2xl font-bold" style={{ color: COLORS.primary }}>
                            {tierProgress.performance.points || 0}
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 border-2" style={{ borderColor: COLORS.primaryLight }}>
                          <div className="text-sm text-gray-600 mb-1">Completion Rate</div>
                          <div className="text-2xl font-bold" style={{ color: COLORS.primary }}>
                            {tierProgress.performance.completionRate?.toFixed(1) || '0.0'}%
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 border-2" style={{ borderColor: COLORS.primaryLight }}>
                          <div className="text-sm text-gray-600 mb-1">Response Rate</div>
                          <div className="text-2xl font-bold" style={{ color: COLORS.primary }}>
                            {tierProgress.performance.responseRate?.toFixed(1) || '0.0'}%
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Next Tier */}
                  {tierProgress.nextTier && (
                    <div className="mb-6 bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                      <h3 className="text-lg font-bold mb-2" style={{ color: COLORS.primary }}>Next Tier: {tierProgress.nextTier.name}</h3>
                      <div className="text-sm text-gray-700 space-y-1">
                        {tierProgress.nextTier.pointTarget && (
                          <div>Point Target: {tierProgress.nextTier.pointTarget}</div>
                        )}
                        {tierProgress.nextTier.minCompletionRate && (
                          <div>Min Completion Rate: {tierProgress.nextTier.minCompletionRate}%</div>
                        )}
                        {tierProgress.nextTier.minResponseRate && (
                          <div>Min Response Rate: {tierProgress.nextTier.minResponseRate}%</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Improvement Areas */}
                  {tierProgress.improvementAreas && tierProgress.improvementAreas.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold mb-3" style={{ color: COLORS.primary }}>Areas to Improve</h3>
                      <ul className="space-y-2">
                        {tierProgress.improvementAreas.map((area: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                            <i className="fas fa-info-circle text-yellow-600 mt-1"></i>
                            <span className="text-sm text-gray-700">{area}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-600">Loading tier progress...</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings View */}
        {activeTab === "settings" && (
          <div className="bg-white rounded-lg border-2" style={{ borderColor: COLORS.primaryLight }}>
            <div className="p-4 border-b" style={{ borderColor: COLORS.border }}>
              <h2 className="text-lg font-bold" style={{ color: COLORS.primary }}>
                Personal Settings
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block font-semibold mb-2">Commission Percentage</label>
                  <div className="text-lg">{commissionPercentage}%</div>
                  <div className="text-sm text-gray-600">Set by owner</div>
                </div>
                {sitterTier && (
                  <div>
                    <label className="block font-semibold mb-2">Current Tier</label>
                    <div className="text-lg">{sitterTier.name}</div>
                    <div className="text-sm text-gray-600">Priority: {sitterTier.priorityLevel}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Visit Detail Modal */}
        {selectedBooking && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold" style={{ color: COLORS.primary }}>
                  Visit Details
                </h2>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold mb-2">Client</h3>
                  <p>{selectedBooking.firstName} {selectedBooking.lastName.charAt(0)}.</p>
                  <p className="text-sm text-gray-600">{selectedBooking.phone}</p>
                </div>
                
                <div>
                  <h3 className="font-bold mb-2">Service</h3>
                  <p>{selectedBooking.service}</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(selectedBooking.startAt)} at {formatTime(selectedBooking.startAt)}
                  </p>
                </div>
                
                <div>
                  <h3 className="font-bold mb-2">Address</h3>
                  <p>{selectedBooking.address}</p>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(selectedBooking.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 text-sm"
                  >
                    Get Directions →
                  </a>
                </div>
                
                <div>
                  <h3 className="font-bold mb-2">Pets</h3>
                  <div className="space-y-2">
                    {selectedBooking.pets.map((pet, idx) => (
                      <div key={idx} className="p-2 bg-gray-50 rounded">
                        <div className="font-semibold">{pet.name || `Pet ${idx + 1}`}</div>
                        <div className="text-sm text-gray-600">{pet.species}</div>
                        {pet.notes && (
                          <div className="text-sm text-gray-600 mt-1">{pet.notes}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                {selectedBooking.notes && (
                  <div>
                    <h3 className="font-bold mb-2">Notes</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedBooking.notes}</p>
                  </div>
                )}
                
                <div className="flex items-center gap-2 pt-4 border-t">
                  <button
                    onClick={() => checkIn(selectedBooking.id)}
                    className="flex-1 px-4 py-2 rounded-lg font-semibold text-white"
                    style={{ background: COLORS.primary }}
                  >
                    Check In
                  </button>
                  <button
                    onClick={() => setSelectedBooking(null)}
                    className="px-4 py-2 rounded-lg font-semibold bg-gray-200 text-gray-800"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}