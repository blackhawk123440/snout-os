/**
 * Today Board Component (Phase 6.2)
 * 
 * Displays the Today board with quick action buttons.
 * Per Master Spec 8.1: Today board with one-click actions.
 */

"use client";

import { COLORS } from "@/lib/booking-utils";
import { 
  assignSitterToBooking, 
  sendPaymentLinkToBooking, 
  resendConfirmation, 
  markBookingComplete 
} from "@/lib/today-board-helpers";

interface Booking {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  service: string;
  startAt: Date | string;
  endAt: Date | string;
  status: string;
  paymentStatus: string;
  totalPrice: number;
  sitterId?: string | null;
  sitter?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  pets: Array<{ species: string; name?: string }>;
  notes?: string | null;
}

interface TodayBoardProps {
  todayBoardData: {
    today: Booking[];
    unassigned: Booking[];
    unpaid: Booking[];
    atRisk: Booking[];
    stats: {
      todayCount: number;
      unassignedCount: number;
      unpaidCount: number;
      atRiskCount: number;
    };
  };
  sitters: Array<{ id: string; firstName: string; lastName: string }>;
  onRefresh: () => void;
  onBookingClick: (booking: Booking) => void;
}

export default function TodayBoard({ 
  todayBoardData, 
  sitters, 
  onRefresh,
  onBookingClick 
}: TodayBoardProps) {
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString();
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatPets = (pets: Array<{ species: string }>) => {
    const counts: Record<string, number> = {};
    pets.forEach(pet => {
      counts[pet.species] = (counts[pet.species] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([species, count]) => `${count} ${species}${count > 1 ? 's' : ''}`)
      .join(', ');
  };

  const handleQuickAction = async (
    action: 'assign' | 'payment' | 'resend' | 'complete',
    booking: Booking,
    sitterId?: string
  ) => {
    try {
      let result;
      switch (action) {
        case 'assign':
          if (!sitterId) {
            alert('Please select a sitter first');
            return;
          }
          result = await assignSitterToBooking(booking.id, sitterId);
          break;
        case 'payment':
          result = await sendPaymentLinkToBooking(booking.id);
          if (result.success && result.link) {
            const copied = await navigator.clipboard.writeText(result.link).catch(() => false);
            alert(`Payment link generated${copied ? ' and copied to clipboard' : ''}!\n\n${result.link}`);
          }
          break;
        case 'resend':
          result = await resendConfirmation(booking.id);
          break;
        case 'complete':
          result = await markBookingComplete(booking.id);
          break;
      }

      if (result?.success) {
        onRefresh();
      } else {
        alert(result?.error || 'Action failed');
      }
    } catch (error) {
      console.error('Quick action failed:', error);
      alert('Action failed. Please try again.');
    }
  };

  const renderBookingCard = (booking: Booking, section: string) => {
    const isUnassigned = !booking.sitterId;
    const isUnpaid = booking.paymentStatus === 'unpaid';
    const isAtRisk = section === 'atRisk';

    return (
      <div
        key={booking.id}
        className={`p-4 border-2 rounded-lg mb-3 ${
          isAtRisk ? 'border-red-300 bg-red-50' : 
          isUnpaid ? 'border-yellow-300 bg-yellow-50' :
          isUnassigned ? 'border-orange-300 bg-orange-50' :
          'border-gray-200'
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-bold text-lg">
                {booking.firstName} {booking.lastName}
              </h3>
              <span className={`px-2 py-1 text-xs font-bold rounded ${
                booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {booking.status}
              </span>
              {isUnpaid && (
                <span className="px-2 py-1 text-xs font-bold rounded bg-red-100 text-red-800">
                  Unpaid
                </span>
              )}
              {isUnassigned && (
                <span className="px-2 py-1 text-xs font-bold rounded bg-orange-100 text-orange-800">
                  Unassigned
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div><strong>Service:</strong> {booking.service}</div>
              <div><strong>Date:</strong> {formatDate(booking.startAt)} at {formatTime(booking.startAt)}</div>
              <div><strong>Pets:</strong> {formatPets(booking.pets)}</div>
              <div><strong>Total:</strong> ${booking.totalPrice.toFixed(2)}</div>
              {booking.sitter && (
                <div><strong>Sitter:</strong> {booking.sitter.firstName} {booking.sitter.lastName}</div>
              )}
            </div>
          </div>
          <button
            onClick={() => onBookingClick(booking)}
            className="px-3 py-1 text-sm font-semibold rounded bg-blue-100 text-blue-800 hover:bg-blue-200"
          >
            Details
          </button>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200">
          {isUnassigned && sitters.length > 0 && (
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleQuickAction('assign', booking, e.target.value);
                  e.target.value = '';
                }
              }}
              className="px-2 py-1 text-xs border rounded"
              defaultValue=""
            >
              <option value="">Assign Sitter...</option>
              {sitters.map(sitter => (
                <option key={sitter.id} value={sitter.id}>
                  {sitter.firstName} {sitter.lastName}
                </option>
              ))}
            </select>
          )}
          {isUnpaid && (
            <button
              onClick={() => handleQuickAction('payment', booking)}
              className="px-3 py-1 text-xs font-semibold rounded text-white bg-blue-500 hover:bg-blue-600"
            >
              Send Payment Link
            </button>
          )}
          <button
            onClick={() => handleQuickAction('resend', booking)}
            className="px-3 py-1 text-xs font-semibold rounded text-white bg-green-500 hover:bg-green-600"
          >
            Resend Confirmation
          </button>
          {booking.status !== 'completed' && (
            <button
              onClick={() => handleQuickAction('complete', booking)}
              className="px-3 py-1 text-xs font-semibold rounded text-white bg-purple-500 hover:bg-purple-600"
            >
              Mark Complete
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border-2" style={{ borderColor: COLORS.primaryLight }}>
          <div className="text-2xl font-bold mb-1" style={{ color: COLORS.primary }}>
            {todayBoardData.stats.todayCount}
          </div>
          <div className="text-sm text-gray-600">Today's Bookings</div>
        </div>
        <div className="bg-white rounded-lg p-4 border-2 border-orange-300">
          <div className="text-2xl font-bold mb-1 text-orange-600">
            {todayBoardData.stats.unassignedCount}
          </div>
          <div className="text-sm text-gray-600">Unassigned</div>
        </div>
        <div className="bg-white rounded-lg p-4 border-2 border-yellow-300">
          <div className="text-2xl font-bold mb-1 text-yellow-600">
            {todayBoardData.stats.unpaidCount}
          </div>
          <div className="text-sm text-gray-600">Unpaid</div>
        </div>
        <div className="bg-white rounded-lg p-4 border-2 border-red-300">
          <div className="text-2xl font-bold mb-1 text-red-600">
            {todayBoardData.stats.atRiskCount}
          </div>
          <div className="text-sm text-gray-600">At Risk</div>
        </div>
      </div>

      {/* Today's Bookings */}
      {todayBoardData.today.length > 0 && (
        <div className="bg-white rounded-lg border-2 p-4" style={{ borderColor: COLORS.primaryLight }}>
          <h3 className="text-lg font-bold mb-4" style={{ color: COLORS.primary }}>
            Today's Bookings ({todayBoardData.today.length})
          </h3>
          {todayBoardData.today.map(booking => renderBookingCard(booking, 'today'))}
        </div>
      )}

      {/* Unassigned Bookings */}
      {todayBoardData.unassigned.length > 0 && (
        <div className="bg-white rounded-lg border-2 border-orange-300 p-4">
          <h3 className="text-lg font-bold mb-4 text-orange-600">
            Unassigned Bookings ({todayBoardData.unassigned.length})
          </h3>
          {todayBoardData.unassigned.map(booking => renderBookingCard(booking, 'unassigned'))}
        </div>
      )}

      {/* Unpaid Bookings */}
      {todayBoardData.unpaid.length > 0 && (
        <div className="bg-white rounded-lg border-2 border-yellow-300 p-4">
          <h3 className="text-lg font-bold mb-4 text-yellow-600">
            Unpaid Bookings ({todayBoardData.unpaid.length})
          </h3>
          {todayBoardData.unpaid.map(booking => renderBookingCard(booking, 'unpaid'))}
        </div>
      )}

      {/* At Risk Bookings */}
      {todayBoardData.atRisk.length > 0 && (
        <div className="bg-white rounded-lg border-2 border-red-300 p-4">
          <h3 className="text-lg font-bold mb-4 text-red-600">
            At Risk Bookings ({todayBoardData.atRisk.length})
          </h3>
          {todayBoardData.atRisk.map(booking => renderBookingCard(booking, 'atRisk'))}
        </div>
      )}

      {/* Empty State */}
      {todayBoardData.today.length === 0 && 
       todayBoardData.unassigned.length === 0 && 
       todayBoardData.unpaid.length === 0 && 
       todayBoardData.atRisk.length === 0 && (
        <div className="bg-white rounded-lg border-2 p-8 text-center" style={{ borderColor: COLORS.primaryLight }}>
          <i className="fas fa-calendar-check text-4xl text-gray-300 mb-4"></i>
          <p className="text-gray-600">No bookings for today. Great job!</p>
        </div>
      )}
    </div>
  );
}

