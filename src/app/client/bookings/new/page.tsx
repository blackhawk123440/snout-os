/**
 * Client New Booking Page
 *
 * Client-owned booking form. Submits to /api/form; redirects to client booking detail.
 * Uses the same payload-building and date logic as the owner new booking page;
 * only createdFrom and redirect path differ.
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutWrapper, PageHeader } from '@/components/layout';
import { BookingForm } from '@/components/bookings/BookingForm';
import { BookingFormValues } from '@/lib/bookings/booking-form-mapper';
import { Button } from '@/components/ui';

export default function ClientNewBookingPage() {
  const router = useRouter();
  const [waitlistOffer, setWaitlistOffer] = useState<{
    service: string;
    date: string;
    timeStart: string;
    timeEnd: string;
  } | null>(null);
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);

  const handleJoinWaitlist = async () => {
    if (!waitlistOffer) return;
    setJoiningWaitlist(true);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: waitlistOffer.service,
          preferredDate: waitlistOffer.date,
          preferredTimeStart: waitlistOffer.timeStart,
          preferredTimeEnd: waitlistOffer.timeEnd,
          notes: '',
        }),
      });
      if (res.ok) {
        setWaitlistOffer(null);
        alert('You\'ve been added to the waitlist! We\'ll notify you when a spot opens up.');
        router.push('/client/bookings');
      } else {
        alert('Could not join waitlist. Please try again.');
      }
    } catch {
      alert('Could not join waitlist. Please try again.');
    } finally {
      setJoiningWaitlist(false);
    }
  };

  const handleSubmit = async (values: BookingFormValues) => {
    // Use selectedDates and dateTimes from form (matching booking-form.html structure)
    const selectedDates = values.selectedDates || [];
    const dateTimes = values.dateTimes || {};

    // Calculate startAt and endAt from selectedDates and dateTimes (matching HTML form logic)
    let startAt: string;
    let endAt: string;
    let minutes: number = 0;
    let quantity: number;

    const isHouseSitting = values.service === 'Housesitting' || values.service === '24/7 Care';

    if (isHouseSitting && selectedDates.length > 1) {
      // For house sitting: use first and last dates with times
      const sortedDates = [...selectedDates].sort();
      const firstDate = sortedDates[0];
      const lastDate = sortedDates[sortedDates.length - 1];

      // Get first time from first date
      const firstDateTimes = dateTimes[firstDate] || [];
      const firstTime = firstDateTimes.length > 0 ? firstDateTimes[0].time : '9:00 AM';

      // Convert 12-hour to 24-hour
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

      // Get last time from last date
      const lastDateTimes = dateTimes[lastDate] || [];
      const lastTime = lastDateTimes.length > 0
        ? lastDateTimes[lastDateTimes.length - 1].time
        : '11:30 PM';
      const lastTime24h = convertTo24Hour(lastTime);
      endAt = createDateInTimezone(lastDate, lastTime24h).toISOString();

      // Quantity for house sitting is number of nights (number of days - 1)
      quantity = sortedDates.length - 1;
      // For house sitting, minutes is not typically used, but set to 0
      minutes = 0;
    } else {
      // For other services: use provided startAt/endAt or calculate from first date/time
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

        // Quantity for other services is total time slots
        quantity = selectedDates.reduce((total, date) => {
          return total + (dateTimes[date]?.length || 0);
        }, 0) || 1;
      } else {
        // Fallback to provided values
        startAt = values.startAt ? new Date(values.startAt).toISOString() : new Date().toISOString();
        endAt = values.endAt ? new Date(values.endAt).toISOString() : new Date(Date.now() + 3600000).toISOString();
        const startDate = new Date(startAt);
        const endDate = new Date(endAt);
        minutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
        quantity = 1;
      }
    }

    // Ensure pets array has valid entries (filter out empty pets)
    const validPets = values.pets.filter(pet => pet.name && pet.name.trim() && pet.species && pet.species.trim());
    if (validPets.length === 0) {
      // Default to one pet if none provided
      validPets.push({ name: 'Pet', species: 'Dog' });
    }

    // For non-house-sitting, non-pet-taxi services, address is required
    // For Pet Taxi, pickupAddress and dropoffAddress are required
    // For house sitting, address is optional
    // Note: Keep as null if not provided - validation will catch missing required addresses
    const address = values.address?.trim() || null;
    const pickupAddress = values.pickupAddress?.trim() || null;
    const dropoffAddress = values.dropoffAddress?.trim() || null;

    // Ensure email is either valid email or empty string (not null)
    const email = values.email?.trim() || '';

    // Build payload matching form-to-booking-mapper format exactly
    const payload = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      phone: values.phone.trim(),
      email: email, // Empty string or valid email
      address: address, // null for house sitting/pet taxi, string for others
      pickupAddress: pickupAddress, // Required for Pet Taxi
      dropoffAddress: dropoffAddress, // Required for Pet Taxi
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
      createdFrom: 'Client Portal',
    };

    // Submit to authenticated client booking endpoint (SaaS-safe, org-scoped)
    const response = await fetch('/api/client/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();

      // If there are structured validation errors, format them nicely
      if (errorData.errors && Array.isArray(errorData.errors)) {
        const errorMessages = errorData.errors.map((err: any) => {
          const field = err.field || 'unknown';
          const message = err.message || 'Validation error';
          return `${field}: ${message}`;
        }).join('\n');
        throw new Error(`Validation failed:\n${errorMessages}`);
      }

      // If the error is about no sitters available, offer waitlist
      const errorMsg = errorData.error || errorData.message || '';
      if (/no.*sitter|unavailable|no.*available|fully.*booked/i.test(errorMsg)) {
        const selectedDates = values.selectedDates || [];
        const firstDate = selectedDates[0] || new Date().toISOString().slice(0, 10);
        const dateTimes = values.dateTimes || {};
        const firstSlot = dateTimes[firstDate]?.[0];
        setWaitlistOffer({
          service: values.service,
          date: firstDate,
          timeStart: firstSlot?.time || '9:00 AM',
          timeEnd: firstSlot?.time || '5:00 PM',
        });
      }

      throw new Error(errorMsg || 'Failed to create booking');
    }

    const data = await response.json();

    // Redirect to client booking detail page
    router.push(`/client/bookings/${data.booking.id}`);
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <LayoutWrapper variant="narrow">
      <PageHeader title="Book a visit" subtitle="Request a new pet care visit" />
      {waitlistOffer && (
        <div className="mx-4 mb-4 rounded-xl border border-yellow-300 bg-yellow-50 p-4">
          <p className="text-sm font-medium text-yellow-900">No sitters available for this time</p>
          <p className="mt-1 text-sm text-yellow-700">
            Join the waitlist for {waitlistOffer.service} on{' '}
            {new Date(waitlistOffer.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            {' '}and we'll notify you when a spot opens up.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={handleJoinWaitlist} disabled={joiningWaitlist}>
              {joiningWaitlist ? 'Joining...' : 'Join Waitlist'}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setWaitlistOffer(null)}>
              Dismiss
            </Button>
          </div>
        </div>
      )}
      <div className="p-4 pb-8">
        <BookingForm mode="create" onSubmit={handleSubmit} onCancel={handleCancel} />
      </div>
    </LayoutWrapper>
  );
}
