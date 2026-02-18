/**
 * Dispatch Control Helper
 * 
 * Owner-facing control and visibility for the dispatch system.
 * Enforces valid dispatchStatus transitions and provides override actions.
 */

import { prisma } from '@/lib/db';
import { recordSitterAuditEvent } from '@/lib/audit-events';
import { syncBookingToCalendar, deleteBookingCalendarEvent } from '@/lib/calendar-sync';

export type DispatchStatus = 'auto' | 'manual_required' | 'manual_in_progress' | 'assigned';

/**
 * Valid dispatch status transitions
 * 
 * Rules:
 * - auto -> manual_required: When automation exhausts or fails
 * - auto -> assigned: Direct assignment (bypasses automation)
 * - manual_required -> manual_in_progress: Owner starts working on it
 * - manual_required -> assigned: Owner assigns directly
 * - manual_required -> auto: Owner resumes automation (retry)
 * - manual_in_progress -> assigned: Owner completes assignment
 * - assigned -> auto: Resume automation (for future bookings)
 */
const VALID_TRANSITIONS: Record<DispatchStatus, DispatchStatus[]> = {
  auto: ['manual_required', 'assigned'],
  manual_required: ['manual_in_progress', 'assigned', 'auto'], // Can resume automation
  manual_in_progress: ['assigned'],
  assigned: ['auto'], // Can resume automation after assignment
};

/**
 * Check if a dispatch status transition is valid
 */
export function isValidDispatchTransition(
  from: DispatchStatus | null,
  to: DispatchStatus
): boolean {
  if (!from) {
    // Null/undefined means 'auto' (default)
    from = 'auto';
  }
  return VALID_TRANSITIONS[from]?.includes(to) || false;
}

/**
 * Force assign a sitter to a booking (owner override)
 * 
 * Valid transitions:
 * - manual_required -> assigned
 * - manual_in_progress -> assigned
 * - auto -> assigned (if booking is unassigned)
 */
export async function forceAssignSitter(
  orgId: string,
  bookingId: string,
  sitterId: string,
  reason: string,
  actorId: string
): Promise<void> {
  // Get current booking state
  const booking = await (prisma as any).booking.findUnique({
    where: { id: bookingId },
    select: {
      dispatchStatus: true,
      sitterId: true,
      status: true,
    },
  });

  if (!booking) {
    throw new Error(`Booking ${bookingId} not found`);
  }

  const currentStatus: DispatchStatus = (booking.dispatchStatus || 'auto') as DispatchStatus;

  // Validate transition
  if (!isValidDispatchTransition(currentStatus, 'assigned')) {
    throw new Error(
      `Invalid transition from ${currentStatus} to assigned. Valid transitions: ${VALID_TRANSITIONS[currentStatus]?.join(', ') || 'none'}`
    );
  }

  // Verify sitter exists and is active
  const sitter = await (prisma as any).sitter.findUnique({
    where: { id: sitterId },
    select: { active: true },
  });

  if (!sitter) {
    throw new Error(`Sitter ${sitterId} not found`);
  }

  if (!sitter.active) {
    throw new Error(`Sitter ${sitterId} is not active`);
  }

  // If booking was previously assigned to a different sitter, delete their calendar event
  const previousSitterId = booking.sitterId;
  if (previousSitterId && previousSitterId !== sitterId) {
    try {
      await deleteBookingCalendarEvent(orgId, bookingId, previousSitterId, 'Booking reassigned to different sitter');
    } catch (error) {
      console.error('[Force Assign] Failed to delete previous sitter calendar event:', error);
      // Don't throw - continue with assignment
    }
  }

  // Update booking
  await (prisma as any).booking.update({
    where: { id: bookingId },
    data: {
      sitterId: sitterId,
      dispatchStatus: 'assigned',
      status: 'confirmed',
    },
  });

  // Record audit event
  await recordSitterAuditEvent({
    orgId,
    sitterId: sitterId,
    eventType: 'dispatch.force_assign',
    actorType: 'owner',
    actorId: actorId,
    entityType: 'booking',
    entityId: bookingId,
    bookingId,
    metadata: {
      fromStatus: currentStatus,
      toStatus: 'assigned',
      reason,
      bookingId,
      sitterId,
    },
  });

  // Sync to Google Calendar (fail-open: don't block assignment)
  try {
    await syncBookingToCalendar(orgId, bookingId, sitterId, 'Booking force-assigned by owner');
  } catch (error) {
    console.error('[Force Assign] Calendar sync failed:', error);
    // Don't throw - booking assignment succeeds even if calendar sync fails
  }
}

/**
 * Resume automation for a booking (owner override)
 * 
 * Valid transitions:
 * - assigned -> auto (after assignment, can resume automation)
 * - manual_required -> auto (if owner wants to retry automation)
 * 
 * Note: manual_in_progress cannot resume automation (must assign first)
 */
export async function resumeAutomation(
  orgId: string,
  bookingId: string,
  reason: string,
  actorId: string
): Promise<void> {
  // Get current booking state
  const booking = await (prisma as any).booking.findUnique({
    where: { id: bookingId },
    select: {
      dispatchStatus: true,
      sitterId: true,
      status: true,
    },
  });

  if (!booking) {
    throw new Error(`Booking ${bookingId} not found`);
  }

  const currentStatus: DispatchStatus = (booking.dispatchStatus || 'auto') as DispatchStatus;

  // Validate transition
  if (!isValidDispatchTransition(currentStatus, 'auto')) {
    throw new Error(
      `Invalid transition from ${currentStatus} to auto. Valid transitions: ${VALID_TRANSITIONS[currentStatus]?.join(', ') || 'none'}`
    );
  }

  // Update booking
  await (prisma as any).booking.update({
    where: { id: bookingId },
    data: {
      dispatchStatus: 'auto',
      manualDispatchReason: null,
      manualDispatchAt: null,
      // Keep sitterId if already assigned, otherwise leave unassigned for automation
    },
  });

  // Record audit event
  await recordSitterAuditEvent({
    orgId,
    sitterId: booking.sitterId || 'system',
    eventType: 'dispatch.resume_automation',
    actorType: 'owner',
    actorId: actorId,
    entityType: 'booking',
    entityId: bookingId,
    bookingId,
    metadata: {
      fromStatus: currentStatus,
      toStatus: 'auto',
      reason,
      bookingId,
    },
  });
}
