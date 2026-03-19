/**
 * New Booking Page
 *
 * Creates a new booking using the unified BookingForm component.
 * After creation, shows confirmation with payment link send option.
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { OwnerAppShell, LayoutWrapper, PageHeader, Section } from '@/components/layout';
import { BookingForm } from '@/components/bookings/BookingForm';
import { tokens } from '@/lib/design-tokens';
import { BookingFormValues } from '@/lib/bookings/booking-form-mapper';
import { useMobile } from '@/lib/use-mobile';
import { toastSuccess, toastError, toastWarning } from '@/lib/toast';
import { Button } from '@/components/ui';

interface CreatedBooking {
  id: string;
  service: string;
  startAt: string;
  totalPrice: number;
  firstName: string;
  lastName: string;
  phone: string;
}

export default function NewBookingPage() {
  const router = useRouter();
  const isMobile = useMobile();
  const [sendPaymentLink, setSendPaymentLink] = useState(true);
  const [created, setCreated] = useState<CreatedBooking | null>(null);
  const [paymentLinkSent, setPaymentLinkSent] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);

  const sendPaymentLinkForBooking = async (bookingId: string) => {
    setSendingLink(true);
    try {
      const res = await fetch('/api/messages/send-payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      });
      if (res.ok) {
        setPaymentLinkSent(true);
        toastSuccess('Payment link sent');
      } else {
        const json = await res.json().catch(() => ({}));
        toastWarning(json.error || 'Payment link could not be sent');
      }
    } catch {
      toastWarning('Payment link could not be sent');
    } finally {
      setSendingLink(false);
    }
  };

  const handleSubmit = async (values: BookingFormValues) => {
    const selectedDates = values.selectedDates || [];
    const dateTimes = values.dateTimes || {};

    let startAt: string;
    let endAt: string;
    let minutes: number = 0;
    let quantity: number;

    const isHouseSitting = values.service === 'Housesitting' || values.service === '24/7 Care';

    if (isHouseSitting && selectedDates.length > 1) {
      const sortedDates = [...selectedDates].sort();
      const firstDate = sortedDates[0];
      const lastDate = sortedDates[sortedDates.length - 1];

      const firstDateTimes = dateTimes[firstDate] || [];
      const firstTime = firstDateTimes.length > 0 ? firstDateTimes[0].time : '9:00 AM';

      const convertTo24Hour = (time12h: string): string => {
        const [time, modifier] = time12h.split(' ');
        let [hours, minutes] = time.split(':');
        if (hours === '12') hours = '00';
        if (modifier === 'PM') hours = String(parseInt(hours, 10) + 12).padStart(2, '0');
        return `${String(hours).padStart(2, '0')}:${minutes}:00`;
      };

      const createDateInTimezone = (dateStr: string, time24h: string): Date => {
        const [year, month, day] = dateStr.split('-').map(Number);
        const [hours, mins] = time24h.split(':').map(Number);
        const isoString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00.000Z`;
        return new Date(isoString);
      };

      const firstTime24h = convertTo24Hour(firstTime);
      startAt = createDateInTimezone(firstDate, firstTime24h).toISOString();

      const lastDateTimes = dateTimes[lastDate] || [];
      const lastTime = lastDateTimes.length > 0
        ? lastDateTimes[lastDateTimes.length - 1].time
        : '11:30 PM';
      const lastTime24h = convertTo24Hour(lastTime);
      endAt = createDateInTimezone(lastDate, lastTime24h).toISOString();

      quantity = sortedDates.length - 1;
      minutes = 0;
    } else {
      if (selectedDates.length > 0 && dateTimes[selectedDates[0]]?.length > 0) {
        const firstDate = selectedDates[0];
        const firstTimeEntry = dateTimes[firstDate][0];
        const duration = firstTimeEntry.duration || 30;

        const convertTo24Hour = (time12h: string): string => {
          const [time, modifier] = time12h.split(' ');
          let [hours, minutes] = time.split(':');
          if (hours === '12') hours = '00';
          if (modifier === 'PM') hours = String(parseInt(hours, 10) + 12).padStart(2, '0');
          return `${String(hours).padStart(2, '0')}:${minutes}:00`;
        };

        const createDateInTimezone = (dateStr: string, time24h: string): Date => {
          const [year, month, day] = dateStr.split('-').map(Number);
          const [hours, mins] = time24h.split(':').map(Number);
          const isoString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00.000Z`;
          return new Date(isoString);
        };

        const firstTime24h = convertTo24Hour(firstTimeEntry.time);
        const startDateTime = createDateInTimezone(firstDate, firstTime24h);
        startAt = startDateTime.toISOString();
        endAt = new Date(startDateTime.getTime() + duration * 60000).toISOString();
        minutes = duration;

        quantity = selectedDates.reduce((total, date) => {
          return total + (dateTimes[date]?.length || 0);
        }, 0) || 1;
      } else {
        startAt = values.startAt ? new Date(values.startAt).toISOString() : new Date().toISOString();
        endAt = values.endAt ? new Date(values.endAt).toISOString() : new Date(Date.now() + 3600000).toISOString();
        const startDate = new Date(startAt);
        const endDate = new Date(endAt);
        minutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
        quantity = 1;
      }
    }

    const validPets = values.pets.filter(pet => pet.name && pet.name.trim() && pet.species && pet.species.trim());
    if (validPets.length === 0) {
      validPets.push({ name: 'Pet', species: 'Dog' });
    }

    const address = values.address?.trim() || null;
    const pickupAddress = values.pickupAddress?.trim() || null;
    const dropoffAddress = values.dropoffAddress?.trim() || null;
    const email = values.email?.trim() || '';

    const payload = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      phone: values.phone.trim(),
      email: email,
      address: address,
      pickupAddress: pickupAddress,
      dropoffAddress: dropoffAddress,
      service: values.service,
      startAt: startAt,
      endAt: endAt,
      minutes: minutes > 0 ? minutes : undefined,
      quantity: quantity,
      pets: validPets.map(pet => ({
        name: pet.name.trim(),
        species: pet.species.trim(),
      })),
      notes: values.notes?.trim() || null,
      specialInstructions: values.notes?.trim() || null,
      additionalNotes: null,
      selectedDates: selectedDates,
      dateTimes: dateTimes,
      afterHours: values.afterHours || false,
      holiday: values.holiday || false,
      createdFrom: 'Admin Dashboard',
    };

    const response = await fetch('/api/form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();

      if (errorData.errors && Array.isArray(errorData.errors)) {
        const errorMessages = errorData.errors.map((err: any) => {
          const field = err.field || 'unknown';
          const message = err.message || 'Validation error';
          return `${field}: ${message}`;
        }).join('\n');
        throw new Error(`Validation failed:\n${errorMessages}`);
      }

      throw new Error(errorData.error || errorData.message || 'Failed to create booking');
    }

    const data = await response.json();
    const bookingData: CreatedBooking = {
      id: data.booking.id,
      service: payload.service,
      startAt: startAt,
      totalPrice: data.booking.totalPrice || 0,
      firstName: payload.firstName,
      lastName: payload.lastName,
      phone: payload.phone,
    };
    setCreated(bookingData);

    // Auto-send payment link if toggle is on
    if (sendPaymentLink && bookingData.totalPrice > 0) {
      void sendPaymentLinkForBooking(bookingData.id);
    } else {
      toastSuccess('Booking created');
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const maskPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 4) return `(***) ***-${digits.slice(-4)}`;
    return phone;
  };

  // Post-creation confirmation screen
  if (created) {
    return (
      <OwnerAppShell>
        <LayoutWrapper variant="wide">
          <div className="mx-auto max-w-lg py-12">
            <div className="rounded-xl border border-border-default bg-surface-primary p-6 text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-status-success-bg text-2xl mb-4">
                {'\u2705'}
              </div>
              <h2 className="text-xl font-bold text-text-primary">Booking Created</h2>
              <div className="mt-4 space-y-1 text-sm text-text-secondary">
                <p className="font-medium text-text-primary">{created.service}</p>
                <p>{formatDate(created.startAt)} at {formatTime(created.startAt)}</p>
                {created.totalPrice > 0 && (
                  <p className="text-lg font-bold text-text-primary">${created.totalPrice.toFixed(2)}</p>
                )}
              </div>

              {paymentLinkSent && (
                <div className="mt-4 rounded-lg bg-surface-secondary p-3">
                  <p className="text-sm text-text-secondary">
                    {'\ud83d\udcf1'} Payment link sent to {created.firstName} {created.lastName.charAt(0)}. at {maskPhone(created.phone)}
                  </p>
                </div>
              )}

              <div className="mt-6 flex flex-col gap-2">
                {!paymentLinkSent && created.totalPrice > 0 && (
                  <button
                    type="button"
                    onClick={() => void sendPaymentLinkForBooking(created.id)}
                    disabled={sendingLink}
                    className="min-h-[44px] rounded-lg bg-accent-primary px-4 text-sm font-semibold text-text-inverse hover:opacity-90 transition disabled:opacity-50"
                  >
                    {sendingLink ? 'Sending\u2026' : 'Send payment link'}
                  </button>
                )}
                {paymentLinkSent && (
                  <button
                    type="button"
                    onClick={() => void sendPaymentLinkForBooking(created.id)}
                    disabled={sendingLink}
                    className="min-h-[44px] rounded-lg border border-border-default bg-surface-primary px-4 text-sm font-medium text-text-secondary hover:bg-surface-secondary transition disabled:opacity-50"
                  >
                    {sendingLink ? 'Sending\u2026' : 'Send again'}
                  </button>
                )}
                <Link href={`/bookings/${created.id}`}>
                  <button type="button" className="w-full min-h-[44px] rounded-lg border border-border-default bg-surface-primary px-4 text-sm font-medium text-text-primary hover:bg-surface-secondary transition">
                    View booking
                  </button>
                </Link>
                <button
                  type="button"
                  onClick={() => { setCreated(null); setPaymentLinkSent(false); }}
                  className="min-h-[44px] text-sm font-medium text-accent-primary hover:underline"
                >
                  Create another booking
                </button>
              </div>
            </div>
          </div>
        </LayoutWrapper>
      </OwnerAppShell>
    );
  }

  // Send payment link toggle
  const paymentToggle = (
    <label className="flex items-center gap-3 rounded-xl border border-border-default bg-surface-primary px-4 py-3 cursor-pointer mt-4">
      <input
        type="checkbox"
        checked={sendPaymentLink}
        onChange={(e) => setSendPaymentLink(e.target.checked)}
        className="h-5 w-5 rounded border-border-default text-accent-primary focus:ring-border-focus"
      />
      <div>
        <p className="text-sm font-medium text-text-primary">Send payment link via SMS</p>
        <p className="text-xs text-text-tertiary">Client receives a Stripe payment link immediately after booking</p>
      </div>
    </label>
  );

  if (isMobile) {
    return (
      <OwnerAppShell>
        <LayoutWrapper variant="wide">
          <PageHeader title="New Booking" subtitle="Create a new booking" />
          <Section>
            <div style={{
              padding: tokens.spacing[4],
              paddingBottom: tokens.spacing[16],
            }}>
              <BookingForm
                mode="create"
                onSubmit={handleSubmit}
                onCancel={handleCancel}
              />
              {paymentToggle}
            </div>
          </Section>
        </LayoutWrapper>
      </OwnerAppShell>
    );
  }

  return (
    <OwnerAppShell>
      <LayoutWrapper variant="wide">
        <PageHeader title="New Booking" subtitle="Create a new booking" />
        <Section>
          <div style={{
            padding: tokens.spacing[6],
            maxWidth: '1200px',
            margin: '0 auto',
          }}>
            <BookingForm
              mode="create"
              onSubmit={handleSubmit}
              onCancel={handleCancel}
            />
            {paymentToggle}
          </div>
        </Section>
      </LayoutWrapper>
    </OwnerAppShell>
  );
}
