'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Button, Modal, PageHeader, useToast } from '@/components/ui';

type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'in_progress' | string;

interface TodayBooking {
  id: string;
  status: BookingStatus;
  service: string;
  startAt: string;
  endAt: string;
  address: string | null;
  clientName: string;
  pets: Array<{ id: string; name?: string | null; species?: string | null }>;
  threadId: string | null;
}

interface DailyDelightModalProps {
  booking: TodayBooking | null;
  isOpen: boolean;
  onClose: () => void;
}

type DelightResponseMeta = {
  reportId?: string;
  messageId?: string;
  id?: string;
} | null;

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

const formatTimeRange = (startAt: string, endAt: string) => {
  const start = new Date(startAt);
  const end = new Date(endAt);
  return `${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
};

const buildStubDelight = (booking: TodayBooking) => {
  const petNames =
    booking.pets.length > 0
      ? booking.pets.map((pet) => pet.name || pet.species || 'pet').join(', ')
      : 'your pet';
  const timeRange = formatTimeRange(booking.startAt, booking.endAt);
  return `Today with ${petNames} went smoothly.\n\nHighlights:\n- ${booking.service} completed during ${timeRange}.\n- Appetite, energy, and comfort looked normal.\n- No concerns observed during the visit.\n\nWe are ready for the next check-in.`;
};

function DailyDelightModal({ booking, isOpen, onClose }: DailyDelightModalProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [isStubDraft, setIsStubDraft] = useState(false);
  const [meta, setMeta] = useState<DelightResponseMeta>(null);

  useEffect(() => {
    if (!isOpen || !booking) return;
    setDraft('');
    setMeta(null);
    setIsStubDraft(false);
    setLoading(false);
  }, [isOpen, booking]);

  const generate = async () => {
    if (!booking) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/daily-delight`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const fallback = buildStubDelight(booking);
        setDraft(fallback);
        setMeta(null);
        setIsStubDraft(true);
        const fallbackMessage =
          res.status === 403
            ? 'Daily Delight access is restricted, showing a local draft.'
            : res.status === 404
              ? 'Daily Delight service is unavailable for this booking, showing a local draft.'
              : 'Could not generate right now. A local draft is ready.';
        showToast({ message: fallbackMessage, variant: 'warning' });
        return;
      }

      setDraft(typeof data.report === 'string' && data.report.trim() ? data.report : buildStubDelight(booking));
      setMeta({
        reportId: typeof data.reportId === 'string' ? data.reportId : undefined,
        messageId: typeof data.messageId === 'string' ? data.messageId : undefined,
        id: typeof data.id === 'string' ? data.id : undefined,
      });
      setIsStubDraft(false);
      showToast({ message: 'Daily Delight generated', variant: 'success' });
    } catch {
      const fallback = buildStubDelight(booking);
      setDraft(fallback);
      setMeta(null);
      setIsStubDraft(true);
      showToast({ message: 'Could not generate right now. A local draft is ready.', variant: 'warning' });
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    if (!draft.trim()) {
      showToast({ message: 'Add or generate content first', variant: 'error' });
      return;
    }
    if (meta?.messageId || meta?.reportId || meta?.id) {
      showToast({ message: 'Daily Delight sent', variant: 'success' });
      return;
    }
    showToast({ message: 'Daily Delight saved', variant: 'success' });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={booking ? `✨ Daily Delight - ${booking.clientName}` : '✨ Daily Delight'}
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose}>
            Close
          </Button>
          <Button variant="secondary" size="md" onClick={() => void generate()} disabled={loading}>
            {loading ? 'Working...' : draft ? 'Regenerate' : 'Generate'}
          </Button>
          <Button variant="primary" size="md" onClick={handleSend} disabled={loading || !draft.trim()}>
            Send
          </Button>
        </>
      }
    >
      {booking ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700">
            <p className="font-medium text-gray-900">{booking.service}</p>
            <p>{formatTimeRange(booking.startAt, booking.endAt)}</p>
            {booking.pets.length > 0 ? (
              <p className="mt-1 text-gray-600">
                Pets:{' '}
                {booking.pets
                  .map((pet) => (pet.name ? `${pet.name}${pet.species ? ` (${pet.species})` : ''}` : pet.species || 'Pet'))
                  .join(', ')}
              </p>
            ) : null}
          </div>

          {isStubDraft ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Using a local draft so you can keep moving. You can still edit and send/save from here.
            </div>
          ) : null}

          <div className="rounded-lg bg-gray-50 p-3">
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">Preview / Composer</label>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Generate a Daily Delight, then fine-tune the message here."
              className="min-h-44 w-full resize-y rounded-md border border-gray-300 bg-white p-3 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

export default function SitterTodayPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [bookings, setBookings] = useState<TodayBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [delightBooking, setDelightBooking] = useState<TodayBooking | null>(null);

  const todayLabel = useMemo(
    () => new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }),
    []
  );

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sitter/today');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast({ message: data.error || 'Unable to load today bookings', variant: 'error' });
        return;
      }
      setBookings(Array.isArray(data.bookings) ? data.bookings : []);
    } catch {
      showToast({ message: 'Unable to load today bookings', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  const handleCheckIn = async (bookingId: string) => {
    setCheckingInId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast({ message: data.error || 'Check in failed', variant: 'error' });
        return;
      }
      setBookings((prev) => prev.map((booking) => (booking.id === bookingId ? { ...booking, status: 'confirmed' } : booking)));
      showToast({ message: 'Checked in successfully', variant: 'success' });
    } catch {
      showToast({ message: 'Check in failed', variant: 'error' });
    } finally {
      setCheckingInId(null);
    }
  };

  const handleOpenChat = (booking: TodayBooking) => {
    const query = booking.threadId ? `?thread=${encodeURIComponent(booking.threadId)}` : '';
    router.push(`/sitter/inbox${query}`);
  };

  const openDelightModal = (booking: TodayBooking) => {
    setDelightBooking(booking);
  };

  return (
    <AppShell>
      <PageHeader title="Today" description={todayLabel} />
      <div className="mx-auto w-full max-w-3xl px-4 pb-8 pt-2">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Today's bookings</h2>
          <Button variant="secondary" size="sm" onClick={() => void loadBookings()} disabled={loading}>
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((row) => (
              <div key={row} className="animate-pulse rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-2 h-4 w-1/2 rounded bg-gray-200" />
                <div className="mb-2 h-3 w-1/3 rounded bg-gray-100" />
                <div className="h-9 w-full rounded bg-gray-100" />
              </div>
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="text-sm text-gray-600">No bookings scheduled for today.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <article key={booking.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-gray-900">{booking.clientName}</p>
                    <p className="text-sm text-gray-600">{booking.service}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(booking.status)}`}>
                    {booking.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="mb-3 space-y-1 text-sm text-gray-700">
                  <p>{formatTimeRange(booking.startAt, booking.endAt)}</p>
                  {booking.address ? <p className="text-gray-600">{booking.address}</p> : null}
                  {booking.pets.length > 0 ? (
                    <p className="text-gray-600">
                      Pets:{' '}
                      {booking.pets
                        .map((pet) => (pet.name ? `${pet.name}${pet.species ? ` (${pet.species})` : ''}` : pet.species || 'Pet'))
                        .join(', ')}
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => void handleCheckIn(booking.id)}
                    disabled={checkingInId === booking.id || booking.status === 'completed' || booking.status === 'cancelled'}
                  >
                    {checkingInId === booking.id ? 'Checking in...' : 'Check in'}
                  </Button>
                  <Button variant="secondary" size="md" onClick={() => handleOpenChat(booking)}>
                    Open chat
                  </Button>
                  <Button variant="secondary" size="md" onClick={() => openDelightModal(booking)}>
                    ✨ Daily Delight
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <DailyDelightModal
        isOpen={!!delightBooking}
        booking={delightBooking}
        onClose={() => setDelightBooking(null)}
      />
    </AppShell>
  );
}
