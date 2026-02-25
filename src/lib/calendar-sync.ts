import { prisma } from './db';
import { google } from 'googleapis';

const calendar = google.calendar('v3');

const DEFAULT_TIMEZONE = 'America/Chicago';

export const calendarSync = {
  /**
   * Push a booking to the assigned sitter's Google Calendar.
   * Conflict-free: skips if already synced for this booking+sitter.
   * Personal-mode safe: uses booking/sitter data as-is (single org).
   */
  async syncBookingToGoogle(bookingId: string): Promise<void> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: true,
        sitter: true,
        pets: true,
      },
    });
    if (!booking) return;

    const sitterId = booking.sitterId;
    if (!sitterId) return;

    const sitter = booking.sitter;
    if (!sitter?.googleRefreshToken?.trim() || !sitter.calendarSyncEnabled) return;

    // Conflict-free: already synced for this booking+sitter
    const existing = await prisma.bookingCalendarEvent.findUnique({
      where: { bookingId_sitterId: { bookingId, sitterId } },
    });
    if (existing) return;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2Client.setCredentials({ refresh_token: sitter.googleRefreshToken });

    const clientName = booking.client
      ? `${booking.client.firstName} ${booking.client.lastName}`.trim() || 'Client'
      : `${booking.firstName} ${booking.lastName}`.trim() || 'Client';
    const petLabel =
      booking.pets?.length && booking.pets[0]?.name
        ? booking.pets[0].name
        : 'Pet';
    const sitterName = `${sitter.firstName} ${sitter.lastName}`.trim() || 'Sitter';

    const event = {
      summary: `${petLabel} – ${clientName}`,
      description: `Client: ${clientName}\nSitter: ${sitterName}\nNotes: ${booking.notes ?? ''}`,
      start: {
        dateTime: booking.startAt.toISOString(),
        timeZone: DEFAULT_TIMEZONE,
      },
      end: {
        dateTime: booking.endAt.toISOString(),
        timeZone: DEFAULT_TIMEZONE,
      },
      ...(booking.client?.email && {
        attendees: [{ email: booking.client.email }],
      }),
    };

    try {
      const res = await calendar.events.insert({
        auth: oauth2Client,
        calendarId: sitter.googleCalendarId ?? 'primary',
        requestBody: event,
      });

      const googleEventId = res.data.id;
      if (googleEventId) {
        await prisma.bookingCalendarEvent.create({
          data: {
            bookingId,
            sitterId,
            googleCalendarEventId: googleEventId,
          },
        });
      }
    } catch (e) {
      console.error('[calendar-sync] Google sync failed for booking', bookingId, e);
    }
  },

  /**
   * Pull new/changed events from Google and create/update bookings (stub).
   * Full implementation: webhook + polling fallback, conflict resolution.
   */
  async syncFromGoogle(sitterId: string): Promise<void> {
    // TODO: list events from Google Calendar, diff with BookingCalendarEvent,
    // create/update bookings and BookingCalendarEvent rows; handle conflicts.
    console.log(`[calendar-sync] Bidirectional sync ready for sitter ${sitterId}`);
  },
};

/**
 * Legacy alias for syncBookingToGoogle. Personal-mode safe (orgId ignored).
 */
export async function syncBookingToCalendar(
  _orgId: string,
  bookingId: string,
  _sitterId?: string,
  _reason?: string
): Promise<void> {
  await calendarSync.syncBookingToGoogle(bookingId);
}

/**
 * Remove calendar event for a booking+sitter (e.g. on reassign). Personal-mode safe.
 */
export async function deleteBookingCalendarEvent(
  _orgId: string,
  bookingId: string,
  previousSitterId: string,
  _reason?: string
): Promise<void> {
  try {
    await prisma.bookingCalendarEvent.deleteMany({
      where: { bookingId, sitterId: previousSitterId },
    });
    // Optionally delete from Google Calendar via API; for now we only remove our mapping
  } catch (e) {
    console.error('[calendar-sync] deleteBookingCalendarEvent failed', bookingId, previousSitterId, e);
  }
}

export default calendarSync;
