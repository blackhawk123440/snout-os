"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { COLORS } from "@/lib/booking-utils";

interface Booking {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  service: string;
  startAt: string | Date;
  endAt: string | Date;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  totalPrice: number;
  pets: Array<{ species: string }>;
  sitter?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  timeSlots?: Array<{
    startAt: string | Date;
    endAt: string | Date;
  }>;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  bookings: Booking[];
}

export default function CalendarPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSitterFilter, setSelectedSitterFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>("month");
  const [sitters, setSitters] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
  const [conflictNoticeEnabled, setConflictNoticeEnabled] = useState(true);

  useEffect(() => {
    fetchBookings();
    fetchSitters();
    fetchSettings();
  }, []);

  useEffect(() => {
    if (viewMode !== "month") {
      setSelectedDate(null);
    }
  }, [viewMode]);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      const data = await response.json();
      if (data.settings?.conflictNoticeEnabled !== undefined) {
        setConflictNoticeEnabled(data.settings.conflictNoticeEnabled);
      }
    } catch {
      // Silently handle errors
    }
  };

  // Close modal on ESC key and prevent body scroll
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedDate) {
        setSelectedDate(null);
      }
    };
    
    if (selectedDate) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [selectedDate]);

  const fetchSitters = async () => {
    try {
      const response = await fetch("/api/sitters");
      const data = await response.json();
      setSitters(data.sitters || []);
    } catch {
      setSitters([]);
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/bookings");
      const data = await response.json();
      setBookings(data.bookings || []);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };


  const filteredBookings = useMemo(() => {
    return bookings.filter(booking => {
      if (selectedSitterFilter !== "all") {
        return booking.sitter?.id === selectedSitterFilter;
      }
      return true;
    });
  }, [bookings, selectedSitterFilter]);

  const agendaBookings = useMemo(() => {
    const now = new Date();
    return [...filteredBookings]
      .filter(booking => new Date(booking.endAt) >= now)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [filteredBookings]);

  const agendaGrouped = useMemo(() => {
    const groups = new Map<string, Booking[]>();
    agendaBookings.forEach(booking => {
      const dateKey = new Date(booking.startAt).toISOString().split('T')[0];
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(booking);
    });

    return Array.from(groups.entries()).map(([date, items]) => ({
      date,
      bookings: items.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    }));
  }, [agendaBookings]);

  // Get bookings for a specific date
  const getBookingsForDate = (date: Date): Booking[] => {
    const dateStr = date.toISOString().split('T')[0];
    const bookings = filteredBookings.filter(booking => {
      const startAt = new Date(booking.startAt);
      const startDateStr = startAt.toISOString().split('T')[0];
      
      // Check if booking has time slots
      if (booking.timeSlots && booking.timeSlots.length > 0) {
        return booking.timeSlots.some(slot => {
          const slotDate = new Date(slot.startAt);
          return slotDate.toISOString().split('T')[0] === dateStr;
        });
      }
      
      // For house sitting and 24/7 care, check if date falls within range
      if (booking.service === "Housesitting" || booking.service === "24/7 Care") {
        const endAt = new Date(booking.endAt);
        const dateOnly = new Date(date);
        dateOnly.setHours(0, 0, 0, 0);
        const startOnly = new Date(startAt);
        startOnly.setHours(0, 0, 0, 0);
        const endOnly = new Date(endAt);
        endOnly.setHours(0, 0, 0, 0);
        return dateOnly >= startOnly && dateOnly <= endOnly;
      }
      
      return startDateStr === dateStr;
    });

    // Sort bookings chronologically by their earliest time on this date
    return bookings.sort((a, b) => {
      const getEarliestTime = (booking: Booking, date: Date): number => {
        const dateStr = date.toISOString().split('T')[0];
        
        // If booking has time slots, find the earliest slot on this date
        if (booking.timeSlots && booking.timeSlots.length > 0) {
          const daySlots = booking.timeSlots
            .filter(slot => {
              const slotDate = new Date(slot.startAt);
              return slotDate.toISOString().split('T')[0] === dateStr;
            })
            .map(slot => new Date(slot.startAt).getTime());
          
          if (daySlots.length > 0) {
            return Math.min(...daySlots);
          }
        }
        
        // For house sitting/24/7 care, use startAt time if date is start date
        const startAt = new Date(booking.startAt);
        const startDateStr = startAt.toISOString().split('T')[0];
        if (startDateStr === dateStr) {
          return startAt.getTime();
        }
        
        // Otherwise use the startAt time as fallback
        return startAt.getTime();
      };
      
      return getEarliestTime(a, date) - getEarliestTime(b, date);
    });
  };

  // Generate calendar days for current month
  const calendarDays = useMemo((): CalendarDay[] => {
    const year = currentYear;
    const month = currentMonth;
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay();
    
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    const lastDate = lastDay.getDate();
    
    // Previous month's last few days
    const prevMonthLastDay = new Date(year, month, 0);
    const prevMonthLastDate = prevMonthLastDay.getDate();
    
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Add previous month's trailing days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDate - i);
      const dateOnly = new Date(date);
      dateOnly.setHours(0, 0, 0, 0);
      days.push({
        date: dateOnly,
        isCurrentMonth: false,
        isToday: false,
        isPast: dateOnly < today,
        bookings: getBookingsForDate(dateOnly),
      });
    }
    
    // Add current month's days
    for (let day = 1; day <= lastDate; day++) {
      const date = new Date(year, month, day);
      const dateOnly = new Date(date);
      dateOnly.setHours(0, 0, 0, 0);
      const isToday = dateOnly.getTime() === today.getTime();
      days.push({
        date: dateOnly,
        isCurrentMonth: true,
        isToday,
        isPast: dateOnly < today && !isToday,
        bookings: getBookingsForDate(dateOnly),
      });
    }
    
    // Add next month's leading days to complete the grid (42 days = 6 weeks)
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      const dateOnly = new Date(date);
      dateOnly.setHours(0, 0, 0, 0);
      days.push({
        date: dateOnly,
        isCurrentMonth: false,
        isToday: false,
        isPast: dateOnly < today,
        bookings: getBookingsForDate(dateOnly),
      });
    }
    
    return days;
  }, [currentMonth, currentYear, filteredBookings]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDate(null);
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
      case "pending": return {
        bg: "#fef3c7",
        text: "#92400e",
        border: "#fcd34d"
      };
      case "confirmed": return {
        bg: "#dbeafe",
        text: "#1e40af",
        border: "#60a5fa"
      };
      case "completed": return {
        bg: "#d1fae5",
        text: "#065f46",
        border: "#34d399"
      };
      case "cancelled": return {
        bg: "#fee2e2",
        text: "#991b1b",
        border: "#f87171"
      };
      default: return {
        bg: "#f3f4f6",
        text: "#374151",
        border: "#d1d5db"
      };
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Sort selected date bookings chronologically (already sorted in getBookingsForDate, but ensure it's maintained)
  const selectedDateBookings = selectedDate ? getBookingsForDate(selectedDate) : [];

  // Check for conflicts in bookings for visual indicators (only if enabled)
  const bookingsWithConflicts = useMemo(() => {
    if (!conflictNoticeEnabled) {
      return new Set<string>();
    }
    
    const conflictSet = new Set<string>();
    
    // Group bookings by sitter
    const bookingsBySitter = new Map<string, Booking[]>();
    bookings.forEach(booking => {
      if (booking.sitter?.id && (booking.status === "pending" || booking.status === "confirmed")) {
        if (!bookingsBySitter.has(booking.sitter.id)) {
          bookingsBySitter.set(booking.sitter.id, []);
        }
        bookingsBySitter.get(booking.sitter.id)!.push(booking);
      }
    });

    // Check for overlaps within each sitter's bookings
    bookingsBySitter.forEach((sitterBookings) => {
      for (let i = 0; i < sitterBookings.length; i++) {
        for (let j = i + 1; j < sitterBookings.length; j++) {
          const booking1 = sitterBookings[i];
          const booking2 = sitterBookings[j];

          const checkOverlap = (b1: Booking, b2: Booking): boolean => {
            if (b1.timeSlots && b1.timeSlots.length > 0 && b2.timeSlots && b2.timeSlots.length > 0) {
              // Both have time slots, check if any overlap
              return b1.timeSlots.some(slot1 => 
                b2.timeSlots!.some(slot2 => {
                  const start1 = new Date(slot1.startAt).getTime();
                  const end1 = new Date(slot1.endAt).getTime();
                  const start2 = new Date(slot2.startAt).getTime();
                  const end2 = new Date(slot2.endAt).getTime();
                  return start1 < end2 && start2 < end1;
                })
              );
            } else if (b1.timeSlots && b1.timeSlots.length > 0) {
              // b1 has time slots, b2 doesn't
              return b1.timeSlots.some(slot => {
                const slotStart = new Date(slot.startAt).getTime();
                const slotEnd = new Date(slot.endAt).getTime();
                const b2Start = new Date(b2.startAt).getTime();
                const b2End = new Date(b2.endAt).getTime();
                return slotStart < b2End && b2Start < slotEnd;
              });
            } else if (b2.timeSlots && b2.timeSlots.length > 0) {
              // b2 has time slots, b1 doesn't
              return b2.timeSlots.some(slot => {
                const slotStart = new Date(slot.startAt).getTime();
                const slotEnd = new Date(slot.endAt).getTime();
                const b1Start = new Date(b1.startAt).getTime();
                const b1End = new Date(b1.endAt).getTime();
                return slotStart < b1End && b1Start < slotEnd;
              });
            } else {
              // Neither has time slots, check date ranges
              const b1Start = new Date(b1.startAt).getTime();
              const b1End = new Date(b1.endAt).getTime();
              const b2Start = new Date(b2.startAt).getTime();
              const b2End = new Date(b2.endAt).getTime();
              return b1Start < b2End && b2Start < b1End;
            }
          };

          if (checkOverlap(booking1, booking2)) {
            conflictSet.add(booking1.id);
            conflictSet.add(booking2.id);
          }
        }
      }
    });

    return conflictSet;
  }, [bookings, conflictNoticeEnabled]);

  return (
    <div className="min-h-screen w-full" style={{ background: COLORS.primaryLighter }}>
      {/* Header */}
      <div className="bg-white border-b shadow-sm w-full" style={{ borderColor: COLORS.border }}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: COLORS.primary }}>
                <i className="fas fa-calendar-alt" style={{ color: COLORS.primaryLight }}></i>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold" style={{ color: COLORS.primary }}>
                  Calendar View
                </h1>
                <p className="text-xs sm:text-sm text-gray-500">See every booking at a glance</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3 w-full lg:w-auto overflow-x-auto no-scrollbar pb-1">
              <Link
                href="/calendar/accounts"
                className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold border-2 rounded-lg hover:opacity-90 transition-all flex-shrink-0"
                style={{ color: COLORS.primary, borderColor: COLORS.primaryLight }}
              >
                <i className="fas fa-cog"></i><span>Calendar Settings</span>
              </Link>
              <Link
                href="/bookings"
                className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold border rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0"
                style={{ color: COLORS.primary, borderColor: COLORS.border }}
              >
                <i className="fas fa-arrow-left"></i><span>Back to Bookings</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        {/* Filters and Month Navigation */}
        <div className="bg-white rounded-lg p-3 sm:p-4 border-2 mb-4 sm:mb-6" style={{ borderColor: COLORS.primaryLight }}>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="px-3 py-2 border rounded-lg hover:bg-gray-50 transition-colors touch-manipulation min-h-[44px]"
                  style={{ borderColor: COLORS.border }}
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                <h2 className="text-sm sm:text-lg font-bold px-2 sm:px-4 truncate" style={{ color: COLORS.primary }}>
                  {monthNames[currentMonth]} {currentYear}
                </h2>
                <button
                  onClick={() => navigateMonth('next')}
                  className="px-3 py-2 border rounded-lg hover:bg-gray-50 transition-colors touch-manipulation min-h-[44px]"
                  style={{ borderColor: COLORS.border }}
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
                <button
                  onClick={goToToday}
                  className="px-3 py-2 text-xs sm:text-sm border rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation min-h-[44px]"
                  style={{ borderColor: COLORS.border, color: COLORS.primary }}
                >
                  Today
                </button>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {[
                  { id: 'month', label: 'Month View', icon: 'fas fa-table' },
                  { id: 'agenda', label: 'Agenda View', icon: 'fas fa-list' },
                ].map(option => (
                  <button
                    key={option.id}
                    onClick={() => setViewMode(option.id as 'month' | 'agenda')}
                    className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg border transition-all touch-manipulation min-h-[44px] whitespace-nowrap ${
                      viewMode === option.id ? 'shadow-md' : ''
                    }`}
                    style={{
                      background: viewMode === option.id ? COLORS.primary : 'white',
                      color: viewMode === option.id ? COLORS.primaryLight : COLORS.primary,
                      borderColor: viewMode === option.id ? COLORS.primaryLight : COLORS.border,
                    }}
                  >
                    <i className={option.icon}></i>
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <label className="text-sm font-medium" style={{ color: COLORS.primary }}>Sitter:</label>
              <select
                value={selectedSitterFilter}
                onChange={(e) => setSelectedSitterFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm touch-manipulation min-h-[44px] flex-1 sm:flex-initial"
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
          </div>
        </div>

        {viewMode === 'month' ? (
          <div className="bg-white rounded-lg border-2 mb-6 overflow-hidden" style={{ borderColor: COLORS.border }}>
            <div className="overflow-x-auto">
              <div className="p-0">
                {/* Day Names Header */}
                <div className="grid grid-cols-7 border-t border-l border-r" style={{ borderColor: COLORS.border }}>
                  {dayNames.map(day => (
                    <div
                      key={day}
                      className="text-center text-xs sm:text-sm font-bold py-2 border-b bg-gray-50"
                      style={{ 
                        color: COLORS.primary,
                        borderColor: COLORS.border
                      }}
                    >
                      <span className="hidden sm:inline">{day}</span>
                      <span className="sm:hidden">{day[0]}</span>
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                {loading ? (
                  <div className="text-center py-12">
                    <i className="fas fa-spinner fa-spin text-2xl" style={{ color: COLORS.primary }}></i>
                    <p className="mt-2 text-gray-600">Loading calendar...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-7 gap-px border-t border-l" style={{ borderColor: COLORS.border }}>
                    {calendarDays.map((day, index) => {
                      const maxVisibleBookings = 2;
                      const remainingCount = Math.max(0, day.bookings.length - maxVisibleBookings);
                      
                      return (
                        <div
                          key={index}
                          onClick={() => day.isCurrentMonth && setSelectedDate(day.date)}
                          className={`min-h-[110px] sm:min-h-[140px] flex flex-col border-r border-b transition-all touch-manipulation ${
                            !day.isCurrentMonth ? 'opacity-30 bg-gray-50' : 'bg-white'
                          } ${day.isCurrentMonth && !day.isPast ? 'hover:bg-gray-50 active:bg-gray-100' : ''} ${day.isCurrentMonth ? 'cursor-pointer' : 'cursor-default'}`}
                          style={{ 
                            borderColor: COLORS.border,
                            backgroundColor: selectedDate && selectedDate.getTime() === day.date.getTime() 
                              ? COLORS.primaryLighter 
                              : (day.isPast && day.isCurrentMonth ? '#fafafa' : (day.isCurrentMonth ? 'white' : '#f9fafb')),
                            borderWidth: selectedDate && selectedDate.getTime() === day.date.getTime() ? '2px' : '1px',
                          }}
                        >
                          {/* Date Number */}
                          <div className="flex items-center justify-between px-1.5 sm:px-2 py-1 flex-shrink-0">
                            <span 
                              className={`text-[11px] sm:text-sm font-medium ${
                                day.isToday ? 'font-bold' : 'font-normal'
                              }`}
                              style={{
                                color: day.isToday 
                                  ? COLORS.primary 
                                  : (day.isCurrentMonth ? COLORS.primary : COLORS.gray)
                              }}
                            >
                              {day.date.getDate()}
                            </span>
                            {day.isToday && (
                              <span 
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: COLORS.primary }}
                              ></span>
                            )}
                          </div>

                          {/* Bookings Container - Fixed Height */}
                          <div className="flex-1 px-1 pb-1 overflow-hidden flex flex-col">
                            <div className="space-y-0.5 flex-1 min-h-0">
                              {day.bookings.slice(0, maxVisibleBookings).map((booking) => {
                                const colors = getStatusColor(booking.status);
                                const dateStr = day.date.toISOString().split('T')[0];
                                
                                // Get time slots for this date
                                let displayTime = '';
                                let tooltipTime = '';
                                
                                if (booking.timeSlots && booking.timeSlots.length > 0) {
                                  const daySlots = booking.timeSlots
                                    .filter(slot => {
                                      const slotDate = new Date(slot.startAt);
                                      return slotDate.toISOString().split('T')[0] === dateStr;
                                    })
                                    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
                                  
                                  if (daySlots.length > 0) {
                                    // Show all time slots for this day
                                    const times = daySlots.map(slot => {
                                      const start = formatTime(new Date(slot.startAt));
                                      const end = formatTime(new Date(slot.endAt));
                                      return `${start}-${end}`;
                                    });
                                    displayTime = times.length > 1 ? `${times.length} slots` : times[0];
                                    tooltipTime = times.join(', ');
                                  } else {
                                    displayTime = formatTime(new Date(booking.startAt));
                                    tooltipTime = displayTime;
                                  }
                                } else if (booking.service === "Housesitting" || booking.service === "24/7 Care") {
                                  // For house sitting/24/7 care, show start-end time if it's the start or end date
                                  const startAt = new Date(booking.startAt);
                                  const endAt = new Date(booking.endAt);
                                  const startDateStr = startAt.toISOString().split('T')[0];
                                  const endDateStr = endAt.toISOString().split('T')[0];
                                  
                                  if (dateStr === startDateStr) {
                                    displayTime = formatTime(startAt);
                                    tooltipTime = `Start: ${formatTime(startAt)}`;
                                  } else if (dateStr === endDateStr) {
                                    displayTime = formatTime(endAt);
                                    tooltipTime = `End: ${formatTime(endAt)}`;
                                  } else {
                                    displayTime = 'All day';
                                    tooltipTime = 'Ongoing';
                                  }
                                } else {
                                  displayTime = formatTime(new Date(booking.startAt));
                                  tooltipTime = displayTime;
                                }
                                
                                const hasConflict = bookingsWithConflicts.has(booking.id);
                                return (
                                  <div
                                    key={booking.id}
                                    className={`text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 sm:py-1 rounded cursor-pointer hover:opacity-90 active:opacity-75 transition-opacity truncate touch-manipulation relative ${
                                      hasConflict ? 'border-2' : ''
                                    }`}
                                    style={{
                                      backgroundColor: colors.bg,
                                      color: colors.text,
                                      borderLeft: `2px solid ${hasConflict ? COLORS.error : colors.border}`,
                                      borderColor: hasConflict ? COLORS.error : 'transparent',
                                    }}
                                    title={`${booking.firstName} ${booking.lastName} - ${booking.service}${booking.sitter ? ` - ${booking.sitter.firstName} ${booking.sitter.lastName}` : ''} - ${tooltipTime}${hasConflict ? ' ⚠️ CONFLICT' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedDate(day.date);
                                    }}
                                  >
                                    {hasConflict && (
                                      <i className="fas fa-exclamation-triangle absolute top-0 right-0 text-[8px] sm:text-[10px]" style={{ color: COLORS.error }}></i>
                                    )}
                                    <div className="font-semibold truncate leading-tight text-[10px] sm:text-xs pr-2">
                                      {booking.firstName} {booking.lastName.charAt(0)}.
                                    </div>
                                    <div className="truncate leading-tight opacity-80 text-[9px] sm:text-[10px]">
                                      {displayTime}
                                    </div>
                                  </div>
                                );
                              })}
                              
                              {/* "See more" link */}
                              {remainingCount > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDate(day.date);
                                  }}
                                  className="text-[10px] sm:text-xs px-1 sm:px-1.5 py-1 sm:py-0.5 rounded w-full text-left hover:opacity-80 active:opacity-70 transition-opacity font-medium mt-0.5 touch-manipulation min-h-[32px] sm:min-h-auto"
                                  style={{
                                    color: COLORS.primary,
                                    backgroundColor: COLORS.primaryLight + '40',
                                  }}
                                >
                                  {remainingCount} more
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border-2 mb-6 overflow-hidden" style={{ borderColor: COLORS.border }}>
            <div className="p-4 sm:p-6 space-y-5">
              {agendaGrouped.length === 0 ? (
                <div className="text-center py-8">
                  <i className="fas fa-calendar-check text-3xl text-gray-300 mb-3"></i>
                  <p className="text-sm text-gray-600">No upcoming bookings found. Adjust your filters or switch back to month view.</p>
                </div>
              ) : (
                agendaGrouped.map(group => {
                  const dateObj = new Date(group.date);
                  return (
                    <div key={group.date} className="border border-gray-100 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 border-b border-gray-100 px-4 py-2 flex items-center justify-between">
                        <div className="text-sm font-semibold" style={{ color: COLORS.primary }}>
                          {dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </div>
                        <span className="text-xs text-gray-500">{group.bookings.length} booking{group.bookings.length > 1 ? 's' : ''}</span>
                      </div>
                      <div className="divide-y">
                        {group.bookings.map(booking => {
                          const start = new Date(booking.startAt);
                          const end = new Date(booking.endAt);
                          const colors = getStatusColor(booking.status);
                          return (
                            <div key={booking.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold" style={{ color: COLORS.primary }}>
                                  <span>{booking.service}</span>
                                  <span className={`px-2 py-0.5 text-[11px] rounded-full border`} style={{ background: colors.bg, color: colors.text, borderColor: colors.border }}>
                                    {booking.status}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <i className="fas fa-clock w-4"></i>
                                    <span>{formatTime(start)} - {formatTime(end)}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <i className="fas fa-user w-4"></i>
                                    <span>{booking.firstName} {booking.lastName}</span>
                                  </div>
                                  {booking.sitter && (
                                    <div className="flex items-center gap-2">
                                      <i className="fas fa-user-check w-4"></i>
                                      <span>Sitter: {booking.sitter.firstName} {booking.sitter.lastName}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-start sm:items-end gap-1">
                                <span className="text-sm font-bold" style={{ color: COLORS.primary }}>
                                  ${booking.totalPrice.toFixed(2)}
                                </span>
                                <span className="text-xs text-gray-500">{formatPetsByQuantity(booking.pets)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Selected Date Bookings Modal */}
        {viewMode === 'month' && selectedDate && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
            onClick={() => setSelectedDate(null)}
          >
            <div 
              className="bg-white rounded-lg border-2 w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl"
              style={{ borderColor: COLORS.primaryLight }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white p-3 sm:p-4 border-b z-10 shadow-sm" style={{ borderColor: COLORS.border }}>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base sm:text-xl font-bold truncate flex-1" style={{ color: COLORS.primary }}>
                    Bookings for {formatDate(selectedDate)}
                  </h2>
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="px-3 sm:px-4 py-2 text-sm font-bold border rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation min-h-[44px] flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: COLORS.border, color: COLORS.primary }}
                  >
                    <i className="fas fa-times sm:mr-2"></i>
                    <span className="hidden sm:inline">Close</span>
                  </button>
                </div>
              </div>
              <div className="p-3 sm:p-6">
              {selectedDateBookings.length === 0 ? (
                <p className="text-gray-600 text-center py-4">No bookings for this date</p>
              ) : (
                <div className="space-y-4">
                  {selectedDateBookings.map((booking) => {
                    // Get time slots for this date if they exist, sorted chronologically
                    const dateStr = selectedDate.toISOString().split('T')[0];
                    const dayTimeSlots = booking.timeSlots && booking.timeSlots.length > 0 
                      ? booking.timeSlots
                          .filter(slot => {
                            const slotDate = new Date(slot.startAt).toISOString().split('T')[0];
                            return slotDate === dateStr;
                          })
                          .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
                      : [];
                    
                    const hasConflict = bookingsWithConflicts.has(booking.id);
                    return (
                      <div
                        key={booking.id}
                        className={`p-3 sm:p-6 border-2 rounded-lg hover:shadow-lg transition-all`}
                        style={{ 
                          borderColor: hasConflict ? COLORS.error : COLORS.border,
                        }}
                      >
                        {hasConflict && (
                          <div className="mb-2 p-2 rounded-lg flex items-center gap-2" style={{ backgroundColor: COLORS.error + '20' }}>
                            <i className="fas fa-exclamation-triangle" style={{ color: COLORS.error }}></i>
                            <span className="text-xs font-bold" style={{ color: COLORS.error }}>
                              SCHEDULING CONFLICT
                            </span>
                          </div>
                        )}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-base sm:text-xl truncate" style={{ color: COLORS.primary }}>
                              {booking.firstName} {booking.lastName}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 truncate">{booking.service}</p>
                          </div>
                          <span 
                            className="px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-bold rounded self-start whitespace-nowrap flex-shrink-0"
                            style={{
                              backgroundColor: getStatusColor(booking.status).bg,
                              color: getStatusColor(booking.status).text,
                              border: `1px solid ${getStatusColor(booking.status).border}`
                            }}
                          >
                            {booking.status.toUpperCase()}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                          <div className="space-y-2 sm:space-y-2">
                            {/* Only show Start Time for services without time slots (House Sitting, 24/7 Care) */}
                            {(!booking.timeSlots || booking.timeSlots.length === 0) && 
                             (booking.service === "Housesitting" || booking.service === "24/7 Care") && (
                              <div className="flex items-center gap-2">
                                <i className="fas fa-clock w-5" style={{ color: COLORS.primary }}></i>
                                <div>
                                  <div className="text-xs text-gray-500">Start Time</div>
                                  <div className="text-sm font-medium">{formatTime(new Date(booking.startAt))}</div>
                                </div>
                              </div>
                            )}
                            
                            {/* Show Time Slots for services that have them (Drop-ins, Dog Walking, Pet Taxi) */}
                            {dayTimeSlots.length > 0 && (
                              <div className="flex items-start gap-2">
                                <i className="fas fa-list w-5 mt-1" style={{ color: COLORS.primary }}></i>
                                <div>
                                  <div className="text-xs text-gray-500">Time Slots</div>
                                  <div className="text-sm">
                                    {dayTimeSlots.map((slot, idx) => (
                                      <div key={idx} className="font-medium">
                                        {formatTime(new Date(slot.startAt))} - {formatTime(new Date(slot.endAt))}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Show Start/End Time for House Sitting/24/7 Care when no time slots */}
                            {(!booking.timeSlots || booking.timeSlots.length === 0) && 
                             (booking.service === "Housesitting" || booking.service === "24/7 Care") && (
                              <div className="flex items-center gap-2">
                                <i className="fas fa-clock w-5" style={{ color: COLORS.primary }}></i>
                                <div>
                                  <div className="text-xs text-gray-500">End Time</div>
                                  <div className="text-sm font-medium">{formatTime(new Date(booking.endAt))}</div>
                                </div>
                              </div>
                            )}
                            
                            {booking.sitter ? (
                              <div className="flex items-center gap-2 mt-2">
                                <i className="fas fa-user-check w-5" style={{ color: COLORS.primary }}></i>
                                <div>
                                  <div className="text-xs text-gray-500">Assigned Sitter</div>
                                  <div className="text-sm font-bold" style={{ color: COLORS.primary }}>
                                    {booking.sitter.firstName} {booking.sitter.lastName}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 mt-2">
                                <i className="fas fa-user-times w-5 text-gray-400"></i>
                                <div>
                                  <div className="text-xs text-gray-500">Assigned Sitter</div>
                                  <div className="text-sm text-gray-400 font-medium">Not Assigned</div>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <i className="fas fa-paw w-5" style={{ color: COLORS.primary }}></i>
                              <div>
                                <div className="text-xs text-gray-500">Pets</div>
                                <div className="text-sm font-medium">{formatPetsByQuantity(booking.pets)}</div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <i className="fas fa-dollar-sign w-5" style={{ color: COLORS.primary }}></i>
                              <div>
                                <div className="text-xs text-gray-500">Total Price</div>
                                <div className="text-sm font-bold" style={{ color: COLORS.primary }}>
                                  ${booking.totalPrice.toFixed(2)}
                                </div>
                              </div>
                            </div>
                            
                            {booking.address && (
                              <div className="flex items-start gap-2">
                                <i className="fas fa-map-marker-alt w-5 mt-1" style={{ color: COLORS.primary }}></i>
                                <div>
                                  <div className="text-xs text-gray-500">Address</div>
                                  <div className="text-sm font-medium">{booking.address}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {(booking.email || booking.phone) && (
                          <div className="pt-3 sm:pt-4 border-t" style={{ borderColor: COLORS.border }}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                              {booking.phone && (
                                <div className="flex items-center gap-2 min-w-0">
                                  <i className="fas fa-phone w-4 sm:w-5 flex-shrink-0" style={{ color: COLORS.primary }}></i>
                                  <a href={`tel:${booking.phone}`} className="font-medium truncate hover:underline">
                                    {booking.phone}
                                  </a>
                                </div>
                              )}
                              {booking.email && (
                                <div className="flex items-center gap-2 min-w-0">
                                  <i className="fas fa-envelope w-4 sm:w-5 flex-shrink-0" style={{ color: COLORS.primary }}></i>
                                  <a href={`mailto:${booking.email}`} className="font-medium truncate hover:underline break-all">
                                    {booking.email}
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}