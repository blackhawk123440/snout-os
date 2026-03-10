/**
 * One-way calendar sync: Snout OS → Google Calendar
 * Source of truth: Snout OS. Google is a mirror.
 */

import { createHash } from 'crypto';
import { google } from 'googleapis';
import type { PrismaClient } from '@prisma/client';
import { CalendarAuthExpiredError, refreshGoogleTokenForSitter } from '@/lib/calendar/token-refresh';

const calendar = google.calendar('v3');
const DEFAULT_TIMEZONE = 'UTC';

function computePayloadChecksum(payload: Record<string, unknown>): string {
  const str = JSON.stringify(payload, Object.keys(payload).sort());
  return createHash('sha256').update(str).digest('hex').slice(0, 32);
}

function buildEventPayload(booking: {
  startAt: Date;
  endAt: Date;
  service: string;
  firstName: string;
  lastName: string;
  client?: { firstName: string; lastName: string } | null;
  pets?: { name: string }[];
  notes?: string | null;
  id: string;
  orgId?: string;
}, sitter: { firstName: string; lastName: string; id: string }, timeZone: string): Record<string, unknown> {
  const clientName = booking.client
    ? `${booking.client.firstName} ${booking.client.lastName}`.trim() || 'Client'
    : `${booking.firstName} ${booking.lastName}`.trim() || 'Client';
  const petLabel = booking.pets?.length && booking.pets[0]?.name ? booking.pets[0].name : 'Pet';
  const sitterName = `${sitter.firstName} ${sitter.lastName}`.trim() || 'Sitter';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.snoutos.com';
  const bookingLink = `${baseUrl}/bookings/${booking.id}`;

  return {
    summary: `${petLabel} – ${clientName} (${booking.service})`,
    description: `Snout OS Booking\nClient: ${clientName}\nSitter: ${sitterName}\nService: ${booking.service}\nNotes: ${booking.notes ?? ''}\n\nBooking: ${bookingLink}`,
    start: {
      dateTime: new Date(booking.startAt).toISOString(),
      timeZone,
    },
    end: {
      dateTime: new Date(booking.endAt).toISOString(),
      timeZone,
    },
    extendedProperties: {
      private: {
        snoutBookingId: booking.id,
        snoutOrgId: booking.orgId ?? 'default',
        snoutSitterId: sitter.id,
        snoutSource: 'snout-os',
      },
    },
  };
}

async function resolveCalendarTimezone(db: PrismaClient, orgId: string, sitterTimezone?: string | null): Promise<string> {
  if (sitterTimezone?.trim()) return sitterTimezone.trim();
  const settings = await db.businessSettings
    .findUnique({
      where: { orgId },
      select: { timeZone: true },
    })
    .catch(() => null);
  return settings?.timeZone || DEFAULT_TIMEZONE;
}

function serializeFailureMetadata(metadata: Record<string, unknown>): string {
  try {
    return JSON.stringify(metadata);
  } catch {
    return '{}';
  }
}

async function upsertSyncState(params: {
  db: PrismaClient;
  orgId: string;
  bookingId: string;
  sitterId: string;
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED' | 'DISABLED' | 'AUTH_EXPIRED';
  now: Date;
  correlationId?: string;
  syncedCalendarId?: string | null;
  externalEventId?: string | null;
  payloadChecksum?: string | null;
  lastSyncError?: string | null;
  failureMetadata?: Record<string, unknown> | null;
  lastSyncedAt?: Date | null;
}) {
  await params.db.bookingCalendarEvent.upsert({
    where: { bookingId_sitterId: { bookingId: params.bookingId, sitterId: params.sitterId } },
    create: {
      orgId: params.orgId,
      bookingId: params.bookingId,
      sitterId: params.sitterId,
      syncStatus: params.syncStatus,
      lastSyncAttemptAt: params.now,
      lastSyncedAt: params.lastSyncedAt ?? null,
      lastSyncError: params.lastSyncError ?? null,
      syncedCalendarId: params.syncedCalendarId ?? null,
      externalEventId: params.externalEventId ?? null,
      googleCalendarEventId: params.externalEventId ?? null,
      payloadChecksum: params.payloadChecksum ?? null,
      correlationId: params.correlationId ?? null,
      failureMetadata: params.failureMetadata ? serializeFailureMetadata(params.failureMetadata) : null,
    },
    update: {
      syncStatus: params.syncStatus,
      lastSyncAttemptAt: params.now,
      lastSyncedAt: params.lastSyncedAt ?? undefined,
      lastSyncError: params.lastSyncError ?? null,
      syncedCalendarId: params.syncedCalendarId ?? null,
      externalEventId: params.externalEventId ?? null,
      googleCalendarEventId: params.externalEventId ?? null,
      payloadChecksum: params.payloadChecksum ?? undefined,
      correlationId: params.correlationId ?? null,
      failureMetadata: params.failureMetadata ? serializeFailureMetadata(params.failureMetadata) : null,
    },
  });
}

export interface UpsertResult {
  action: 'created' | 'updated' | 'skipped';
  googleEventId?: string;
  error?: string;
}

/**
 * Upsert a Google Calendar event for a booking.
 * Skips update if payload checksum unchanged.
 */
export async function upsertEventForBooking(
  db: PrismaClient,
  bookingId: string,
  orgId: string,
  meta?: { correlationId?: string; idempotencyKey?: string; action?: string }
): Promise<UpsertResult> {
  const now = new Date();
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { client: true, pets: true, sitter: true },
  });
  if (!booking?.sitterId || !booking.sitter) return { action: 'skipped' };

  const sitter = booking.sitter;
  if (!sitter.calendarSyncEnabled) {
    await upsertSyncState({
      db,
      orgId,
      bookingId,
      sitterId: sitter.id,
      syncStatus: 'DISABLED',
      now,
      correlationId: meta?.correlationId,
    });
    return { action: 'skipped' };
  }
  if (!sitter.googleRefreshToken?.trim()) return { action: 'skipped' };

  const calendarId = sitter.googleCalendarId ?? 'primary';
  const timeZone = await resolveCalendarTimezone(db, orgId, sitter.timezone);
  const payload = buildEventPayload(booking, sitter, timeZone);
  const checksum = computePayloadChecksum(payload);

  const existing = await db.bookingCalendarEvent.findUnique({
    where: { bookingId_sitterId: { bookingId, sitterId: sitter.id } },
  });

  if (existing?.payloadChecksum === checksum && existing.googleCalendarEventId) {
    await upsertSyncState({
      db,
      orgId,
      bookingId,
      sitterId: sitter.id,
      syncStatus: 'SYNCED',
      now,
      correlationId: meta?.correlationId,
      externalEventId: existing.googleCalendarEventId,
      syncedCalendarId: calendarId,
      payloadChecksum: checksum,
      lastSyncedAt: existing.lastSyncedAt ?? now,
    });
    return { action: 'skipped' };
  }

  await upsertSyncState({
    db,
    orgId,
    bookingId,
    sitterId: sitter.id,
    syncStatus: 'PENDING',
    now,
    correlationId: meta?.correlationId,
    syncedCalendarId: calendarId,
    payloadChecksum: checksum,
  });

  let oauth2Client: InstanceType<typeof google.auth.OAuth2>;
  try {
    oauth2Client = await refreshGoogleTokenForSitter({
      db,
      sitterId: sitter.id,
      refreshToken: sitter.googleRefreshToken,
    });
  } catch (error) {
    if (error instanceof CalendarAuthExpiredError) {
      await upsertSyncState({
        db,
        orgId,
        bookingId,
        sitterId: sitter.id,
        syncStatus: 'AUTH_EXPIRED',
        now,
        correlationId: meta?.correlationId,
        syncedCalendarId: calendarId,
        lastSyncError: error.message,
        failureMetadata: { action: meta?.action ?? 'upsert', idempotencyKey: meta?.idempotencyKey ?? null },
      });
      return { action: 'skipped', error: error.message };
    }
    throw error;
  }

  let googleEventIdToUse: string | null = existing?.googleCalendarEventId ?? null;

  try {
    if (googleEventIdToUse) {
      try {
        await calendar.events.patch({
          auth: oauth2Client,
          calendarId,
          eventId: googleEventIdToUse,
          requestBody: payload,
        });
      } catch (patchErr: unknown) {
        const err = patchErr as { code?: number };
        if (err?.code === 404) {
          googleEventIdToUse = null;
        } else {
          throw patchErr;
        }
      }
    }

    if (!googleEventIdToUse) {
      const res = await calendar.events.insert({
        auth: oauth2Client,
        calendarId,
        requestBody: {
          summary: payload.summary as string,
          description: payload.description as string,
          start: payload.start as { dateTime: string; timeZone: string },
          end: payload.end as { dateTime: string; timeZone: string },
          extendedProperties: payload.extendedProperties as { private?: Record<string, string> },
        },
      });
      const googleEventId = res.data?.id;
      if (googleEventId) {
        const syncedAt = new Date();
        await upsertSyncState({
          db,
          orgId,
          bookingId,
          sitterId: sitter.id,
          syncStatus: 'SYNCED',
          now,
          correlationId: meta?.correlationId,
          syncedCalendarId: calendarId,
          externalEventId: googleEventId,
          payloadChecksum: checksum,
          lastSyncedAt: syncedAt,
        });
        return { action: 'created', googleEventId };
      }
    } else {
      const syncedAt = new Date();
      await upsertSyncState({
        db,
        orgId,
        bookingId,
        sitterId: sitter.id,
        syncStatus: 'SYNCED',
        now,
        correlationId: meta?.correlationId,
        syncedCalendarId: calendarId,
        externalEventId: googleEventIdToUse,
        payloadChecksum: checksum,
        lastSyncedAt: syncedAt,
      });
      return { action: 'updated', googleEventId: googleEventIdToUse! };
    }
  } catch (e) {
    await upsertSyncState({
      db,
      orgId,
      bookingId,
      sitterId: sitter.id,
      syncStatus: 'FAILED',
      now,
      correlationId: meta?.correlationId,
      syncedCalendarId: calendarId,
      externalEventId: googleEventIdToUse,
      payloadChecksum: checksum,
      lastSyncError: e instanceof Error ? e.message : String(e),
      failureMetadata: { action: meta?.action ?? 'upsert', idempotencyKey: meta?.idempotencyKey ?? null },
    });
    throw e;
  }
  return { action: 'skipped' };
}

/**
 * Delete Google Calendar event for a booking+sitter.
 */
export async function deleteEventForBooking(
  db: PrismaClient,
  bookingId: string,
  sitterId: string,
  orgId: string,
  meta?: { correlationId?: string; idempotencyKey?: string; action?: string }
): Promise<{ deleted: boolean; error?: string }> {
  const now = new Date();
  const mapping = await db.bookingCalendarEvent.findUnique({
    where: { bookingId_sitterId: { bookingId, sitterId } },
  });
  if (!mapping?.googleCalendarEventId && !mapping?.externalEventId) {
    await upsertSyncState({
      db,
      orgId,
      bookingId,
      sitterId,
      syncStatus: 'SYNCED',
      now,
      correlationId: meta?.correlationId,
      externalEventId: null,
      syncedCalendarId: null,
      lastSyncedAt: now,
    });
    return { deleted: true };
  }

  const sitter = await db.sitter.findUnique({
    where: { id: sitterId },
    select: { googleRefreshToken: true, googleCalendarId: true },
  });
  if (!sitter?.googleRefreshToken?.trim()) {
    await upsertSyncState({
      db,
      orgId,
      bookingId,
      sitterId,
      syncStatus: 'DISABLED',
      now,
      correlationId: meta?.correlationId,
      externalEventId: mapping?.googleCalendarEventId ?? mapping?.externalEventId ?? null,
      syncedCalendarId: sitter?.googleCalendarId ?? null,
      lastSyncError: 'Google refresh token missing',
    });
    return { deleted: true };
  }

  const calendarId = sitter.googleCalendarId ?? 'primary';
  await upsertSyncState({
    db,
    orgId,
    bookingId,
    sitterId,
    syncStatus: 'PENDING',
    now,
    correlationId: meta?.correlationId,
    syncedCalendarId: calendarId,
    externalEventId: mapping?.googleCalendarEventId ?? mapping?.externalEventId ?? null,
  });

  let oauth2Client: InstanceType<typeof google.auth.OAuth2>;
  try {
    oauth2Client = await refreshGoogleTokenForSitter({
      db,
      sitterId,
      refreshToken: sitter.googleRefreshToken,
    });
  } catch (error) {
    if (error instanceof CalendarAuthExpiredError) {
      await upsertSyncState({
        db,
        orgId,
        bookingId,
        sitterId,
        syncStatus: 'AUTH_EXPIRED',
        now,
        correlationId: meta?.correlationId,
        syncedCalendarId: calendarId,
        externalEventId: mapping?.googleCalendarEventId ?? mapping?.externalEventId ?? null,
        lastSyncError: error.message,
        failureMetadata: { action: meta?.action ?? 'delete', idempotencyKey: meta?.idempotencyKey ?? null },
      });
      return { deleted: false, error: error.message };
    }
    throw error;
  }

  try {
    await calendar.events.delete({
      auth: oauth2Client,
      calendarId,
      eventId: mapping.googleCalendarEventId ?? mapping.externalEventId ?? undefined,
    });
  } catch (e) {
    const err = e as { code?: number };
    if (err?.code !== 404) {
      // Rethrow so worker records failure and BullMQ can retry / dead-letter
      throw e;
    }
    // 404: event already gone, continue to remove mapping
  }

  await upsertSyncState({
    db,
    orgId,
    bookingId,
    sitterId,
    syncStatus: 'SYNCED',
    now,
    correlationId: meta?.correlationId,
    syncedCalendarId: calendarId,
    externalEventId: null,
    payloadChecksum: mapping?.payloadChecksum ?? null,
    lastSyncedAt: now,
  });
  return { deleted: true };
}

export interface SyncRangeResult {
  created: number;
  updated: number;
  skipped: number;
  deleted: number;
  errors: string[];
}

/**
 * Sync all bookings for a sitter in a date range to Google.
 * Repairs drift (recreates if event was deleted in Google).
 */
export async function syncRangeForSitter(
  db: PrismaClient,
  sitterId: string,
  start: Date,
  end: Date,
  orgId: string
): Promise<SyncRangeResult> {
  const result: SyncRangeResult = { created: 0, updated: 0, skipped: 0, deleted: 0, errors: [] };

  const sitter = await db.sitter.findUnique({
    where: { id: sitterId },
    select: { googleRefreshToken: true, calendarSyncEnabled: true },
  });
  if (!sitter?.googleRefreshToken?.trim() || !sitter.calendarSyncEnabled) {
    return result;
  }

  const bookings = await db.booking.findMany({
    where: {
      sitterId,
      orgId,
      status: { not: 'cancelled' },
      startAt: { gte: start, lte: end },
    },
    include: { client: true, pets: true, sitter: true },
  });

  for (const booking of bookings) {
    const r = await upsertEventForBooking(db, booking.id, orgId, { action: 'repair' });
    if (r.error) result.errors.push(`${booking.id}: ${r.error}`);
    else if (r.action === 'created') result.created++;
    else if (r.action === 'updated') result.updated++;
    else result.skipped++;
  }

  const mappings = await db.bookingCalendarEvent.findMany({
    where: { sitterId, orgId },
    include: { booking: true },
  });
  for (const m of mappings) {
    if (!m.booking || m.booking.status === 'cancelled') {
      await deleteEventForBooking(db, m.bookingId, sitterId, orgId, { action: 'repair' });
      result.deleted++;
    }
  }

  return result;
}

/**
 * Get busy ranges from Google Calendar for a sitter (for "Respect Google Busy").
 * Returns transient busy blocks; does not persist.
 */
export async function getGoogleBusyRanges(
  db: PrismaClient,
  sitterId: string,
  start: Date,
  end: Date
): Promise<{ start: Date; end: Date }[]> {
  const sitter = await db.sitter.findUnique({
    where: { id: sitterId },
    select: { googleRefreshToken: true, respectGoogleBusy: true, googleCalendarId: true },
  });
  if (!sitter?.respectGoogleBusy || !sitter.googleRefreshToken?.trim()) {
    return [];
  }

  const oauth2Client = await refreshGoogleTokenForSitter({
    db,
    sitterId,
    refreshToken: sitter.googleRefreshToken,
  });
  const calendarId = sitter.googleCalendarId ?? 'primary';

  try {
    const res = await calendar.freebusy.query({
      auth: oauth2Client,
      requestBody: {
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        items: [{ id: calendarId }],
      },
    });

    const cal = res.data.calendars?.[calendarId];
    if (!cal?.busy) return [];

    return (cal.busy || []).map((b) => ({
      start: new Date(b.start!),
      end: new Date(b.end!),
    }));
  } catch {
    return [];
  }
}
