"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface Pet {
  id: string;
  name: string;
  species: string;
}

interface TimeSlot {
  id: string;
  startAt: string;
  endAt: string;
  duration: number;
}

interface Booking {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  address?: string;
  service: string;
  minutes?: number;
  quantity: number;
  startAt: string;
  endAt: string;
  special?: string;
  totalPrice?: number;
  status: string;
  pets: Pet[];
  timeSlots?: TimeSlot[];
}

function SitterPageContent() {
  const searchParams = useSearchParams();
  const sitterId = searchParams.get("id") || "demo"; // Demo mode if no ID
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportText, setReportText] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [visitStatus, setVisitStatus] = useState<Record<string, 'not_started' | 'in_progress' | 'completed'>>({});
  const [visitPhotos, setVisitPhotos] = useState<Record<string, string[]>>({});
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    fetchMyBookings();
  }, [sitterId]);

  const fetchMyBookings = async () => {
    setLoading(true);
    try {
      // Fetch confirmed bookings assigned to this sitter
      const response = await fetch(`/api/sitter/${sitterId}/bookings`);
      const data = await response.json();
      setBookings(data.bookings || []);
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
    }
    setLoading(false);
  };

  const startVisit = async (bookingId: string) => {
    setVisitStatus(prev => ({ ...prev, [bookingId]: 'in_progress' }));
    
    // Notify client
    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedBooking?.phone,
          message: `🐾 VISIT STARTED!\n\nYour pet care visit has begun. Your sitter will send updates and photos during the visit.`
        }),
      });
      
      if (response.ok) {
        alert("✅ Visit started! Client has been notified.");
      }
    } catch (error) {
      console.error("Failed to notify client:", error);
      alert("Visit started, but failed to notify client.");
    }
  };

  const endVisit = async (bookingId: string) => {
    setVisitStatus(prev => ({ ...prev, [bookingId]: 'completed' }));
    
    // Notify client
    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedBooking?.phone,
          message: `🐾 VISIT COMPLETED!\n\nYour pet care visit has ended. A detailed report will be sent shortly.`
        }),
      });
      
      if (response.ok) {
        alert("✅ Visit completed! Client has been notified.");
      }
    } catch (error) {
      console.error("Failed to notify client:", error);
      alert("Visit completed, but failed to notify client.");
    }
  };

  const uploadPhoto = async (bookingId: string, file: File) => {
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bookingId', bookingId);
      
      const response = await fetch('/api/upload/photo', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const data = await response.json();
        setVisitPhotos(prev => ({
          ...prev,
          [bookingId]: [...(prev[bookingId] || []), data.url]
        }));
        
        // Notify client of new photo
        await fetch('/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: selectedBooking?.phone,
            message: `📸 NEW PHOTO!\n\nYour sitter just shared a photo from the visit. Check your Snout Card for the latest updates!`
          }),
        });
        
        alert("✅ Photo uploaded and client notified!");
      } else {
        alert("❌ Failed to upload photo");
      }
    } catch (error) {
      console.error("Failed to upload photo:", error);
      alert("❌ Failed to upload photo");
    }
    setUploadingPhoto(false);
  };

  const submitReport = async () => {
    if (!selectedBooking || !reportText.trim()) return;

    setSubmittingReport(true);
    try {
      const response = await fetch(`/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          sitterId,
          summary: reportText,
        }),
      });

      if (response.ok) {
        alert("Report submitted! Client will receive an update.");
        setReportText("");
        fetchMyBookings();
      }
    } catch (error) {
      console.error("Failed to submit report:", error);
    }
    setSubmittingReport(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    const isTomorrow =
      date.getDate() === tomorrow.getDate() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getFullYear() === tomorrow.getFullYear();

    if (isToday) return "Today";
    if (isTomorrow) return "Tomorrow";

    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const groupByDate = () => {
    const groups: { [key: string]: Booking[] } = {};
    bookings.forEach((booking) => {
      const dateKey = formatDate(booking.startAt);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(booking);
    });
    return groups;
  };

  const groupedBookings = groupByDate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-First Header */}
      <div className="bg-white border-b sticky top-0 z-10" style={{ borderColor: "#e0e0e0" }}>
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#432f21" }}>
                <i className="fas fa-paw text-lg" style={{ color: "#fce1ef" }}></i>
              </div>
              <div>
                <h1 className="text-lg font-bold" style={{ color: "#432f21" }}>
                  Sitter Dashboard
                </h1>
                <p className="text-xs text-gray-500">Your assigned visits</p>
              </div>
            </div>
            <button
              onClick={fetchMyBookings}
              className="w-10 h-10 rounded-lg flex items-center justify-center border hover:bg-gray-50"
              style={{ borderColor: "#d0d0d0" }}
            >
              <i className="fas fa-sync-alt text-sm" style={{ color: "#432f21" }}></i>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-r-transparent" style={{ borderColor: "#432f21", borderRightColor: "transparent" }}></div>
            <p className="mt-4 text-sm font-medium text-gray-600">Loading your visits...</p>
          </div>
        </div>
      ) : Object.keys(groupedBookings).length === 0 ? (
        <div className="text-center py-20 px-4">
          <i className="fas fa-calendar-check text-6xl text-gray-200 mb-4"></i>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No upcoming visits</h3>
          <p className="text-sm text-gray-500">You have no assigned bookings at this time</p>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-6 max-w-2xl mx-auto">
          {Object.entries(groupedBookings).map(([dateLabel, bookingsForDate]) => (
            <div key={dateLabel}>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3 px-2">
                {dateLabel}
              </h2>
              <div className="space-y-3">
                {bookingsForDate.map((booking) => (
                  <div
                    key={booking.id}
                    className="bg-white rounded-lg border-2 shadow-sm active:scale-[0.98] transition-transform"
                    style={{ borderColor: "#e0e0e0" }}
                  >
                    <div
                      className="p-4"
                      onClick={() => setSelectedBooking(selectedBooking?.id === booking.id ? null : booking)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-base" style={{ color: "#432f21" }}>
                            {booking.pets.map((p) => p.name).join(" & ")}
                          </h3>
                          <p className="text-sm text-gray-600">{booking.firstName} {booking.lastName}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold" style={{ color: "#432f21" }}>
                            {formatTime(booking.startAt)}
                          </div>
                          <div className="text-xs text-gray-500">{booking.minutes || 30}m</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-600 mb-3">
                        <div className="flex items-center gap-1.5">
                          <i className="fas fa-briefcase" style={{ color: "#432f21" }}></i>
                          <span>{booking.service}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <i className="fas fa-paw" style={{ color: "#432f21" }}></i>
                          <span>{booking.pets.length} pet{booking.pets.length > 1 ? 's' : ''}</span>
                        </div>
                      </div>

                      {booking.address && (
                        <div className="text-sm text-gray-700 mb-3 flex items-start gap-2">
                          <i className="fas fa-map-marker-alt mt-1" style={{ color: "#432f21" }}></i>
                          <a
                            href={`https://maps.google.com/?q=${encodeURIComponent(booking.address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                            style={{ color: "#432f21" }}
                          >
                            {booking.address}
                          </a>
                        </div>
                      )}

                      {/* Expanded Details */}
                      {selectedBooking?.id === booking.id && (
                        <div className="mt-4 pt-4 border-t space-y-4" style={{ borderColor: "#f0f0f0" }}>
                          {/* Pet Details */}
                          <div>
                            <div className="text-xs font-bold uppercase text-gray-400 mb-2">Pets</div>
                            <div className="space-y-2">
                              {booking.pets.map((pet) => (
                                <div key={pet.id} className="flex items-center gap-2 text-sm">
                                  <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "#fce1ef" }}>
                                    <i className="fas fa-paw text-xs" style={{ color: "#432f21" }}></i>
                                  </div>
                                  <div>
                                    <div className="font-semibold" style={{ color: "#432f21" }}>{pet.name}</div>
                                    <div className="text-xs text-gray-500">{pet.species}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Client Contact */}
                          <div>
                            <div className="text-xs font-bold uppercase text-gray-400 mb-2">Contact</div>
                            <a
                              href={`tel:${booking.phone}`}
                              className="flex items-center gap-2 text-sm font-medium hover:underline"
                              style={{ color: "#432f21" }}
                            >
                              <i className="fas fa-phone"></i>
                              {booking.phone}
                            </a>
                          </div>

                          {/* Special Instructions */}
                          {booking.special && (
                            <div>
                              <div className="text-xs font-bold uppercase text-gray-400 mb-2">Special Instructions</div>
                              <div className="text-sm text-gray-800 bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                                {booking.special}
                              </div>
                            </div>
                          )}

                          {/* Visit Flow Controls */}
                          <div>
                            <div className="text-xs font-bold uppercase text-gray-400 mb-3">Visit Controls</div>
                            <div className="space-y-3">
                              {/* Visit Status */}
                              <div className="flex items-center gap-3">
                                {visitStatus[booking.id] === 'not_started' && (
                                  <button
                                    onClick={() => startVisit(booking.id)}
                                    className="flex-1 px-4 py-2.5 text-sm font-bold text-white rounded-lg hover:opacity-90 transition-all"
                                    style={{ background: "#22c55e" }}
                                  >
                                    <i className="fas fa-play mr-2"></i>
                                    Start Visit
                                  </button>
                                )}
                                
                                {visitStatus[booking.id] === 'in_progress' && (
                                  <>
                                    <button
                                      onClick={() => endVisit(booking.id)}
                                      className="flex-1 px-4 py-2.5 text-sm font-bold text-white rounded-lg hover:opacity-90 transition-all"
                                      style={{ background: "#dc2626" }}
                                    >
                                      <i className="fas fa-stop mr-2"></i>
                                      End Visit
                                    </button>
                                    
                                    {/* Photo Upload */}
                                    <label className="px-4 py-2.5 text-sm font-bold border-2 rounded-lg hover:opacity-90 transition-all cursor-pointer flex items-center justify-center"
                                           style={{ color: "#432f21", borderColor: "#432f21" }}>
                                      <i className="fas fa-camera mr-2"></i>
                                      Photo
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) uploadPhoto(booking.id, file);
                                        }}
                                        className="hidden"
                                        disabled={uploadingPhoto}
                                      />
                                    </label>
                                  </>
                                )}
                                
                                {visitStatus[booking.id] === 'completed' && (
                                  <div className="flex-1 px-4 py-2.5 text-sm font-bold text-white rounded-lg text-center"
                                       style={{ background: "#6b7280" }}>
                                    <i className="fas fa-check mr-2"></i>
                                    Visit Completed
                                  </div>
                                )}
                              </div>
                              
                              {/* Visit Photos */}
                              {visitPhotos[booking.id] && visitPhotos[booking.id].length > 0 && (
                                <div>
                                  <div className="text-xs font-bold text-gray-500 mb-2">Visit Photos</div>
                                  <div className="grid grid-cols-2 gap-2">
                                    {visitPhotos[booking.id].map((photo, idx) => (
                                      <img
                                        key={idx}
                                        src={photo}
                                        alt={`Visit photo ${idx + 1}`}
                                        className="w-full h-20 object-cover rounded-lg"
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Report Box */}
                          <div>
                            <div className="text-xs font-bold uppercase text-gray-400 mb-2">Visit Report</div>
                            <textarea
                              value={reportText}
                              onChange={(e) => setReportText(e.target.value)}
                              placeholder="How did the visit go? (This will be sent to the client)"
                              className="w-full px-3 py-2 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2"
                              style={{ borderColor: "#d0d0d0", minHeight: "80px" }}
                              onFocus={(e) => e.target.style.borderColor = "#432f21"}
                              onBlur={(e) => e.target.style.borderColor = "#d0d0d0"}
                              rows={3}
                            />
                          </div>

                          {/* Action Buttons */}
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => startVisit(booking.id)}
                              className="px-4 py-3 rounded-lg font-bold text-sm text-white transition-all active:scale-95"
                              style={{ background: "#432f21" }}
                            >
                              <i className="fas fa-play mr-2"></i>
                              Start Visit
                            </button>
                            <button
                              onClick={submitReport}
                              disabled={!reportText.trim() || submittingReport}
                              className={`px-4 py-3 rounded-lg font-bold text-sm transition-all active:scale-95 ${
                                !reportText.trim() || submittingReport
                                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                  : "bg-green-600 text-white"
                              }`}
                            >
                              {submittingReport ? (
                                <>
                                  <i className="fas fa-spinner fa-spin mr-2"></i>
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <i className="fas fa-check mr-2"></i>
                                  Complete & Send
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Tap to expand hint */}
                      {selectedBooking?.id !== booking.id && (
                        <div className="text-xs text-center text-gray-400 mt-3">
                          Tap to view details
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Safe Area for Mobile */}
      <div className="h-20"></div>
    </div>
  );
}

export default function SitterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SitterPageContent />
    </Suspense>
  );
}

