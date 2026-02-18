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
 * Get timezone for organization
 * Falls back to America/New_York if not configured
 */
async function getOrgTimezone(orgId: string): Promise<string> {
  try {
    const settings = await (prisma as any).businessSettings.findFirst({
      select: { timeZone: true },
    });
    return settings?.timeZone || 'America/New_York';
  } catch (error) {
    console.warn('[Calendar Sync] Failed to fetch org timezone, using default');
    return 'America/New_York';
  }
}

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

    // Get timezone for organization
    const timeZone = await getOrgTimezone(orgId);

    // Check if event already exists (idempotency check)
    const existingEvent = await (prisma as any).bookingCalendarEvent.findUnique({
      where: {
        bookingId_sitterId: {
          bookingId,
          sitterId,
        },
      },
    });

    // Build calendar event with explicit timezone
    const eventTitle = `${booking.service} - ${booking.firstName} ${booking.lastName}`;
    const eventDescription = booking.notes || '';
    const eventLocation = booking.address || '';

    // Ensure dates are Date objects
    const startAt = booking.startAt instanceof Date ? booking.startAt : new Date(booking.startAt);
    const endAt = booking.endAt instanceof Date ? booking.endAt : new Date(booking.endAt);

    const calendarEvent: GoogleCalendarEvent = {
      summary: eventTitle,
      description: eventDescription,
      start: {
        dateTime: startAt.toISOString(),
        timeZone: timeZone, // Explicit timezone from org settings
      },
      end: {
        dateTime: endAt.toISOString(),
        timeZone: timeZone, // Explicit timezone from org settings
      },
      location: eventLocation,
    };

    let googleEventId: string | null = null;
    const now = new Date();

    if (existingEvent) {
      // Idempotency: Update existing event
      calendarEvent.id = existingEvent.googleCalendarEventId;
      const updated = await updateGoogleCalendarEvent(
        accessToken,
        calendarId,
        existingEvent.googleCalendarEventId,
        calendarEvent
      );

      if (updated) {
        googleEventId = existingEvent.googleCalendarEventId;
        
        // Update lastSyncAt timestamp
        await (prisma as any).bookingCalendarEvent.update({
          where: {
            bookingId_sitterId: {
              bookingId,
              sitterId,
            },
          },
          data: {
            updatedAt: now, // This serves as lastSyncAt
          },
        });

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
            timeZone,
          },
        });
      } else {
        throw new Error('Failed to update Google Calendar event');
      }
    } else {
      // Create new event and store mapping
      googleEventId = await createGoogleCalendarEvent(
        accessToken,
        calendarId,
        calendarEvent
      );

      if (googleEventId) {
        // Store mapping with timestamp
        await (prisma as any).bookingCalendarEvent.create({
          data: {
            bookingId,
            sitterId,
            googleCalendarEventId: googleEventId,
            createdAt: now,
            updatedAt: now, // This serves as lastSyncAt
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
            timeZone,
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
      // No event to delete - handle gracefully (idempotent)
      console.log(`[Calendar Sync] No calendar event found for booking ${bookingId} and sitter ${sitterId} - skipping deletion`);
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
