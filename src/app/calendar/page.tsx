"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { COLORS } from "@/lib/booking-utils";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { getConflictStatus, getBookingConflicts, formatPetsByQuantity } from "@/lib/booking-utils";

interface Booking {
  id: string;
  firstName: string;
  lastName: string;
  service: string;
  minutes?: number;
  startAt: string;
  endAt: string;
  status: string;
  sitter?: { id: string; firstName: string; lastName: string };
  pets: { name: string; species: string }[];
  totalPrice?: number;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    booking?: Booking;
    isGoogleEvent?: boolean;
    event?: any;
  };
}

interface Sitter {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  active: boolean;
}

export default function CalendarPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [sitters, setSitters] = useState<Sitter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [viewType, setViewType] = useState<"dayGridMonth" | "timeGridWeek" | "timeGridDay">("dayGridMonth");
  const [syncingGoogle, setSyncingGoogle] = useState(false);
  const [selectedSitters, setSelectedSitters] = useState<string[]>(() => {
    // Load from localStorage on initialization
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('calendar-sitter-filters');
      return saved ? JSON.parse(saved) : ["all"];
    }
    return ["all"];
  });
  const [ownerEvents, setOwnerEvents] = useState<any[]>([]);

  useEffect(() => {
    fetchBookings();
    fetchSitters();
    fetchOwnerEvents();
  }, []);

  const fetchOwnerEvents = async () => {
    try {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 3, 0);
      
      const response = await fetch(
        `/api/calendar/owner-events?start=${startDate.toISOString()}&end=${endDate.toISOString()}`
      );
      const data = await response.json();
      setOwnerEvents(data.events || []);
    } catch (error) {
      console.error("Failed to fetch owner events:", error);
    }
  };

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

  // Sitter filtering simplified for dropdown

  const getEventColor = (status: string) => {
    switch (status) {
      case "Confirmed":
        return { bg: "#22c55e", border: "#16a34a" }; // Green
      case "Pending":
        return { bg: "#f59e0b", border: "#d97706" }; // Amber
      case "Completed":
        return { bg: "#6b7280", border: "#4b5563" }; // Gray
      default:
        return { bg: COLORS.primary, border: "#2d1f16" }; // Brand brown
    }
  };

  // Filter bookings by selected sitters
  const filteredBookings = bookings.filter((booking) => {
    if (selectedSitters.includes("all")) return true;
    if (selectedSitters.includes("unassigned") && !booking.sitter) return true;
    if (booking.sitter && selectedSitters.includes(booking.sitter.id)) return true;
    return false;
  });

  // Create booking events with detailed information
  const bookingEvents: CalendarEvent[] = filteredBookings.map((booking) => {
    const colors = getEventColor(booking.status);
    const petQuantities = formatPetsByQuantity(booking.pets);
    const sitterName = booking.sitter ? `${booking.sitter.firstName} ${booking.sitter.lastName}` : "Unassigned";
    
    // Check for conflicts
    const conflictStatus = getConflictStatus(booking, bookings);
    const conflicts = getBookingConflicts(booking, bookings);
    
    // Create detailed title based on view type
    let title = "";
    if (viewType === "timeGridDay" || viewType === "timeGridWeek") {
      // Timeline views - show more detail
      title = `${booking.firstName} ${booking.lastName}`;
    } else {
      // Month view - show service and client
      title = `${booking.service} - ${booking.firstName} ${booking.lastName}`;
    }
    
    // Add conflict indicator to title
    if (conflictStatus !== 'none') {
      title = `⚠️ ${title}`;
    }
    
    return {
      id: booking.id,
      title,
      start: booking.startAt,
      end: booking.endAt,
      backgroundColor: colors.bg,
      borderColor: conflictStatus === 'error' ? '#dc2626' : conflictStatus === 'warning' ? '#f59e0b' : colors.border,
        extendedProps: {
          booking,
          petQuantities,
          sitterName,
          service: booking.service,
          clientName: `${booking.firstName} ${booking.lastName}`,
          conflictStatus,
          conflicts,
        },
    };
  });

  // Create owner's Google Calendar events
  const googleEvents: CalendarEvent[] = ownerEvents.map((event) => ({
    id: `google-${event.id}`,
    title: event.summary || "Google Calendar Event",
    start: event.start?.dateTime || event.start?.date,
    end: event.end?.dateTime || event.end?.date,
    backgroundColor: "#3b82f6", // Blue for Google Calendar events
    borderColor: "#1d4ed8",
    extendedProps: {
      isGoogleEvent: true,
      event,
    },
  }));

  const events = [...bookingEvents, ...googleEvents];

  const handleEventClick = (info: any) => {
    const extendedProps = info.event.extendedProps;
    if (extendedProps.isGoogleEvent) {
      // Handle Google Calendar event click
      setSelectedBooking(null);
      alert(`Google Calendar Event: ${info.event.title}`);
    } else {
      // Handle booking event click
      setSelectedBooking(extendedProps.booking);
    }
  };

  const syncWithGoogleCalendar = async () => {
    setSyncingGoogle(true);
    try {
      const response = await fetch("/api/calendar/google-sync", {
        method: "POST",
      });

      if (response.ok) {
        alert("✅ Bookings synced to your Google Calendar!");
        fetchOwnerEvents(); // Refresh owner events
      } else {
        alert("❌ Failed to sync with Google Calendar");
      }
    } catch (error) {
      console.error("Failed to sync calendar:", error);
      alert("❌ Failed to sync calendar");
    }
    setSyncingGoogle(false);
  };

  return (
    <div className="min-h-screen" style={{ background: "#f5f5f5" }}>
      {/* Header */}
      <div className="bg-white border-b shadow-sm" style={{ borderColor: "#e0e0e0" }}>
        <div className="max-w-[1800px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: COLORS.primary }}>
                <i className="fas fa-calendar-alt" style={{ color: COLORS.primaryLight }}></i>
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: COLORS.primary }}>
                  Booking Calendar
                </h1>
                <p className="text-xs text-gray-800 font-medium">Schedule & meet-and-greets • Sitter conflicts • Google Calendar sync</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={syncWithGoogleCalendar}
                disabled={syncingGoogle}
                className={`px-4 py-2 text-sm font-bold text-white rounded-lg transition-all ${
                  syncingGoogle ? "bg-gray-400" : "hover:opacity-90"
                }`}
                style={syncingGoogle ? {} : { background: COLORS.primary }}
              >
                {syncingGoogle ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>Syncing...
                  </>
                ) : (
                  <>
                    <i className="fab fa-google mr-2"></i>Sync to Owner Calendar
                  </>
                )}
              </button>
              <Link
                href="/bookings"
                className="px-4 py-2 text-sm font-medium border rounded-lg hover:bg-gray-50 transition-colors"
                style={{ color: COLORS.primary, borderColor: "#d0d0d0" }}
              >
                <i className="fas fa-arrow-left mr-2"></i>Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-8 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Calendar */}
          <div className="col-span-9">
            <div className="bg-white rounded-lg border shadow-sm p-6" style={{ borderColor: "#e0e0e0" }}>
              {/* View Controls */}
              <div className="space-y-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewType("dayGridMonth")}
                      className={`px-3 py-1.5 text-sm font-semibold rounded transition-colors ${
                        viewType === "dayGridMonth" ? "text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                      style={viewType === "dayGridMonth" ? { background: COLORS.primary } : {}}
                    >
                      Month
                    </button>
                    <button
                      onClick={() => setViewType("timeGridWeek")}
                      className={`px-3 py-1.5 text-sm font-semibold rounded transition-colors ${
                        viewType === "timeGridWeek" ? "text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                      style={viewType === "timeGridWeek" ? { background: COLORS.primary } : {}}
                    >
                      Week
                    </button>
                    <button
                      onClick={() => setViewType("timeGridDay")}
                      className={`px-3 py-1.5 text-sm font-semibold rounded transition-colors ${
                        viewType === "timeGridDay" ? "text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                      style={viewType === "timeGridDay" ? { background: COLORS.primary } : {}}
                    >
                      Day
                    </button>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-green-500"></div>
                      <span className="text-gray-600">Confirmed</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-amber-500"></div>
                      <span className="text-gray-600">Pending</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-gray-500"></div>
                      <span className="text-gray-600">Completed</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded" style={{ background: COLORS.primary }}></div>
                      <span className="text-gray-600">Other</span>
                    </div>
                  </div>
                </div>

                {/* Sitter Filter Dropdown */}
                <div className="border-t pt-3" style={{ borderColor: "#e0e0e0" }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <i className="fas fa-filter text-sm" style={{ color: COLORS.primary }}></i>
                      <span className="text-xs font-bold uppercase text-gray-500">Filter by Sitter</span>
                      <span className="text-xs text-gray-400">({filteredBookings.length} of {bookings.length} shown)</span>
                    </div>
                    <select
                      value={selectedSitters[0] || "all"}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "all") {
                          setSelectedSitters(["all"]);
                          localStorage.setItem('calendar-sitter-filters', JSON.stringify(["all"]));
                        } else {
                          setSelectedSitters([value]);
                          localStorage.setItem('calendar-sitter-filters', JSON.stringify([value]));
                        }
                      }}
                      className="px-3 py-2 text-sm font-semibold rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-opacity-50"
                      style={{ 
                        borderColor: COLORS.primary, 
                        color: COLORS.primary,
                        background: "white"
                      }}
                    >
                      <option value="all">All Sitters</option>
                      <option value="unassigned">Unassigned</option>
                      {sitters.map((sitter) => (
                        <option key={sitter.id} value={sitter.id}>
                          {sitter.firstName} {sitter.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-r-transparent" style={{ borderColor: COLORS.primary, borderRightColor: "transparent" }}></div>
                    <p className="mt-4 text-sm font-medium text-gray-600">Loading calendar...</p>
                  </div>
                </div>
              ) : (
                <div className="calendar-wrapper">
                  <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView={viewType}
                    headerToolbar={{
                      left: "prev,next today",
                      center: "title",
                      right: "",
                    }}
                    events={events}
                    eventClick={handleEventClick}
                    eventContent={(eventInfo) => {
                      const extendedProps = eventInfo.event.extendedProps;
                      if (extendedProps.isGoogleEvent) {
                        return { html: `<div class="fc-event-title">${eventInfo.event.title}</div>` };
                      }
                      
                      // Custom rendering for booking events
                      if (viewType === "timeGridDay" || viewType === "timeGridWeek") {
                        return {
                          html: `
                            <div class="fc-event-main-frame">
                              <div class="fc-event-title-container">
                                <div class="fc-event-title">${extendedProps.clientName}</div>
                                <div class="fc-event-time">${eventInfo.timeText}</div>
                              </div>
                 <div class="fc-event-details">
                   <div class="fc-event-service">${extendedProps.service}</div>
                   <div class="fc-event-pets">${extendedProps.petQuantities}</div>
                   <div class="fc-event-sitter">${extendedProps.sitterName}</div>
                 </div>
                            </div>
                          `
                        };
                      }
                      
                      return { html: `<div class="fc-event-title">${eventInfo.event.title}</div>` };
                    }}
                    height="auto"
                    slotMinTime="06:00:00"
                    slotMaxTime="22:00:00"
                    allDaySlot={false}
                    nowIndicator={true}
                    eventTimeFormat={{
                      hour: "numeric",
                      minute: "2-digit",
                      meridiem: "short",
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="col-span-3">
            {selectedBooking ? (
              <div className="bg-white rounded-lg border shadow-sm" style={{ borderColor: "#e0e0e0" }}>
                <div className="px-4 py-3 border-b" style={{ borderColor: "#e0e0e0", background: COLORS.primary }}>
                  <h3 className="font-bold text-white text-sm">Booking Details</h3>
                </div>
                <div className="p-4 space-y-3 text-sm">
                  <div>
                    <div className="text-xs font-bold uppercase text-gray-400 mb-1">Client</div>
                    <div className="font-semibold" style={{ color: COLORS.primary }}>
                      {selectedBooking.firstName} {selectedBooking.lastName}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold uppercase text-gray-400 mb-1">Service</div>
                    <div className="font-medium text-gray-700">
                      {selectedBooking.service}
                      {selectedBooking.minutes && ` (${selectedBooking.minutes} min)`}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold uppercase text-gray-400 mb-1">Pets</div>
                    <div className="font-medium text-gray-700">
                      {selectedBooking.pets.map((p) => p.name).join(", ")}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold uppercase text-gray-400 mb-1">Time</div>
                    <div className="font-medium text-gray-700">
                      {new Date(selectedBooking.startAt).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                      {" - "}
                      {new Date(selectedBooking.endAt).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  {selectedBooking.sitter && (
                    <div>
                      <div className="text-xs font-bold uppercase text-gray-400 mb-1">Sitter</div>
                      <div className="font-medium text-gray-700">
                        {selectedBooking.sitter.firstName} {selectedBooking.sitter.lastName}
                      </div>
                    </div>
                  )}

                  {selectedBooking.totalPrice && (
                    <div>
                      <div className="text-xs font-bold uppercase text-gray-400 mb-1">Price</div>
                      <div className="font-bold text-lg" style={{ color: COLORS.primary }}>
                        ${selectedBooking.totalPrice.toFixed(2)}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-xs font-bold uppercase text-gray-400 mb-1">Status</div>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                      selectedBooking.status === "Pending" ? "bg-amber-100 text-amber-700" :
                      selectedBooking.status === "Confirmed" ? "bg-green-100 text-green-700" :
                      selectedBooking.status === "Completed" ? "bg-gray-100 text-gray-600" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {selectedBooking.status}
                    </span>
                  </div>

                  {/* Conflict Information */}
                  {selectedBooking && (() => {
                    const conflictStatus = getConflictStatus(selectedBooking, bookings);
                    const conflicts = getBookingConflicts(selectedBooking, bookings);
                    
                    if (conflictStatus !== 'none') {
                      return (
                        <div>
                          <div className="text-xs font-bold uppercase text-gray-400 mb-1">Conflicts</div>
                          <div className={`px-2 py-1 rounded text-xs font-bold ${
                            conflictStatus === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {conflictStatus === 'error' ? '⚠️ Confirmed Conflict' : '⚠️ Potential Conflict'}
                          </div>
                          {conflicts.length > 0 && (
                            <div className="mt-2 text-xs text-gray-600">
                              <div className="font-semibold mb-1">Conflicting bookings:</div>
                              {conflicts.map((conflict, idx) => (
                                <div key={idx} className="ml-2">
                                  • Conflict with booking {conflict.id}
                                  <br />
                                  <span className="text-gray-500">
                                    {new Date(conflict.startAt).toLocaleTimeString("en-US", {
                                      hour: "numeric",
                                      minute: "2-digit",
                                    })} - {new Date(conflict.endAt).toLocaleTimeString("en-US", {
                                      hour: "numeric",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <a
                    href={`/bookings?id=${selectedBooking.id}`}
                    className="block w-full mt-4 px-4 py-2 text-center text-white rounded-lg font-semibold text-sm hover:opacity-90 transition-all"
                    style={{ background: COLORS.primary }}
                  >
                    <i className="fas fa-arrow-right mr-2"></i>View Full Details
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border shadow-sm p-6 text-center" style={{ borderColor: "#e0e0e0" }}>
                <i className="fas fa-mouse-pointer text-4xl text-gray-300 mb-3"></i>
                <p className="text-sm text-gray-500">Click on any booking in the calendar to see details</p>
              </div>
            )}

            {/* Upcoming Today */}
            <div className="mt-6 bg-white rounded-lg border shadow-sm" style={{ borderColor: "#e0e0e0" }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: "#e0e0e0", background: COLORS.primaryLight }}>
                <h3 className="font-bold text-sm" style={{ color: COLORS.primary }}>
                  <i className="fas fa-clock mr-2"></i>Upcoming Today
                </h3>
              </div>
              <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                {bookings
                  .filter((b) => {
                    const today = new Date();
                    const bookingDate = new Date(b.startAt);
                    return (
                      bookingDate.toDateString() === today.toDateString() &&
                      bookingDate >= today &&
                      b.status !== "Completed"
                    );
                  })
                  .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
                  .map((booking) => (
                    <div
                      key={booking.id}
                      onClick={() => setSelectedBooking(booking)}
                      className="p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all"
                      style={{ borderColor: "#e0e0e0" }}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="font-semibold text-sm" style={{ color: COLORS.primary }}>
                          {new Date(booking.startAt).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </div>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          booking.status === "Confirmed" ? "bg-green-100 text-green-700" :
                          "bg-amber-100 text-amber-700"
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">
                        {booking.service} - {booking.firstName} {booking.lastName}
                      </div>
                      <div className="text-xs text-gray-800 font-medium mt-1">
                        {booking.pets.map((p) => p.name).join(", ")}
                      </div>
                    </div>
                  ))}
                {bookings.filter((b) => {
                  const today = new Date();
                  const bookingDate = new Date(b.startAt);
                  return (
                    bookingDate.toDateString() === today.toDateString() &&
                    bookingDate >= today &&
                    b.status !== "Completed"
                  );
                }).length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <i className="fas fa-check-circle text-3xl mb-2"></i>
                    <p className="text-sm">No more visits today</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .fc {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 14px;
        }
        .fc .fc-button-primary {
          background-color: ${COLORS.primary} !important;
          border-color: ${COLORS.primary} !important;
          font-weight: 700 !important;
          font-size: 14px !important;
        }
        .fc .fc-button-primary:hover {
          background-color: #5a4232 !important;
        }
        .fc .fc-button-active {
          background-color: #2d1f16 !important;
        }
        .fc-event {
          cursor: pointer;
          font-size: 0.875rem;
          padding: 4px 6px;
          font-weight: 600;
        }
        .fc-event:hover {
          opacity: 0.9;
        }
        .fc-day-today {
          background-color: ${COLORS.primaryLight}40 !important;
        }
        .fc .fc-col-header-cell-cushion {
          color: ${COLORS.primary} !important;
          font-weight: 800 !important;
          font-size: 15px !important;
          padding: 12px 8px !important;
        }
        .fc .fc-daygrid-day-number {
          color: #1f2937 !important;
          font-weight: 700 !important;
          font-size: 16px !important;
          padding: 8px !important;
        }
        .fc .fc-timegrid-slot-label {
          color: #1f2937 !important;
          font-weight: 600 !important;
          font-size: 13px !important;
        }
        .fc .fc-toolbar-title {
          color: ${COLORS.primary} !important;
          font-weight: 800 !important;
          font-size: 24px !important;
        }
        .fc .fc-daygrid-day-top {
          font-size: 14px !important;
        }
        .fc-event-title {
          font-weight: 600 !important;
          color: white !important;
        }
        .fc .fc-timegrid-axis {
          color: #1f2937 !important;
          font-weight: 600 !important;
        }
        /* Make all calendar text darker and bolder */
        .fc td, .fc th {
          color: #1f2937 !important;
        }
        
        /* Custom event styling for timeline views */
        .fc-event-details {
          font-size: 0.75rem !important;
          line-height: 1.2 !important;
          margin-top: 2px !important;
        }
        .fc-event-service {
          font-weight: 600 !important;
          color: rgba(255, 255, 255, 0.9) !important;
        }
        .fc-event-pets {
          color: rgba(255, 255, 255, 0.8) !important;
          font-style: italic !important;
        }
        .fc-event-sitter {
          color: rgba(255, 255, 255, 0.7) !important;
          font-size: 0.7rem !important;
        }
        .fc-event-time {
          font-size: 0.7rem !important;
          color: rgba(255, 255, 255, 0.8) !important;
          font-weight: 500 !important;
        }
      `}</style>
    </div>
  );
}

