/**
 * Booking Edit API
 * 
 * Enterprise endpoint for editing bookings with validation, pricing, and audit logging.
 */

import { NextRequest, NextResponse } from 'next/server';
import { editBooking, type BookingEditInput } from '@/lib/booking-edit-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const updates: BookingEditInput = {
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      email: body.email,
      service: body.service,
      startAt: body.startAt,
      endAt: body.endAt,
      address: body.address,
      pickupAddress: body.pickupAddress,
      dropoffAddress: body.dropoffAddress,
      quantity: body.quantity,
      afterHours: body.afterHours,
      holiday: body.holiday,
      notes: body.notes,
      pets: body.pets,
      timeSlots: body.timeSlots,
      status: body.status,
    };

    const result = await editBooking(id, updates, request);

    if (result.success) {
      return NextResponse.json({
        success: true,
        booking: result.booking,
        changes: result.changes,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          errors: result.errors,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Failed to edit booking:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to edit booking',
      },
      { status: 500 }
    );
  }
}

