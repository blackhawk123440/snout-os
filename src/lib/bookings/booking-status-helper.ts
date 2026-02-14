/**
 * Booking Status Helper
 * 
 * Phase 3: Centralized handler for booking status transitions
 * Ensures all confirmation paths call onBookingConfirmed
 */

import { prisma } from '@/lib/db';
import { onBookingConfirmed } from './booking-confirmed-handler';

/**
 * Update booking status and trigger Phase 3 handler if moving to confirmed
 * 
 * Idempotent: Can be called multiple times safely
 * 
 * @param bookingId - Booking ID
 * @param newStatus - New status (only triggers handler if moving to "confirmed")
 * @param actorUserId - User who made the change (for audit)
 */
export async function updateBookingStatus(
  bookingId: string,
  newStatus: string,
  actorUserId?: string
): Promise<{ success: boolean; error?: string; triggeredPhase3?: boolean }> {
  try {
    // Get current booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: true,
      },
    });

    if (!booking) {
      return { success: false, error: 'Booking not found' };
    }

    const previousStatus = booking.status;

    // Update status
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: newStatus },
    });

    // Phase 3: Trigger handler if moving to confirmed
    if (previousStatus !== 'confirmed' && newStatus === 'confirmed') {
      try {
        const orgId = booking.orgId || 'default'; // TODO: Get actual orgId
        
        await onBookingConfirmed({
          bookingId,
          orgId,
          clientId: booking.clientId || '',
          sitterId: booking.sitterId,
          startAt: new Date(booking.startAt),
          endAt: new Date(booking.endAt),
          actorUserId: actorUserId || 'system',
        });

        // Emit audit event
        await prisma.eventLog.create({
          data: {
            eventType: 'booking.confirmed.processed',
            status: 'success',
            bookingId,
            metadata: JSON.stringify({
              correlationId: bookingId,
              source: 'status_update',
              actorUserId: actorUserId || 'system',
            }),
          },
        });

        return { success: true, triggeredPhase3: true };
      } catch (error: any) {
        // Non-blocking: Log error but don't fail status update
        console.error(`[updateBookingStatus] Phase 3: Failed to create thread for booking ${bookingId}:`, error);
        
        // Emit audit event for failure
        await prisma.eventLog.create({
          data: {
            eventType: 'booking.confirmed.processed',
            status: 'failed',
            bookingId,
            error: error.message,
            metadata: JSON.stringify({
              correlationId: bookingId,
              source: 'status_update',
              error: error.message,
            }),
          },
        });

        return { success: true, triggeredPhase3: false }; // Status updated, but Phase 3 failed
      }
    }

    return { success: true, triggeredPhase3: false };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
