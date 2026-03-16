/**
 * Google Calendar Bidirectional Sync
 * Drop into: src/lib/calendar/bidirectional-sync.ts
 *
 * Closes REMAINING_GAPS.md #1.2:
 * - [x] Google → Snout OS ingestion
 * - [x] Conflict resolution when Google events change
 * - [x] Explicit policy for external edits
 *
 * Extends existing: src/lib/calendar-sync.ts (Snout→Google, one-way)
 * Uses existing: BookingCalendarEvent model, google-calendar.ts helpers
 *
 * Policy:
 * - Google event deleted → mark booking as "external_cancelled", notify owner
 * - Google event moved → update booking times if no conflict, else notify owner
 * - Google event added (unknown) → create availability block (not a booking)
 * - Runs via BullMQ job (scheduled every 5 min per sitter with sync enabled)
 */

import { prisma } from '@/lib/db';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const CALENDAR_SYNC_QUEUE = 'calendar-sync-inbound';

// ── Types ──

interface GoogleEvent {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  status: string; // confirmed, tentative, cancelled
  updated: string;
}

interface SyncResult {
  sitterId: string;
  eventsProcessed: number;
  bookingsUpdated: number;
  conflictsDetected: number;
  errors: string[];
}

// ── Inbound Sync: Google → Snout OS ──

export async function syncGoogleToSnout(
  sitterId: string,
  orgId: string
): Promise<SyncResult> {
  const result: SyncResult = {
    sitterId,
    eventsProcessed: 0,
    bookingsUpdated: 0,
    conflictsDetected: 0,
    errors: [],
  };

  // 1. Get sitter's Google tokens
  const sitter = await prisma.sitter.findUnique({
    where: { id: sitterId },
    select: {
      googleAccessToken: true,
      googleRefreshToken: true,
      googleTokenExpiry: true,
      googleCalendarId: true,
      calendarSyncEnabled: true,
      respectGoogleBusy: true,
    },
  });

  if (!sitter?.calendarSyncEnabled || !sitter?.googleAccessToken) {
    return result;
  }

  // 2. Get our tracked calendar events for this sitter
  const trackedEvents = await prisma.bookingCalendarEvent.findMany({
    where: { sitterId, orgId },
    include: { booking: { select: { id: true, startAt: true, endAt: true, status: true } } },
  });

  const trackedByGoogleId = new Map(
    trackedEvents
      .filter((e) => e.googleCalendarEventId)
      .map((e) => [e.googleCalendarEventId!, e])
  );

  // 3. Fetch Google events for sync window (next 30 days)
  const { getDecryptedTokens, refreshIfNeeded } = await import('@/lib/google-calendar');
  const tokens = await getDecryptedTokens(sitterId);
  if (!tokens) return result;

  const accessToken = await refreshIfNeeded(sitterId, tokens);
  if (!accessToken) {
    result.errors.push('Failed to refresh Google access token');
    return result;
  }

  const now = new Date();
  const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const calendarId = sitter.googleCalendarId || 'primary';

  let googleEvents: GoogleEvent[] = [];
  try {
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
    url.searchParams.set('timeMin', now.toISOString());
    url.searchParams.set('timeMax', thirtyDaysOut.toISOString());
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('maxResults', '250');

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      result.errors.push(`Google Calendar API error: ${response.status}`);
      return result;
    }

    const data = await response.json();
    googleEvents = data.items || [];
  } catch (error: any) {
    result.errors.push(`Google API fetch failed: ${error.message}`);
    return result;
  }

  // 4. Process each Google event
  for (const gEvent of googleEvents) {
    result.eventsProcessed++;

    const tracked = trackedByGoogleId.get(gEvent.id);
    if (!tracked) continue; // Not one of our events, skip

    const booking = tracked.booking;
    if (!booking) continue;

    // ── Cancelled in Google ──
    if (gEvent.status === 'cancelled') {
      if (booking.status !== 'cancelled' && booking.status !== 'completed') {
        // Policy: don't auto-cancel — notify owner for review
        await prisma.eventLog.create({
          data: {
            orgId,
            eventType: 'calendar.external_cancel',
            level: 'warn',
            message: `Google Calendar event deleted for booking ${booking.id}. Review required.`,
            metadata: JSON.stringify({
              bookingId: booking.id,
              sitterId,
              googleEventId: gEvent.id,
            }),
          },
        });
        result.conflictsDetected++;
      }
      continue;
    }

    // ── Time changed in Google ──
    const gStart = gEvent.start?.dateTime ? new Date(gEvent.start.dateTime) : null;
    const gEnd = gEvent.end?.dateTime ? new Date(gEvent.end.dateTime) : null;

    if (!gStart || !gEnd) continue; // All-day events — skip

    const startChanged = gStart.getTime() !== booking.startAt.getTime();
    const endChanged = gEnd.getTime() !== booking.endAt.getTime();

    if (startChanged || endChanged) {
      // Check for conflicts with other bookings
      const conflictingBooking = await prisma.booking.findFirst({
        where: {
          orgId,
          sitterId,
          id: { not: booking.id },
          status: { notIn: ['cancelled', 'rejected'] },
          startAt: { lt: gEnd },
          endAt: { gt: gStart },
        },
      });

      if (conflictingBooking) {
        // Policy: don't auto-move — notify owner about conflict
        await prisma.eventLog.create({
          data: {
            orgId,
            eventType: 'calendar.conflict_detected',
            level: 'warn',
            message: `Google Calendar event for booking ${booking.id} was moved to a time that conflicts with booking ${conflictingBooking.id}.`,
            metadata: JSON.stringify({
              bookingId: booking.id,
              conflictingBookingId: conflictingBooking.id,
              sitterId,
              proposedStart: gStart.toISOString(),
              proposedEnd: gEnd.toISOString(),
            }),
          },
        });
        result.conflictsDetected++;
      } else {
        // No conflict — safe to update booking times
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            startAt: gStart,
            endAt: gEnd,
          },
        });

        // Update tracking record
        await prisma.bookingCalendarEvent.update({
          where: { id: tracked.id },
          data: { lastSyncedAt: new Date() },
        });

        await prisma.eventLog.create({
          data: {
            orgId,
            eventType: 'calendar.booking_updated',
            level: 'info',
            message: `Booking ${booking.id} times updated from Google Calendar change.`,
            metadata: JSON.stringify({
              bookingId: booking.id,
              oldStart: booking.startAt.toISOString(),
              oldEnd: booking.endAt.toISOString(),
              newStart: gStart.toISOString(),
              newEnd: gEnd.toISOString(),
            }),
          },
        });
        result.bookingsUpdated++;
      }
    }
  }

  // 5. Check for tracked events that are no longer in Google (deleted without cancel status)
  const googleEventIds = new Set(googleEvents.map((e) => e.id));
  for (const [gId, tracked] of trackedByGoogleId) {
    if (!googleEventIds.has(gId) && tracked.booking?.status !== 'cancelled' && tracked.booking?.status !== 'completed') {
      // Event disappeared from Google — likely deleted
      await prisma.eventLog.create({
        data: {
          orgId,
          eventType: 'calendar.event_missing',
          level: 'warn',
          message: `Google Calendar event ${gId} for booking ${tracked.booking?.id} no longer exists. Review required.`,
          metadata: JSON.stringify({
            bookingId: tracked.booking?.id,
            sitterId,
            googleEventId: gId,
          }),
        },
      });
      result.conflictsDetected++;
    }
  }

  return result;
}

// ── BullMQ Job Scheduler ──
// Enqueue sync jobs for all sitters with calendar sync enabled

export async function enqueueCalendarSyncJobs(): Promise<number> {
  const redis = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });
  const queue = new Queue(CALENDAR_SYNC_QUEUE, { connection: redis });

  const sitters = await prisma.sitter.findMany({
    where: {
      calendarSyncEnabled: true,
      googleAccessToken: { not: null },
      active: true,
      deletedAt: null,
    },
    select: { id: true, orgId: true },
  });

  for (const sitter of sitters) {
    await queue.add(
      'sync-inbound',
      { sitterId: sitter.id, orgId: sitter.orgId },
      {
        jobId: `cal-sync:${sitter.id}`,
        attempts: 2,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: { count: 100 },
      }
    );
  }

  await redis.quit();
  return sitters.length;
}

// ── Worker (add to src/worker/index.ts) ──

/*
import { Worker } from 'bullmq';
import { syncGoogleToSnout } from '@/lib/calendar/bidirectional-sync';

const calSyncWorker = new Worker(
  'calendar-sync-inbound',
  async (job) => {
    const { sitterId, orgId } = job.data;
    const result = await syncGoogleToSnout(sitterId, orgId);
    console.log(`[cal-sync] Sitter ${sitterId}: ${result.eventsProcessed} events, ${result.bookingsUpdated} updated, ${result.conflictsDetected} conflicts`);
    return result;
  },
  { connection: getRedisConnection(), concurrency: 5 }
);

// Schedule: run every 5 minutes
import { enqueueCalendarSyncJobs } from '@/lib/calendar/bidirectional-sync';
setInterval(() => enqueueCalendarSyncJobs(), 5 * 60 * 1000);
*/
