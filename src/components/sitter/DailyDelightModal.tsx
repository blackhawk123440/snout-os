'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Button, Modal } from '@/components/ui';
import { toastSuccess, toastError, toastWarning, toastInfo } from '@/lib/toast';
import { useAuth } from '@/lib/auth-client';
import { useOffline } from '@/hooks/useOffline';
import {
  addPendingPhoto,
  removePendingPhoto,
  getPendingPhotosForBooking,
  enqueueAction,
} from '@/lib/offline';

const MAX_PHOTOS = 5;
const MAX_SIZE_MB = 5;
const ACCEPT = 'image/jpeg,image/png,image/webp';

type PendingPhotoEntry = { id: string; objectUrl: string };

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
  const { user } = useAuth();
  const { isOnline, refreshQueuedCount } = useOffline();
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [tone, setTone] = useState<ToneOption>('warm');
  const [isStubDraft, setIsStubDraft] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhotoEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const orgId = user?.orgId || 'default';
  const sitterId = user?.sitterId || '';

  const loadPendingPhotos = useCallback(async () => {
    if (!booking) return;
    const photos = await getPendingPhotosForBooking(booking.id);
    const entries: PendingPhotoEntry[] = photos.map((p) => ({
      id: p.id,
      objectUrl: URL.createObjectURL(p.blob),
    }));
    setPendingPhotos(entries);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- booking.id sufficient; full booking causes extra effect runs on parent re-renders
  }, [booking?.id]);

  useEffect(() => {
    if (!isOpen || !booking) return;
    setDraft('');
    setIsStubDraft(false);
    setLoading(false);
    setMediaUrls([]);
    setPendingPhotos([]);
    if (!isOnline) void loadPendingPhotos();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- booking?.id + loadPendingPhotos sufficient; full booking causes extra runs
  }, [isOpen, booking?.id, isOnline, loadPendingPhotos]);

  const pendingRef = useRef<PendingPhotoEntry[]>([]);
  pendingRef.current = pendingPhotos;
  useEffect(
    () => () => pendingRef.current.forEach((p) => URL.revokeObjectURL(p.objectUrl)),
    []
  );

  const totalCount = mediaUrls.length + pendingPhotos.length;
  const remaining = MAX_PHOTOS - totalCount;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !booking) return;
    if (remaining <= 0) {
      toastError(`Maximum ${MAX_PHOTOS} photos allowed`);
      return;
    }
    const toAdd = Array.from(files).slice(0, remaining);
    for (const f of toAdd) {
      if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        toastError(`${f.name} is too large (max ${MAX_SIZE_MB}MB)`);
        continue;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
        toastError(`${f.name}: only JPEG, PNG, WebP allowed`);
        continue;
      }
    }
    setUploading(true);
    try {
      if (isOnline) {
        const formData = new FormData();
        formData.set('bookingId', booking.id);
        toAdd.forEach((f) => formData.append('files', f));
        const res = await fetch('/api/upload/report-media', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toastError(data.error || 'Upload failed');
          return;
        }
        setMediaUrls((prev) => [...prev, ...(data.urls || [])].slice(0, MAX_PHOTOS));
        toastSuccess('Photos added');
      } else {
        for (const f of toAdd) {
          const id = await addPendingPhoto(booking.id, f, f.type);
          setPendingPhotos((prev) => {
            const next = [...prev, { id, objectUrl: URL.createObjectURL(f) }];
            return next.slice(0, MAX_PHOTOS);
          });
        }
        toastSuccess('Photos queued for upload — will sync when online');
        void refreshQueuedCount();
      }
    } catch {
      toastError('Failed to add photos');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removePhoto = (urlOrId: string) => {
    if (mediaUrls.includes(urlOrId)) {
      setMediaUrls((prev) => prev.filter((u) => u !== urlOrId));
      return;
    }
    const entry = pendingPhotos.find((p) => p.id === urlOrId || p.objectUrl === urlOrId);
    if (entry) {
      URL.revokeObjectURL(entry.objectUrl);
      void removePendingPhoto(entry.id);
      setPendingPhotos((prev) => prev.filter((p) => p.id !== entry.id));
    }
  };

  const generate = async () => {
    if (!booking) return;
    if (!isOnline) {
      const fallback = buildStubDelight(booking);
      setDraft(fallback);
      setIsStubDraft(true);
      toastInfo('Offline — using a local draft. Edit and send when ready.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/daily-delight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone, mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const fallback = buildStubDelight(booking);
        setDraft(fallback);
        setIsStubDraft(true);
        toastWarning('Could not generate right now. A local draft is ready.');
        return;
      }
      setDraft(typeof data.report === 'string' && data.report.trim() ? data.report : buildStubDelight(booking));
      setIsStubDraft(false);
      toastSuccess('Daily Delight generated');
    } catch {
      const fallback = buildStubDelight(booking);
      setDraft(fallback);
      setIsStubDraft(true);
      toastWarning('Could not generate right now. A local draft is ready.');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!draft.trim() || !booking) {
      toastError('Add or generate content first');
      return;
    }
    setSending(true);
    try {
      if (isOnline) {
        const res = await fetch(`/api/bookings/${booking.id}/daily-delight`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            report: draft.trim(),
            tone,
            mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toastError(data.error || 'Failed to send');
          return;
        }
        toastSuccess('Sent');
        onClose();
      } else {
        const photoIds = pendingPhotos.map((p) => p.id);
        await enqueueAction('delight.create', {
          orgId,
          sitterId,
          bookingId: booking.id,
          payload: { report: draft.trim(), tone, photoIds },
        });
        setPendingPhotos((prev) => {
          prev.forEach((p) => URL.revokeObjectURL(p.objectUrl));
          return [];
        });
        void refreshQueuedCount();
        toastSuccess('Queued — will sync when online');
        onClose();
      }
    } catch {
      toastError('Failed to send');
    } finally {
      setSending(false);
    }
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
          <Button variant="primary" size="md" onClick={() => void handleSend()} disabled={loading || sending || !draft.trim()}>
            {sending ? 'Sending…' : 'Send'}
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
          <div className="rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 p-4">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading || mediaUrls.length >= MAX_PHOTOS}
            />
            {(mediaUrls.length > 0 || pendingPhotos.length > 0) && (
              <div className="mb-3 flex flex-wrap gap-2">
                {mediaUrls.map((url) => (
                  <div key={url} className="relative">
                    <img
                      src={url}
                      alt="Report photo"
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(url)}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white hover:bg-red-600"
                      aria-label="Remove photo"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {pendingPhotos.map((p) => (
                  <div key={p.id} className="relative">
                    <img
                      src={p.objectUrl}
                      alt="Queued photo"
                      className="h-16 w-16 rounded-lg object-cover ring-2 ring-amber-400"
                    />
                    <span className="absolute bottom-0 left-0 right-0 rounded-b-lg bg-amber-900/80 px-1 py-0.5 text-[10px] text-amber-100">
                      Queued upload
                    </span>
                    <button
                      type="button"
                      onClick={() => removePhoto(p.id)}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white hover:bg-red-600"
                      aria-label="Remove photo"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || totalCount >= MAX_PHOTOS}
              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : totalCount >= MAX_PHOTOS ? `${MAX_PHOTOS} photos max` : 'Add photos (optional)'}
            </button>
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
