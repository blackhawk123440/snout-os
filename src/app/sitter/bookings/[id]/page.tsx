'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader, Button, Modal } from '@/components/ui';

interface BookingDetail {
  id: string;
  status: string;
  service: string;
  startAt: string;
  endAt: string;
  address: string | null;
  pickupAddress: string | null;
  dropoffAddress: string | null;
  notes: string | null;
  totalPrice: number;
  clientName: string;
  client?: { firstName?: string; lastName?: string; phone?: string; email?: string | null };
  pets: Array<{ id: string; name?: string | null; species?: string | null; breed?: string | null; notes?: string | null }>;
  threadId: string | null;
}

const statusBadgeClass = (status: string) => {
  switch (status) {
    case 'confirmed':
      return 'bg-blue-100 text-blue-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-amber-100 text-amber-800';
    case 'in_progress':
      return 'bg-purple-100 text-purple-800';
    case 'cancelled':
      return 'bg-gray-200 text-gray-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const formatDateTime = (d: string) =>
  new Date(d).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

type DelightResponseMeta = { reportId?: string; messageId?: string; id?: string } | null;

const buildStubDelight = (b: BookingDetail) => {
  const petNames =
    b.pets.length > 0
      ? b.pets.map((p) => p.name || p.species || 'pet').join(', ')
      : 'your pet';
  const start = new Date(b.startAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const end = new Date(b.endAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return `Today with ${petNames} went smoothly.\n\nHighlights:\n- ${b.service} completed during ${start} - ${end}.\n- Appetite, energy, and comfort looked normal.\n- No concerns observed during the visit.\n\nWe are ready for the next check-in.`;
};

export default function SitterBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [delightOpen, setDelightOpen] = useState(false);
  const [delightDraft, setDelightDraft] = useState('');
  const [delightLoading, setDelightLoading] = useState(false);
  const [delightMeta, setDelightMeta] = useState<DelightResponseMeta>(null);

  const loadBooking = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sitter/bookings/${id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Booking not found');
        setBooking(null);
        return;
      }
      setBooking(data);
    } catch {
      setError('Failed to load booking');
      setBooking(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadBooking();
  }, [loadBooking]);

  const handleCheckIn = async () => {
    if (!id) return;
    setCheckingIn(true);
    try {
      const res = await fetch(`/api/bookings/${id}/check-in`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'Check-in failed');
        return;
      }
      await loadBooking();
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    if (!id) return;
    setCheckingOut(true);
    try {
      const res = await fetch(`/api/bookings/${id}/check-out`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'Check-out failed');
        return;
      }
      await loadBooking();
    } finally {
      setCheckingOut(false);
    }
  };

  const handleOpenChat = () => {
    if (booking?.threadId) {
      router.push(`/sitter/inbox?thread=${encodeURIComponent(booking.threadId)}`);
    }
  };

  const generateDelight = async () => {
    if (!booking) return;
    setDelightLoading(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/daily-delight`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDelightDraft(buildStubDelight(booking));
        setDelightMeta(null);
      } else {
        const report = typeof data.report === 'string' && data.report.trim() ? data.report : buildStubDelight(booking);
        setDelightDraft(report);
        setDelightMeta({
          reportId: typeof data.reportId === 'string' ? data.reportId : undefined,
          messageId: typeof data.messageId === 'string' ? data.messageId : undefined,
          id: typeof data.id === 'string' ? data.id : undefined,
        });
      }
    } catch {
      setDelightDraft(buildStubDelight(booking));
      setDelightMeta(null);
    } finally {
      setDelightLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Booking details"
        description={booking ? `${booking.service} · ${booking.clientName}` : ''}
      />
      <div className="mx-auto max-w-3xl px-4 pb-8 pt-2">
        {loading ? (
          <div className="animate-pulse space-y-4 rounded-xl border border-gray-200 bg-white p-4">
            <div className="h-6 w-48 rounded bg-gray-200" />
            <div className="h-4 w-full rounded bg-gray-100" />
            <div className="h-4 w-3/4 rounded bg-gray-100" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="text-sm text-gray-600">{error}</p>
            <Button variant="secondary" size="md" className="mt-4" onClick={() => router.back()}>
              Back
            </Button>
          </div>
        ) : booking ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{booking.clientName}</p>
                  <p className="text-sm text-gray-600">{booking.service}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(booking.status)}`}
                >
                  {booking.status.replace('_', ' ')}
                </span>
              </div>
              <div className="space-y-4 text-sm text-gray-700">
                <div>
                  <p className="font-medium text-gray-900">When</p>
                  <p>{formatDateTime(booking.startAt)} – {formatDateTime(booking.endAt)}</p>
                </div>
                {booking.address && (
                  <div>
                    <p className="font-medium text-gray-900">Address</p>
                    <p>{booking.address}</p>
                  </div>
                )}
                {booking.pets.length > 0 && (
                  <div>
                    <p className="font-medium text-gray-900">Pets</p>
                    <ul className="list-disc pl-4">
                      {booking.pets.map((p) => (
                        <li key={p.id}>
                          {p.name || 'Pet'} {p.species ? `(${p.species})` : ''}
                          {p.breed ? ` – ${p.breed}` : ''}
                          {p.notes ? ` – ${p.notes}` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {booking.notes && (
                  <div>
                    <p className="font-medium text-gray-900">Notes</p>
                    <p>{booking.notes}</p>
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">Total</p>
                  <p>${booking.totalPrice.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {['pending', 'confirmed'].includes(booking.status) && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => void handleCheckIn()}
                  disabled={checkingIn}
                >
                  {checkingIn ? 'Checking in...' : 'Check in'}
                </Button>
              )}
              {booking.status === 'in_progress' && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => void handleCheckOut()}
                  disabled={checkingOut}
                >
                  {checkingOut ? 'Checking out...' : 'Check out'}
                </Button>
              )}
              {booking.threadId && (
                <Button variant="secondary" size="md" onClick={handleOpenChat}>
                  Open chat
                </Button>
              )}
              <Button variant="secondary" size="md" onClick={() => setDelightOpen(true)}>
                ✨ Daily Delight
              </Button>
              <Button variant="secondary" size="md" onClick={() => router.back()}>
                Back
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <Modal
        isOpen={delightOpen}
        onClose={() => setDelightOpen(false)}
        title={booking ? `✨ Daily Delight - ${booking.clientName}` : '✨ Daily Delight'}
        footer={
          <>
            <Button variant="secondary" size="md" onClick={() => setDelightOpen(false)}>
              Close
            </Button>
            <Button variant="secondary" size="md" onClick={() => void generateDelight()} disabled={delightLoading}>
              {delightLoading ? 'Working...' : delightDraft ? 'Regenerate' : 'Generate'}
            </Button>
            <Button variant="primary" size="md" disabled={!delightDraft.trim()}>
              Send
            </Button>
          </>
        }
      >
        {booking ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700">
              <p className="font-medium text-gray-900">{booking.service}</p>
              <p>{formatDateTime(booking.startAt)} – {formatDateTime(booking.endAt)}</p>
                {booking.pets.length > 0 && (
                  <p className="mt-1 text-gray-600">
                    Pets:{' '}
                    {booking.pets
                      .map((p) =>
                        p.name ? `${p.name}${p.species ? ` (${p.species})` : ''}` : p.species || 'Pet'
                      )
                      .join(', ')}
                  </p>
                )}
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
                Preview / Composer
              </label>
              <textarea
                value={delightDraft}
                onChange={(e) => setDelightDraft(e.target.value)}
                placeholder="Generate a Daily Delight, then fine-tune the message here."
                className="min-h-44 w-full resize-y rounded-md border border-gray-300 bg-white p-3 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
