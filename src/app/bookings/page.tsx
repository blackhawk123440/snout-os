    "use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { COLORS, formatPetsByQuantity, getPetIcon, getServiceIcon, calculatePriceBreakdown } from "@/lib/booking-utils";

interface Booking {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  pickupAddress?: string | null;
  dropoffAddress?: string | null;
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
  timeSlots?: Array<{
    id: string;
    startAt: Date;
    endAt: Date;
    duration: number;
  }>;
  stripePaymentLinkUrl?: string;
  tipLinkUrl?: string;
  quantity: number;
  afterHours: boolean;
  holiday: boolean;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Sitter {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  active: boolean;
}

function BookingsPageContent() {
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [sitters, setSitters] = useState<Sitter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "completed" | "cancelled">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "name" | "price">("date");
  const [showArchived, setShowArchived] = useState(false);
  const [selectedSitterFilter, setSelectedSitterFilter] = useState<string>("all");

  // Multi-select states
  const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Edit mode states
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedBooking, setEditedBooking] = useState<Partial<Booking>>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    pickupAddress: '',
    dropoffAddress: '',
    service: ''
  });
  const [editedTimeSlots, setEditedTimeSlots] = useState<Array<{ id?: string; startAt: Date; endAt: Date; duration: number }>>([]);
  const [editedPets, setEditedPets] = useState<Array<{ species: string }>>([]);
  const [editedSitterId, setEditedSitterId] = useState<string | null | undefined>(undefined);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [selectedDateForTime, setSelectedDateForTime] = useState<string | null>(null);
  const [timeModalOpen, setTimeModalOpen] = useState(false);
  const [timeSelectorOpen, setTimeSelectorOpen] = useState<"start" | "end" | null>(null);

  // Sitter pool states
  const [showSitterPoolModal, setShowSitterPoolModal] = useState(false);
  const [selectedSittersForPool, setSelectedSittersForPool] = useState<string[]>([]);
  const [poolBookingId, setPoolBookingId] = useState<string | null>(null);

  // Payment link states
  const [generatingPaymentLink, setGeneratingPaymentLink] = useState(false);
  const [generatingTipLink, setGeneratingTipLink] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkModalContent, setLinkModalContent] = useState<{ title: string; link: string; details?: string } | null>(null);

  // New features states
  const [sitterRecommendations, setSitterRecommendations] = useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [bookingTags, setBookingTags] = useState<any[]>([]);
  const [allTags, setAllTags] = useState<any[]>([]);
  const [showRecommendations, setShowRecommendations] = useState(false);

  // Conflict checking state
  const [conflictModal, setConflictModal] = useState<{
    bookingId: string;
    sitterId: string;
    conflicts: Array<{
      bookingId: string;
      firstName: string;
      lastName: string;
      service: string;
      startAt: Date;
      endAt: Date;
      overlappingSlots: Array<{ bookingSlot: { startAt: Date; endAt: Date }; existingSlot: { startAt: Date; endAt: Date } }>;
    }>;
  } | null>(null);
  const [conflictNoticeEnabled, setConflictNoticeEnabled] = useState(true);

  // Dashboard sections visibility
  const [showStats, setShowStats] = useState(true);
  const [showUpcoming, setShowUpcoming] = useState(true);
  const [showPending, setShowPending] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    let loadingCleared = false;
    
    const loadData = async () => {
      setLoading(true);
      loadingCleared = false;
      
      // Force loading to false after 8 seconds regardless of API status
      timeoutId = setTimeout(() => {
        if (isMounted && !loadingCleared) {
          setLoading(false);
          loadingCleared = true;
        }
      }, 8000);
      
      try {
        // Fetch settings for conflict notice setting
        const settingsResponse = await fetch("/api/settings").catch(() => null);
        if (settingsResponse?.ok) {
          try {
            const settingsData = await settingsResponse.json();
            if (settingsData.settings?.conflictNoticeEnabled !== undefined) {
              setConflictNoticeEnabled(settingsData.settings.conflictNoticeEnabled);
            }
          } catch {
            // Silently handle errors
          }
        }

        // Fetch both in parallel
        const [bookingsResponse, sittersResponse] = await Promise.allSettled([
          fetch("/api/bookings").catch(() => null),
          fetch("/api/sitters").catch(() => null)
        ]);
        
        // Process bookings
        if (isMounted && bookingsResponse.status === 'fulfilled' && bookingsResponse.value) {
          try {
            if (bookingsResponse.value.ok) {
              const data = await bookingsResponse.value.json();
              const bookingsData = data.bookings || [];
              
              // Debug: Log a sample booking to verify notes are in the response
              if (bookingsData.length > 0) {
                const sample = bookingsData.find((b: any) => b.firstName?.toLowerCase().includes('mike') || b.firstName?.toLowerCase().includes('carson'));
                if (sample) {
                  console.log('Sample booking from API response:', {
                    id: sample.id,
                    firstName: sample.firstName,
                    lastName: sample.lastName,
                    notes: sample.notes,
                    notesType: typeof sample.notes,
                    allKeys: Object.keys(sample),
                  });
                }
              }
              
              setBookings(bookingsData);
            } else {
              setBookings([]);
            }
          } catch {
            setBookings([]);
          }
        } else {
          if (isMounted) setBookings([]);
        }
        
        // Process sitters
        if (isMounted && sittersResponse.status === 'fulfilled' && sittersResponse.value) {
          try {
            if (sittersResponse.value.ok) {
              const data = await sittersResponse.value.json();
              setSitters(data.sitters || []);
            } else {
              setSitters([]);
            }
          } catch {
            setSitters([]);
          }
        } else {
          if (isMounted) setSitters([]);
        }
        
      } catch {
        if (isMounted) {
          setBookings([]);
          setSitters([]);
        }
      } finally {
        clearTimeout(timeoutId);
        if (isMounted && !loadingCleared) {
          setLoading(false);
          loadingCleared = true;
        }
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Check URL for booking ID and select that booking
  useEffect(() => {
    const bookingId = searchParams?.get('booking');
    if (!bookingId || bookings.length === 0) return;
    
    const booking = bookings.find(b => b.id === bookingId);
    if (booking && (!selectedBooking || booking.id !== selectedBooking.id)) {
      // Ensure all fields including notes are preserved
      const fullBooking = {
        ...booking,
        notes: booking.notes || null,
      };
      setSelectedBooking(fullBooking);
      // Clear URL parameter after selecting
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('booking');
        window.history.replaceState({}, '', url.toString());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams?.get('booking'), bookings.length, selectedBooking?.id]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/bookings");
      if (!response.ok) {
        throw new Error(`Failed to fetch bookings: ${response.status}`);
      }
      const data = await response.json();
      setBookings(data.bookings || []);
    } catch {
      setBookings([]);
    } finally {
    setLoading(false);
    }
  };

  const fetchSitters = async () => {
    try {
      const response = await fetch("/api/sitters");
      if (!response.ok) {
        throw new Error(`Failed to fetch sitters: ${response.status}`);
      }
      const data = await response.json();
      setSitters(data.sitters || []);
    } catch {
      setSitters([]);
    }
  };

  const fetchBookingTags = async (bookingId: string) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/tags`);
      if (response.ok) {
        const data = await response.json();
        setBookingTags(data.tags || []);
      }
    } catch {
      setBookingTags([]);
    }
  };

  const fetchAllTags = async () => {
    try {
      const response = await fetch("/api/booking-tags");
      if (response.ok) {
        const data = await response.json();
        setAllTags(data.tags || []);
      }
    } catch {
      setAllTags([]);
    }
  };

  const getSitterRecommendations = async (bookingId: string) => {
    if (!selectedBooking) return;
    
    setLoadingRecommendations(true);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/recommend-sitters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeSlots: selectedBooking.timeSlots || [],
          address: selectedBooking.address,
          service: selectedBooking.service,
          petCount: selectedBooking.pets.length,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setSitterRecommendations(data.recommendations || []);
        setShowRecommendations(true);
      }
    } catch (error) {
      console.error("Failed to get recommendations:", error);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const addTagToBooking = async (bookingId: string, tagId: string) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagIds: [tagId] }),
      });
      if (response.ok) {
        fetchBookingTags(bookingId);
      }
    } catch (error) {
      console.error("Failed to add tag:", error);
    }
  };

  const removeTagFromBooking = async (bookingId: string, tagId: string) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/tags?tagId=${tagId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchBookingTags(bookingId);
      }
    } catch (error) {
      console.error("Failed to remove tag:", error);
    }
  };

  useEffect(() => {
    if (selectedBooking) {
      fetchBookingTags(selectedBooking.id);
      fetchAllTags();
    }
  }, [selectedBooking?.id]);

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
          const breakdownA = calculatePriceBreakdown(a);
          const breakdownB = calculatePriceBreakdown(b);
          return breakdownB.total - breakdownA.total;
        case "date":
        default:
          // Sort by submission time (createdAt) - most recent first
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return filtered;
  }, [activeBookings, filter, selectedSitterFilter, searchTerm, sortBy]);

  const stats = useMemo(() => {
    const total = activeBookings.length;
    const pending = activeBookings.filter(b => b.status === "pending").length;
    const confirmed = activeBookings.filter(b => b.status === "confirmed").length;
    const completed = activeBookings.filter(b => b.status === "completed").length;
    // Calculate revenue using true calculated totals
    const revenue = activeBookings.reduce((sum, b) => {
      const breakdown = calculatePriceBreakdown(b);
      return sum + breakdown.total;
    }, 0);
    // Treat confirmed bookings as paid
    const paid = activeBookings.filter(b => b.status === "confirmed" || b.status === "completed").length;
    const paidAmount = activeBookings.filter(b => b.status === "confirmed" || b.status === "completed").reduce((sum, b) => {
      const breakdown = calculatePriceBreakdown(b);
      return sum + breakdown.total;
    }, 0);

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
    // Debug: Log the booking object to see what fields are present
    console.log('Selected booking:', {
      id: booking.id,
      firstName: booking.firstName,
      lastName: booking.lastName,
      notes: booking.notes,
      notesType: typeof booking.notes,
      allKeys: Object.keys(booking),
    });
    
    // Ensure all fields including notes are preserved
    const fullBooking = {
      ...booking,
      notes: booking.notes !== undefined ? booking.notes : null,
    };
    
    console.log('Full booking with notes:', {
      id: fullBooking.id,
      notes: fullBooking.notes,
      notesType: typeof fullBooking.notes,
    });
    
    setSelectedBooking(fullBooking);
    setEditedBooking(fullBooking);
    
    // For house sitting/24/7 care, create a time slot from startAt/endAt if timeSlots are empty
    if (isHouseSittingService(booking.service) && booking.startAt && booking.endAt) {
      const startDate = new Date(booking.startAt);
      const endDate = new Date(booking.endAt);
      const duration = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
      setEditedTimeSlots([{
        startAt: startDate,
        endAt: endDate,
        duration: duration
      }]);
      
      // Initialize calendar to show the booking's start date
      setCalendarMonth(startDate.getMonth());
      setCalendarYear(startDate.getFullYear());
    } else {
      // For other services, use timeSlots
      // Dates from database are stored as UTC, but we need to display them in local time
      // JavaScript's Date constructor automatically converts UTC to local timezone
    setEditedTimeSlots(booking.timeSlots?.map(ts => ({
      id: ts.id,
      startAt: new Date(ts.startAt),
      endAt: new Date(ts.endAt),
      duration: ts.duration
    })) || []);
      
      // Initialize calendar to show the first time slot's date or current month
      if (booking.timeSlots && booking.timeSlots.length > 0) {
        const firstDate = new Date(booking.timeSlots[0].startAt);
        setCalendarMonth(firstDate.getMonth());
        setCalendarYear(firstDate.getFullYear());
      }
    }
    
    setIsEditMode(false);
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
    } catch {
      // Silently handle errors
    }
  };

  const handleSitterAssign = async (bookingId: string, sitterId: string) => {
    if (!sitterId) {
      // Removing sitter assignment - proceed directly
      try {
        const response = await fetch(`/api/bookings/${bookingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sitterId: "" }),
        });

        if (response.ok) {
          fetchBookings();
          if (selectedBooking?.id === bookingId) {
            setSelectedBooking({ ...selectedBooking, sitter: undefined });
          }
        }
      } catch {
        // Silently handle errors
      }
      return;
    }

    // Check for conflicts if enabled
    if (conflictNoticeEnabled) {
      try {
        const conflictResponse = await fetch(`/api/bookings/${bookingId}/check-conflicts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sitterId }),
        });
        
        const conflictData = await conflictResponse.json();
        
        if (conflictData.conflicts && conflictData.conflicts.length > 0) {
          // Convert date strings to Date objects
          const conflicts = conflictData.conflicts.map((conflict: any) => ({
            ...conflict,
            startAt: new Date(conflict.startAt),
            endAt: new Date(conflict.endAt),
            overlappingSlots: conflict.overlappingSlots.map((slot: any) => ({
              bookingSlot: {
                startAt: new Date(slot.bookingSlot.startAt),
                endAt: new Date(slot.bookingSlot.endAt),
              },
              existingSlot: {
                startAt: new Date(slot.existingSlot.startAt),
                endAt: new Date(slot.existingSlot.endAt),
              },
            })),
          }));
          
          // Show conflict confirmation modal
          setConflictModal({
            bookingId,
            sitterId,
            conflicts,
          });
          return;
        }
      } catch {
        // If conflict check fails, proceed with assignment
      }
    }
    
    // No conflicts or conflict notices disabled - assign directly
    await assignSitterToBooking(bookingId, sitterId);
  };

  const assignSitterToBooking = async (bookingId: string, sitterId: string) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sitterId }),
      });

      if (response.ok) {
        fetchBookings();
        setConflictModal(null);
        if (selectedBooking?.id === bookingId) {
          const sitter = sitters.find(s => s.id === sitterId);
          if (sitter) {
            setSelectedBooking({ ...selectedBooking, sitter });
          }
        }
      }
    } catch {
      // Silently handle errors
    }
  };

  const handleConfirmConflictAssignment = () => {
    if (conflictModal) {
      assignSitterToBooking(conflictModal.bookingId, conflictModal.sitterId);
    }
  };

  const handleSitterPoolOffer = async () => {
    if (!poolBookingId || selectedSittersForPool.length === 0) return;

    try {
      const booking = bookings.find(b => b.id === poolBookingId);
      if (!booking) return;

      const response = await fetch("/api/sitter-pool/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: poolBookingId,
          sitterIds: selectedSittersForPool,
          message: `New ${booking.service} opportunity! ${booking.firstName} ${booking.lastName} - ${new Date(booking.startAt).toLocaleDateString()} at ${new Date(booking.startAt).toLocaleTimeString()}. Reply YES to accept!`
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const smsResults = data.smsResults;
        
        if (smsResults) {
          if (smsResults.failed > 0) {
            const failedDetails = smsResults.details
              .filter((r: any) => !r.success)
              .map((r: any) => r.error || 'Unknown error')
              .join('\n');
            alert(`Sitter pool offer created, but some messages failed:\n\nSuccessful: ${smsResults.successful}/${smsResults.total}\nFailed: ${smsResults.failed}/${smsResults.total}\n\nErrors:\n${failedDetails}`);
          } else {
            alert(`Sitter pool offer sent successfully to ${smsResults.successful} sitter(s)!`);
          }
        } else {
          alert(`Sitter pool offer sent to ${selectedSittersForPool.length} sitters!`);
        }
        
        setShowSitterPoolModal(false);
        setSelectedSittersForPool([]);
        setPoolBookingId(null);
        fetchBookings();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        alert(`Failed to create sitter pool offer: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`Failed to create sitter pool offer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const openSitterPoolModal = (bookingId: string) => {
    setPoolBookingId(bookingId);
    setSelectedSittersForPool([]);
    setShowSitterPoolModal(true);
  };

  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      // Fallback for older browsers/mobile
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
      } catch (err) {
        document.body.removeChild(textArea);
        return false;
      }
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      return false;
    }
  };

  const handleGeneratePaymentLink = async (booking: Booking) => {
    setGeneratingPaymentLink(true);
    try {
      const response = await fetch("/api/payments/create-payment-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          includeTip: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Try to copy to clipboard
        const copied = await copyToClipboard(data.paymentLink);
        
        // Show modal with link (works better on mobile)
        setLinkModalContent({
          title: 'Payment Link Generated',
          link: data.paymentLink,
          details: `Service Amount: $${data.baseAmount?.toFixed(2) || 'N/A'}${copied ? '\n\n✓ Copied to clipboard!' : '\n\nTap the link below to copy it'}`
        });
        setShowLinkModal(true);
        
        // Refresh bookings to show updated payment link
        fetchBookings();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        setLinkModalContent({
          title: 'Error',
          link: '',
          details: `Failed to generate payment link: ${errorData.error || 'Unknown error'}${errorData.details ? `\n\nDetails: ${errorData.details}` : ''}`
        });
        setShowLinkModal(true);
      }
    } catch (error) {
      setLinkModalContent({
        title: 'Error',
        link: '',
        details: 'Failed to generate payment link. Please try again.'
      });
      setShowLinkModal(true);
    }
    setGeneratingPaymentLink(false);
  };

  const handleGenerateTipLink = async (booking: Booking) => {
    setGeneratingTipLink(true);
    try {
      const response = await fetch("/api/payments/create-tip-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Try to copy to clipboard
        const copied = await copyToClipboard(data.tipLink);
        
        // Show detailed tip calculations
        const tipCalc = data.tipCalculations;
        const details = `Service Amount: $${tipCalc.serviceAmount}\n\nTip Options:\n• 10%: $${tipCalc.tip10} (Total: $${tipCalc.total10})\n• 15%: $${tipCalc.tip15} (Total: $${tipCalc.total15})\n• 20%: $${tipCalc.tip20} (Total: $${tipCalc.total20})\n• 25%: $${tipCalc.tip25} (Total: $${tipCalc.total25})${copied ? '\n\n✓ Copied to clipboard!' : '\n\nTap the link below to copy it'}`;
        
        setLinkModalContent({
          title: 'Tip Link Generated',
          link: data.tipLink,
          details
        });
        setShowLinkModal(true);
        
        // Refresh bookings to show updated tip link
        fetchBookings();
      } else {
        setLinkModalContent({
          title: 'Error',
          link: '',
          details: 'Failed to generate tip link. Please try again.'
        });
        setShowLinkModal(true);
      }
    } catch (error) {
      setLinkModalContent({
        title: 'Error',
        link: '',
        details: 'Failed to generate tip link. Please try again.'
      });
      setShowLinkModal(true);
    }
    setGeneratingTipLink(false);
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
    } catch {
      // Silently handle errors
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

  // Helper function to check if service is house sitting or 24/7 care
  const isHouseSittingService = (service: string | undefined | null): boolean => {
    if (!service) return false;
    const serviceLower = service.toLowerCase().trim();
    return serviceLower === 'housesitting' || 
           serviceLower === 'house sitting' || 
           serviceLower === '24/7 care' || 
           serviceLower === '24 7 care';
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  const formatTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    // Dates are stored with local time as UTC, so use UTC methods to get the original time
    const hours = dateObj.getUTCHours();
    const minutes = dateObj.getUTCMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
  };

  const handleSave = async () => {
    if (!selectedBooking) return;
    
    try {
      const requestBody: any = {};

      // Include editedBooking fields if any exist
      if (Object.keys(editedBooking).length > 0) {
        Object.assign(requestBody, editedBooking);
      }

      // Always include timeSlots if we're in edit mode (even if unchanged, we send current state)
      // Prepare timeSlots data for API
      const timeSlotsData = editedTimeSlots.map(ts => ({
        id: ts.id,
        startAt: ts.startAt.toISOString(),
        endAt: ts.endAt.toISOString(),
        duration: ts.duration
      }));
      requestBody.timeSlots = timeSlotsData;

      // Include pets if in edit mode (even if empty array to clear pets)
      if (isEditMode) {
        requestBody.pets = editedPets;
      }

      // Include sitterId if edited (handle both setting and clearing)
      if (editedSitterId !== undefined) {
        requestBody.sitterId = editedSitterId || null;
      }

      // Check if we actually have anything to send
      const hasChanges = 
        Object.keys(editedBooking).length > 0 ||
        editedTimeSlots.length > 0 ||
        (isEditMode && editedPets.length >= 0) ||
        editedSitterId !== undefined;

      if (!hasChanges) {
        // Still allow save even if no changes detected (user might have clicked save)
        // This ensures the button always works
      }

      if (!selectedBooking?.id) return;
      const response = await fetch(`/api/bookings/${selectedBooking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      if (response.ok) {
        const data = await response.json();
        setSelectedBooking(data.booking);
        setIsEditMode(false);
        setEditedBooking({
          firstName: '',
          lastName: '',
          phone: '',
          email: '',
          address: '',
          pickupAddress: '',
          dropoffAddress: '',
          service: ''
        });
        setEditedTimeSlots([]);
        setEditedPets([]);
        setEditedSitterId(undefined);
        alert('Booking updated successfully!');
        fetchBookings();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        alert(`Failed to update booking: ${errorData.error || 'Unknown error'}`);
      }
    } catch {
      alert('Error updating booking');
    }
  };

  const handleCancel = () => {
    if (!selectedBooking) return;
    setIsEditMode(false);
    setEditedBooking(selectedBooking || {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      address: '',
      pickupAddress: '',
      dropoffAddress: '',
      service: ''
    });
    setEditedTimeSlots(selectedBooking?.timeSlots?.map(ts => ({
      id: ts.id,
      startAt: new Date(ts.startAt),
      endAt: new Date(ts.endAt),
      duration: ts.duration
    })) || []);
    setEditedPets([]);
    setEditedSitterId(undefined);
  };

  const handleServiceChange = (newService: string) => {
    if (!selectedBooking) return;
    
    // Reset everything when service changes
    // Clear all dates, times, and time slots
    setEditedBooking(prev => ({
      ...prev,
      service: newService,
      startAt: undefined,
      endAt: undefined,
      totalPrice: undefined,
    }));
    
    // Clear all time slots
    setEditedTimeSlots([]);
    
    // Note: We don't update selectedBooking here to avoid causing calculation issues
    // The calculation will use editedBooking values which are now cleared
    // This will result in $0.00 until new dates/times are selected
  };

  const addTimeSlot = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const endTime = new Date(tomorrow);
    endTime.setHours(9, 30, 0, 0);
    
    setEditedTimeSlots([...editedTimeSlots, {
      startAt: tomorrow,
      endAt: endTime,
      duration: 30
    }]);
  };

  const removeTimeSlot = (index: number) => {
    setEditedTimeSlots(editedTimeSlots.filter((_, i) => i !== index));
  };

  const updateTimeSlot = (index: number, field: 'startAt' | 'endAt' | 'duration', value: string | number) => {
    const updated = [...editedTimeSlots];
    const slot = updated[index];
    
    if (field === 'duration') {
      // Only allow 30 or 60 minutes
      const durationValue = Number(value);
      if (durationValue !== 30 && durationValue !== 60) {
        return; // Invalid duration
      }
      slot.duration = durationValue;
      // Update endAt based on duration
      const endTime = new Date(slot.startAt);
      endTime.setMinutes(endTime.getMinutes() + slot.duration);
      slot.endAt = endTime;
    } else if (field === 'startAt') {
      const dateTime = new Date(value as string);
      slot.startAt = dateTime;
      // Update endAt based on duration
      const endTime = new Date(dateTime);
      endTime.setMinutes(endTime.getMinutes() + slot.duration);
      slot.endAt = endTime;
    } else if (field === 'endAt') {
      const dateTime = new Date(value as string);
      slot.endAt = dateTime;
      // Update duration based on endAt (round to nearest 30 or 60)
      const durationMinutes = Math.round((dateTime.getTime() - slot.startAt.getTime()) / 60000);
      slot.duration = durationMinutes <= 45 ? 30 : 60;
    }
    
    setEditedTimeSlots(updated);
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        const displayMinute = minute.toString().padStart(2, '0');
        slots.push({
          time: `${displayHour}:${displayMinute} ${period}`,
          hour,
          minute,
        });
      }
    }
    return slots;
  };

  // TimeSlotSelector component for house sitting/24/7 care - shows as button with modal
  const TimeSlotSelector = ({ 
    selectedTime, 
    onTimeSelect, 
    label,
    type 
  }: { 
    selectedTime: Date; 
    onTimeSelect: (hour: number, minute: number) => void;
    label: string;
    type: "start" | "end";
  }) => {
    const timeSlots = generateTimeSlots();
    const selectedHour = new Date(selectedTime).getHours();
    const selectedMinute = new Date(selectedTime).getMinutes();
    const selectedTimeStr = timeSlots.find(slot => slot.hour === selectedHour && slot.minute === selectedMinute)?.time || 'Select Time';
    
    return (
      <>
        <button
          type="button"
          onClick={() => setTimeSelectorOpen(type)}
          className="w-full px-4 py-3 sm:py-2.5 border-2 rounded-lg text-base sm:text-base font-semibold transition-all text-left flex items-center justify-between touch-manipulation min-h-[44px]"
          style={{
            borderColor: COLORS.border,
            background: COLORS.white,
            color: COLORS.primary,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = COLORS.primary;
            e.currentTarget.style.background = COLORS.primaryLight;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = COLORS.border;
            e.currentTarget.style.background = COLORS.white;
          }}
          onTouchStart={(e) => {
            e.currentTarget.style.borderColor = COLORS.primary;
            e.currentTarget.style.background = COLORS.primaryLight;
          }}
          onTouchEnd={(e) => {
            e.currentTarget.style.borderColor = COLORS.border;
            e.currentTarget.style.background = COLORS.white;
          }}
        >
          <span className="truncate">{selectedTimeStr}</span>
          <i className="fas fa-chevron-down text-sm ml-2 flex-shrink-0" style={{ color: COLORS.primary, opacity: 0.6 }}></i>
        </button>
        
        {timeSelectorOpen === type && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" 
            onClick={() => setTimeSelectorOpen(null)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setTimeSelectorOpen(null);
              }
            }}
            tabIndex={-1}
          >
            <div 
              className="bg-white rounded-xl shadow-2xl w-full mx-4 max-h-[85vh] sm:max-w-md overflow-hidden flex flex-col" 
              onClick={(e) => e.stopPropagation()}
              style={{ borderColor: COLORS.primaryLight }}
            >
              <div className="p-3 sm:p-4 border-b flex items-center justify-between" style={{ borderColor: COLORS.border }}>
                <h3 className="text-base sm:text-lg font-bold" style={{ color: COLORS.primary }}>
                  {label}
                </h3>
                <button
                  type="button"
                  onClick={() => setTimeSelectorOpen(null)}
                  className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg active:bg-gray-100 transition-colors touch-manipulation"
                  style={{ color: COLORS.primary }}
                  aria-label="Close"
                >
                  <i className="fas fa-times text-lg sm:text-base"></i>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                <div className="grid grid-cols-1 gap-2 sm:gap-2">
                  {timeSlots.map((slot, idx) => {
                    const isSelected = slot.hour === selectedHour && slot.minute === selectedMinute;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          onTimeSelect(slot.hour, slot.minute);
                          setTimeSelectorOpen(null);
                        }}
                        className={`
                          px-4 py-3.5 sm:py-3 border-2 rounded-lg text-base sm:text-sm font-medium transition-all text-left flex items-center justify-between
                          cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[auto]
                        `}
                        style={{
                          borderColor: isSelected ? COLORS.primary : COLORS.secondary,
                          background: isSelected ? COLORS.primaryLight : COLORS.white,
                          color: COLORS.primary,
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = COLORS.primary;
                            e.currentTarget.style.background = COLORS.primaryLight;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = COLORS.secondary;
                            e.currentTarget.style.background = COLORS.white;
                          }
                        }}
                      >
                        <span className="font-semibold">{slot.time}</span>
                        {isSelected && (
                          <i className="fas fa-check text-sm" style={{ color: COLORS.primary }}></i>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  const getCalendarDays = () => {
    if (!selectedBooking) return [];
    
    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const days: Array<{ day: number; date: Date; isCurrentMonth: boolean; isToday: boolean; isSelected: boolean }> = [];
    
    const currentService = editedBooking.service || selectedBooking?.service || '';
    const isHouse = isHouseSittingService(currentService);
    
    // Get selected date range for house sitting
    let selectedDateRange: Set<string> = new Set();
    if (isHouse) {
      // In edit mode, only use editedBooking dates if they exist
      // If editedBooking dates are undefined, don't show any selected dates (reset state)
      if (isEditMode) {
        if (editedBooking.startAt && editedBooking.endAt && editedBooking.startAt !== undefined && editedBooking.endAt !== undefined) {
          const startDate = new Date(editedBooking.startAt);
          const endDate = new Date(editedBooking.endAt);
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(0, 0, 0, 0);
          
          let current = new Date(startDate);
          while (current <= endDate) {
            selectedDateRange.add(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
          }
        }
        // If editedBooking dates are undefined/null, don't use selectedBooking dates
        // This ensures the calendar resets when service changes
      } else {
        // Not in edit mode, use selectedBooking dates
        if (selectedBooking?.startAt && selectedBooking?.endAt) {
          const startDate = new Date(selectedBooking.startAt);
          const endDate = new Date(selectedBooking.endAt);
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(0, 0, 0, 0);
          
          let current = new Date(startDate);
          while (current <= endDate) {
            selectedDateRange.add(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
          }
        }
      }
    }
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: 0, date: new Date(), isCurrentMonth: false, isToday: false, isSelected: false });
    }
    
    // Add days of month
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(calendarYear, calendarMonth, day);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      
      // Check if this date is selected
      let isSelected = false;
      if (isHouse) {
        isSelected = selectedDateRange.has(dateStr);
      } else {
      // Check if this date has any time slots
        isSelected = editedTimeSlots.some(ts => {
        const tsDate = new Date(ts.startAt);
        tsDate.setHours(0, 0, 0, 0);
        return tsDate.toISOString().split('T')[0] === dateStr;
      });
      }
      
      days.push({
        day,
        date,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        isSelected,
      });
    }
    
    return days;
  };

  const handleCalendarDateClick = (date: Date) => {
    if (!selectedBooking) return;
    
    const dateStr = date.toISOString().split('T')[0];
    const currentService = editedBooking.service || selectedBooking?.service || '';
    const isHouse = isHouseSittingService(currentService);
    
    if (isHouse) {
      // For house sitting/24/7 care: select consecutive date range
      handleHouseSittingDateClick(date);
    } else {
      // For other services: open time selection modal
    setSelectedDateForTime(dateStr);
    setTimeModalOpen(true);
    }
  };

  const handleHouseSittingDateClick = (date: Date) => {
    if (!selectedBooking) return;
    
    const dateStr = date.toISOString().split('T')[0];
    const dateTime = new Date(date);
    dateTime.setHours(0, 0, 0, 0);
    
    // Get existing date range - only use first and last dates (startAt/endAt)
    // In edit mode, prefer editedBooking dates, but don't fall back to selectedBooking if they're explicitly cleared
    let existingStartDate: Date | null = null;
    let existingEndDate: Date | null = null;
    
    if (isEditMode) {
      // In edit mode, only use editedBooking dates if they exist
      // If editedBooking dates are undefined, treat as no existing range (fresh start)
      if (editedBooking.startAt !== undefined && editedBooking.endAt !== undefined && 
          editedBooking.startAt !== null && editedBooking.endAt !== null) {
        existingStartDate = new Date(editedBooking.startAt);
        existingEndDate = new Date(editedBooking.endAt);
        existingStartDate.setHours(0, 0, 0, 0);
        existingEndDate.setHours(0, 0, 0, 0);
      }
      // Don't fall back to selectedBooking dates in edit mode - this ensures proper reset
    } else {
      // Not in edit mode, use selectedBooking dates
      if (selectedBooking?.startAt && selectedBooking?.endAt) {
        existingStartDate = new Date(selectedBooking.startAt);
        existingEndDate = new Date(selectedBooking.endAt);
        existingStartDate.setHours(0, 0, 0, 0);
        existingEndDate.setHours(0, 0, 0, 0);
      }
    }
    
    // Check if clicked date is in the current range
    const isInRange = existingStartDate && existingEndDate && 
                      dateTime >= existingStartDate && 
                      dateTime <= existingEndDate;
    
    if (isInRange) {
      // If clicking a date in the range, allow removing from edges
      if (dateStr === existingStartDate!.toISOString().split('T')[0]) {
        // Clicked start date - remove it (shorten range from start)
        if (existingEndDate! > existingStartDate!) {
          // Move start forward by 1 day
          const newStart = new Date(existingStartDate!);
          newStart.setDate(newStart.getDate() + 1);
          updateHouseSittingDates([newStart, existingEndDate!]);
        } else {
          // Only one day - deselect all
          updateHouseSittingDates([]);
        }
      } else if (dateStr === existingEndDate!.toISOString().split('T')[0]) {
        // Clicked end date - remove it (shorten range from end)
        if (existingEndDate! > existingStartDate!) {
          // Move end back by 1 day
          const newEnd = new Date(existingEndDate!);
          newEnd.setDate(newEnd.getDate() - 1);
          updateHouseSittingDates([existingStartDate!, newEnd]);
        } else {
          // Only one day - deselect all
          updateHouseSittingDates([]);
        }
      }
      // If clicking middle date, do nothing (can't remove middle dates)
    } else {
      // Add this date - extend range if it forms a consecutive range, or start new range
      if (!existingStartDate || !existingEndDate) {
        // No existing range - start new single-day range
        updateHouseSittingDates([dateTime]);
      } else {
        // If clicked date is before start or after end, extend the range to include all dates
        if (dateTime < existingStartDate) {
          // Clicked date is before start - extend range backward to include all dates from clicked to end
          updateHouseSittingDates([dateTime, existingEndDate]);
        } else if (dateTime > existingEndDate) {
          // Clicked date is after end - extend range forward to include all dates from start to clicked
          updateHouseSittingDates([existingStartDate, dateTime]);
        } else {
          // Date is in between - shouldn't happen if isInRange check is correct, but handle it anyway
          // Don't change the range
        }
      }
    }
  };

  const updateHouseSittingDates = (dates: Date[]) => {
    if (!selectedBooking) return;
    
    if (dates.length === 0) {
      // Clear everything - reset dates and time slots
      setEditedTimeSlots([]);
      setEditedBooking(prev => ({
        ...prev,
        startAt: undefined,
        endAt: undefined,
      }));
      return;
    }
    
    // Sort dates - take first and last only
    dates.sort((a, b) => a.getTime() - b.getTime());
    const startDate = new Date(dates[0]);
    const endDate = new Date(dates[dates.length - 1]);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    
    // If only one date provided, use it for both start and end
    const actualStartDate = dates.length === 1 ? new Date(dates[0]) : startDate;
    const actualEndDate = dates.length === 1 ? new Date(dates[0]) : endDate;
    if (dates.length === 1) {
      actualStartDate.setHours(0, 0, 0, 0);
      actualEndDate.setHours(0, 0, 0, 0);
    }
    
    // For house sitting, when selecting dates from calendar, preserve existing times or use defaults
    // In edit mode, prefer editedBooking times, but don't fall back to selectedBooking if explicitly cleared
    let existingStart: Date | null = null;
    let existingEnd: Date | null = null;
    
    if (isEditMode) {
      // In edit mode, only use editedBooking times if dates exist
      if (editedBooking.startAt && editedBooking.startAt !== undefined && editedBooking.startAt !== null) {
        existingStart = new Date(editedBooking.startAt);
      } else if (selectedBooking.startAt) {
        // Only fall back if editedBooking doesn't have dates (but allow for initial state)
        existingStart = new Date(selectedBooking.startAt);
      }
      
      if (editedBooking.endAt && editedBooking.endAt !== undefined && editedBooking.endAt !== null) {
        existingEnd = new Date(editedBooking.endAt);
      } else if (selectedBooking?.endAt) {
        existingEnd = new Date(selectedBooking.endAt);
      }
    } else {
      existingStart = selectedBooking?.startAt ? new Date(selectedBooking.startAt) : null;
      existingEnd = selectedBooking?.endAt ? new Date(selectedBooking.endAt) : null;
    }
    
    // Preserve the time portion from existing booking or use default (9 AM for start, 9 PM for end)
    const startHour = existingStart ? existingStart.getHours() : 9;
    const startMinute = existingStart ? existingStart.getMinutes() : 0;
    const endHour = existingEnd ? existingEnd.getHours() : 21;
    const endMinute = existingEnd ? existingEnd.getMinutes() : 0;
    
    // Create new dates with the selected dates but preserve/existing times
    const newStartAt = new Date(actualStartDate);
    newStartAt.setHours(startHour, startMinute, 0, 0);
    
    const newEndAt = new Date(actualEndDate);
    newEndAt.setHours(endHour, endMinute, 0, 0);
    
    setEditedBooking({
      ...editedBooking,
      startAt: newStartAt,
      endAt: newEndAt,
    });
    
    // For house sitting, we don't need time slots, but we'll keep one for display purposes
    setEditedTimeSlots([{
      startAt: newStartAt,
      endAt: newEndAt,
      duration: Math.round((newEndAt.getTime() - newStartAt.getTime()) / 60000),
    }]);
  };

  const handleTimeSlotSelect = (time: { hour: number; minute: number }, duration: 30 | 60) => {
    if (!selectedDateForTime || !selectedBooking) return;
    
    const dateStr = selectedDateForTime;
    const [year, month, day] = dateStr.split('-').map(Number);
    // Create dates using the same method as the API - store local time as UTC
    const isoString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}:00.000Z`;
    const startAt = new Date(isoString);
    const endAt = new Date(startAt.getTime() + duration * 60000);
    
    // Find any slot at this exact date+time (regardless of duration)
    // Use UTC methods since dates are stored with local time as UTC
    const sameTimeIndex = editedTimeSlots.findIndex(ts => {
      const tsDate = ts.startAt instanceof Date ? ts.startAt : new Date(ts.startAt);
      const tsYear = tsDate.getUTCFullYear();
      const tsMonth = tsDate.getUTCMonth() + 1;
      const tsDay = tsDate.getUTCDate();
      const tsHour = tsDate.getUTCHours();
      const tsMinute = tsDate.getUTCMinutes();
      return tsYear === year && tsMonth === month && tsDay === day && tsHour === time.hour && tsMinute === time.minute;
    });

    // If an identical duration already exists: toggle OFF (remove it)
    if (
      sameTimeIndex >= 0 &&
      editedTimeSlots[sameTimeIndex] &&
      editedTimeSlots[sameTimeIndex]!.duration === duration
    ) {
      const updated = [...editedTimeSlots];
      updated.splice(sameTimeIndex, 1);
      setEditedTimeSlots(updated);
      return;
    }

    // If a different duration exists at this time: replace it with the new duration
    if (sameTimeIndex >= 0) {
      const updated = [...editedTimeSlots];
      updated.splice(sameTimeIndex, 1, { startAt, endAt, duration });
      setEditedTimeSlots(updated);
      return;
    }

    // Otherwise, add as a fresh selection
    setEditedTimeSlots([...editedTimeSlots, { startAt, endAt, duration }]);
  };

  const isTimeSlotSelected = (time: { hour: number; minute: number }, duration: 30 | 60): boolean => {
    if (!selectedDateForTime) return false;
    const dateStr = selectedDateForTime;
    const [year, month, day] = dateStr.split('-').map(Number);
    
    return editedTimeSlots.some(ts => {
      // Handle both Date objects and date strings
      const tsDate = ts.startAt instanceof Date ? ts.startAt : new Date(ts.startAt);
      
      // IMPORTANT: Dates are stored as UTC strings with local time components
      // When we read them back, we need to use UTC methods to get the original time components
      // This is because we stored them as if the local time was UTC
      const tsYear = tsDate.getUTCFullYear();
      const tsMonth = tsDate.getUTCMonth() + 1;
      const tsDay = tsDate.getUTCDate();
      const tsHour = tsDate.getUTCHours();
      const tsMinute = tsDate.getUTCMinutes();
      
      // Compare date and time components using UTC methods
      // This matches how we stored them (local time as UTC)
      const dateMatches = tsYear === year && tsMonth === month && tsDay === day;
      const timeMatches = tsHour === time.hour && tsMinute === time.minute;
      const durationMatches = ts.duration === duration;
      
      return dateMatches && timeMatches && durationMatches;
    });
  };

  const navigateCalendarMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (calendarMonth === 0) {
        setCalendarMonth(11);
        setCalendarYear(calendarYear - 1);
      } else {
        setCalendarMonth(calendarMonth - 1);
      }
    } else {
      if (calendarMonth === 11) {
        setCalendarMonth(0);
        setCalendarYear(calendarYear + 1);
      } else {
        setCalendarMonth(calendarMonth + 1);
      }
    }
  };

  const formatDateInput = (date: Date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatTimeInput = (date: Date) => {
    const d = new Date(date);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Import phone formatting utility
  const formatPhoneNumber = (phone: string) => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const formatDateTimeLocal = (date: Date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return (
    <div className="min-h-screen w-full" style={{ background: COLORS.primaryLighter }}>
      {/* Header */}
      <div className="bg-white border-b shadow-sm w-full" style={{ borderColor: COLORS.border }}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5">
            <div className="flex items-center gap-3 sm:gap-4">
              <Link href="/" className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: COLORS.primary }}>
                  <img 
                    src="/logo.png" 
                    alt="Snout Services Logo" 
                    className="w-12 h-12 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      const parent = (e.target as HTMLImageElement).parentElement;
                      if (parent) {
                        parent.innerHTML = '<i class="fas fa-paw" style="color: #fce1ef;"></i>';
                      }
                    }}
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold" style={{ color: COLORS.primary }}>
                    Snout Services
                  </h1>
                  <p className="text-xs text-gray-700 font-medium">Owner Dashboard</p>
                </div>
              </Link>
            </div>
            <div className="relative w-full">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <Link
                href="/"
                  className="flex items-center gap-2 px-3 py-2 text-[11px] sm:text-sm font-semibold border-2 rounded-lg hover:opacity-90 transition-all flex-shrink-0 whitespace-nowrap"
                style={{ color: COLORS.primary, borderColor: COLORS.primaryLight }}
              >
                  <i className="fas fa-home"></i><span>Home</span>
              </Link>
              <button
                onClick={() => {
                  fetchBookings();
                  fetchSitters();
                }}
                disabled={loading}
                  className="flex items-center gap-2 px-3 py-2 text-[11px] sm:text-sm font-semibold border-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 whitespace-nowrap"
                style={{ color: COLORS.primary, borderColor: COLORS.primaryLight }}
                title="Refresh data"
              >
                  <i className={`fas fa-sync-alt ${loading ? 'animate-spin' : ''}`}></i><span>Refresh</span>
              </button>
              <Link
                href="/payments"
                  className="flex items-center gap-2 px-3 py-2 text-[11px] sm:text-sm font-semibold border-2 rounded-lg hover:opacity-90 transition-all flex-shrink-0 whitespace-nowrap"
                style={{ color: COLORS.primary, borderColor: COLORS.primaryLight }}
              >
                  <i className="fas fa-credit-card"></i><span>Payments</span>
              </Link>
              <Link
                href="/calendar"
                  className="flex items-center gap-2 px-3 py-2 text-[11px] sm:text-sm font-semibold border-2 rounded-lg hover:opacity-90 transition-all flex-shrink-0 whitespace-nowrap"
                  style={{ color: COLORS.primary, borderColor: COLORS.primaryLight }}
              >
                  <i className="fas fa-calendar-alt"></i><span>Calendar</span>
              </Link>
              <Link
                href="/clients"
                  className="flex items-center gap-2 px-3 py-2 text-[11px] sm:text-sm font-semibold border-2 rounded-lg hover:opacity-90 transition-all flex-shrink-0 whitespace-nowrap"
                style={{ color: COLORS.primary, borderColor: COLORS.primaryLight }}
              >
                  <i className="fas fa-users"></i><span>Clients</span>
              </Link>
              <Link
                href="/automation"
                  className="flex items-center gap-2 px-3 py-2 text-[11px] sm:text-sm font-semibold border-2 rounded-lg hover:opacity-90 transition-all flex-shrink-0 whitespace-nowrap"
                style={{ color: COLORS.primary, borderColor: COLORS.primaryLight }}
              >
                  <i className="fas fa-robot"></i><span>Automation</span>
              </Link>
              <Link
                href="/settings"
                  className="flex items-center gap-2 px-3 py-2 text-[11px] sm:text-sm font-semibold border-2 rounded-lg hover:opacity-90 transition-all flex-shrink-0 whitespace-nowrap"
                style={{ color: COLORS.primary, borderColor: COLORS.primaryLight }}
              >
                  <i className="fas fa-cog"></i><span>Settings</span>
              </Link>
              <Link
                href="/bookings/sitters"
                  className="flex items-center gap-2 px-3 py-2 text-[11px] sm:text-sm font-semibold border-2 rounded-lg hover:opacity-90 transition-all flex-shrink-0 whitespace-nowrap"
                style={{ color: COLORS.primary, borderColor: COLORS.primaryLight }}
              >
                  <i className="fas fa-user-friends"></i><span>Sitters</span>
              </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Stats Cards */}
        {showStats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4">
            {[
              {
                label: "Total Bookings",
                value: stats.total,
                icon: "fas fa-calendar"
              },
              {
                label: "Pending",
                value: stats.pending,
                icon: "fas fa-clock"
              },
              {
                label: "Confirmed",
                value: stats.confirmed,
                icon: "fas fa-check"
              },
              {
                label: "Completed",
                value: stats.completed,
                icon: "fas fa-flag-checkered"
              },
              {
                label: "Revenue",
                value: `$${stats.revenue.toFixed(2)}`,
                icon: "fas fa-dollar-sign"
              },
              {
                label: "Paid Bookings",
                value: stats.paid,
                icon: "fas fa-receipt"
              },
              {
                label: "Paid Amount",
                value: `$${stats.paidAmount.toFixed(2)}`,
                icon: "fas fa-wallet"
              }
            ].map((card) => (
              <div key={card.label} className="bg-white rounded-lg p-4 sm:p-5 border-2" style={{ borderColor: COLORS.primaryLight }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm font-medium text-gray-600">{card.label}</p>
                    <p className="text-xl sm:text-2xl font-bold" style={{ color: COLORS.primary }}>{card.value}</p>
                </div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: COLORS.primaryLight }}>
                    <i className={`${card.icon} text-sm sm:text-base`} style={{ color: COLORS.primary }}></i>
                </div>
              </div>
            </div>
            ))}
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
                  ${todayBookings.reduce((sum, b) => {
                    const breakdown = calculatePriceBreakdown(b);
                    return sum + breakdown.total;
                  }, 0).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Today's Revenue</div>
              </div>
            </div>
          </div>
        </div>

        {/* Overview Dashboard - Always Visible */}
        {bookings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border-2" style={{ borderColor: COLORS.primaryLight }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Visits</p>
                <p className="text-2xl font-bold" style={{ color: COLORS.primary }}>
                  {bookings.filter(b => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const bookingDate = new Date(b.startAt);
                    bookingDate.setHours(0, 0, 0, 0);
                    return bookingDate.getTime() === today.getTime() && b.status !== "cancelled";
                  }).length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                <i className="fas fa-calendar-day text-xl" style={{ color: COLORS.primary }}></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border-2" style={{ borderColor: COLORS.primaryLight }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unassigned</p>
                <p className="text-2xl font-bold" style={{ color: COLORS.primary }}>
                  {bookings.filter(b => !b.sitter && b.status !== "cancelled" && new Date(b.startAt) >= new Date()).length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: "#fef3c2" }}>
                <i className="fas fa-exclamation-triangle text-xl text-yellow-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border-2" style={{ borderColor: COLORS.primaryLight }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold" style={{ color: COLORS.primary }}>
                  {bookings.filter(b => b.status === "pending").length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: "#dbeafe" }}>
                <i className="fas fa-clock text-xl text-blue-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border-2" style={{ borderColor: COLORS.primaryLight }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Revenue (This Month)</p>
                <p className="text-2xl font-bold" style={{ color: COLORS.primary }}>
                  ${bookings
                    .filter(b => {
                      const now = new Date();
                      const bookingDate = new Date(b.startAt);
                      return bookingDate.getMonth() === now.getMonth() &&
                             bookingDate.getFullYear() === now.getFullYear() &&
                             b.status === "completed";
                    })
                    .reduce((sum, b) => {
                      const breakdown = calculatePriceBreakdown(b);
                      return sum + breakdown.total;
                    }, 0)
                    .toFixed(0)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: "#d1fae5" }}>
                <i className="fas fa-dollar-sign text-xl text-green-600"></i>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-lg p-3 sm:p-4 border-2 mb-4 sm:mb-6" style={{ borderColor: COLORS.primaryLight }}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
              <label className="text-sm font-medium" style={{ color: COLORS.primary }}>Status:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as "all" | "pending" | "confirmed" | "completed" | "cancelled")}
                className="px-3 py-2 sm:py-1 border rounded-lg text-sm w-full sm:w-auto"
                style={{ borderColor: COLORS.border }}
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
              <label className="text-sm font-medium" style={{ color: COLORS.primary }}>Sitter:</label>
              <select
                value={selectedSitterFilter}
                onChange={(e) => setSelectedSitterFilter(e.target.value)}
                className="px-3 py-2 sm:py-1 border rounded-lg text-sm w-full sm:w-auto"
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

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
              <label className="text-sm font-medium" style={{ color: COLORS.primary }}>Sort:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 sm:py-1 border rounded-lg text-sm w-full sm:w-auto"
                style={{ borderColor: COLORS.border }}
              >
                <option value="date">Date</option>
                <option value="name">Name</option>
                <option value="price">Price</option>
              </select>
            </div>

            <div className="flex-1 min-w-0">
              <input
                type="text"
                placeholder="Search bookings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 sm:py-1 border rounded-lg text-sm touch-manipulation min-h-[44px] sm:min-h-[auto]"
                style={{ borderColor: COLORS.border }}
              />
            </div>

            {selectedBookingIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <h2 className="text-lg font-bold" style={{ color: COLORS.primary }}>
                Bookings ({filteredBookings.length})
              </h2>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <button
                  onClick={selectAllBookings}
                  className="px-3 py-2 sm:py-1 text-sm border rounded-lg active:bg-gray-50 touch-manipulation min-h-[44px] sm:min-h-[auto]"
                  style={{ color: COLORS.primary, borderColor: COLORS.border }}
                >
                  Select All
                </button>
                <button
                  onClick={() => setShowStats(!showStats)}
                  className="px-3 py-2 sm:py-1 text-sm border rounded-lg active:bg-gray-50 touch-manipulation min-h-[44px] sm:min-h-[auto]"
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
                <p className="mt-1 text-xs text-gray-500">If this takes too long, check your API connection</p>
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
                  onClick={(e) => {
                    // Don't open modal if clicking on checkbox or its container
                    const target = e.target as HTMLElement;
                    if (target.closest('.checkbox-container')) {
                      return;
                    }
                    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
                      return;
                    }
                    if (target.tagName === 'INPUT') {
                      return;
                    }
                    handleBookingSelect(booking);
                  }}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full">
                      <div className="checkbox-container" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedBookingIds.includes(booking.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleBookingSelection(booking.id);
                        }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-5 h-5 cursor-pointer"
                          style={{
                            accentColor: COLORS.primary,
                            minWidth: '20px',
                            minHeight: '20px',
                            cursor: 'pointer'
                          }}
                        />
                      </div>
                      <div className="w-full space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:flex-wrap gap-2">
                          <span className="px-2.5 py-1 text-xs font-bold rounded-md uppercase tracking-wide whitespace-nowrap" style={{ 
                            background: COLORS.primaryLight, 
                            color: COLORS.primary,
                            border: `1px solid ${COLORS.primary}`
                          }}>
                            <i className={`${getServiceIcon(booking.service)} mr-1.5`}></i>
                            {booking.service}
                          </span>
                          <h3 className="font-semibold text-lg leading-snug">
                            {booking.firstName} {booking.lastName}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-bold rounded ${getStatusColor(booking.status)}`}>
                            {booking.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-wrap">
                            {booking.service === "Housesitting" ? (
                              <>
                                <span><i className="fas fa-calendar mr-1"></i>{formatDate(booking.startAt)} - {formatDate(booking.endAt)}</span>
                                <span><i className="fas fa-clock mr-1"></i>{formatTime(booking.startAt)} - {formatTime(booking.endAt)}</span>
                              </>
                            ) : (
                              <>
                                <span><i className="fas fa-calendar mr-1"></i>{formatDate(booking.startAt)}</span>
                                <span><i className="fas fa-clock mr-1"></i>{formatTime(booking.startAt)}</span>
                              </>
                            )}
                            <span className="inline-flex items-center gap-1">
                              {(() => {
                                const petCounts: Record<string, number> = {};
                                booking.pets.forEach(pet => {
                                  petCounts[pet.species] = (petCounts[pet.species] || 0) + 1;
                                });
                                return Object.entries(petCounts).map(([species, count], index) => (
                                  <span key={species} className="inline-flex items-center gap-1">
                                    {index > 0 && <span className="mx-1">,</span>}
                                    <i className={getPetIcon(species)} style={{ color: COLORS.primary }}></i>
                                    <span>{count} {species}{count > 1 ? 's' : ''}</span>
                                  </span>
                                ));
                              })()}
                            </span>
                            <span><i className="fas fa-dollar-sign mr-1"></i>${(() => {
                              const breakdown = calculatePriceBreakdown(booking);
                              return breakdown.total.toFixed(2);
                            })()}</span>
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
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-semibold" style={{ color: COLORS.primary }}>
                          ${calculatePriceBreakdown(booking).total.toFixed(2)}
                        </p>
                      </div>
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
          <div 
            className="fixed inset-0 bg-black flex items-center justify-center z-[9999] p-0 sm:p-2 md:p-4" 
            style={{ 
              alignItems: 'flex-start', 
              paddingTop: '0', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              pointerEvents: 'auto'
            }}
            onClick={(e) => {
              // Only close if clicking the backdrop, not the modal content
              if (e.target === e.currentTarget) {
                setSelectedBooking(null);
              }
            }}
          >
            <div 
              className="bg-white rounded-none sm:rounded-xl max-w-5xl w-full h-screen sm:h-auto max-h-screen sm:max-h-[98vh] md:max-h-[95vh] overflow-hidden shadow-2xl flex flex-col relative z-[10000]"
              onClick={(e) => e.stopPropagation()}
              style={{ pointerEvents: 'auto' }}
            >
              {/* Header */}
              <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b flex-shrink-0" style={{ borderColor: COLORS.border, background: `linear-gradient(135deg, ${COLORS.primaryLight} 0%, ${COLORS.primaryLighter} 100%)` }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0" style={{ background: COLORS.primary }}>
                      <i className="fas fa-calendar-check text-base sm:text-lg" style={{ color: COLORS.primaryLight }}></i>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg sm:text-xl lg:text-2xl font-bold truncate" style={{ color: COLORS.primary }}>
                        Booking #{selectedBooking.id.slice(-8).toUpperCase()}
                      </h2>
                      <p className="text-sm sm:text-base font-medium truncate" style={{ color: COLORS.primary }}>
                        {selectedBooking.firstName} {selectedBooking.lastName} • {selectedBooking.service}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedBooking(null)}
                    className="w-10 h-10 rounded-full bg-white/20 active:bg-white/30 flex items-center justify-center transition-all duration-200 touch-manipulation flex-shrink-0"
                    style={{ color: COLORS.primary }}
                    aria-label="Close"
                  >
                    <i className="fas fa-times text-base sm:text-lg"></i>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto flex-1 min-h-0">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                  {/* Left Column - Client & Service Info */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Client Information */}
                    <div className="bg-white border-2 rounded-xl p-4 sm:p-6 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
                      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: COLORS.primaryLight }}>
                          <i className="fas fa-user text-sm" style={{ color: COLORS.primary }}></i>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold" style={{ color: COLORS.primary }}>Client Information</h3>
                      </div>
                      
                      {isEditMode ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                          <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">First Name</label>
                            <input
                              type="text"
                              value={editedBooking.firstName || ''}
                              onChange={(e) => setEditedBooking({...editedBooking, firstName: e.target.value})}
                              className="w-full px-3 py-2.5 sm:py-2 border rounded-lg text-base sm:text-lg font-semibold touch-manipulation"
                              style={{ borderColor: COLORS.border }}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Last Name</label>
                            <input
                              type="text"
                              value={editedBooking.lastName || ''}
                              onChange={(e) => setEditedBooking({...editedBooking, lastName: e.target.value})}
                              className="w-full px-3 py-2.5 sm:py-2 border rounded-lg text-base sm:text-lg font-semibold touch-manipulation"
                              style={{ borderColor: COLORS.border }}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Phone Number</label>
                            <input
                              type="tel"
                              value={editedBooking.phone || ''}
                              onChange={(e) => setEditedBooking({...editedBooking, phone: e.target.value})}
                              className="w-full px-3 py-2.5 sm:py-2 border rounded-lg text-base sm:text-lg font-semibold touch-manipulation"
                              style={{ borderColor: COLORS.border }}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Email Address</label>
                            <input
                              type="email"
                              value={editedBooking.email || ''}
                              onChange={(e) => setEditedBooking({...editedBooking, email: e.target.value})}
                              className="w-full px-3 py-2.5 sm:py-2 border rounded-lg text-base sm:text-lg font-semibold touch-manipulation"
                              style={{ borderColor: COLORS.border }}
                            />
                          </div>
                          {editedBooking.service === "Pet Taxi" ? (
                            <>
                              <div className="md:col-span-2 space-y-1">
                                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Pickup Address</label>
                                <textarea
                                  value={editedBooking.pickupAddress || ''}
                                  onChange={(e) => setEditedBooking({...editedBooking, pickupAddress: e.target.value})}
                                  className="w-full px-3 py-2.5 sm:py-2 border rounded-lg text-base sm:text-lg font-semibold touch-manipulation"
                                  style={{ borderColor: COLORS.border }}
                                  rows={3}
                                />
                              </div>
                              <div className="md:col-span-2 space-y-1">
                                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Dropoff Address</label>
                                <textarea
                                  value={editedBooking.dropoffAddress || ''}
                                  onChange={(e) => setEditedBooking({...editedBooking, dropoffAddress: e.target.value})}
                                  className="w-full px-3 py-2.5 sm:py-2 border rounded-lg text-base sm:text-lg font-semibold touch-manipulation"
                                  style={{ borderColor: COLORS.border }}
                                  rows={3}
                                />
                              </div>
                            </>
                          ) : (
                          <div className="md:col-span-2 space-y-1">
                            <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Service Address</label>
                            <textarea
                              value={editedBooking.address || ''}
                              onChange={(e) => setEditedBooking({...editedBooking, address: e.target.value})}
                                className="w-full px-3 py-2.5 sm:py-2 border rounded-lg text-base sm:text-lg font-semibold touch-manipulation"
                              style={{ borderColor: COLORS.border }}
                              rows={3}
                            />
                          </div>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Full Name</label>
                            <p className="text-lg font-semibold text-gray-900">{selectedBooking.firstName} {selectedBooking.lastName}</p>
                          </div>
                          <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Phone Number</label>
                            <div className="flex items-center gap-2">
                            <p className="text-lg font-semibold text-gray-900">{formatPhoneNumber(selectedBooking.phone)}</p>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    // Fetch the OpenPhone conversation URL from the API
                                    const response = await fetch(`/api/openphone/get-contact-url?phone=${encodeURIComponent(selectedBooking.phone)}`);
                                    const data = await response.json();
                                    
                                    if (data.url) {
                                      // Open the conversation URL
                                      window.open(data.url, '_blank', 'noopener,noreferrer');
                                    } else {
                                      alert("Could not find conversation. Opening search instead.");
                                      const phoneDigits = selectedBooking.phone.replace(/\D/g, '');
                                      window.open(`https://my.openphone.com/search?q=${encodeURIComponent(phoneDigits)}`, '_blank', 'noopener,noreferrer');
                                    }
                                  } catch (error) {
                                    // Fallback to search URL
                                    const phoneDigits = selectedBooking.phone.replace(/\D/g, '');
                                    window.open(`https://my.openphone.com/search?q=${encodeURIComponent(phoneDigits)}`, '_blank', 'noopener,noreferrer');
                                  }
                                }}
                                className="px-3 py-1.5 text-sm font-medium rounded-lg transition-all touch-manipulation inline-flex items-center gap-2 hover:opacity-90 active:scale-95"
                                style={{ 
                                  background: COLORS.primary, 
                                  color: COLORS.white,
                                  minHeight: '44px'
                                }}
                                title="Open conversation in OpenPhone"
                              >
                                <i className="fas fa-phone-alt"></i>
                                <span className="hidden sm:inline">OpenPhone</span>
                              </button>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Email Address</label>
                            <p className="text-lg font-semibold text-gray-900">{selectedBooking.email || "Not provided"}</p>
                          </div>
                          {selectedBooking.service === "Pet Taxi" ? (
                            <>
                              <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Pickup Address</label>
                                <p className="text-lg font-semibold text-gray-900">{selectedBooking.pickupAddress || "Not provided"}</p>
                              </div>
                              <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Dropoff Address</label>
                                <p className="text-lg font-semibold text-gray-900">{selectedBooking.dropoffAddress || "Not provided"}</p>
                              </div>
                            </>
                          ) : (
                          <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Service Address</label>
                            <p className="text-lg font-semibold text-gray-900">{selectedBooking.address}</p>
                          </div>
                          )}
                        </div>
                      )}
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
                           {isEditMode ? (
                             <select
                               value={editedBooking.service || selectedBooking?.service || ''}
                               onChange={(e) => handleServiceChange(e.target.value)}
                               className="w-full px-3 py-2.5 sm:py-2 border rounded-lg text-base font-semibold touch-manipulation"
                               style={{ borderColor: COLORS.border }}
                             >
                               <option value="Drop-ins">Drop-ins</option>
                               <option value="Dog Walking">Dog Walking</option>
                               <option value="Housesitting">Housesitting</option>
                               <option value="24/7 Care">24/7 Care</option>
                               <option value="Pet Taxi">Pet Taxi</option>
                             </select>
                           ) : (
                             <p className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                               <i className={`${getServiceIcon(selectedBooking.service)} text-lg`} style={{ color: COLORS.primary }}></i>
                               {selectedBooking.service}
                             </p>
                           )}
                          </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Status</label>
                          <div className="mt-1">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${getStatusColor(selectedBooking.status)}`}>
                              {selectedBooking.status.charAt(0).toUpperCase() + selectedBooking.status.slice(1)}
                            </span>
                          </div>
                        </div>
                        {isHouseSittingService(editedBooking.service || selectedBooking.service) ? (
                          <>
                            <div className="md:col-span-2 space-y-1">
                              <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Selected Dates (Consecutive Only)</label>
                              </div>
                              {isEditMode ? (
                                // Edit mode: Show calendar for date range selection
                                <div className="mt-2 space-y-6">
                                  {/* Calendar */}
                                  <div className="p-6 rounded-xl border-2 shadow-sm" style={{ background: COLORS.accent, borderColor: COLORS.secondary, borderRadius: '12px' }}>
                                    <div className="mb-4">
                                      <div className="flex items-center justify-between mb-1">
                                        <h4 className="text-base font-semibold" style={{ color: COLORS.primary }}>
                                          <i className="fas fa-calendar-alt mr-2"></i>
                                          Select Consecutive Dates
                                        </h4>
                                        <p className="text-xs" style={{ color: COLORS.primary, opacity: 0.6 }}>
                                          Click dates to select consecutive range (start and end only)
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between mb-5">
                                      <button
                                        onClick={() => navigateCalendarMonth('prev')}
                                        className="w-10 h-10 flex items-center justify-center rounded-lg transition-all hover:scale-105"
                                        style={{ 
                                          color: COLORS.primary,
                                          background: COLORS.white,
                                          border: `1px solid ${COLORS.secondary}`,
                                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = COLORS.primaryLight;
                                          e.currentTarget.style.borderColor = COLORS.primary;
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = COLORS.white;
                                          e.currentTarget.style.borderColor = COLORS.secondary;
                                        }}
                                        title="Previous month"
                                      >
                                        <i className="fas fa-chevron-left text-sm"></i>
                                      </button>
                                      <h3 className="text-base sm:text-lg font-bold" style={{ color: COLORS.primary }}>
                                        {new Date(calendarYear, calendarMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                      </h3>
                                      <button
                                        onClick={() => navigateCalendarMonth('next')}
                                        className="w-12 h-12 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg transition-all active:scale-95 touch-manipulation"
                                        style={{ 
                                          color: COLORS.primary,
                                          background: COLORS.white,
                                          border: `1px solid ${COLORS.secondary}`,
                                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = COLORS.primaryLight;
                                          e.currentTarget.style.borderColor = COLORS.primary;
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = COLORS.white;
                                          e.currentTarget.style.borderColor = COLORS.secondary;
                                        }}
                                        title="Next month"
                                      >
                                        <i className="fas fa-chevron-right text-sm"></i>
                                      </button>
                                    </div>
                                    <div className="relative -mx-2 sm:mx-0 overflow-x-auto pb-1">
                                      <div className="min-w-[392px] sm:min-w-0">
                                        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 sm:mb-3">
                                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                            <div key={day} className="text-center text-[11px] sm:text-xs font-bold py-1 sm:py-2" style={{ color: COLORS.primary, opacity: 0.7 }}>
                                              <span className="hidden sm:inline">{day}</span>
                                              <span className="sm:hidden">{day.substring(0, 1)}</span>
                                            </div>
                                          ))}
                                        </div>
                                        <div className="grid grid-cols-7 gap-1 sm:gap-2">
                                          {getCalendarDays().map((dayInfo, idx) => {
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);
                                            const isPast = dayInfo.date < today;
                                            
                                            return (
                                              <button
                                                key={idx}
                                                type="button"
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  e.stopPropagation();
                                                  if (dayInfo.isCurrentMonth && !isPast) {
                                                    handleCalendarDateClick(dayInfo.date);
                                                  }
                                                }}
                                                disabled={!dayInfo.isCurrentMonth || isPast}
                                                className={`
                                                  h-12 sm:h-14 flex items-center justify-center text-sm sm:text-sm font-medium rounded-lg transition-all touch-manipulation min-h-[44px]
                                                  ${!dayInfo.isCurrentMonth ? 'opacity-30' : ''}
                                                  ${isPast ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
                                                `}
                                                style={{
                                                  border: dayInfo.isToday 
                                                    ? `2px solid ${COLORS.primary}` 
                                                    : dayInfo.isSelected
                                                      ? 'none'
                                                      : `1px solid ${COLORS.secondary}`,
                                                  borderRadius: '6px',
                                                  background: dayInfo.isSelected 
                                                    ? `linear-gradient(135deg, ${COLORS.primary} 0%, #5c4032 100%)`
                                                    : dayInfo.isToday 
                                                      ? COLORS.primaryLight 
                                                      : COLORS.white,
                                                  color: dayInfo.isSelected ? COLORS.white : COLORS.primary,
                                                  fontWeight: dayInfo.isToday || dayInfo.isSelected ? 600 : 500,
                                                  boxShadow: dayInfo.isSelected 
                                                    ? '0 4px 12px rgba(67, 47, 33, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)' 
                                                    : dayInfo.isToday
                                                      ? '0 2px 4px rgba(67, 47, 33, 0.1)'
                                                      : 'none',
                                                  transition: 'all 0.2s ease',
                                                }}
                                                onMouseEnter={(e) => {
                                                  if (!isPast && dayInfo.isCurrentMonth && !dayInfo.isSelected) {
                                                    e.currentTarget.style.borderColor = COLORS.primary;
                                                    e.currentTarget.style.background = COLORS.primaryLight;
                                                    e.currentTarget.style.transform = 'scale(1.05)';
                                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(67, 47, 33, 0.15)';
                                                  }
                                                }}
                                                onMouseLeave={(e) => {
                                                  if (!isPast && dayInfo.isCurrentMonth && !dayInfo.isSelected) {
                                                    e.currentTarget.style.borderColor = dayInfo.isToday ? COLORS.primary : COLORS.secondary;
                                                    e.currentTarget.style.background = dayInfo.isToday ? COLORS.primaryLight : COLORS.white;
                                                    e.currentTarget.style.transform = 'scale(1)';
                                                    e.currentTarget.style.boxShadow = dayInfo.isToday ? '0 2px 4px rgba(67, 47, 33, 0.1)' : 'none';
                                                  }
                                                }}
                                                onMouseDown={(e) => {
                                                  if (!isPast && dayInfo.isCurrentMonth) {
                                                    e.currentTarget.style.transform = 'scale(0.95)';
                                                  }
                                                }}
                                                onMouseUp={(e) => {
                                                  e.currentTarget.style.transform = 'scale(1)';
                                                }}
                                              >
                                                {dayInfo.day > 0 ? dayInfo.day : ''}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Selected Date Range and Times - Only show start and end dates with separate time inputs */}
                                  {(editedBooking.startAt || selectedBooking?.startAt) && (
                                    <div className="space-y-4">
                                      <div className="p-5 bg-white rounded-xl border-2 shadow-sm" style={{ borderColor: COLORS.primaryLight, borderRadius: '12px' }}>
                                        <div className="flex items-center gap-2 mb-5">
                                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                                            <i className="fas fa-calendar-day text-sm" style={{ color: COLORS.primary }}></i>
                                          </div>
                                          <div>
                                            <p className="font-bold text-base" style={{ color: COLORS.primary }}>Selected Date Range</p>
                                            <p className="text-xs text-gray-600 mt-1">
                                              {(() => {
                                                const start = editedBooking.startAt || selectedBooking?.startAt;
                                                const end = editedBooking.endAt || selectedBooking?.endAt;
                                                if (start && end) {
                                                  const startDate = new Date(start);
                                                  const endDate = new Date(end);
                                                  startDate.setHours(0, 0, 0, 0);
                                                  endDate.setHours(0, 0, 0, 0);
                                                  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
                                                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                                                  return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} selected`;
                                                }
                                                return '';
                                              })()}
                                            </p>
                                          </div>
                                        </div>
                                        
                                        {/* Start Date & Time */}
                                        <div className="space-y-4 mb-5">
                                          <div className="space-y-2">
                                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Start Date & Time</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                              <div className="px-3 py-2.5 border-2 rounded-lg bg-gray-50" style={{ borderColor: COLORS.border }}>
                                                <p className="text-sm sm:text-sm font-semibold text-gray-900">
                                                  {(editedBooking.startAt !== undefined && editedBooking.startAt !== null) 
                                                    ? formatDate(new Date(editedBooking.startAt))
                                                    : (selectedBooking?.startAt 
                                                      ? formatDate(new Date(selectedBooking.startAt))
                                                      : 'No date selected')}
                                                </p>
                                              </div>
                                              <TimeSlotSelector
                                                selectedTime={(editedBooking.startAt !== undefined && editedBooking.startAt !== null) ? editedBooking.startAt : (selectedBooking?.startAt || new Date())}
                                                onTimeSelect={(hour, minute) => {
                                                  // Use existing date or create new one
                                                  const baseDate = editedBooking.startAt || selectedBooking?.startAt || new Date();
                                                  const startDate = new Date(baseDate);
                                                  startDate.setHours(hour, minute, 0, 0);
                                                  
                                                  // Ensure we have an end date too
                                                  const endDate = editedBooking.endAt || selectedBooking?.endAt || new Date(startDate);
                                                  if (endDate < startDate) {
                                                    endDate.setDate(startDate.getDate());
                                                  }
                                                  
                                                  setEditedBooking({
                                                    ...editedBooking,
                                                    startAt: startDate,
                                                    endAt: endDate,
                                                  });
                                                  
                                                  // Update time slots
                                                  setEditedTimeSlots([{
                                                    startAt: startDate,
                                                    endAt: endDate,
                                                    duration: Math.round((endDate.getTime() - startDate.getTime()) / 60000),
                                                  }]);
                                                }}
                                                label="Select Start Time"
                                                type="start"
                                              />
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {/* End Date & Time */}
                                        <div className="space-y-4">
                                          <div className="space-y-2">
                                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">End Date & Time</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                              <div className="px-3 py-2.5 border-2 rounded-lg bg-gray-50" style={{ borderColor: COLORS.border }}>
                                                <p className="text-sm sm:text-sm font-semibold text-gray-900">
                                                  {(editedBooking.endAt !== undefined && editedBooking.endAt !== null)
                                                    ? formatDate(new Date(editedBooking.endAt))
                                                    : (selectedBooking?.endAt
                                                      ? formatDate(new Date(selectedBooking.endAt))
                                                      : 'No date selected')}
                                                </p>
                            </div>
                                              <TimeSlotSelector
                                                selectedTime={(editedBooking.endAt !== undefined && editedBooking.endAt !== null) ? editedBooking.endAt : (selectedBooking.endAt || new Date())}
                                                onTimeSelect={(hour, minute) => {
                                                  // Use existing date or create new one
                                                  const baseDate = editedBooking.endAt || selectedBooking.endAt || new Date();
                                                  const endDate = new Date(baseDate);
                                                  endDate.setHours(hour, minute, 0, 0);
                                                  
                                                  // Ensure we have a start date too
                                                  const startDate = editedBooking.startAt || selectedBooking?.startAt || new Date(endDate);
                                                  if (startDate > endDate) {
                                                    // If start is after end, adjust start to same date as end
                                                    const adjustedStart = new Date(endDate);
                                                    adjustedStart.setHours(0, 0, 0, 0);
                                                    setEditedBooking({
                                                      ...editedBooking,
                                                      startAt: adjustedStart,
                                                      endAt: endDate,
                                                    });
                                                    
                                                    setEditedTimeSlots([{
                                                      startAt: adjustedStart,
                                                      endAt: endDate,
                                                      duration: Math.round((endDate.getTime() - adjustedStart.getTime()) / 60000),
                                                    }]);
                                                  } else {
                                                    setEditedBooking({
                                                      ...editedBooking,
                                                      endAt: endDate,
                                                    });
                                                    
                                                    setEditedTimeSlots([{
                                                      startAt: new Date(startDate),
                                                      endAt: endDate,
                                                      duration: Math.round((endDate.getTime() - new Date(startDate).getTime()) / 60000),
                                                    }]);
                                                  }
                                                }}
                                                label="Select End Time"
                                                type="end"
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                // View mode: Show read-only date range
                                <div className="p-3 bg-gray-50 rounded-lg border" style={{ borderColor: COLORS.border }}>
                                  <p className="font-semibold text-gray-900">
                                    Start: {selectedBooking?.startAt ? formatDate(selectedBooking.startAt) : 'N/A'} at {selectedBooking?.startAt ? formatTime(selectedBooking.startAt) : 'N/A'}
                                  </p>
                                  {selectedBooking?.endAt && (
                                    <p className="font-semibold text-gray-900 mt-1">
                                      End: {formatDate(selectedBooking.endAt)} at {formatTime(selectedBooking.endAt)}
                                </p>
                              )}
                                  <p className="text-sm text-gray-600 mt-2">
                                {(() => {
                                      if (!selectedBooking?.startAt) return 'No date selected';
                                      const startDate = new Date(selectedBooking.startAt);
                                      const endDate = selectedBooking?.endAt ? new Date(selectedBooking.endAt) : startDate;
                                  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
                                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                  return `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
                                })()}
                              </p>
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="md:col-span-2 space-y-1">
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Selected Dates & Times</label>
                            </div>
                            {isEditMode ? (
                              // Edit mode: Show calendar and time selection
                              <div className="mt-2 space-y-6">
                                {/* Calendar */}
                                <div className="p-6 rounded-xl border-2 shadow-sm" style={{ background: COLORS.accent, borderColor: COLORS.secondary, borderRadius: '12px' }}>
                                  <div className="mb-4">
                                    <div className="flex items-center justify-between mb-1">
                                      <h4 className="text-base font-semibold" style={{ color: COLORS.primary }}>
                                        <i className="fas fa-calendar-alt mr-2"></i>
                                        Select Dates
                                      </h4>
                                      <p className="text-xs" style={{ color: COLORS.primary, opacity: 0.6 }}>
                                        Click to add/remove dates
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between mb-5">
                                    <button
                                      onClick={() => navigateCalendarMonth('prev')}
                                      className="w-10 h-10 flex items-center justify-center rounded-lg transition-all hover:scale-105"
                                      style={{ 
                                        color: COLORS.primary,
                                        background: COLORS.white,
                                        border: `1px solid ${COLORS.secondary}`,
                                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.background = COLORS.primaryLight;
                                        e.currentTarget.style.borderColor = COLORS.primary;
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.background = COLORS.white;
                                        e.currentTarget.style.borderColor = COLORS.secondary;
                                      }}
                                      title="Previous month"
                                    >
                                      <i className="fas fa-chevron-left text-sm"></i>
                                    </button>
                                    <h3 className="text-lg font-bold" style={{ color: COLORS.primary }}>
                                      {new Date(calendarYear, calendarMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                    </h3>
                                    <button
                                      onClick={() => navigateCalendarMonth('next')}
                                      className="w-10 h-10 flex items-center justify-center rounded-lg transition-all hover:scale-105"
                                      style={{ 
                                        color: COLORS.primary,
                                        background: COLORS.white,
                                        border: `1px solid ${COLORS.secondary}`,
                                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.background = COLORS.primaryLight;
                                        e.currentTarget.style.borderColor = COLORS.primary;
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.background = COLORS.white;
                                        e.currentTarget.style.borderColor = COLORS.secondary;
                                      }}
                                      title="Next month"
                                    >
                                      <i className="fas fa-chevron-right text-sm"></i>
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-7 gap-2 mb-3">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                      <div key={day} className="text-center text-xs font-bold py-2" style={{ color: COLORS.primary, opacity: 0.7 }}>
                                        {day}
                                      </div>
                                    ))}
                                  </div>
                                  <div className="grid grid-cols-7 gap-2">
                                    {getCalendarDays().map((dayInfo, idx) => {
                                      const today = new Date();
                                      today.setHours(0, 0, 0, 0);
                                      const isPast = dayInfo.date < today;
                                      
                                      return (
                                        <button
                                          key={idx}
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                            if (dayInfo.isCurrentMonth && !isPast) {
                                              handleCalendarDateClick(dayInfo.date);
                                            }
                                          }}
                                          disabled={!dayInfo.isCurrentMonth || isPast}
                                          className={`
                                            aspect-square flex items-center justify-center text-sm font-medium rounded-lg transition-all
                                            ${!dayInfo.isCurrentMonth ? 'opacity-30' : ''}
                                            ${isPast ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                                          `}
                                          style={{
                                            border: dayInfo.isToday 
                                              ? `2px solid ${COLORS.primary}` 
                                              : dayInfo.isSelected
                                                ? 'none'
                                                : `1px solid ${COLORS.secondary}`,
                                            borderRadius: '6px',
                                            background: dayInfo.isSelected 
                                              ? `linear-gradient(135deg, ${COLORS.primary} 0%, #5c4032 100%)`
                                              : dayInfo.isToday 
                                                ? COLORS.primaryLight 
                                                : COLORS.white,
                                            color: dayInfo.isSelected ? COLORS.white : COLORS.primary,
                                            fontWeight: dayInfo.isToday || dayInfo.isSelected ? 600 : 500,
                                            boxShadow: dayInfo.isSelected 
                                              ? '0 4px 12px rgba(67, 47, 33, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)' 
                                              : dayInfo.isToday
                                                ? '0 2px 4px rgba(67, 47, 33, 0.1)'
                                                : 'none',
                                            transition: 'all 0.2s ease',
                                          }}
                                          onMouseEnter={(e) => {
                                            if (!isPast && dayInfo.isCurrentMonth && !dayInfo.isSelected) {
                                              e.currentTarget.style.borderColor = COLORS.primary;
                                              e.currentTarget.style.background = COLORS.primaryLight;
                                              e.currentTarget.style.transform = 'scale(1.05)';
                                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(67, 47, 33, 0.15)';
                                            }
                                          }}
                                          onMouseLeave={(e) => {
                                            if (!isPast && dayInfo.isCurrentMonth && !dayInfo.isSelected) {
                                              e.currentTarget.style.borderColor = dayInfo.isToday ? COLORS.primary : COLORS.secondary;
                                              e.currentTarget.style.background = dayInfo.isToday ? COLORS.primaryLight : COLORS.white;
                                              e.currentTarget.style.transform = 'scale(1)';
                                              e.currentTarget.style.boxShadow = dayInfo.isToday ? '0 2px 4px rgba(67, 47, 33, 0.1)' : 'none';
                                            }
                                          }}
                                          onMouseDown={(e) => {
                                            if (!isPast && dayInfo.isCurrentMonth) {
                                              e.currentTarget.style.transform = 'scale(0.95)';
                                            }
                                          }}
                                          onMouseUp={(e) => {
                                            e.currentTarget.style.transform = 'scale(1)';
                                          }}
                                        >
                                          {dayInfo.day > 0 ? dayInfo.day : ''}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Selected Time Slots Display */}
                                {editedTimeSlots.length > 0 && (
                                  <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-base font-semibold" style={{ color: COLORS.primary }}>
                                        <i className="fas fa-check-circle mr-2"></i>
                                        Selected Times
                                      </h4>
                                      <span className="text-xs px-3 py-1 rounded-full" style={{ background: COLORS.primaryLight, color: COLORS.primary }}>
                                        {editedTimeSlots.length} {editedTimeSlots.length === 1 ? 'time slot' : 'time slots'}
                                      </span>
                                    </div>
                                    {(() => {
                                      const slotsByDate: Record<string, Array<{ slot: typeof editedTimeSlots[0]; index: number }>> = {};
                                      editedTimeSlots.forEach((slot, index) => {
                                        const dateKey = formatDate(slot.startAt);
                                        if (!slotsByDate[dateKey]) {
                                          slotsByDate[dateKey] = [];
                                        }
                                        slotsByDate[dateKey]!.push({ slot, index });
                                      });

                                      return Object.entries(slotsByDate).map(([date, slots]) => (
                                        <div key={date} className="p-4 bg-white rounded-xl border-2 shadow-sm" style={{ borderColor: COLORS.primaryLight, borderRadius: '12px' }}>
                                          <div className="flex items-center gap-2 mb-3">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                                              <i className="fas fa-calendar-day text-sm" style={{ color: COLORS.primary }}></i>
                                            </div>
                                            <p className="font-bold text-base" style={{ color: COLORS.primary }}>{date}</p>
                                          </div>
                                          <div className="space-y-2">
                                            {slots.map((item) => (
                                              <div key={item.index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border transition-all hover:shadow-sm" style={{ borderColor: COLORS.border, borderRadius: '8px' }}>
                                                <div className="flex items-center gap-3">
                                                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                                                    <i className="fas fa-clock text-sm" style={{ color: COLORS.primary }}></i>
                                                  </div>
                                                  <div>
                                                    <p className="text-sm font-semibold text-gray-900">
                                                      {formatTime(item.slot.startAt)} - {formatTime(item.slot.endAt)}
                                                    </p>
                                                    <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                                                      <i className="fas fa-stopwatch"></i>
                                                      {item.slot.duration} minutes
                                                    </p>
                                                  </div>
                                                </div>
                                                <button
                                                  onClick={() => removeTimeSlot(item.index)}
                                                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-all hover:scale-105"
                                                  style={{ borderRadius: '6px' }}
                                                  title="Remove time slot"
                                                >
                                                  <i className="fas fa-trash text-sm"></i>
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                )}
                              </div>
                            ) : (
                              // View mode: Show read-only time slots
                              <div className="mt-2 space-y-3">
                                {selectedBooking.timeSlots && selectedBooking.timeSlots.length > 0 ? (
                                  (() => {
                                    const slotsByDate: Record<string, typeof selectedBooking.timeSlots> = {};
                                    selectedBooking.timeSlots.forEach((slot) => {
                                      const slotStart = new Date(slot.startAt);
                                      const dateKey = formatDate(slotStart);
                                      if (!slotsByDate[dateKey]) {
                                        slotsByDate[dateKey] = [];
                                      }
                                      slotsByDate[dateKey]!.push(slot);
                                    });

                                    return Object.entries(slotsByDate).map(([date, slots]) => (
                                      <div key={date} className="p-3 bg-gray-50 rounded-lg border" style={{ borderColor: COLORS.border }}>
                                        <p className="font-bold text-base mb-2" style={{ color: COLORS.primary }}>{date}</p>
                                        <div className="space-y-2">
                                          {slots!.map((slot) => {
                                            const slotStart = new Date(slot.startAt);
                                            const slotEnd = new Date(slot.endAt);
                                            return (
                                              <div key={slot.id} className="flex items-center justify-between py-1.5 px-3 bg-white rounded border" style={{ borderColor: COLORS.border }}>
                                                <div className="flex items-center gap-2">
                                                  <i className="fas fa-clock text-xs" style={{ color: COLORS.primary }}></i>
                                                  <div>
                                                    <p className="text-sm font-medium text-gray-900">
                                                      {formatTime(slotStart)} - {formatTime(slotEnd)}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                      {slot.duration} min
                                                    </p>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    ));
                                  })()
                                ) : (
                                  <div className="p-3 bg-gray-50 rounded-lg border" style={{ borderColor: COLORS.border }}>
                                    <p className="font-semibold text-gray-900">
                                      {selectedBooking?.startAt ? formatDate(selectedBooking.startAt) : 'N/A'} at {selectedBooking?.startAt ? formatTime(selectedBooking.startAt) : 'N/A'}
                                    </p>
                                    {selectedBooking?.endAt && (
                                      <p className="text-sm text-gray-600 mt-1">
                                        Through {formatDate(selectedBooking.endAt)} at {formatTime(selectedBooking.endAt)}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Time Selection Modal */}
                        {timeModalOpen && selectedDateForTime && (
                          <div 
                            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity backdrop-blur-sm" 
                            onClick={() => setTimeModalOpen(false)}
                            style={{ animation: 'fadeIn 0.2s ease' }}
                          >
                            <div 
                              className="bg-white rounded-xl shadow-2xl max-w-3xl w-full mx-2 sm:mx-4 max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95" 
                              style={{ 
                                borderRadius: '16px',
                                border: `1px solid ${COLORS.secondary}`,
                                animation: 'slideUp 0.3s ease'
                              }} 
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="p-6 border-b" style={{ borderColor: COLORS.secondary, background: COLORS.accent }}>
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                                        <i className="fas fa-clock text-lg" style={{ color: COLORS.primary }}></i>
                                      </div>
                                      <h3 className="text-xl font-bold" style={{ color: COLORS.primary }}>Select Times</h3>
                                    </div>
                                    <p className="text-sm font-medium mb-1" style={{ color: COLORS.primary }}>
                                      {new Date(selectedDateForTime).toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                      })}
                                    </p>
                                    <div className="flex items-center gap-2 mt-3 p-3 rounded-lg" style={{ background: COLORS.white, border: `1px solid ${COLORS.secondary}` }}>
                                      <i className="fas fa-info-circle text-sm" style={{ color: COLORS.primary }}></i>
                                      <p className="text-xs" style={{ color: COLORS.primary, opacity: 0.8 }}>
                                        <strong>Tip:</strong> Click any time to select 30 minutes. Use the buttons to choose 60 minutes or remove.
                                      </p>
                                    </div>
                                    {(() => {
                                      const dateStr = selectedDateForTime;
                                      const [y, m, d] = dateStr.split('-').map(Number);
                                      const countForDate = editedTimeSlots.filter(ts => {
                                        const tsDate = new Date(ts.startAt);
                                        return (
                                          tsDate.getFullYear() === y &&
                                          tsDate.getMonth() + 1 === m &&
                                          tsDate.getDate() === d
                                        );
                                      }).length;

                                      const previousForDate = (selectedBooking.timeSlots || []).filter(ts => {
                                        const tsDate = new Date(ts.startAt);
                                        return (
                                          tsDate.getFullYear() === y &&
                                          tsDate.getMonth() + 1 === m &&
                                          tsDate.getDate() === d
                                        );
                                      });

                                      const disabledUnselect = countForDate === 0;
                                      const disabledRestore = previousForDate.length === 0;

                                      return (
                                        <div className="flex items-center justify-between mt-3 gap-2">
                                          <span className="text-xs px-3 py-1 rounded-full" style={{ background: COLORS.primaryLight, color: COLORS.primary }}>
                                            {countForDate} {countForDate === 1 ? 'time selected' : 'times selected'}
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <button
                                              onClick={() => {
                                                const [yy, mm, dd] = selectedDateForTime!.split('-').map(Number);
                                                const cleared = editedTimeSlots.filter(ts => {
                                                  const tsDate = new Date(ts.startAt);
                                                  return !(
                                                    tsDate.getFullYear() === yy &&
                                                    tsDate.getMonth() + 1 === mm &&
                                                    tsDate.getDate() === dd
                                                  );
                                                });
                                                setEditedTimeSlots(cleared);
                                              }}
                                              disabled={disabledUnselect}
                                              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all ${disabledUnselect ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                                              style={{
                                                background: disabledUnselect ? COLORS.secondary : COLORS.white,
                                                color: COLORS.primary,
                                                border: `1px solid ${COLORS.secondary}`,
                                              }}
                                              title="Unselect all times for this date"
                                            >
                                              <i className="fas fa-eraser mr-2"></i>
                                              Unselect all times
                                            </button>
                                            <button
                                              onClick={() => {
                                                const [yy, mm, dd] = selectedDateForTime!.split('-').map(Number);
                                                // Remove current date's edited slots
                                                const kept = editedTimeSlots.filter(ts => {
                                                  const tsDate = new Date(ts.startAt);
                                                  return !(
                                                    tsDate.getFullYear() === yy &&
                                                    tsDate.getMonth() + 1 === mm &&
                                                    tsDate.getDate() === dd
                                                  );
                                                });
                                                // Add back previous (saved) slots for this date
                                                const restored = previousForDate.map(ts => {
                                                  const s = new Date(ts.startAt);
                                                  const e = new Date(ts.endAt);
                                                  return { startAt: s, endAt: e, duration: ts.duration } as typeof editedTimeSlots[number];
                                                });
                                                setEditedTimeSlots([...kept, ...restored]);
                                              }}
                                              disabled={disabledRestore}
                                              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all ${disabledRestore ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                                              style={{
                                                background: disabledRestore ? COLORS.secondary : COLORS.white,
                                                color: COLORS.primary,
                                                border: `1px solid ${COLORS.secondary}`,
                                              }}
                                              title="Restore previously saved times for this date"
                                            >
                                              <i className="fas fa-undo mr-2"></i>
                                              Restore previous times
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                  <button
                                    onClick={() => setTimeModalOpen(false)}
                                    className="text-gray-500 hover:text-gray-700 transition-all hover:scale-110"
                                    style={{ 
                                      background: COLORS.white,
                                      border: `1px solid ${COLORS.secondary}`,
                                      borderRadius: '8px',
                                      fontSize: '18px',
                                      padding: '8px',
                                      cursor: 'pointer',
                                      width: '36px',
                                      height: '36px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                    title="Close"
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = COLORS.primaryLight;
                                      e.currentTarget.style.borderColor = COLORS.primary;
                                      e.currentTarget.style.color = COLORS.primary;
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = COLORS.white;
                                      e.currentTarget.style.borderColor = COLORS.secondary;
                                      e.currentTarget.style.color = '#6b7280';
                                    }}
                                  >
                                    <i className="fas fa-times"></i>
                                  </button>
                                </div>
                              </div>
                              <div className="flex-1 overflow-y-auto p-4">
                                <div className="flex flex-col gap-3">
                                  {generateTimeSlots().map((timeSlot, idx) => {
                                    const is30Selected = isTimeSlotSelected(timeSlot, 30);
                                    const is60Selected = isTimeSlotSelected(timeSlot, 60);
                                    const isSelected = is30Selected || is60Selected;
                                    
                                    return (
                                      <div
                                        key={idx}
                                        className="flex items-center justify-between rounded-lg cursor-pointer transition-all relative group"
                                        style={{
                                          border: `2px solid ${isSelected ? COLORS.primary : COLORS.secondary}`,
                                          borderRadius: '8px',
                                          background: isSelected ? COLORS.primaryLight : COLORS.white,
                                          boxShadow: isSelected 
                                            ? '0 2px 8px rgba(67, 47, 33, 0.15)' 
                                            : '0 1px 3px rgba(0, 0, 0, 0.05)',
                                          padding: '14px 16px',
                                          minHeight: '64px',
                                          transition: 'all 0.2s ease',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          gap: '16px',
                                        }}
                                        onClick={(e) => {
                                          // If already selected, unselect it (remove whichever duration is selected)
                                          if (isSelected) {
                                            // Find and remove the selected time slot
                                            if (is30Selected) {
                                              handleTimeSlotSelect(timeSlot, 30);
                                            } else if (is60Selected) {
                                              handleTimeSlotSelect(timeSlot, 60);
                                            }
                                          } else {
                                            // Default to 30 minutes when clicking an unselected time slot row
                                            handleTimeSlotSelect(timeSlot, 30);
                                          }
                                        }}
                                        onMouseEnter={(e) => {
                                          if (isSelected) {
                                            // Show hover effect for selected items (to indicate they can be unselected)
                                            e.currentTarget.style.borderColor = COLORS.primary;
                                            e.currentTarget.style.boxShadow = '0 4px 16px rgba(67, 47, 33, 0.25)';
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            // Slightly darker on hover to show it's interactive
                                            e.currentTarget.style.background = '#fad6e6';
                                          } else {
                                            e.currentTarget.style.borderColor = COLORS.primary;
                                            e.currentTarget.style.background = COLORS.primaryLight;
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(67, 47, 33, 0.2)';
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          if (isSelected) {
                                            e.currentTarget.style.borderColor = COLORS.primary;
                                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(67, 47, 33, 0.15)';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.background = COLORS.primaryLight;
                                          } else {
                                            e.currentTarget.style.borderColor = COLORS.secondary;
                                            e.currentTarget.style.background = COLORS.white;
                                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                          }
                                        }}
                                        onMouseDown={(e) => {
                                          e.currentTarget.style.transform = 'translateY(0) scale(0.98)';
                                        }}
                                        onMouseUp={(e) => {
                                          if (isSelected) {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                          } else {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                          }
                                        }}
                                      >
                                        <div className="flex items-center gap-3 flex-1">
                                          <div 
                                            className="w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-sm"
                                            style={{ 
                                              background: isSelected ? COLORS.primary : COLORS.secondary,
                                              color: isSelected ? COLORS.white : COLORS.primary,
                                              transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                                            }}
                                          >
                                            <i className="fas fa-clock text-base"></i>
                                          </div>
                                          <div className="flex-1">
                                            <span 
                                              className="font-bold block mb-0.5" 
                                              style={{ 
                                                color: COLORS.primary, 
                                                fontWeight: 700, 
                                                fontSize: '17px',
                                                letterSpacing: '0.02em',
                                                display: 'block'
                                              }}
                                            >
                                              {timeSlot.time}
                                            </span>
                                            {isSelected && (
                                              <span 
                                                className="text-xs px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1 mt-1"
                                                style={{
                                                  background: COLORS.primary,
                                                  color: COLORS.white,
                                                  fontSize: '10px',
                                                  letterSpacing: '0.05em',
                                                  textTransform: 'uppercase'
                                                }}
                                              >
                                                <i className="fas fa-check text-xs"></i>
                                                Selected
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex gap-2">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleTimeSlotSelect(timeSlot, 30);
                                            }}
                                            className="px-4 py-2 rounded-lg font-semibold transition-all cursor-pointer relative"
                                            style={{
                                              background: is30Selected ? COLORS.primary : COLORS.secondary,
                                              color: is30Selected ? COLORS.white : COLORS.primary,
                                              borderRadius: '6px',
                                              minWidth: '60px',
                                              textAlign: 'center',
                                              fontSize: '12px',
                                              fontWeight: 600,
                                              boxShadow: is30Selected ? '0 2px 4px rgba(67, 47, 33, 0.2)' : 'none',
                                            }}
                                            onMouseEnter={(e) => {
                                              if (!is30Selected) {
                                                e.currentTarget.style.background = COLORS.primaryLight;
                                                e.currentTarget.style.transform = 'scale(1.05)';
                                              }
                                            }}
                                            onMouseLeave={(e) => {
                                              if (!is30Selected) {
                                                e.currentTarget.style.background = COLORS.secondary;
                                                e.currentTarget.style.transform = 'scale(1)';
                                              }
                                            }}
                                            onMouseDown={(e) => {
                                              e.currentTarget.style.transform = 'scale(0.95)';
                                            }}
                                            onMouseUp={(e) => {
                                              e.currentTarget.style.transform = is30Selected ? 'scale(1)' : 'scale(1.05)';
                                            }}
                                          >
                                            30 min
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleTimeSlotSelect(timeSlot, 60);
                                            }}
                                            className="px-4 py-2 rounded-lg font-semibold transition-all cursor-pointer"
                                            style={{
                                              background: is60Selected ? COLORS.primary : COLORS.secondary,
                                              color: is60Selected ? COLORS.white : COLORS.primary,
                                              borderRadius: '6px',
                                              minWidth: '60px',
                                              textAlign: 'center',
                                              fontSize: '12px',
                                              fontWeight: 600,
                                              boxShadow: is60Selected ? '0 2px 4px rgba(67, 47, 33, 0.2)' : 'none',
                                            }}
                                            onMouseEnter={(e) => {
                                              if (!is60Selected) {
                                                e.currentTarget.style.background = COLORS.primaryLight;
                                                e.currentTarget.style.transform = 'scale(1.05)';
                                              }
                                            }}
                                            onMouseLeave={(e) => {
                                              if (!is60Selected) {
                                                e.currentTarget.style.background = COLORS.secondary;
                                                e.currentTarget.style.transform = 'scale(1)';
                                              }
                                            }}
                                            onMouseDown={(e) => {
                                              e.currentTarget.style.transform = 'scale(0.95)';
                                            }}
                                            onMouseUp={(e) => {
                                              e.currentTarget.style.transform = is60Selected ? 'scale(1)' : 'scale(1.05)';
                                            }}
                                          >
                                            60 min
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="md:col-span-2 space-y-4">
                          <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Price Breakdown</label>
                          <div className="bg-gray-50 rounded-lg p-4 border" style={{ borderColor: COLORS.border }}>
                            {(() => {
                              // Build a booking-like object for calculation. In edit mode, use editedTimeSlots length as quantity for non-housesitting services.
                              const currentService = editedBooking.service || selectedBooking?.service || '';
                              const isHouse = isHouseSittingService(currentService);
                              
                              // Check if dates/times have been cleared (service changed)
                              const hasDates = isEditMode 
                                ? (editedBooking.startAt !== undefined && editedBooking.endAt !== undefined && editedBooking.startAt !== null && editedBooking.endAt !== null)
                                : (selectedBooking?.startAt && selectedBooking?.endAt);
                              
                              const hasTimeSlots = isEditMode 
                                ? editedTimeSlots.length > 0
                                : (selectedBooking?.timeSlots && selectedBooking.timeSlots.length > 0);
                              
                              // If service was changed and no dates/times selected yet, return $0
                              if (isEditMode && !hasDates && !hasTimeSlots && editedBooking.service) {
                                return (
                                  <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                      <p className="text-sm text-gray-500">Please select dates and times</p>
                                      <p className="text-lg font-bold" style={{ color: COLORS.primary }}>$0.00</p>
                                    </div>
                                  </div>
                                );
                              }
                              
                              // If no dates or time slots available at all, show $0
                              if (!hasDates && !hasTimeSlots) {
                                return (
                                  <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                      <p className="text-sm text-gray-500">No dates or times selected</p>
                                      <p className="text-lg font-bold" style={{ color: COLORS.primary }}>$0.00</p>
                                    </div>
                                  </div>
                                );
                              }
                              
                              const calcInput = isEditMode
                                ? {
                                    service: currentService,
                                    startAt: editedBooking.startAt !== undefined && editedBooking.startAt !== null ? editedBooking.startAt : (hasDates ? selectedBooking?.startAt : new Date()),
                                    endAt: editedBooking.endAt !== undefined && editedBooking.endAt !== null ? editedBooking.endAt : (hasDates ? selectedBooking?.endAt : new Date()),
                                    pets: editedPets.length > 0 ? editedPets : selectedBooking?.pets || [],
                                    quantity: isHouse ? (hasDates ? (selectedBooking?.quantity ?? 1) : 1) : Math.max(editedTimeSlots.length, 0),
                                    afterHours: editedBooking.afterHours !== undefined ? editedBooking.afterHours : (selectedBooking?.afterHours ?? false),
                                    holiday: editedBooking.holiday !== undefined ? editedBooking.holiday : (selectedBooking?.holiday ?? false),
                                    totalPrice: editedBooking.totalPrice !== undefined ? editedBooking.totalPrice : (selectedBooking?.totalPrice ?? undefined),
                                    timeSlots: editedTimeSlots.length > 0 ? editedTimeSlots.map(ts => ({ startAt: ts.startAt, endAt: ts.endAt, duration: ts.duration })) : (hasTimeSlots ? (selectedBooking?.timeSlots || []) : []),
                                  }
                                : selectedBooking ? { ...selectedBooking, service: currentService } : {
                                    service: currentService || '',
                                    firstName: '',
                                    lastName: '',
                                    phone: '',
                                    email: '',
                                    address: '',
                                    pets: [],
                                    quantity: 1,
                                    afterHours: false,
                                    holiday: false,
                                    timeSlots: []
                                  };
                              
                              // Only calculate if we have valid data
                              let breakdown;
                              try {
                                breakdown = calculatePriceBreakdown(calcInput as any);
                              } catch {
                                breakdown = {
                                  total: 0,
                                  breakdown: [],
                                };
                              }
                              return (
                                <div className="space-y-3">
                                  {breakdown.breakdown.map((item, index) => (
                                    <div key={index} className="flex justify-between items-center">
                                      <div>
                                        <p className="font-medium text-gray-900">{item.label}</p>
                                        {item.description && (
                                          <p className="text-sm text-gray-600">{item.description}</p>
                                        )}
                                      </div>
                                      <p className="font-semibold text-gray-900">${item.amount.toFixed(2)}</p>
                                    </div>
                                  ))}
                                      <div className="border-t pt-3 mt-3" style={{ borderColor: COLORS.border }}>
                                      <div className="flex justify-between items-center">
                                        <p className="text-lg font-bold" style={{ color: COLORS.primary }}>Total</p>
                                        <p className="text-2xl font-bold" style={{ color: COLORS.primary }}>${breakdown.total.toFixed(2)}</p>
                                      </div>
                                    </div>
                                </div>
                              );
                            })()}
                          </div>
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
                          const displayPets = isEditMode ? editedPets : selectedBooking.pets;
                          const petCounts: Record<string, number> = {};
                          displayPets.forEach(pet => {
                            petCounts[pet.species] = (petCounts[pet.species] || 0) + 1;
                          });
                          return Object.entries(petCounts).map(([species, count]) => (
                            <div key={species} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm" style={{ background: COLORS.primaryLight }}>
                                  <i className={`${getPetIcon(species)} text-sm`} style={{ color: COLORS.primary }}></i>
                                </div>
                                <div>
                                  <p className="text-base font-semibold text-gray-900 capitalize">{species}s</p>
                                  <p className="text-xs text-gray-600">Pet Species</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {isEditMode ? (
                                  <>
                                    <button
                                      onClick={() => {
                                        // Remove one pet of this species
                                        const index = editedPets.findIndex(p => p.species === species);
                                        if (index >= 0) {
                                          const updated = [...editedPets];
                                          updated.splice(index, 1);
                                          setEditedPets(updated);
                                        }
                                      }}
                                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-100 transition-colors"
                                      style={{ border: `1px solid ${COLORS.border}` }}
                                      disabled={count <= 0}
                                    >
                                      <i className="fas fa-minus text-xs text-gray-600"></i>
                                    </button>
                                    <p className="text-xl font-bold w-12 text-center" style={{ color: COLORS.primary }}>{count}</p>
                                    <button
                                      onClick={() => {
                                        // Add one pet of this species
                                        setEditedPets([...editedPets, { species }]);
                                      }}
                                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-green-100 transition-colors"
                                      style={{ border: `1px solid ${COLORS.border}` }}
                                    >
                                      <i className="fas fa-plus text-xs text-gray-600"></i>
                                    </button>
                                  </>
                                ) : (
                                  <div className="text-right">
                                    <p className="text-xl font-bold" style={{ color: COLORS.primary }}>{count}</p>
                                    <p className="text-xs text-gray-600">Total</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ));
                        })()}
                        {isEditMode && (
                          <div className="mt-4 p-4 bg-gray-50 rounded-lg border" style={{ borderColor: COLORS.border }}>
                            <div className="flex items-center gap-2 mb-3">
                              <i className="fas fa-plus-circle" style={{ color: COLORS.primary }}></i>
                              <p className="font-semibold" style={{ color: COLORS.primary }}>Add Pet Type</p>
                            </div>
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  setEditedPets([...editedPets, { species: e.target.value }]);
                                  e.target.value = "";
                                }
                              }}
                              className="w-full px-4 py-2 border-2 rounded-lg font-semibold text-sm"
                              style={{ borderColor: COLORS.border }}
                            >
                              <option value="">Select pet type...</option>
                              <option value="dog">Dog</option>
                              <option value="cat">Cat</option>
                              <option value="bird">Bird</option>
                              <option value="reptile">Reptile</option>
                              <option value="farm animal">Farm Animal</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                        )}
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-2">
                            <i className="fas fa-info-circle text-blue-600"></i>
                            <p className="font-semibold text-blue-800">
                              Total Pets: {formatPetsByQuantity(isEditMode ? editedPets : selectedBooking.pets)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Additional Notes */}
                    <div className="bg-white border-2 rounded-xl p-6 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                          <i className="fas fa-sticky-note text-sm" style={{ color: COLORS.primary }}></i>
                        </div>
                        <h3 className="text-lg font-bold" style={{ color: COLORS.primary }}>Additional Notes</h3>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg border" style={{ borderColor: COLORS.border }}>
                        {(() => {
                          // Check both selectedBooking.notes and also check the original booking from the array
                          const bookingFromArray = bookings.find(b => b.id === selectedBooking.id);
                          
                          // Debug logging
                          console.log('Notes display check:', {
                            selectedBookingId: selectedBooking.id,
                            selectedBookingNotes: selectedBooking.notes,
                            selectedBookingNotesType: typeof selectedBooking.notes,
                            bookingFromArrayExists: !!bookingFromArray,
                            bookingFromArrayNotes: bookingFromArray?.notes,
                            bookingFromArrayNotesType: typeof bookingFromArray?.notes,
                            allBookingsLength: bookings.length,
                          });
                          
                          // Try multiple sources for notes
                          let notesValue = selectedBooking.notes;
                          if ((!notesValue || notesValue === null || notesValue === '') && bookingFromArray) {
                            notesValue = bookingFromArray.notes;
                          }
                          
                          // Also check if notes might be stored in editedBooking
                          if ((!notesValue || notesValue === null || notesValue === '') && editedBooking.notes) {
                            notesValue = editedBooking.notes;
                          }
                          
                          // Convert to string and check
                          let notesString = '';
                          if (notesValue != null && notesValue !== undefined && notesValue !== '') {
                            notesString = String(notesValue).trim();
                          }
                          
                          const hasNotes = notesString.length > 0;
                          
                          console.log('Final notes check:', {
                            notesValue,
                            notesString,
                            hasNotes,
                          });
                          
                          if (hasNotes) {
                            return (
                              <div>
                                <p className="text-base text-gray-900 whitespace-pre-wrap">{notesString}</p>
                              </div>
                            );
                          } else {
                            return (
                              <p className="text-base text-gray-500 italic">No additional notes provided</p>
                            );
                          }
                        })()}
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
                      {isEditMode ? (
                        <div className="space-y-4">
                          {editedSitterId && (() => {
                            const assignedSitter = sitters.find(s => s.id === editedSitterId);
                            return assignedSitter ? (
                              <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm bg-green-100">
                                  <i className="fas fa-user-check text-green-600 text-lg"></i>
                                </div>
                                <div className="flex-1">
                                  <p className="font-bold text-green-800">{assignedSitter.firstName} {assignedSitter.lastName}</p>
                                  <p className="text-sm text-green-600">Assigned Sitter</p>
                                </div>
                              </div>
                            ) : null;
                          })()}
                          <select
                            value={editedSitterId || ""}
                            onChange={(e) => {
                              setEditedSitterId(e.target.value || null);
                            }}
                            className="w-full px-4 py-3 border-2 rounded-lg font-semibold"
                            style={{ borderColor: COLORS.border }}
                          >
                            <option value="">No sitter assigned</option>
                            {sitters.map(sitter => (
                              <option key={sitter.id} value={sitter.id}>
                                {sitter.firstName} {sitter.lastName}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <>
                          {selectedBooking.sitter ? (() => {
                            const assignedSitter = selectedBooking.sitter!;
                            return (
                              <div className="space-y-4">
                                <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm bg-green-100">
                                    <i className="fas fa-user-check text-green-600 text-lg"></i>
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-bold text-green-800">
                                      {assignedSitter.firstName} {assignedSitter.lastName}
                                    </p>
                                    <p className="text-sm text-green-600">Assigned Sitter</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => getSitterRecommendations(selectedBooking.id)}
                                  disabled={loadingRecommendations}
                                  className="w-full px-4 py-3 text-sm font-bold rounded-lg hover:opacity-90 transition-all mb-2"
                                  style={{ background: "#8b5cf6", color: "white" }}
                                >
                                  <i className={`fas fa-lightbulb mr-2 ${loadingRecommendations ? 'fa-spin' : ''}`}></i>
                                  {loadingRecommendations ? "Loading..." : "Get Better Recommendations"}
                                </button>
                                <button
                                  onClick={() => handleSitterAssign(selectedBooking.id, "")}
                                  className="w-full px-4 py-3 text-sm font-semibold border-2 rounded-lg hover:bg-gray-50 transition-colors"
                                  style={{ color: COLORS.primary, borderColor: COLORS.border }}
                                >
                                  <i className="fas fa-times mr-2"></i>Remove Sitter
                                </button>
                              </div>
                            );
                          })() : null}
                          {!selectedBooking.sitter && (
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
                              
                              <button
                                onClick={() => openSitterPoolModal(selectedBooking.id)}
                                className="w-full px-4 py-3 text-sm font-bold rounded-lg hover:opacity-90 transition-all mb-2"
                                style={{ background: COLORS.primary, color: COLORS.primaryLight }}
                              >
                                <i className="fas fa-users mr-2"></i>Create Sitter Pool Offer
                              </button>
                              <button
                                onClick={() => getSitterRecommendations(selectedBooking.id)}
                                disabled={loadingRecommendations}
                                className="w-full px-4 py-3 text-sm font-bold rounded-lg hover:opacity-90 transition-all"
                                style={{ background: "#8b5cf6", color: "white" }}
                              >
                                <i className={`fas fa-lightbulb mr-2 ${loadingRecommendations ? 'fa-spin' : ''}`}></i>
                                {loadingRecommendations ? "Loading..." : "Get Recommendations"}
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Sitter Recommendations */}
                    {showRecommendations && sitterRecommendations.length > 0 && (
                      <div className="bg-white border-2 rounded-xl p-6 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                              <i className="fas fa-lightbulb text-sm" style={{ color: COLORS.primary }}></i>
                            </div>
                            <h3 className="text-lg font-bold" style={{ color: COLORS.primary }}>Recommended Sitters</h3>
                          </div>
                          <button
                            onClick={() => setShowRecommendations(false)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="space-y-3">
                          {sitterRecommendations.slice(0, 5).map((rec) => (
                            <div
                              key={rec.sitterId}
                              className="p-4 border rounded-lg hover:shadow-md transition-all"
                              style={{ borderColor: COLORS.border }}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="font-bold">
                                  {rec.sitter.firstName} {rec.sitter.lastName}
                                </div>
                                <div className="text-sm font-semibold" style={{ color: COLORS.primary }}>
                                  Score: {rec.score}
                                </div>
                              </div>
                              <div className="text-sm text-gray-600 mb-2">
                                {rec.reasons.join(", ")}
                              </div>
                              {rec.conflicts.length > 0 && (
                                <div className="text-xs text-red-600 mb-2">
                                  Conflicts: {rec.conflicts.length}
                                </div>
                              )}
                              <button
                                onClick={() => handleSitterAssign(selectedBooking.id, rec.sitterId)}
                                className="w-full px-3 py-2 text-sm font-semibold rounded text-white"
                                style={{ background: COLORS.primary }}
                              >
                                Assign
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Booking Tags */}
                    <div className="bg-white border-2 rounded-xl p-6 shadow-sm" style={{ borderColor: COLORS.primaryLight }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                          <i className="fas fa-tags text-sm" style={{ color: COLORS.primary }}></i>
                        </div>
                        <h3 className="text-lg font-bold" style={{ color: COLORS.primary }}>Tags</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {bookingTags.map((tag) => (
                            <span
                              key={tag.id}
                              className="px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2"
                              style={{ background: tag.color || COLORS.primaryLight, color: COLORS.primary }}
                            >
                              {tag.name}
                              <button
                                onClick={() => removeTagFromBooking(selectedBooking.id, tag.id)}
                                className="hover:text-red-600"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              addTagToBooking(selectedBooking.id, e.target.value);
                              e.target.value = "";
                            }
                          }}
                          className="w-full px-4 py-2 border-2 rounded-lg"
                          style={{ borderColor: COLORS.border }}
                        >
                          <option value="">Add a tag...</option>
                          {allTags
                            .filter(tag => !bookingTags.find(bt => bt.id === tag.id))
                            .map(tag => (
                              <option key={tag.id} value={tag.id}>
                                {tag.name}
                              </option>
                            ))}
                        </select>
                      </div>
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
                        {!isEditMode && (
                          <button
                            onClick={() => {
                              setIsEditMode(true);
                              setEditedPets(selectedBooking.pets || []);
                              setEditedSitterId(selectedBooking.sitter?.id || null);
                            }}
                            className="w-full px-4 py-3 text-sm font-semibold border-2 rounded-lg hover:bg-gray-50 transition-colors"
                            style={{ color: COLORS.primary, borderColor: COLORS.border }}
                          >
                            <i className="fas fa-edit mr-2"></i>Edit Booking
                          </button>
                        )}
                        {isEditMode && (
                          <>
                            <button
                              onClick={handleSave}
                              className="w-full px-4 py-3 text-sm font-semibold rounded-lg transition-colors"
                              style={{ background: COLORS.primary, color: COLORS.primaryLight }}
                            >
                              <i className="fas fa-save mr-2"></i>Save Changes
                            </button>
                            <button
                              onClick={handleCancel}
                              className="w-full px-4 py-3 text-sm font-semibold border-2 rounded-lg hover:bg-gray-50 transition-colors"
                              style={{ color: COLORS.primary, borderColor: COLORS.border }}
                            >
                              <i className="fas fa-times mr-2"></i>Cancel
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => {
                            if (!selectedBooking?.id) return;
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
                            if (!selectedBooking) return;
                            const breakdown = calculatePriceBreakdown(selectedBooking);
                            const calculatedTotal = breakdown.total;
                            const message = selectedBooking.service === "Housesitting"
                              ? `Booking Details:\nClient: ${selectedBooking.firstName} ${selectedBooking.lastName}\nService: ${selectedBooking.service}\nStart: ${selectedBooking.startAt ? formatDate(selectedBooking.startAt) : 'N/A'} at ${selectedBooking.startAt ? formatTime(selectedBooking.startAt) : 'N/A'}\nEnd: ${selectedBooking.endAt ? formatDate(selectedBooking.endAt) : 'N/A'} at ${selectedBooking.endAt ? formatTime(selectedBooking.endAt) : 'N/A'}\nPets: ${formatPetsByQuantity(selectedBooking.pets || [])}\nPrice: $${calculatedTotal.toFixed(2)}`
                              : `Booking Details:\nClient: ${selectedBooking.firstName} ${selectedBooking.lastName}\nService: ${selectedBooking.service}\nDate: ${selectedBooking.startAt ? formatDate(selectedBooking.startAt) : 'N/A'}\nTime: ${selectedBooking.startAt ? formatTime(selectedBooking.startAt) : 'N/A'}\nPets: ${formatPetsByQuantity(selectedBooking.pets || [])}\nPrice: $${calculatedTotal.toFixed(2)}`;
                            navigator.clipboard.writeText(message);
                            alert('Booking details copied to clipboard!');
                          }}
                          className="w-full px-4 py-3 text-sm font-semibold border-2 rounded-lg hover:bg-gray-50 transition-colors"
                          style={{ color: COLORS.primary, borderColor: COLORS.border }}
                        >
                          <i className="fas fa-clipboard mr-2"></i>Copy Details
                        </button>
                        
                        <button
                          onClick={() => handleGeneratePaymentLink(selectedBooking)}
                          disabled={generatingPaymentLink}
                          className="w-full px-4 py-3 text-sm font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                          style={{ background: COLORS.primary, color: COLORS.primaryLight }}
                        >
                          <i className={`fas fa-credit-card mr-2 ${generatingPaymentLink ? 'animate-spin' : ''}`}></i>
                          {generatingPaymentLink ? 'Generating...' : 'Generate Payment Link'}
                        </button>
                        
                        <button
                          onClick={() => handleGenerateTipLink(selectedBooking)}
                          disabled={generatingTipLink}
                          className="w-full px-4 py-3 text-sm font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                          style={{ background: COLORS.primaryLight, color: COLORS.primary }}
                        >
                          <i className={`fas fa-gift mr-2 ${generatingTipLink ? 'animate-spin' : ''}`}></i>
                          {generatingTipLink ? 'Generating...' : 'Generate Tip Link'}
                        </button>
                        
                        {selectedBooking.stripePaymentLinkUrl && (
                          <button
                            onClick={async () => {
                              const copied = await copyToClipboard(selectedBooking.stripePaymentLinkUrl!);
                              if (copied) {
                              alert("Payment link copied to clipboard!");
                              } else {
                                setLinkModalContent({
                                  title: 'Payment Link',
                                  link: selectedBooking.stripePaymentLinkUrl!,
                                  details: 'Tap the link below to copy it'
                                });
                                setShowLinkModal(true);
                              }
                            }}
                            className="w-full px-4 py-3 text-sm font-bold rounded-lg hover:opacity-90 transition-all"
                            style={{ background: COLORS.primaryLight, color: COLORS.primary }}
                          >
                            <i className="fas fa-link mr-2"></i>Copy Payment Link
                          </button>
                        )}
                        
                        {selectedBooking.tipLinkUrl && (
                          <button
                            onClick={async () => {
                              const copied = await copyToClipboard(selectedBooking.tipLinkUrl!);
                              if (copied) {
                              alert("Tip link copied to clipboard!");
                              } else {
                                setLinkModalContent({
                                  title: 'Tip Link',
                                  link: selectedBooking.tipLinkUrl!,
                                  details: 'Tap the link below to copy it'
                                });
                                setShowLinkModal(true);
                              }
                            }}
                            className="w-full px-4 py-3 text-sm font-bold rounded-lg hover:opacity-90 transition-all"
                            style={{ background: COLORS.primaryLight, color: COLORS.primary }}
                          >
                            <i className="fas fa-gift mr-2"></i>Copy Tip Link
                          </button>
                        )}
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

        {/* Sitter Pool Selection Modal */}
        {showSitterPoolModal && (
          <div 
            className="fixed inset-0 bg-black flex items-center justify-center p-0 sm:p-4" 
            style={{ 
              alignItems: 'flex-start', 
              paddingTop: '0',
              zIndex: 10001,
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              pointerEvents: 'auto'
            }}
            onClick={(e) => {
              // Only close if clicking the backdrop, not the modal content
              if (e.target === e.currentTarget) {
                setShowSitterPoolModal(false);
              }
            }}
          >
            <div 
              className="bg-white rounded-none sm:rounded-2xl shadow-2xl max-w-2xl w-full h-screen sm:h-auto max-h-screen sm:max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
              style={{ pointerEvents: 'auto', zIndex: 10002 }}
            >
              {/* Header */}
              <div className="px-4 sm:px-8 py-4 sm:py-6 border-b flex-shrink-0" style={{ borderColor: COLORS.border, background: `linear-gradient(135deg, ${COLORS.primaryLight} 0%, ${COLORS.primaryLighter} 100%)` }}>
                <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-4">
                  <div className="flex items-start sm:items-center gap-2 sm:gap-4 min-w-0 flex-1">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0" style={{ background: COLORS.primary }}>
                      <i className="fas fa-users text-base sm:text-lg" style={{ color: COLORS.primaryLight }}></i>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg sm:text-2xl font-bold" style={{ color: COLORS.primary }}>
                        Create Sitter Pool Offer
                      </h2>
                      <p className="text-sm sm:text-base font-medium" style={{ color: COLORS.primary }}>
                        Select sitters to send this booking opportunity to
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSitterPoolModal(false)}
                    className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all duration-200 flex-shrink-0 touch-manipulation"
                    style={{ color: COLORS.primary }}
                    aria-label="Close"
                  >
                    <i className="fas fa-times text-base sm:text-lg"></i>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-8 overflow-y-auto flex-1 min-h-0">
                <div className="space-y-6">
                  {/* Booking Summary */}
                  {poolBookingId && (() => {
                    const booking = bookings.find(b => b.id === poolBookingId);
                    if (!booking) return null;
                    return (
                      <div className="bg-gray-50 rounded-lg p-4 border" style={{ borderColor: COLORS.border }}>
                        <h3 className="font-semibold mb-2" style={{ color: COLORS.primary }}>Booking Details</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Client:</span> {booking.firstName} {booking.lastName}
                          </div>
                          <div>
                            <span className="font-medium">Service:</span> 
                            <i className={`${getServiceIcon(booking.service)} ml-1 mr-1`}></i>
                            {booking.service}
                          </div>
                          <div>
                            <span className="font-medium">Date:</span> {new Date(booking.startAt).toLocaleDateString()}
                          </div>
                          <div>
                            <span className="font-medium">Time:</span> {new Date(booking.startAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Sitter Selection */}
                  <div>
                    <h3 className="text-base sm:text-lg font-bold mb-4" style={{ color: COLORS.primary }}>Select Sitters</h3>
                    <div className="space-y-3 max-h-60 sm:max-h-60 overflow-y-auto">
                      {sitters.filter(sitter => sitter.active).map(sitter => (
                        <label key={sitter.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors" style={{ borderColor: COLORS.border }}>
                          <input
                            type="checkbox"
                            checked={selectedSittersForPool.includes(sitter.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSittersForPool([...selectedSittersForPool, sitter.id]);
                              } else {
                                setSelectedSittersForPool(selectedSittersForPool.filter(id => id !== sitter.id));
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <div className="flex-1">
                            <div className="font-semibold">{sitter.firstName} {sitter.lastName}</div>
                            <div className="text-sm text-gray-600">{sitter.email}</div>
                            <div className="text-xs text-gray-500">{sitter.phone}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 pb-2 sm:pb-0">
                    <button
                      onClick={handleSitterPoolOffer}
                      disabled={selectedSittersForPool.length === 0}
                      className="flex-1 px-6 py-3 text-sm font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 touch-manipulation min-h-[44px]"
                      style={{ background: COLORS.primary, color: COLORS.primaryLight }}
                    >
                      <i className="fas fa-paper-plane mr-2"></i>
                      Send to {selectedSittersForPool.length} Sitter{selectedSittersForPool.length !== 1 ? 's' : ''}
                    </button>
                    <button
                      onClick={() => setShowSitterPoolModal(false)}
                      className="px-6 py-3 text-sm font-bold border-2 rounded-lg hover:bg-gray-50 transition-all touch-manipulation min-h-[44px]"
                      style={{ borderColor: COLORS.border, color: COLORS.primary }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Conflict Confirmation Modal */}
        {conflictModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-2 sm:p-4"
            onClick={() => setConflictModal(null)}
          >
            <div 
              className="bg-white rounded-lg border-2 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
              style={{ borderColor: COLORS.primaryLight }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white p-3 sm:p-4 border-b z-10 shadow-sm" style={{ borderColor: COLORS.border }}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base sm:text-xl font-bold" style={{ color: COLORS.error }}>
                      <i className="fas fa-exclamation-triangle mr-2"></i>
                      Scheduling Conflict Detected
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">
                      This sitter already has overlapping bookings
                    </p>
                  </div>
                  <button
                    onClick={() => setConflictModal(null)}
                    className="px-3 sm:px-4 py-2 text-sm font-bold border rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation min-h-[44px] flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: COLORS.border, color: COLORS.primary }}
                  >
                    <i className="fas fa-times sm:mr-2"></i>
                    <span className="hidden sm:inline">Close</span>
                  </button>
                </div>
              </div>
              <div className="p-3 sm:p-6">
                <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: COLORS.primaryLight + '40', borderLeft: `4px solid ${COLORS.error}` }}>
                  <p className="text-sm font-medium" style={{ color: COLORS.primary }}>
                    The sitter you're trying to assign already has {conflictModal.conflicts.length} overlapping booking{conflictModal.conflicts.length > 1 ? 's' : ''}.
                  </p>
                </div>

                <div className="space-y-4 mb-4">
                  {conflictModal.conflicts.map((conflict, idx) => (
                    <div
                      key={conflict.bookingId}
                      className="p-3 sm:p-4 border-2 rounded-lg"
                      style={{ borderColor: COLORS.error }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-sm sm:text-base" style={{ color: COLORS.primary }}>
                          {conflict.firstName} {conflict.lastName}
                        </h3>
                        <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: COLORS.error, color: 'white' }}>
                          CONFLICT
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 mb-2">{conflict.service}</p>
                      
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-gray-700">Overlapping Times:</div>
                        {conflict.overlappingSlots.map((slot, slotIdx) => (
                          <div key={slotIdx} className="text-xs sm:text-sm pl-2 border-l-2" style={{ borderColor: COLORS.error }}>
                            <div className="font-medium">
                              {formatTime(slot.existingSlot.startAt)} - {formatTime(slot.existingSlot.endAt)}
                            </div>
                            <div className="text-gray-500">
                              Conflicts with: {formatTime(slot.bookingSlot.startAt)} - {formatTime(slot.bookingSlot.endAt)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    onClick={handleConfirmConflictAssignment}
                    className="flex-1 px-4 py-2 text-sm font-bold border-2 rounded-lg hover:opacity-90 transition-opacity touch-manipulation min-h-[44px] flex items-center justify-center"
                    style={{ 
                      backgroundColor: COLORS.error,
                      color: 'white',
                      borderColor: COLORS.error
                    }}
                  >
                    <i className="fas fa-check mr-2"></i>
                    Assign Anyway
                  </button>
                  <button
                    onClick={() => setConflictModal(null)}
                    className="flex-1 px-4 py-2 text-sm font-bold border-2 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation min-h-[44px] flex items-center justify-center"
                    style={{ borderColor: COLORS.border, color: COLORS.primary }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Link Modal for Payment/Tip Links */}
        {showLinkModal && linkModalContent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" style={{ border: `2px solid ${COLORS.primary}` }}>
              <div className="sticky top-0 bg-white border-b-2 p-4 flex items-center justify-between" style={{ borderColor: COLORS.border }}>
                <h2 className="text-lg font-bold" style={{ color: COLORS.primary }}>{linkModalContent.title}</h2>
                <button
                  onClick={() => {
                    setShowLinkModal(false);
                    setLinkModalContent(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  style={{ color: COLORS.primary }}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="p-4 space-y-4">
                {linkModalContent.details && (
                  <div className="text-sm text-gray-700 whitespace-pre-line">
                    {linkModalContent.details}
                  </div>
                )}
                {linkModalContent.link && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-600">Link:</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={linkModalContent.link}
                        className="flex-1 px-3 py-2 border-2 rounded-lg text-sm"
                        style={{ borderColor: COLORS.border }}
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <button
                        onClick={async () => {
                          const copied = await copyToClipboard(linkModalContent!.link);
                          if (copied) {
                            alert('Link copied to clipboard!');
                          } else {
                            // Select the input text as fallback
                            const input = document.querySelector('input[value="' + linkModalContent!.link + '"]') as HTMLInputElement;
                            if (input) {
                              input.select();
                              input.setSelectionRange(0, 99999);
                            }
                            alert('Please manually copy the link above');
                          }
                        }}
                        className="px-4 py-2 text-sm font-bold rounded-lg hover:opacity-90 transition-opacity"
                        style={{ background: COLORS.primary, color: COLORS.primaryLight }}
                      >
                        <i className="fas fa-copy"></i>
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">Tap the link above to select and copy it</p>
                  </div>
                )}
                <button
                  onClick={() => {
                    setShowLinkModal(false);
                    setLinkModalContent(null);
                  }}
                  className="w-full px-4 py-3 text-sm font-bold rounded-lg hover:opacity-90 transition-opacity"
                  style={{ background: COLORS.primary, color: COLORS.primaryLight }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BookingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.primaryLighter }}>
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl mb-4" style={{ color: COLORS.primary }}></i>
          <p className="text-gray-600">Loading bookings...</p>
        </div>
      </div>
    }>
      <BookingsPageContent />
    </Suspense>
  );
}