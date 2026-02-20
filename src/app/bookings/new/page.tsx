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
    
    // Determine address requirements based on service type
    const isHouseSittingService = values.service === 'Housesitting' || values.service === '24/7 Care';
    const isPetTaxi = values.service === 'Pet Taxi';
    
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
      createdFrom: 'Admin Dashboard',
    };

    // Submit to form endpoint (reuses existing validation and mapper)
    const response = await fetch('/api/form', {
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
      
      // Otherwise use the general error message
      throw new Error(errorData.error || errorData.message || 'Failed to create booking');
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

