'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { OwnerAppShell, LayoutWrapper, PageHeader, Section } from '@/components/layout';
import { AppErrorState, getStatusPill } from '@/components/app';
import {
  Button,
  DataTableShell,
  EmptyState,
  Input,
  Select,
  StatusChip,
  Table,
  TableSkeleton,
  useToast,
} from '@/components/ui';

type Booking = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  service: string;
  startAt: string;
  endAt: string;
  status: string;
  paymentStatus: string;
  totalPrice: number;
  notes?: string | null;
  sitter?: { id: string; firstName: string; lastName: string } | null;
  client?: { id: string; firstName: string; lastName: string; email?: string | null; phone?: string | null } | null;
  pets?: Array<{ id: string; name: string; species: string }>;
  hasReport?: boolean;
  paymentProof?: {
    status: string;
    amount: number;
    paidAt: string;
    bookingReference: string;
    paymentReference: string;
    paymentIntentId: string | null;
    currency: string;
    receiptLink: string | null;
  } | null;
  calendarSyncProof?: {
    status: string;
    externalEventId: string | null;
    connectedCalendar: string | null;
    connectedAccount: string | null;
    lastSyncedAt: string | null;
    syncError: string | null;
    openInGoogleCalendarUrl: string | null;
  } | null;
  paymentMessageState?: {
    status: string;
    sentAt: string;
    providerMessageId: string | null;
    error: string | null;
  } | null;
  tipMessageState?: {
    status: string;
    sentAt: string;
    providerMessageId: string | null;
    error: string | null;
  } | null;
};

type EventItem = {
  id: string;
  type: string;
  source: 'event' | 'status';
  status?: string | null;
  message: string;
  createdAt: string;
};

export default function BookingDetailEnterprisePage() {
  const params = useParams<{ id: string }>();
  const bookingId = params.id;
  const { showToast } = useToast();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [sitters, setSitters] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [sitterId, setSitterId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bookingRes, eventsRes, sittersRes] = await Promise.all([
        fetch(`/api/bookings/${bookingId}`),
        fetch(`/api/bookings/${bookingId}/events`),
        fetch('/api/sitters?page=1&pageSize=200'),
      ]);
      const bookingJson = await bookingRes.json().catch(() => ({}));
      const eventsJson = await eventsRes.json().catch(() => ({}));
      const sittersJson = await sittersRes.json().catch(() => ({}));
      if (!bookingRes.ok) throw new Error(bookingJson.error || 'Failed to load booking');
      if (!eventsRes.ok) throw new Error(eventsJson.error || 'Failed to load events');
      setBooking(bookingJson.booking || null);
      setSitterId(bookingJson.booking?.sitter?.id || '');
      setEvents(Array.isArray(eventsJson.items) ? eventsJson.items : []);
      setSitters(Array.isArray(sittersJson.items) ? sittersJson.items : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load booking');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (bookingId) void load();
  }, [bookingId, load]);

  const filteredEvents = useMemo(() => {
    if (eventTypeFilter === 'all') return events;
    return events.filter((e) => e.type.toLowerCase().includes(eventTypeFilter.toLowerCase()));
  }, [events, eventTypeFilter]);
  const paymentProof = booking?.paymentProof ?? null;
  const calendarProof = booking?.calendarSyncProof ?? null;

  async function patchBooking(payload: Record<string, unknown>, successMessage: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Update failed');
      showToast({ variant: 'success', message: successMessage });
      await load();
    } catch (e) {
      showToast({ variant: 'error', message: e instanceof Error ? e.message : 'Update failed' });
    } finally {
      setBusy(false);
    }
  }

  async function runFix(type: 'automation_failure' | 'calendar_repair') {
    const target = events.find((e) => e.type.includes(type === 'automation_failure' ? 'automation' : 'calendar'));
    if (!target) {
      showToast({ variant: 'error', message: `No ${type} event found` });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/ops/command-center/attention/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: `${type}:${target.id.replace(/^event:/, '')}` }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Fix failed');
      showToast({ variant: 'success', message: 'Fix queued' });
      await load();
    } catch (e) {
      showToast({ variant: 'error', message: e instanceof Error ? e.message : 'Fix failed' });
    } finally {
      setBusy(false);
    }
  }

  async function sendBookingLink(kind: 'payment' | 'tip', forceResend = false) {
    setBusy(true);
    try {
      const endpoint = kind === 'payment' ? '/api/messages/send-payment-link' : '/api/messages/send-tip-link';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, forceResend }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Failed to send ${kind} link`);
      showToast({
        variant: 'success',
        message: json.deduped ? `${kind} link already sent recently` : `${kind} link sent`,
      });
      await load();
    } catch (e) {
      showToast({ variant: 'error', message: e instanceof Error ? e.message : `Failed to send ${kind} link` });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <OwnerAppShell>
        <LayoutWrapper variant="wide">
          <PageHeader title="Booking Ops Cockpit" subtitle="Loading booking..." />
          <TableSkeleton rows={8} cols={5} />
        </LayoutWrapper>
      </OwnerAppShell>
    );
  }

  if (error || !booking) {
    return (
      <OwnerAppShell>
        <LayoutWrapper variant="wide">
          <PageHeader title="Booking Ops Cockpit" subtitle="Unable to load booking" />
          <AppErrorState title="Couldn't load booking" subtitle={error || 'Unknown error'} onRetry={() => void load()} />
        </LayoutWrapper>
      </OwnerAppShell>
    );
  }

  return (
    <OwnerAppShell>
      <LayoutWrapper variant="wide">
        <PageHeader
          title={`Booking ${booking.firstName} ${booking.lastName}`}
          subtitle={`${new Date(booking.startAt).toLocaleString()} • ${booking.service}`}
          actions={
            <div className="flex gap-2">
              <Link href="/bookings"><Button variant="secondary">Back</Button></Link>
              <Link href={`/clients/${booking.client?.id || ''}`}><Button variant="secondary">Client</Button></Link>
              {booking.sitter?.id ? <Link href={`/sitters/${booking.sitter.id}`}><Button variant="secondary">Sitter</Button></Link> : null}
            </div>
          }
        />

        <Section title="Timeline">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border p-3"><div className="text-xs text-[var(--color-text-secondary)]">Created</div><div>{new Date(booking.startAt).toLocaleDateString()}</div></div>
            <div className="rounded-lg border p-3"><div className="text-xs text-[var(--color-text-secondary)]">Status</div><StatusChip ariaLabel={`Status ${getStatusPill(booking.status).label}`}>{getStatusPill(booking.status).label}</StatusChip></div>
            <div className="rounded-lg border p-3"><div className="text-xs text-[var(--color-text-secondary)]">Payment</div><StatusChip ariaLabel={`Payment ${getStatusPill(booking.paymentStatus).label}`}>{getStatusPill(booking.paymentStatus).label}</StatusChip></div>
            <div className="rounded-lg border p-3"><div className="text-xs text-[var(--color-text-secondary)]">Report</div><div>{booking.hasReport ? 'Submitted' : 'Not submitted'}</div></div>
          </div>
        </Section>

        <Section title="Proof Surfaces">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border p-3">
              <div className="mb-1 text-sm font-medium">Payment completion proof</div>
              {paymentProof ? (
                <div className="space-y-1 text-sm text-slate-700">
                  <div className="flex items-center gap-2">
                    <StatusChip ariaLabel="Payment paid">Paid</StatusChip>
                    <span className="font-semibold text-slate-900">${paymentProof.amount.toFixed(2)}</span>
                  </div>
                  <div>Paid at: {new Date(paymentProof.paidAt).toLocaleString()}</div>
                  <div>Booking ref: {paymentProof.bookingReference}</div>
                  <div>Invoice ref: {paymentProof.paymentReference}</div>
                  {paymentProof.paymentIntentId ? <div>Intent: {paymentProof.paymentIntentId}</div> : null}
                  {paymentProof.receiptLink ? (
                    <a
                      href={paymentProof.receiptLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex text-sm font-medium text-slate-700 underline underline-offset-2"
                    >
                      View receipt
                    </a>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-slate-600">No webhook-confirmed payment yet.</p>
              )}
              <div className="mt-3 rounded border border-slate-200 p-2 text-xs text-slate-700">
                <div className="font-medium">Payment link delivery</div>
                <div>Status: {booking.paymentMessageState?.status || 'not sent'}</div>
                <div>Sent: {booking.paymentMessageState?.sentAt ? new Date(booking.paymentMessageState.sentAt).toLocaleString() : 'N/A'}</div>
                {booking.paymentMessageState?.error ? <div className="text-red-700">Error: {booking.paymentMessageState.error}</div> : null}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="mb-1 text-sm font-medium">Google Calendar sync proof</div>
              <div className="space-y-1 text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <StatusChip ariaLabel={`Calendar sync ${calendarProof?.status || 'unknown'}`}>
                    {calendarProof?.status || 'unknown'}
                  </StatusChip>
                </div>
                <div>External event: {calendarProof?.externalEventId || 'N/A'}</div>
                <div>Connected calendar: {calendarProof?.connectedCalendar || 'N/A'}</div>
                <div>Connected account: {calendarProof?.connectedAccount || 'N/A'}</div>
                <div>
                  Last synced:{' '}
                  {calendarProof?.lastSyncedAt
                    ? new Date(calendarProof.lastSyncedAt).toLocaleString()
                    : 'N/A'}
                </div>
                {calendarProof?.syncError ? <div className="text-red-700">Error: {calendarProof.syncError}</div> : null}
                {calendarProof?.openInGoogleCalendarUrl ? (
                  <a
                    href={calendarProof.openInGoogleCalendarUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex text-sm font-medium text-slate-700 underline underline-offset-2"
                  >
                    Open in Google Calendar
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </Section>

        <Section title="Quick Actions">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border p-3">
              <div className="mb-2 text-sm font-medium">Assign sitter</div>
              <Select
                value={sitterId}
                options={[
                  { value: '', label: 'Unassigned' },
                  ...sitters.map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName}` })),
                ]}
                onChange={(e) => setSitterId(e.target.value)}
              />
              <Button className="mt-2 w-full" disabled={busy} onClick={() => void patchBooking({ sitterId: sitterId || null }, 'Sitter assignment updated')}>Save assignment</Button>
            </div>
            <div className="rounded-lg border p-3">
              <div className="mb-2 text-sm font-medium">Comms</div>
              <div className="flex flex-wrap gap-2">
                <a href={`tel:${booking.phone}`}><Button variant="secondary">Call client (ops exception)</Button></a>
                {booking.email ? <a href={`mailto:${booking.email}`}><Button variant="secondary">Email client</Button></a> : null}
                <Link href="/messages"><Button variant="secondary">Messages</Button></Link>
                <Button variant="secondary" disabled={busy} onClick={() => void sendBookingLink('payment')}>Send payment link</Button>
                <Button variant="secondary" disabled={busy} onClick={() => void sendBookingLink('payment', true)}>Resend payment</Button>
                <Button variant="secondary" disabled={busy} onClick={() => void sendBookingLink('tip')}>Send tip link</Button>
                <Button variant="secondary" disabled={busy} onClick={() => void sendBookingLink('tip', true)}>Resend tip</Button>
              </div>
              <div className="mt-2 text-xs text-slate-600">Direct calling is an owner/admin operational exception; normal service communication stays in masked inbox threads.</div>
              <div className="mt-2 text-xs text-slate-700">
                Tip link status: {booking.tipMessageState?.status || 'not sent'}
                {booking.tipMessageState?.error ? ` (error: ${booking.tipMessageState.error})` : ''}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="mb-2 text-sm font-medium">Ops</div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" disabled={busy} onClick={() => void patchBooking({ status: 'cancelled' }, 'Booking cancelled')}>Cancel</Button>
                <Link href={`/payments?bookingId=${booking.id}`}><Button variant="secondary">Refund</Button></Link>
                <Button variant="secondary" disabled={busy} onClick={() => void runFix('calendar_repair')}>Repair calendar</Button>
                <Button variant="secondary" disabled={busy} onClick={() => void runFix('automation_failure')}>Retry automation</Button>
              </div>
            </div>
          </div>
        </Section>

        <Section title="EventLog (last 50)" description="Filter and inspect execution history for this booking">
          <div className="mb-3 max-w-xs">
            <Input placeholder="Filter by type (automation, status, calendar...)" value={eventTypeFilter === 'all' ? '' : eventTypeFilter} onChange={(e) => setEventTypeFilter(e.target.value || 'all')} />
          </div>
          {filteredEvents.length === 0 ? (
            <EmptyState title="No events" description="No event records for this booking yet." />
          ) : (
            <DataTableShell stickyHeader>
              <Table<EventItem>
                forceTableLayout
                columns={[
                  { key: 'createdAt', header: 'Time', mobileOrder: 1, mobileLabel: 'Time', render: (r) => new Date(r.createdAt).toLocaleString() },
                  { key: 'type', header: 'Type', mobileOrder: 2, mobileLabel: 'Type' },
                  {
                    key: 'status',
                    header: 'Status',
                    mobileOrder: 3,
                    mobileLabel: 'Status',
                    render: (r) => <StatusChip>{r.status ? getStatusPill(r.status).label : 'N/A'}</StatusChip>,
                  },
                  { key: 'message', header: 'Message', mobileOrder: 4, mobileLabel: 'Message', hideBelow: 'md' },
                ]}
                data={filteredEvents}
                keyExtractor={(r) => r.id}
                emptyMessage="No events"
              />
            </DataTableShell>
          )}
        </Section>
      </LayoutWrapper>
    </OwnerAppShell>
  );
}

