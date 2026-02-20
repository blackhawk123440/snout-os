/**
 * New Booking Page
 * 
 * Creates a new booking using the unified BookingForm component.
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/ui';
import { BookingForm } from '@/components/bookings/BookingForm';
import { tokens } from '@/lib/design-tokens';
import { BookingFormValues } from '@/lib/bookings/booking-form-mapper';
import { Modal } from '@/components/ui/Modal';
import { useMobile } from '@/lib/use-mobile';

export default function NewBookingPage() {
  const router = useRouter();
  const isMobile = useMobile();

  const handleSubmit = async (values: BookingFormValues) => {
    // Ensure startAt and endAt are valid ISO datetime strings
    const startAt = values.startAt ? new Date(values.startAt).toISOString() : new Date().toISOString();
    const endAt = values.endAt ? new Date(values.endAt).toISOString() : new Date(Date.now() + 3600000).toISOString();
    
    // Calculate minutes from duration
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);
    const minutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
    
    // Calculate selectedDates and dateTimes from startAt/endAt if not provided
    let selectedDates = values.selectedDates || [];
    let dateTimes = values.dateTimes || {};
    
    if (selectedDates.length === 0) {
      // Extract date from startAt (YYYY-MM-DD format)
      const startDateStr = startAt.split('T')[0];
      selectedDates = [startDateStr];
      
      // Extract time from startAt and convert to 12-hour format with AM/PM
      const startDateObj = new Date(startAt);
      const hours = startDateObj.getHours();
      const mins = startDateObj.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const hours12 = hours % 12 || 12;
      const startTime = `${hours12}:${String(mins).padStart(2, '0')} ${ampm}`;
      
      // Calculate duration in minutes (use the minutes variable from above)
      const duration = minutes > 0 ? minutes : 30; // Default to 30 minutes if invalid
      
      dateTimes = {
        [startDateStr]: [{
          time: startTime,
          duration: duration,
        }],
      };
    }
    
    // Calculate quantity based on service type
    // For house sitting: quantity = number of nights
    // For other services: quantity = 1 (or number of time slots if multiple)
    const isHouseSitting = values.service === 'Housesitting' || values.service === '24/7 Care';
    const quantity = isHouseSitting && selectedDates.length > 1 
      ? selectedDates.length - 1 
      : selectedDates.length > 0 
        ? selectedDates.length 
        : 1;
    
    // Ensure pets array has valid entries (filter out empty pets)
    const validPets = values.pets.filter(pet => pet.name && pet.name.trim() && pet.species && pet.species.trim());
    if (validPets.length === 0) {
      // Default to one pet if none provided
      validPets.push({ name: 'Pet', species: 'Dog' });
    }
    
    // Build payload matching form-to-booking-mapper format exactly
    const payload = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      phone: values.phone.trim(),
      email: values.email?.trim() || '',
      address: values.address?.trim() || null,
      pickupAddress: values.pickupAddress?.trim() || null,
      dropoffAddress: values.dropoffAddress?.trim() || null,
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

    // Submit to form endpoint (reuses existing validation and mapper)
    const response = await fetch('/api/form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create booking');
    }

    const data = await response.json();
    
    // Redirect to booking detail page
    router.push(`/bookings/${data.booking.id}`);
  };

  const handleCancel = () => {
    router.back();
  };

  if (isMobile) {
    // Mobile: Full page with bottom action bar
    return (
      <AppShell>
        <PageHeader 
          title="New Booking"
          description="Create a new booking"
        />
        <div style={{ 
          padding: tokens.spacing[4],
          paddingBottom: tokens.spacing[16], // Space for bottom action bar
        }}>
          <BookingForm
            mode="create"
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </div>
      </AppShell>
    );
  }

  // Desktop: Modal or full page (using full page for now)
  return (
    <AppShell>
      <PageHeader 
        title="New Booking"
        description="Create a new booking"
      />
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
      </div>
    </AppShell>
  );
}

