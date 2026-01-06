/**
 * Booking Edit Service
 * 
 * Enterprise service layer for editing bookings with:
 * - Validation using existing form schema
 * - Pricing recalculation
 * - Audit logging
 * - Status history tracking
 * - Diff detection for high-risk changes
 */

import { prisma } from './db';
import { validateFormPayload, type FormBookingPayload } from './validation/form-booking';
import { calculateBookingPrice } from './rates';
import { logBookingStatusChange } from './booking-status-history';
import { logEvent } from './event-logger';
import { getCurrentUserSafe } from './auth-helpers';
import { NextRequest } from 'next/server';
import { calculateCanonicalPricing, type PricingEngineInput } from './pricing-engine-v1';
import { serializePricingSnapshot } from './pricing-snapshot-helpers';
import { env } from './env';

export interface BookingEditInput {
  // Client info
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string | null;
  
  // Service and schedule
  service?: string;
  startAt?: Date | string;
  endAt?: Date | string;
  quantity?: number;
  afterHours?: boolean;
  holiday?: boolean;
  
  // Addresses
  address?: string | null;
  pickupAddress?: string | null;
  dropoffAddress?: string | null;
  
  // Pets
  pets?: Array<{
    id?: string;
    name: string;
    species: string;
    breed?: string | null;
    age?: number | null;
    notes?: string | null;
  }>;
  
  // Time slots
  timeSlots?: Array<{
    id?: string;
    startAt: Date | string;
    endAt: Date | string;
    duration: number;
  }>;
  
  // Notes
  notes?: string | null;
  
  // Status
  status?: string;
}

export type BookingEditResult = {
  success: true;
  booking: any;
  changes: {
    fields: string[];
    highRisk: boolean;
    pricingChanged: boolean;
    oldPrice?: number;
    newPrice?: number;
  };
} | {
  success: false;
  error: string;
  errors?: Array<{ field: string; message: string }>;
};

/**
 * Detect high-risk changes that require diff review
 */
function detectHighRiskChanges(
  original: any,
  updated: BookingEditInput
): { isHighRisk: boolean; changedFields: string[] } {
  const changedFields: string[] = [];
  let isHighRisk = false;

  // Schedule changes
  if (updated.startAt && new Date(updated.startAt).getTime() !== new Date(original.startAt).getTime()) {
    changedFields.push('startAt');
    isHighRisk = true;
  }
  if (updated.endAt && new Date(updated.endAt).getTime() !== new Date(original.endAt).getTime()) {
    changedFields.push('endAt');
    isHighRisk = true;
  }

  // Service type changes
  if (updated.service && updated.service !== original.service) {
    changedFields.push('service');
    isHighRisk = true;
  }

  // Pet quantity changes
  const originalPetCount = original.pets?.length || 0;
  const updatedPetCount = updated.pets?.length || 0;
  if (updatedPetCount !== originalPetCount) {
    changedFields.push('pets');
    isHighRisk = true;
  }

  // Address changes
  if (updated.address !== undefined && updated.address !== original.address) {
    changedFields.push('address');
    isHighRisk = true;
  }
  if (updated.pickupAddress !== undefined && updated.pickupAddress !== original.pickupAddress) {
    changedFields.push('pickupAddress');
    isHighRisk = true;
  }
  if (updated.dropoffAddress !== undefined && updated.dropoffAddress !== original.dropoffAddress) {
    changedFields.push('dropoffAddress');
    isHighRisk = true;
  }

  // Other changes (not high risk but tracked)
  if (updated.firstName && updated.firstName !== original.firstName) changedFields.push('firstName');
  if (updated.lastName && updated.lastName !== original.lastName) changedFields.push('lastName');
  if (updated.phone && updated.phone !== original.phone) changedFields.push('phone');
  if (updated.email !== undefined && updated.email !== original.email) changedFields.push('email');
  if (updated.notes !== undefined && updated.notes !== original.notes) changedFields.push('notes');
  if (updated.quantity !== undefined && updated.quantity !== original.quantity) changedFields.push('quantity');
  if (updated.afterHours !== undefined && updated.afterHours !== original.afterHours) changedFields.push('afterHours');
  if (updated.holiday !== undefined && updated.holiday !== original.holiday) changedFields.push('holiday');

  return { isHighRisk, changedFields };
}

/**
 * Recalculate pricing for updated booking
 */
async function recalculatePricing(
  booking: any,
  updates: BookingEditInput
): Promise<{ totalPrice: number; pricingSnapshot: string | null }> {
  const service = updates.service || booking.service;
  const startAt = updates.startAt ? new Date(updates.startAt) : new Date(booking.startAt);
  const endAt = updates.endAt ? new Date(updates.endAt) : new Date(booking.endAt);
  const pets = updates.pets || booking.pets || [];
  const petsCount = pets.length;
  const quantity = updates.quantity !== undefined ? updates.quantity : booking.quantity;
  const afterHours = updates.afterHours !== undefined ? updates.afterHours : booking.afterHours;

  // Use pricing engine if enabled
  const usePricingEngine = env.USE_PRICING_ENGINE_V1 === true;

  if (usePricingEngine) {
    const timeSlots = updates.timeSlots || booking.timeSlots || [];
    const pricingInput: PricingEngineInput = {
      service,
      startAt,
      endAt,
      pets: pets.map((p: any) => ({ species: p.species })),
      quantity,
      afterHours,
      holiday: updates.holiday !== undefined ? updates.holiday : booking.holiday,
      timeSlots: timeSlots.map((ts: any) => ({
        startAt: new Date(ts.startAt),
        endAt: new Date(ts.endAt),
        duration: ts.duration,
      })),
    };

    const canonicalBreakdown = calculateCanonicalPricing(pricingInput);
    const pricingSnapshot = serializePricingSnapshot(canonicalBreakdown);
    return { totalPrice: canonicalBreakdown.total, pricingSnapshot };
  } else {
    // Use existing pricing logic
    const priceCalculation = await calculateBookingPrice(
      service,
      startAt,
      endAt,
      petsCount,
      quantity,
      afterHours
    );
    return { totalPrice: priceCalculation.total, pricingSnapshot: null };
  }
}

/**
 * Edit a booking with full validation, pricing recalculation, and audit logging
 */
export async function editBooking(
  bookingId: string,
  updates: BookingEditInput,
  request?: NextRequest
): Promise<BookingEditResult> {
  try {
    // Get original booking
    const original = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        pets: true,
        timeSlots: {
          orderBy: { startAt: 'asc' },
        },
      },
    });

    if (!original) {
      return { success: false, error: 'Booking not found' };
    }

    // Detect high-risk changes
    const { isHighRisk, changedFields } = detectHighRiskChanges(original, updates);

    // Validate updates using form schema (convert to form payload format)
    const formPayload: Partial<FormBookingPayload> = {
      firstName: updates.firstName || original.firstName,
      lastName: updates.lastName || original.lastName,
      phone: updates.phone || original.phone,
      email: updates.email !== undefined ? updates.email : original.email,
      service: updates.service || original.service,
      startAt: updates.startAt ? new Date(updates.startAt).toISOString() : original.startAt.toISOString(),
      endAt: updates.endAt ? new Date(updates.endAt).toISOString() : original.endAt.toISOString(),
      address: updates.address !== undefined ? updates.address : original.address,
      pickupAddress: updates.pickupAddress !== undefined ? updates.pickupAddress : original.pickupAddress,
      dropoffAddress: updates.dropoffAddress !== undefined ? updates.dropoffAddress : original.dropoffAddress,
      quantity: updates.quantity !== undefined ? updates.quantity : original.quantity,
      afterHours: updates.afterHours !== undefined ? updates.afterHours : original.afterHours,
      holiday: updates.holiday !== undefined ? updates.holiday : original.holiday,
      pets: (updates.pets || original.pets || []).map((p: any) => ({
        name: p.name,
        species: p.species,
      })),
      notes: updates.notes !== undefined ? updates.notes : original.notes,
    };

    const validation = validateFormPayload(formPayload);
    if (!validation.success) {
      return {
        success: false,
        error: 'Validation failed',
        errors: validation.errors,
      };
    }

    // Recalculate pricing if relevant fields changed
    const pricingRelevantFields = ['service', 'startAt', 'endAt', 'pets', 'quantity', 'afterHours', 'holiday', 'timeSlots'];
    const pricingChanged = changedFields.some(field => pricingRelevantFields.includes(field));
    
    let totalPrice = original.totalPrice;
    let pricingSnapshot = original.pricingSnapshot;
    
    if (pricingChanged) {
      const pricing = await recalculatePricing(original, updates);
      totalPrice = pricing.totalPrice;
      pricingSnapshot = pricing.pricingSnapshot;
    }

    // Get current user for audit
    const currentUser = request ? await getCurrentUserSafe(request) : null;
    const userId = currentUser?.id || null;

    // Update booking
    const updated = await prisma.$transaction(async (tx) => {
      // Update main booking fields
      const booking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          ...(updates.firstName && { firstName: updates.firstName.trim() }),
          ...(updates.lastName && { lastName: updates.lastName.trim() }),
          ...(updates.phone && { phone: updates.phone.trim() }),
          ...(updates.email !== undefined && { email: updates.email ? updates.email.trim() : null }),
          ...(updates.service && { service: updates.service.trim() }),
          ...(updates.startAt && { startAt: new Date(updates.startAt) }),
          ...(updates.endAt && { endAt: new Date(updates.endAt) }),
          ...(updates.address !== undefined && { address: updates.address ? updates.address.trim() : null }),
          ...(updates.pickupAddress !== undefined && { pickupAddress: updates.pickupAddress ? updates.pickupAddress.trim() : null }),
          ...(updates.dropoffAddress !== undefined && { dropoffAddress: updates.dropoffAddress ? updates.dropoffAddress.trim() : null }),
          ...(updates.quantity !== undefined && { quantity: updates.quantity }),
          ...(updates.afterHours !== undefined && { afterHours: updates.afterHours }),
          ...(updates.holiday !== undefined && { holiday: updates.holiday }),
          ...(updates.notes !== undefined && { notes: updates.notes ? updates.notes.trim() : null }),
          ...(updates.status && { status: updates.status }),
          ...(pricingChanged && { totalPrice, pricingSnapshot }),
        },
      });

      // Update pets if provided
      if (updates.pets) {
        // Delete existing pets
        await tx.pet.deleteMany({ where: { bookingId } });
        
        // Create new pets
        if (updates.pets.length > 0) {
          await tx.pet.createMany({
            data: updates.pets.map((pet) => ({
              bookingId,
              name: pet.name,
              species: pet.species,
              breed: pet.breed || null,
              age: pet.age || null,
              notes: pet.notes || null,
            })),
          });
        }
      }

      // Update time slots if provided
      if (updates.timeSlots) {
        // Delete existing time slots
        await tx.timeSlot.deleteMany({ where: { bookingId } });
        
        // Create new time slots
        if (updates.timeSlots.length > 0) {
          await tx.timeSlot.createMany({
            data: updates.timeSlots.map((slot) => ({
              bookingId,
              startAt: new Date(slot.startAt),
              endAt: new Date(slot.endAt),
              duration: slot.duration,
            })),
          });
        }
      }

      return booking;
    });

    // Log status change if status was updated
    if (updates.status && updates.status !== original.status) {
      await logBookingStatusChange(bookingId, updates.status, {
        fromStatus: original.status,
        changedBy: userId,
        reason: 'Booking edited',
        metadata: { source: 'edit_booking_service' },
      });
    }

    // Log audit event for booking edit
    await logEvent('booking.edited', 'success', {
      bookingId,
      metadata: {
        changedFields,
        isHighRisk,
        pricingChanged,
        oldPrice: pricingChanged ? original.totalPrice : undefined,
        newPrice: pricingChanged ? totalPrice : undefined,
        changedBy: userId,
      },
    });

    return {
      success: true,
      booking: updated,
      changes: {
        fields: changedFields,
        highRisk: isHighRisk,
        pricingChanged,
        oldPrice: pricingChanged ? original.totalPrice : undefined,
        newPrice: pricingChanged ? totalPrice : undefined,
      },
    };
  } catch (error) {
    console.error('[BookingEditService] Failed to edit booking:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to edit booking',
    };
  }
}

