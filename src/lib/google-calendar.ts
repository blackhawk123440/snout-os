import { google } from "googleapis";

interface CalendarEvent {
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  colorId?: string;
}

/**
 * Get Google Calendar API client
 */
export function getGoogleCalendarClient() {
  const credentials = process.env.GOOGLE_CALENDAR_CREDENTIALS;
  const refreshToken = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;

  if (!credentials || !refreshToken) {
    console.warn("⚠️  Google Calendar not configured");
    return null;
  }

  try {
    const creds = JSON.parse(credentials);
    const oauth2Client = new google.auth.OAuth2(
      creds.client_id,
      creds.client_secret,
      creds.redirect_uris[0]
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    return google.calendar({ version: "v3", auth: oauth2Client });
  } catch (error) {
    console.error("Failed to initialize Google Calendar:", error);
    return null;
  }
}

/**
 * Sync a booking to Google Calendar
 */
export async function syncBookingToGoogleCalendar({
  bookingId,
  summary,
  description,
  location,
  startAt,
  endAt,
}: {
  bookingId: string;
  summary: string;
  description?: string;
  location?: string;
  startAt: Date;
  endAt: Date;
}): Promise<string | null> {
  const calendar = getGoogleCalendarClient();
  
  if (!calendar) {
    console.warn("Google Calendar not available");
    return null;
  }

  try {
    const event: CalendarEvent = {
      summary,
      description,
      location,
      start: {
        dateTime: startAt.toISOString(),
        timeZone: "America/Chicago", // Adjust to your timezone
      },
      end: {
        dateTime: endAt.toISOString(),
        timeZone: "America/Chicago",
      },
      colorId: "9", // Blue color
    };

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
    });

    return response.data.id || null;
  } catch (error) {
    console.error("Failed to sync to Google Calendar:", error);
    return null;
  }
}

/**
 * Delete event from Google Calendar
 */
export async function deleteGoogleCalendarEvent(eventId: string): Promise<boolean> {
  const calendar = getGoogleCalendarClient();
  
  if (!calendar) {
    return false;
  }

  try {
    await calendar.events.delete({
      calendarId: "primary",
      eventId,
    });

    return true;
  } catch (error) {
    console.error("Failed to delete from Google Calendar:", error);
    return false;
  }
}

/**
 * Update Google Calendar event
 */
export async function updateGoogleCalendarEvent({
  eventId,
  summary,
  description,
  location,
  startAt,
  endAt,
}: {
  eventId: string;
  summary: string;
  description?: string;
  location?: string;
  startAt: Date;
  endAt: Date;
}): Promise<boolean> {
  const calendar = getGoogleCalendarClient();
  
  if (!calendar) {
    return false;
  }

  try {
    const event: CalendarEvent = {
      summary,
      description,
      location,
      start: {
        dateTime: startAt.toISOString(),
        timeZone: "America/Chicago",
      },
      end: {
        dateTime: endAt.toISOString(),
        timeZone: "America/Chicago",
      },
    };

    await calendar.events.update({
      calendarId: "primary",
      eventId,
      requestBody: event,
    });

    return true;
  } catch (error) {
    console.error("Failed to update Google Calendar event:", error);
    return false;
  }
}

/**
 * Fetch events from owner's Google Calendar
 */
export async function fetchOwnerCalendarEvents({
  startDate,
  endDate,
}: {
  startDate: Date;
  endDate: Date;
}): Promise<any[]> {
  const calendar = getGoogleCalendarClient();
  
  if (!calendar) {
    console.warn("Google Calendar not available");
    return [];
  }

  try {
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    return response.data.items || [];
  } catch (error) {
    console.error("Failed to fetch Google Calendar events:", error);
    return [];
  }
}

/**
 * Check for sitter conflicts
 */
export async function checkSitterConflicts({
  sitterId,
  startAt,
  endAt,
  excludeBookingId,
}: {
  sitterId: string;
  startAt: Date;
  endAt: Date;
  excludeBookingId?: string;
}): Promise<{ hasConflict: boolean; conflictingBookings: any[] }> {
  const { prisma } = await import("@/lib/db");
  
  const conflicting = await prisma.booking.findMany({
    where: {
      sitterId,
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      OR: [
        // Booking starts during this time
        {
          AND: [
            { startAt: { lte: endAt } },
            { startAt: { gte: startAt } },
          ],
        },
        // Booking ends during this time
        {
          AND: [
            { endAt: { lte: endAt } },
            { endAt: { gte: startAt } },
          ],
        },
        // Booking completely overlaps this time
        {
          AND: [
            { startAt: { lte: startAt } },
            { endAt: { gte: endAt } },
          ],
        },
      ],
    },
    include: {
      pets: true,
    },
  });

  return {
    hasConflict: conflicting.length > 0,
    conflictingBookings: conflicting,
  };
}

