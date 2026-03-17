'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui';
import { SitterPageHeader, SitterEmptyState } from '@/components/sitter';
import { toastSuccess, toastError } from '@/lib/toast';

const MAX_PHOTOS = 5;
const ACCEPT = 'image/jpeg,image/png,image/webp';

interface BookingOption {
  id: string;
  service: string;
  startAt: string;
  clientName: string;
  pets: Array<{ id: string; name?: string | null; species?: string | null }>;
}

export default function SitterReportNewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingIdParam = searchParams.get('bookingId');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bookings, setBookings] = useState<BookingOption[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(bookingIdParam);
  const [walkDuration, setWalkDuration] = useState('');
  const [potty, setPotty] = useState('');
  const [food, setFood] = useState('');
  const [water, setWater] = useState('');
  const [medication, setMedication] = useState('');
  const [notes, setNotes] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadBookings = useCallback(async () => {
    setLoadingBookings(true);
    try {
      const res = await fetch('/api/sitter/bookings');
      const json = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(json.bookings)) {
        const list = json.bookings
          .filter((b: { status: string }) => b.status === 'completed')
          .slice(0, 30);
        setBookings(list);
        setSelectedBookingId((prev) => {
          if (bookingIdParam && list.some((b: { id: string }) => b.id === bookingIdParam)) return bookingIdParam;
          if (list.length > 0 && !prev) return list[0].id;
          return prev;
        });
      } else {
        setBookings([]);
      }
    } catch {
      setBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  }, [bookingIdParam]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    if (bookingIdParam) setSelectedBookingId(bookingIdParam);
  }, [bookingIdParam]);

  const selectedBooking = bookings.find((b) => b.id === selectedBookingId);

  const buildReportText = () => {
    const parts: string[] = [];
    if (walkDuration.trim()) parts.push(`Walk: ${walkDuration.trim()} min`);
    if (potty.trim()) parts.push(`Potty: ${potty.trim()}`);
    if (food.trim()) parts.push(`Food: ${food.trim()}`);
    if (water.trim()) parts.push(`Water: ${water.trim()}`);
    if (medication.trim()) parts.push(`Medication: ${medication.trim()}`);
    if (notes.trim()) parts.push(`Notes: ${notes.trim()}`);
    return parts.join('. ') || 'Visit completed.';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !selectedBookingId) return;
    const remaining = MAX_PHOTOS - mediaUrls.length;
    if (remaining <= 0) {
      toastError(`Maximum ${MAX_PHOTOS} photos`);
      return;
    }
    const toAdd = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set('bookingId', selectedBookingId);
      toAdd.forEach((f) => formData.append('files', f));
      const res = await fetch('/api/upload/report-media', { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toastError(data.error || 'Upload failed');
        return;
      }
      setMediaUrls((prev) => [...prev, ...(data.urls || [])].slice(0, MAX_PHOTOS));
      toastSuccess('Photos added');
    } catch {
      toastError('Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removePhoto = (url: string) => {
    setMediaUrls((prev) => prev.filter((u) => u !== url));
  };

  const [sentReportId, setSentReportId] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedBookingId) {
      toastError('Select a visit');
      return;
    }
    const reportText = buildReportText();
    setSubmitting(true);
    setSentReportId(null);
    try {
      const res = await fetch(`/api/bookings/${selectedBookingId}/daily-delight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report: reportText,
          mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toastError(data.error || 'Failed to submit report');
        return;
      }
      toastSuccess('Sent to client');
      setSentReportId(data.reportId ?? null);
    } catch {
      toastError('Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  if (loadingBookings) {
    return (
      <div className="mx-auto max-w-2xl pb-8">
        <SitterPageHeader title="New report" subtitle="Loading…" />
        <div className="h-32 animate-pulse rounded-xl bg-surface-tertiary" />
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="mx-auto max-w-2xl pb-8">
        <SitterPageHeader title="New report" subtitle="No completed visits" />
        <SitterEmptyState
          title="No completed visits"
          subtitle="Complete a visit first, then you can submit a report."
          cta={{ label: 'Today', onClick: () => router.push('/sitter/today') }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl pb-8">
      <SitterPageHeader
        title="New report"
        subtitle="Visit report for client"
        action={
          <Button variant="secondary" size="sm" onClick={() => router.back()}>
            Cancel
          </Button>
        }
      />

      <div className="space-y-6">
        <div>
          <label className="mb-2 block text-sm font-medium text-text-secondary">Visit</label>
          <select
            value={selectedBookingId ?? ''}
            onChange={(e) => setSelectedBookingId(e.target.value || null)}
            className="w-full rounded-xl border border-border-strong bg-surface-primary px-4 py-3 text-sm text-text-primary outline-none focus:border-border-focus focus:ring-2 focus:ring-border-focus/20"
          >
            {bookings.map((b) => (
              <option key={b.id} value={b.id}>
                {formatDate(b.startAt)} · {b.service} · {b.clientName}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border border-border-default bg-surface-primary p-4">
          <p className="mb-3 text-sm font-medium text-text-secondary">Visit details</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-text-tertiary">Walk duration (min)</label>
              <input
                type="text"
                inputMode="numeric"
                value={walkDuration}
                onChange={(e) => setWalkDuration(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 20"
                className="w-full rounded-lg border border-border-strong px-3 py-2.5 text-sm outline-none focus:border-border-focus"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-tertiary">Potty</label>
              <input
                type="text"
                value={potty}
                onChange={(e) => setPotty(e.target.value)}
                placeholder="e.g. normal"
                className="w-full rounded-lg border border-border-strong px-3 py-2.5 text-sm outline-none focus:border-border-focus"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-tertiary">Food</label>
              <input
                type="text"
                value={food}
                onChange={(e) => setFood(e.target.value)}
                placeholder="e.g. ate well"
                className="w-full rounded-lg border border-border-strong px-3 py-2.5 text-sm outline-none focus:border-border-focus"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-tertiary">Water</label>
              <input
                type="text"
                value={water}
                onChange={(e) => setWater(e.target.value)}
                placeholder="e.g. refreshed"
                className="w-full rounded-lg border border-border-strong px-3 py-2.5 text-sm outline-none focus:border-border-focus"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="mb-1 block text-xs text-text-tertiary">Medication</label>
            <input
              type="text"
              value={medication}
              onChange={(e) => setMedication(e.target.value)}
              placeholder="e.g. given as directed"
              className="w-full rounded-lg border border-border-strong px-3 py-2.5 text-sm outline-none focus:border-border-focus"
            />
          </div>
          <div className="mt-4">
            <label className="mb-1 block text-xs text-text-tertiary">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any other details…"
              rows={3}
              className="w-full rounded-lg border border-border-strong px-3 py-2.5 text-sm outline-none focus:border-border-focus"
            />
          </div>
        </div>

        <div className="rounded-xl border border-border-default bg-surface-primary p-4">
          <p className="mb-2 text-sm font-medium text-text-secondary">Photos (optional)</p>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading || mediaUrls.length >= MAX_PHOTOS}
          />
          {mediaUrls.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {mediaUrls.map((url) => (
                <div key={url} className="relative">
                  <img src={url} alt="Report" className="h-20 w-20 rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(url)}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white"
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
            disabled={uploading || mediaUrls.length >= MAX_PHOTOS}
            className="w-full rounded-lg border border-border-strong bg-surface-primary py-3 text-sm font-medium text-text-secondary transition hover:bg-surface-secondary disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : mediaUrls.length >= MAX_PHOTOS ? `${MAX_PHOTOS} photos max` : 'Add photos'}
          </button>
        </div>

        {sentReportId && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="font-semibold text-green-800">Sent to client</p>
            <p className="mt-0.5 text-sm text-green-700">The client will see this in their Latest report.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push(`/sitter/reports/edit/${sentReportId}`)}
              >
                Edit (15 min)
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push('/sitter/reports')}
              >
                Back to reports
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => void handleSubmit()}
            disabled={submitting || !!sentReportId}
            className="min-h-[44px] flex-1"
          >
            {submitting ? 'Submitting…' : sentReportId ? 'Sent' : 'Submit report'}
          </Button>
          <Button variant="secondary" size="md" onClick={() => router.back()} className="min-h-[44px]" disabled={!!sentReportId}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
