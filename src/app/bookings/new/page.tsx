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
    // Build payload matching form-to-booking-mapper format
    const payload = {
      firstName: values.firstName,
      lastName: values.lastName,
      phone: values.phone,
      email: values.email || '',
      address: values.address || '',
      pickupAddress: values.pickupAddress || '',
      dropoffAddress: values.dropoffAddress || '',
      service: values.service,
      startAt: values.startAt,
      endAt: values.endAt,
      pets: values.pets,
      notes: values.notes || '',
      specialInstructions: values.notes || '',
      additionalNotes: '',
      afterHours: values.afterHours || false,
      holiday: values.holiday || false,
      selectedDates: values.selectedDates || [],
      dateTimes: values.dateTimes || {},
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
          paddingBottom: tokens.spacing[24], // Space for bottom action bar
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

