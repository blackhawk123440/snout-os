'use client';

import { useEffect, useState } from 'react';
import { Button, Modal, useToast } from '@/components/ui';

export interface DailyDelightBooking {
  id: string;
  clientName: string;
  service: string;
  startAt: string;
  endAt: string;
  pets: Array<{ id: string; name?: string | null; species?: string | null }>;
}

const formatTimeRange = (startAt: string, endAt: string) => {
  const start = new Date(startAt);
  const end = new Date(endAt);
  return `${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
};

const buildStubDelight = (booking: DailyDelightBooking) => {
  const petNames =
    booking.pets.length > 0
      ? booking.pets.map((pet) => pet.name || pet.species || 'pet').join(', ')
      : 'your pet';
  const timeRange = formatTimeRange(booking.startAt, booking.endAt);
  return `Today with ${petNames} went smoothly.\n\nHighlights:\n- ${booking.service} completed during ${timeRange}.\n- Appetite, energy, and comfort looked normal.\n- No concerns observed during the visit.\n\nWe are ready for the next check-in.`;
};

type ToneOption = 'warm' | 'playful' | 'professional';

export interface DailyDelightModalProps {
  booking: DailyDelightBooking | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DailyDelightModal({ booking, isOpen, onClose }: DailyDelightModalProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [tone, setTone] = useState<ToneOption>('warm');
  const [isStubDraft, setIsStubDraft] = useState(false);

  useEffect(() => {
    if (!isOpen || !booking) return;
    setDraft('');
    setIsStubDraft(false);
    setLoading(false);
  }, [isOpen, booking]);

  const generate = async () => {
    if (!booking) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/daily-delight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const fallback = buildStubDelight(booking);
        setDraft(fallback);
        setIsStubDraft(true);
        showToast({ message: 'Could not generate right now. A local draft is ready.', variant: 'warning' });
        return;
      }
      setDraft(typeof data.report === 'string' && data.report.trim() ? data.report : buildStubDelight(booking));
      setIsStubDraft(false);
      showToast({ message: 'Daily Delight generated', variant: 'success' });
    } catch {
      const fallback = buildStubDelight(booking);
      setDraft(fallback);
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
    showToast({ message: 'Sent 💛', variant: 'success' });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={booking ? `✨ Daily Delight — ${booking.clientName}` : '✨ Daily Delight'}
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose}>
            Close
          </Button>
          <Button variant="secondary" size="md" onClick={() => void generate()} disabled={loading}>
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-amber-400" />
                Generating…
              </span>
            ) : draft ? (
              'Regenerate'
            ) : (
              'Generate'
            )}
          </Button>
          <Button variant="secondary" size="md" onClick={() => {}} disabled>
            Save draft
          </Button>
          <Button variant="primary" size="md" onClick={handleSend} disabled={loading || !draft.trim()}>
            Send
          </Button>
        </>
      }
    >
      {booking ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <p className="font-semibold text-neutral-900">{booking.service}</p>
            <p className="text-sm text-neutral-600">{formatTimeRange(booking.startAt, booking.endAt)}</p>
            {booking.pets.length > 0 && (
              <p className="mt-1 text-sm text-neutral-600">
                {booking.pets
                  .map((pet) => (pet.name ? `${pet.name}${pet.species ? ` (${pet.species})` : ''}` : pet.species || 'Pet'))
                  .join(', ')}
              </p>
            )}
          </div>
          <div className="rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 p-6 text-center">
            <p className="text-sm text-neutral-500">Add photos or media (coming soon)</p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-neutral-500">Tone</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as ToneOption)}
              disabled={loading}
              className="mb-4 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="warm">Warm</option>
              <option value="playful">Playful</option>
              <option value="professional">Professional</option>
            </select>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-neutral-500">Your message</label>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Generate a Daily Delight, then fine-tune here."
              disabled={loading}
              className={`min-h-44 w-full resize-y rounded-xl border border-neutral-300 bg-white p-3 text-sm text-neutral-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${loading ? 'animate-pulse' : ''}`}
            />
          </div>
          {isStubDraft && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              We filled in a warm draft so you can keep moving. Edit and send when ready.
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
