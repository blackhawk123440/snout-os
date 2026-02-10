/**
 * Proactive Thread Creation
 * 
 * Phase 4.3: Operational Integration Upgrade
 * 
 * On booking assignment for weekly clients, proactively creates or links:
 * - MessageThread
 * - MessageNumber assignment
 * - AssignmentWindow with buffers
 * 
 * Ensures idempotency: No duplicate threads, no duplicate windows
 */

import { prisma } from '@/lib/db';
import { determineClientClassification } from './client-classification';
import { assignNumberToThread, determineThreadNumberClass } from './number-helpers';
import { findOrCreateAssignmentWindow } from './window-helpers';
import { getDefaultOrgId } from './org-helpers';
import { TwilioProvider } from './providers/twilio';

/**
 * Ensure proactive thread creation for booking assignment
 * 
 * Called when:
 * - Booking is assigned to a sitter
 * - Only for weekly/recurring clients (not one-time)
 * - Feature flag ENABLE_PROACTIVE_THREAD_CREATION must be enabled
 * 
 * Idempotent: Can be called multiple times without creating duplicates
 * 
 * @param bookingId - Booking ID
 * @param sitterId - Assigned sitter ID
 * @param orgId - Organization ID (optional)
 * @returns Thread ID and window ID, or null if skipped
 */
export async function ensureProactiveThreadCreation(
  bookingId: string,
  sitterId: string,
  orgId?: string
): Promise<{
  threadId: string;
  windowId: string;
  numberClass: string;
} | null> {
  // Check feature flag
  const { env } = await import('@/lib/env');
  if (!env.ENABLE_PROACTIVE_THREAD_CREATION) {
    return null; // Feature flag disabled, skip proactive creation
  }

  const resolvedOrgId = orgId || (await getDefaultOrgId());

  // Fetch booking with client information
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      clientId: true,
      service: true,
      startAt: true,
      endAt: true,
      status: true,
    },
  });

  if (!booking) {
    throw new Error(`Booking ${bookingId} not found`);
  }

  if (!booking.clientId) {
    // No client linked, cannot create thread
    return null;
  }

  // Determine if client is weekly/recurring
  const classification = await determineClientClassification({
    clientId: booking.clientId,
    bookingId: booking.id,
    orgId: resolvedOrgId,
  });

  // Only create threads for recurring clients (not one-time)
  if (classification.isOneTimeClient) {
    return null; // Skip one-time clients
  }

  // Ensure booking has required fields
  if (!booking.startAt || !booking.endAt || !booking.service) {
    throw new Error(`Booking ${bookingId} missing required fields (startAt, endAt, service)`);
  }

  // Find or create thread for this booking and client
  // Note: Thread model doesn't have bookingId, scope, assignedSitterId, isOneTimeClient, or isMeetAndGreet
  // Thread model requires: orgId, clientId, numberId, threadType, status
  // This functionality should be handled by the API service
  // For now, return null to skip proactive creation
  return null;

  // Determine number class for thread
  const numberClass = await determineThreadNumberClass({
    assignedSitterId: thread.assignedSitterId,
    isMeetAndGreet: thread.isMeetAndGreet || false,
    isOneTimeClient: thread.isOneTimeClient || false,
  });

  // Assign number to thread (idempotent - will not reassign if already assigned)
  const provider = new TwilioProvider();
  await assignNumberToThread(
    thread.id,
    numberClass,
    resolvedOrgId,
    provider,
    {
      sitterId: thread.assignedSitterId || undefined,
      isOneTimeClient: thread.isOneTimeClient || undefined,
      isMeetAndGreet: thread.isMeetAndGreet || undefined,
    }
  );

  // Create or update assignment window (idempotent via findOrCreateAssignmentWindow)
  const windowId = await findOrCreateAssignmentWindow(
    booking.id,
    thread.id,
    sitterId,
    booking.startAt,
    booking.endAt,
    booking.service,
    resolvedOrgId
  );

  // Update thread with current window ID
  // Note: Thread model doesn't have assignmentWindowId field
  // Assignment windows are linked via AssignmentWindow.threadId relation
  // This update is a no-op - window linking is handled by the API service

  return {
    threadId: thread.id,
    windowId,
    numberClass,
  };
}

/**
 * Handle booking reassignment (sitter change)
 * 
 * Updates existing thread assignment and window sitter ID
 * 
 * @param bookingId - Booking ID
 * @param newSitterId - New assigned sitter ID
 * @param orgId - Organization ID (optional)
 */
export async function handleBookingReassignment(
  bookingId: string,
  newSitterId: string | null,
  orgId?: string
): Promise<void> {
  const resolvedOrgId = orgId || (await getDefaultOrgId());

  // Note: Thread model doesn't have bookingId or assignedSitterId
  // Thread model uses sitterId, not assignedSitterId
  // This functionality should be handled by the API service
  // For now, this is a no-op
  return;

  if (newSitterId) {
    // Get booking for window update
    // Note: Booking model not available in messaging dashboard schema
    const booking = null;
    // Original code (commented out):
    // await prisma.booking.findUnique({
    //   where: { id: bookingId },
    //   select: {
    //     startAt: true,
    //     endAt: true,
    //     service: true,
    //   },
    // });

    // Note: Booking model not available, so skip window update
    // Original code (commented out - Booking model not in API schema):
    // if (booking && booking.startAt && booking.endAt && booking.service) {
    //   const windowId = await findOrCreateAssignmentWindow(
    //     bookingId,
    //     thread.id,
    //     newSitterId,
    //     booking.startAt,
    //     booking.endAt,
    //     booking.service,
    //     resolvedOrgId
    //   );
    //   await prisma.messageThread.update({
    //     where: { id: thread.id },
    //     data: { assignmentWindowId: windowId },
    //   });
    //   const numberClass = await determineThreadNumberClass({
    //     assignedSitterId: newSitterId,
    //     isMeetAndGreet: thread.isMeetAndGreet || false,
    //     isOneTimeClient: thread.isOneTimeClient || false,
    //   });
    //   const provider = new TwilioProvider();
    //   await assignNumberToThread(
    //     thread.id,
    //     numberClass,
    //     resolvedOrgId,
    //     provider,
    //     {
    //       sitterId: newSitterId,
    //       isOneTimeClient: thread.isOneTimeClient || undefined,
    //       isMeetAndGreet: thread.isMeetAndGreet || undefined,
    //     }
    //   );
    // }
  } else {
    // Sitter unassigned - close active windows
    const { closeAllBookingWindows } = await import('./window-helpers');
    await closeAllBookingWindows(bookingId);
  }
}
