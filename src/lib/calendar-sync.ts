/**
 * Calendar Sync Helper
 * 
 * Handles Google Calendar event creation, updates, and deletion for bookings.
 * Idempotent and auditable.
 */

import { prisma } from '@/lib/db';
import { createGoogleCalendarEvent, updateGoogleCalendarEvent, deleteGoogleCalendarEvent, type GoogleCalendarEvent } from './google-calendar';
import { recordSitterAuditEvent } from './audit-events';

/**
 * Sync booking to Google Calendar (create or update)
 * 
 * Idempotent: If event exists, updates it. Otherwise creates new.
 */
export async function syncBookingToCalendar(
  orgId: string,
  bookingId: string,
  sitterId: string,
  reason: string
): Promise<void> {
  try {
    // Get booking and sitter
    const booking = await (prisma as any).booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        service: true,
        startAt: true,
        endAt: true,
        address: true,
        notes: true,
      },
    });

    if (!booking) {
      throw new Error(`Booking ${bookingId} not found`);
    }

    const sitter = await (prisma as any).sitter.findUnique({
      where: { id: sitterId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        googleAccessToken: true,
        googleRefreshToken: true,
        googleTokenExpiry: true,
        googleCalendarId: true,
        calendarSyncEnabled: true,
      },
    });

    if (!sitter) {
      throw new Error(`Sitter ${sitterId} not found`);
    }

    // Check if sync is enabled
    if (!sitter.calendarSyncEnabled) {
      console.log(`[Calendar Sync] Sync disabled for sitter ${sitterId}`);
      return;
    }

    // Check if token is expired and refresh if needed
    let accessToken = sitter.googleAccessToken;
    if (sitter.googleTokenExpiry && new Date(sitter.googleTokenExpiry) < new Date()) {
      // Token expired - need to refresh (TODO: implement refresh logic)
      console.warn(`[Calendar Sync] Token expired for sitter ${sitterId}, refresh not implemented yet`);
      await recordSitterAuditEvent({
        orgId,
        sitterId,
        eventType: 'calendar.sync_failed',
        actorType: 'system',
        actorId: 'system',
        entityType: 'booking',
        entityId: bookingId,
        bookingId,
        metadata: {
          reason: 'Token expired',
          bookingId,
          sitterId,
        },
      });
      return;
    }

    if (!accessToken) {
      throw new Error(`Sitter ${sitterId} has no Google Calendar access token`);
    }

    const calendarId = sitter.googleCalendarId || 'primary';

    // Check if event already exists
    const existingEvent = await (prisma as any).bookingCalendarEvent.findUnique({
      where: {
        bookingId_sitterId: {
          bookingId,
          sitterId,
        },
      },
    });

    // Build calendar event
    const eventTitle = `${booking.service} - ${booking.firstName} ${booking.lastName}`;
    const eventDescription = booking.notes || '';
    const eventLocation = booking.address || '';

    const calendarEvent: GoogleCalendarEvent = {
      summary: eventTitle,
      description: eventDescription,
      start: {
        dateTime: booking.startAt.toISOString(),
        timeZone: 'America/New_York', // TODO: Get from org settings
      },
      end: {
        dateTime: booking.endAt.toISOString(),
        timeZone: 'America/New_York',
      },
      location: eventLocation,
    };

    let googleEventId: string | null = null;

    if (existingEvent) {
      // Update existing event
      calendarEvent.id = existingEvent.googleCalendarEventId;
      const updated = await updateGoogleCalendarEvent(
        accessToken,
        calendarId,
        existingEvent.googleCalendarEventId,
        calendarEvent
      );

      if (updated) {
        googleEventId = existingEvent.googleCalendarEventId;
        await recordSitterAuditEvent({
          orgId,
          sitterId,
          eventType: 'calendar.event_updated',
          actorType: 'system',
          actorId: 'system',
          entityType: 'booking',
          entityId: bookingId,
          bookingId,
          metadata: {
            reason,
            bookingId,
            sitterId,
            googleEventId,
          },
        });
      } else {
        throw new Error('Failed to update Google Calendar event');
      }
    } else {
      // Create new event
      googleEventId = await createGoogleCalendarEvent(
        accessToken,
        calendarId,
        calendarEvent
      );

      if (googleEventId) {
        // Store mapping
        await (prisma as any).bookingCalendarEvent.create({
          data: {
            bookingId,
            sitterId,
            googleCalendarEventId: googleEventId,
          },
        });

        await recordSitterAuditEvent({
          orgId,
          sitterId,
          eventType: 'calendar.event_created',
          actorType: 'system',
          actorId: 'system',
          entityType: 'booking',
          entityId: bookingId,
          bookingId,
          metadata: {
            reason,
            bookingId,
            sitterId,
            googleEventId,
          },
        });
      } else {
        throw new Error('Failed to create Google Calendar event');
      }
    }
  } catch (error: any) {
    console.error(`[Calendar Sync] Failed to sync booking ${bookingId} to calendar:`, error);
    
    // Record failure audit event
    try {
      await recordSitterAuditEvent({
        orgId,
        sitterId,
        eventType: 'calendar.sync_failed',
        actorType: 'system',
        actorId: 'system',
        entityType: 'booking',
        entityId: bookingId,
        bookingId,
        metadata: {
          reason: error.message || 'Unknown error',
          bookingId,
          sitterId,
        },
      });
    } catch (auditError) {
      console.error('[Calendar Sync] Failed to record audit event:', auditError);
    }

    // Don't throw - booking assignment should succeed even if calendar sync fails
  }
}

/**
 * Delete calendar event for a booking-sitter pair
 */
export async function deleteBookingCalendarEvent(
  orgId: string,
  bookingId: string,
  sitterId: string,
  reason: string
): Promise<void> {
  try {
    const event = await (prisma as any).bookingCalendarEvent.findUnique({
      where: {
        bookingId_sitterId: {
          bookingId,
          sitterId,
        },
      },
    });

    if (!event) {
      // No event to delete
      return;
    }

    const sitter = await (prisma as any).sitter.findUnique({
      where: { id: sitterId },
      select: {
        googleAccessToken: true,
        googleCalendarId: true,
      },
    });

    if (!sitter || !sitter.googleAccessToken) {
      console.warn(`[Calendar Sync] Cannot delete event: sitter ${sitterId} has no access token`);
      return;
    }

    const calendarId = sitter.googleCalendarId || 'primary';
    const deleted = await deleteGoogleCalendarEvent(
      sitter.googleAccessToken,
      calendarId,
      event.googleCalendarEventId
    );

    if (deleted) {
      // Remove mapping
      await (prisma as any).bookingCalendarEvent.delete({
        where: {
          bookingId_sitterId: {
            bookingId,
            sitterId,
          },
        },
      });

      await recordSitterAuditEvent({
        orgId,
        sitterId,
        eventType: 'calendar.event_deleted',
        actorType: 'system',
        actorId: 'system',
        entityType: 'booking',
        entityId: bookingId,
        bookingId,
        metadata: {
          reason,
          bookingId,
          sitterId,
          googleEventId: event.googleCalendarEventId,
        },
      });
    }
  } catch (error: any) {
    console.error(`[Calendar Sync] Failed to delete calendar event for booking ${bookingId}:`, error);
    // Don't throw - deletion failure shouldn't block reassignment
  }
}
