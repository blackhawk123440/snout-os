/**
 * WebflowBookingFormEmbed Component
 * 
 * Embeds the external Webflow booking form for create and edit modes.
 * Supports prefill via URL params or postMessage.
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { tokens } from '@/lib/design-tokens';
import { useMobile } from '@/lib/use-mobile';
import { Modal } from '@/components/ui/Modal';
import { BookingFormValues } from '@/lib/bookings/booking-form-mapper';

export interface WebflowBookingFormEmbedProps {
  mode: 'create' | 'edit';
  bookingId?: string;
  initialValues?: Partial<BookingFormValues>;
  onSuccess?: (bookingId: string) => void;
  onCancel?: () => void;
}

const WEBFLOW_FORM_URL = 'https://booking-form-u01h.onrender.com';

export const WebflowBookingFormEmbed: React.FC<WebflowBookingFormEmbedProps> = ({
  mode,
  bookingId,
  initialValues,
  onSuccess,
  onCancel,
}) => {
  const isMobile = useMobile();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Listen for postMessage from embedded form
    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security
      if (!event.origin.includes('booking-form-u01h.onrender.com')) {
        return;
      }

      // Handle form submission success
      if (event.data?.type === 'BOOKING_CREATED' || event.data?.type === 'BOOKING_UPDATED') {
        const newBookingId = event.data.bookingId || bookingId;
        if (newBookingId && onSuccess) {
          onSuccess(newBookingId);
        }
      }

      // Handle form cancel
      if (event.data?.type === 'BOOKING_FORM_CANCELLED') {
        if (onCancel) {
          onCancel();
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [bookingId, onSuccess, onCancel]);

  useEffect(() => {
    // Send prefill data to embedded form if in edit mode
    if (mode === 'edit' && iframeRef.current && initialValues) {
      const iframe = iframeRef.current;
      iframe.onload = () => {
        // Wait for iframe to be ready, then send prefill data
        setTimeout(() => {
          iframe.contentWindow?.postMessage({
            type: 'PREFILL_BOOKING_FORM',
            bookingId,
            data: initialValues,
          }, WEBFLOW_FORM_URL);
        }, 500);
      };
    }
  }, [mode, bookingId, initialValues]);

  // Build URL with query params for prefill (fallback if postMessage doesn't work)
  const buildFormUrl = () => {
    const url = new URL(WEBFLOW_FORM_URL);
    if (mode === 'edit' && bookingId) {
      url.searchParams.set('mode', 'edit');
      url.searchParams.set('bookingId', bookingId);
      if (initialValues) {
        // Add prefill params
        if (initialValues.firstName) url.searchParams.set('firstName', initialValues.firstName);
        if (initialValues.lastName) url.searchParams.set('lastName', initialValues.lastName);
        if (initialValues.phone) url.searchParams.set('phone', initialValues.phone);
        if (initialValues.email) url.searchParams.set('email', initialValues.email);
        if (initialValues.address) url.searchParams.set('address', initialValues.address);
        if (initialValues.service) url.searchParams.set('service', initialValues.service);
        if (initialValues.startAt) url.searchParams.set('startAt', initialValues.startAt);
        if (initialValues.endAt) url.searchParams.set('endAt', initialValues.endAt);
      }
    } else {
      url.searchParams.set('mode', 'create');
    }
    return url.toString();
  };

  const iframeContent = (
    <iframe
      ref={iframeRef}
      src={buildFormUrl()}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        borderRadius: tokens.borderRadius.md,
      }}
      title="Booking Form"
      allow="camera; microphone"
    />
  );

  if (isMobile) {
    // Mobile: Full screen modal
    return (
      <Modal
        isOpen={true}
        onClose={onCancel || (() => {})}
        title={mode === 'edit' ? 'Edit Booking' : 'New Booking'}
        size="full"
      >
        <div style={{ height: 'calc(100vh - 120px)', padding: tokens.spacing[2] }}>
          {iframeContent}
        </div>
      </Modal>
    );
  }

  // Desktop: Modal with fixed size
  return (
    <Modal
      isOpen={true}
      onClose={onCancel || (() => {})}
      title={mode === 'edit' ? 'Edit Booking' : 'New Booking'}
      size="xl"
    >
      <div style={{ height: '80vh', minHeight: '600px' }}>
        {iframeContent}
      </div>
    </Modal>
  );
};

