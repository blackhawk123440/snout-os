'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LayoutWrapper, PageHeader } from '@/components/layout';
import { Button, Modal, StatusChip } from '@/components/ui';
import { toastError, toastSuccess, toastWarning } from '@/lib/toast';
import { VisitTimerDisplay } from '@/components/sitter';
import {
  getBookingPrimaryAction,
  getOptimisticStatus,
  shouldRenderCopyAddress,
  shouldRenderMail,
  shouldRenderTel,
} from './booking-detail-helpers';

type ChecklistType = 'arrived' | 'leash' | 'fed' | 'water' | 'meds' | 'locked_door';

interface BookingDetail {
  id: string;
  status: string;
  service: string;
  startAt: string;
  endAt: string;
  updatedAt: string;
  address: string | null;
  addressParts: { line1: string | null; line2: string | null; city: string | null; state: string | null; zip: string | null; full: string | null };
  mapLink: { apple: string | null; google: string | null };
  entryInstructions: string | null;
  doorCode: string | null;
  notes: string | null;
  totalPrice: number;
  clientName: string;
  client?: { firstName?: string; lastName?: string; phone?: string; email?: string | null; notes?: string | null };
  emergencyContact?: { name: string; phone: string; relationship?: string | null } | null;
  pets: Array<{ id: string; name?: string | null; species?: string | null; breed?: string | null; careNotes?: string | null; flags?: { hasMedication?: boolean; hasAllergies?: boolean } }>;
  threadId: string | null;
  supportPhone: string | null;
  timeline: {
    scheduledStart: string;
    scheduledEnd: string;
    checkedInAt: string | null;
    checkedOutAt: string | null;
    report: { hasReport: boolean; latestReportId: string | null; latestReportAt: string | null };
  };
  checklist: Array<{ type: ChecklistType; checkedAt: string | null }>;
}

const statusChipVariant = (status: string): 'info' | 'success' | 'warning' | 'neutral' | 'danger' => {
  if (status === 'in_progress') return 'info';
  if (status === 'completed') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'cancelled') return 'danger';
  return 'neutral';
};

const statusLabel = (status: string) => {
  if (status === 'pending' || status === 'confirmed') return 'Upcoming';
  if (status === 'in_progress') return 'Visit in progress';
  if (status === 'completed') return 'Visit complete';
  if (status === 'cancelled') return 'Cancelled';
  return status.replace('_', ' ');
};

const checklistLabel: Record<ChecklistType, string> = {
  arrived: 'Arrived',
  leash: 'Leash',
  fed: 'Fed',
  water: 'Water',
  meds: 'Meds',
  locked_door: 'Locked door',
};

const CHECKLIST_UNLOCK_WINDOW_MS = 5 * 60 * 1000;

export default function SitterBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyPrimary, setBusyPrimary] = useState(false);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

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

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const timeRange = useMemo(() => {
    if (!booking) return '';
    return `${new Date(booking.startAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${new Date(booking.endAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }, [booking]);

  const getGeo = (): Promise<{ lat: number; lng: number } | null> =>
    new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    });

  const runCheckAction = async (kind: 'start' | 'end') => {
    if (!booking) return;
    setBusyPrimary(true);
    const before = booking;
    const nowIso = new Date().toISOString();
    setBooking((prev) =>
      prev
        ? {
            ...prev,
            status: getOptimisticStatus(prev.status, kind),
            timeline: {
              ...prev.timeline,
              checkedInAt: kind === 'start' ? nowIso : prev.timeline.checkedInAt,
              checkedOutAt: kind === 'end' ? nowIso : prev.timeline.checkedOutAt,
            },
          }
        : prev
    );
    try {
      const geo = await getGeo();
      const body = geo ? JSON.stringify({ lat: geo.lat, lng: geo.lng }) : undefined;
      const res = await fetch(`/api/bookings/${booking.id}/${kind === 'start' ? 'check-in' : 'check-out'}`, {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBooking(before);
        toastError(data.error || `${kind === 'start' ? 'Start visit' : 'End visit'} failed`);
        return;
      }
      toastSuccess(kind === 'start' ? 'Visit started' : 'Visit ended');
      await loadBooking();
    } catch {
      setBooking(before);
      toastError(`${kind === 'start' ? 'Start visit' : 'End visit'} failed`);
    } finally {
      setBusyPrimary(false);
    }
  };

  const toggleChecklistItem = async (type: ChecklistType, checked: boolean) => {
    if (!booking) return;
    const prev = booking.checklist;
    setBooking((curr) =>
      curr
        ? {
            ...curr,
            checklist: curr.checklist.map((item) =>
              item.type === type ? { ...item, checkedAt: checked ? new Date().toISOString() : null } : item
            ),
          }
        : curr
    );
    const res = await fetch(`/api/sitter/bookings/${booking.id}/checklist`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, checked }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setBooking((curr) => (curr ? { ...curr, checklist: prev } : curr));
      toastError(data.error || 'Could not update checklist');
    }
  };

  const copyAddress = async () => {
    if (!booking?.addressParts?.full) return;
    try {
      await navigator.clipboard.writeText(booking.addressParts.full);
      toastSuccess('Address copied');
    } catch {
      toastError('Could not copy address');
    }
  };

  const primaryAction = (() => {
    if (!booking) return null;
    const action = getBookingPrimaryAction(booking.status, booking.timeline.report.hasReport);
    if (action === 'end') {
      return (
        <Button
          variant="primary"
          size="md"
          onClick={() => (isMobile ? setConfirmEndOpen(true) : void runCheckAction('end'))}
          disabled={busyPrimary}
        >
          End visit
        </Button>
      );
    }
    if (action === 'write_report') {
      return <Button variant="primary" size="md" onClick={() => router.push(`/sitter/reports/new?bookingId=${booking.id}`)}>Write report</Button>;
    }
    if (action === 'view_report') {
      return <Button variant="primary" size="md" onClick={() => booking.timeline.report.latestReportId ? router.push(`/sitter/reports/edit/${booking.timeline.report.latestReportId}`) : router.push('/sitter/reports')}>View report</Button>;
    }
    return <Button variant="primary" size="md" onClick={() => void runCheckAction('start')} disabled={busyPrimary}>Start visit</Button>;
  })();

  return (
    <LayoutWrapper variant="narrow" className="pb-28 md:pb-4">
      <PageHeader title="Booking execution" subtitle={booking ? `${booking.service} · ${booking.clientName}` : 'Loading...'} />

      {loading ? (
        <div className="animate-pulse space-y-4 rounded-xl border border-gray-200 bg-white p-4">
          <div className="h-6 w-48 rounded bg-gray-200" />
          <div className="h-4 w-full rounded bg-gray-100" />
          <div className="h-4 w-3/4 rounded bg-gray-100" />
        </div>
      ) : error || !booking ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-sm text-gray-600">{error || 'Booking not found'}</p>
          <Button variant="secondary" size="md" className="mt-4" onClick={() => router.push('/sitter/bookings')}>Back</Button>
        </div>
      ) : (
        <>
          <div className="hidden items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 md:flex">
            {primaryAction}
            {booking.threadId && <Button variant="secondary" size="md" onClick={() => router.push(`/sitter/inbox?thread=${encodeURIComponent(booking.threadId || '')}`)}>Message client</Button>}
            <span className="inline-flex min-h-[44px] items-center rounded-lg border border-neutral-300 px-4 text-sm font-medium text-neutral-800">Client calls routed via office</span>
            {shouldRenderTel(booking.supportPhone) && <a href={`tel:${booking.supportPhone}`} title="Intentional support exception" className="inline-flex min-h-[44px] items-center rounded-lg border border-neutral-300 px-4 text-sm font-medium text-neutral-800">Call support</a>}
          </div>

          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-lg font-semibold text-gray-900">{timeRange}</p>
            <VisitTimerDisplay
              status={booking.status}
              checkedInAt={booking.timeline.checkedInAt}
              checkedOutAt={booking.timeline.checkedOutAt}
              nowMs={nowMs}
              className="mt-1"
            />
            <p className="mt-1 text-sm text-gray-700">{booking.service}</p>
            <p className="mt-1 text-sm text-gray-600">{booking.pets.map((p) => p.name || p.species || 'Pet').join(', ')}</p>
            <div className="mt-2"><StatusChip variant={statusChipVariant(booking.status)}>{statusLabel(booking.status)}</StatusChip></div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-gray-900">Address + navigation</p>
            <div className="mt-2 space-y-1 text-sm text-gray-700">
              {booking.addressParts.line1 && <p className="break-words">{booking.addressParts.line1}</p>}
              {booking.addressParts.line2 && <p className="break-words">{booking.addressParts.line2}</p>}
              <p className="break-words">
                {[booking.addressParts.city, booking.addressParts.state, booking.addressParts.zip].filter(Boolean).join(', ')}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {booking.mapLink.google && <a href={booking.mapLink.google} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center rounded-lg border border-neutral-300 px-4 text-sm font-medium text-neutral-800">Open in Maps</a>}
              {shouldRenderCopyAddress(booking.addressParts.full) && <Button variant="secondary" size="md" onClick={() => void copyAddress()}>Copy address</Button>}
            </div>
            {(booking.doorCode || booking.entryInstructions) && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                {booking.doorCode && <p><span className="font-semibold">Door code:</span> {booking.doorCode}</p>}
                {booking.entryInstructions && <p className="mt-1 break-words">{booking.entryInstructions}</p>}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-gray-900">Pets</p>
            <div className="mt-2 space-y-2">
              {booking.pets.map((pet) => {
                return (
                  // ui-primitive-ok
                  <button key={pet.id} type="button" onClick={() => router.push(`/sitter/pets/${pet.id}`)} className="flex min-h-[44px] w-full items-start justify-between rounded-lg border border-gray-100 px-3 py-2 text-left hover:bg-gray-50">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">🐾 {pet.name || 'Pet'}{pet.species ? ` (${pet.species})` : ''}</p>
                      {pet.careNotes && <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">{pet.careNotes}</p>}
                    </div>
                    <div className="ml-2 flex shrink-0 gap-1">
                      {pet.flags?.hasMedication && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-800">Meds</span>}
                      {pet.flags?.hasAllergies && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-800">Allergy</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {booking.status === 'in_progress' && (
            <section className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-gray-900">Visit checklist</p>
              <div className="mt-2 space-y-2">
                {booking.checklist.map((item) => {
                  const checked = !!item.checkedAt;
                  const checkedAtMs = item.checkedAt ? new Date(item.checkedAt).getTime() : 0;
                  const canUncheck = checked && nowMs - checkedAtMs <= CHECKLIST_UNLOCK_WINDOW_MS;
                  const locked = checked && !canUncheck;
                  const subtitle = checked
                    ? `${checklistLabel[item.type]} · ${new Date(item.checkedAt!).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                    : checklistLabel[item.type];
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => {
                        if (!locked) void toggleChecklistItem(item.type, !checked);
                      }}
                      disabled={locked}
                      title={locked ? 'Locked' : undefined}
                      className={`flex min-h-[52px] w-full items-center justify-between rounded-lg border px-4 py-2 text-left text-sm ${
                        checked ? 'border-green-300 bg-green-50 text-green-800' : 'border-gray-200 bg-white text-gray-700'
                      } ${locked ? 'cursor-not-allowed opacity-80' : ''}`}
                    >
                      <div>
                        <p className="font-medium">{subtitle}</p>
                        {locked && <p className="text-[11px] text-amber-700">Locked</p>}
                      </div>
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-md border ${
                          checked ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300 bg-white text-transparent'
                        }`}
                        aria-hidden
                      >
                        ✓
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-gray-900">Notes</p>
            <div className="mt-2 space-y-2 text-sm text-gray-700">
              <p className="text-xs uppercase tracking-wide text-gray-500">Client contact</p>
              <div className="flex flex-wrap gap-3">
                <span className="text-gray-600">Use the masked inbox thread for client communication.</span>
                {shouldRenderMail(booking.client?.email) && (
                  <a href={`mailto:${booking.client?.email}`} className="break-all text-blue-700 underline underline-offset-2">
                    {booking.client?.email}
                  </a>
                )}
              </div>
              {booking.client?.notes && <p><span className="font-medium text-gray-900">Client:</span> {booking.client.notes}</p>}
              {booking.notes && <p><span className="font-medium text-gray-900">Booking:</span> {booking.notes}</p>}
              {!booking.client?.notes && !booking.notes && <p className="text-gray-500">No notes provided.</p>}
              <p className="text-xs text-gray-500">Last updated {new Date(booking.updatedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
            </div>
          </section>

          {booking.emergencyContact && (
            <section className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-900">Emergency contact</p>
              <p className="mt-1 text-sm text-red-900">{booking.emergencyContact.name}{booking.emergencyContact.relationship ? ` · ${booking.emergencyContact.relationship}` : ''}</p>
              <a href={`tel:${booking.emergencyContact.phone}`} title="Intentional emergency exception" className="mt-2 inline-flex min-h-[44px] items-center rounded-lg border border-red-300 bg-white px-4 text-sm font-medium text-red-900">
                {booking.emergencyContact.phone}
              </a>
            </section>
          )}
        </>
      )}

      {booking && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white/95 p-3 backdrop-blur md:hidden">
          <div className="flex flex-wrap gap-2">
            {primaryAction}
            {booking.threadId && <Button variant="secondary" size="md" onClick={() => router.push(`/sitter/inbox?thread=${encodeURIComponent(booking.threadId || '')}`)}>Message</Button>}
            <span className="inline-flex min-h-[44px] items-center rounded-lg border border-neutral-300 px-3 text-sm font-medium text-neutral-800">Client calls via office</span>
            {shouldRenderTel(booking.supportPhone) && <a href={`tel:${booking.supportPhone}`} title="Intentional support exception" className="inline-flex min-h-[44px] items-center rounded-lg border border-neutral-300 px-3 text-sm font-medium text-neutral-800">Support</a>}
          </div>
        </div>
      )}

      <Modal
        isOpen={confirmEndOpen}
        onClose={() => setConfirmEndOpen(false)}
        title="End visit?"
        footer={
          <>
            <Button variant="secondary" size="md" onClick={() => setConfirmEndOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setConfirmEndOpen(false);
                void runCheckAction('end');
              }}
            >
              End visit
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-700">
          End visit? This will stop the timer. You can still write/edit the report after.
        </p>
      </Modal>
    </LayoutWrapper>
  );
}
