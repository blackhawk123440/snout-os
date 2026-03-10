'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AppCard,
  AppCardHeader,
  AppCardBody,
  AppPageHeader,
  AppSkeletonList,
  AppErrorState,
  AppStatusPill,
} from '@/components/app';

interface BookingDetail {
  id: string;
  service: string;
  startAt: string;
  endAt: string;
  status: string;
  paymentStatus?: string;
  totalPrice?: number;
  address: string | null;
  pets: Array<{ id: string; name?: string | null; species?: string | null }>;
  paymentProof?: {
    status: string;
    amount: number;
    paidAt: string;
    bookingReference: string;
    invoiceReference: string;
    paymentIntentId: string | null;
    currency: string;
    receiptLink: string | null;
  } | null;
}

export default function ClientBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Never treat "new" as a booking id: redirect to the client new-booking form
  useEffect(() => {
    if (id === 'new') {
      router.replace('/client/bookings/new');
      return;
    }
  }, [id, router]);

  const load = useCallback(async () => {
    if (!id || id === 'new') return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/client/bookings/${id}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Booking not found');
        setBooking(null);
        return;
      }
      setBooking(json);
    } catch {
      setError('Unable to load booking');
      setBooking(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  // Redirecting to /client/bookings/new; avoid rendering detail/error
  if (id === 'new') return null;

  return (
    <div className="mx-auto max-w-3xl pb-8">
      <AppPageHeader
        title="Booking details"
        subtitle={booking ? booking.service : ''}
        action={
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Back
          </button>
        }
      />
      {loading ? (
        <AppSkeletonList count={2} />
      ) : error ? (
        <AppErrorState title="Couldn't load booking" subtitle={error} onRetry={() => void load()} />
      ) : booking ? (
        <div className="flex flex-col gap-6">
          <AppCard>
            <AppCardHeader>
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-slate-900">{booking.service}</p>
                <AppStatusPill status={booking.status} />
              </div>
            </AppCardHeader>
            <AppCardBody>
              <p className="text-sm text-slate-700">{formatDate(booking.startAt)}</p>
              <p className="mt-1 text-sm tabular-nums text-slate-700">
                {formatTime(booking.startAt)} – {formatTime(booking.endAt)}
              </p>
              {booking.address && (
                <p className="mt-2 text-sm text-slate-500">{booking.address}</p>
              )}
              {booking.pets?.length > 0 && (
                <p className="mt-2 text-sm text-slate-500">
                  Pets: {booking.pets.map((p) => p.name || p.species || 'Pet').join(', ')}
                </p>
              )}
            </AppCardBody>
          </AppCard>
          <AppCard>
            <AppCardHeader>
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-slate-900">Payment completion</p>
                <AppStatusPill status={booking.paymentProof ? 'paid' : booking.paymentStatus || 'unpaid'} />
              </div>
            </AppCardHeader>
            <AppCardBody>
              {booking.paymentProof ? (
                <div className="space-y-1 text-sm text-slate-700">
                  <p>
                    Paid amount: <span className="font-semibold text-slate-900">${booking.paymentProof.amount.toFixed(2)}</span>
                  </p>
                  <p>Paid at: {new Date(booking.paymentProof.paidAt).toLocaleString()}</p>
                  <p>Booking ref: {booking.paymentProof.bookingReference}</p>
                  <p>Invoice ref: {booking.paymentProof.invoiceReference}</p>
                  {booking.paymentProof.receiptLink ? (
                    <a
                      href={booking.paymentProof.receiptLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex text-sm font-medium text-slate-700 underline underline-offset-2"
                    >
                      View receipt
                    </a>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-slate-600">Payment is not webhook-confirmed yet.</p>
              )}
            </AppCardBody>
          </AppCard>
        </div>
      ) : null}
    </div>
  );
}
