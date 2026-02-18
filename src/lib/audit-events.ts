/**
 * Audit Event Helper
 * 
 * Centralized helper for writing audit/event logs for sitter actions.
 * Uses EventLog model (exists in Prisma schema).
 */

import { prisma } from '@/lib/db';

export interface AuditEventParams {
  orgId: string;
  sitterId: string;
  eventType: string;
  actorType: 'owner' | 'sitter' | 'system' | 'automation';
  actorId?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  bookingId?: string;
}

/**
 * Record an audit event for sitter actions
 */
export async function recordSitterAuditEvent(params: AuditEventParams): Promise<void> {
  try {
    await (prisma as any).eventLog.create({
      data: {
        eventType: params.eventType,
        status: 'success',
        bookingId: params.bookingId || null,
        metadata: JSON.stringify({
          orgId: params.orgId,
          sitterId: params.sitterId,
          actorType: params.actorType,
          actorId: params.actorId,
          entityType: params.entityType,
          entityId: params.entityId,
          ...params.metadata,
        }),
        createdAt: new Date(),
      },
    });
  } catch (error: any) {
    // Don't throw - audit failures shouldn't break the application
    console.error('[Audit Event] Failed to record event:', {
      eventType: params.eventType,
      sitterId: params.sitterId,
      error: error.message,
    });
  }
}

/**
 * Record offer accepted event
 */
export async function recordOfferAccepted(
  orgId: string,
  sitterId: string,
  bookingId: string,
  offerId: string,
  responseSeconds: number,
  actorId?: string
): Promise<void> {
  await recordSitterAuditEvent({
    orgId,
    sitterId,
    eventType: 'offer.accepted',
    actorType: 'sitter',
    actorId: actorId || sitterId,
    entityType: 'offer',
    entityId: offerId,
    bookingId,
    metadata: {
      responseSeconds,
      offerId,
    },
  });
}

/**
 * Record offer declined event
 */
export async function recordOfferDeclined(
  orgId: string,
  sitterId: string,
  bookingId: string,
  offerId: string,
  responseSeconds: number,
  reason?: string,
  actorId?: string
): Promise<void> {
  await recordSitterAuditEvent({
    orgId,
    sitterId,
    eventType: 'offer.declined',
    actorType: 'sitter',
    actorId: actorId || sitterId,
    entityType: 'offer',
    entityId: offerId,
    bookingId,
    metadata: {
      responseSeconds,
      offerId,
      reason: reason || 'declined',
    },
  });
}

/**
 * Record offer expired event
 */
export async function recordOfferExpired(
  orgId: string,
  sitterId: string,
  bookingId: string,
  offerId: string,
  actorId?: string
): Promise<void> {
  await recordSitterAuditEvent({
    orgId,
    sitterId,
    eventType: 'offer.expired',
    actorType: 'system',
    actorId: actorId || 'system',
    entityType: 'offer',
    entityId: offerId,
    bookingId,
    metadata: {
      offerId,
    },
  });
}

/**
 * Record sitter status changed event
 */
export async function recordSitterStatusChanged(
  orgId: string,
  sitterId: string,
  oldStatus: string,
  newStatus: string,
  actorId?: string
): Promise<void> {
  await recordSitterAuditEvent({
    orgId,
    sitterId,
    eventType: 'sitter.status_changed',
    actorType: actorId ? 'owner' : 'system',
    actorId: actorId || 'system',
    entityType: 'sitter',
    entityId: sitterId,
    metadata: {
      oldStatus,
      newStatus,
    },
  });
}

/**
 * Record tier changed event
 */
export async function recordTierChanged(
  orgId: string,
  sitterId: string,
  oldTier: string | null,
  newTier: string,
  reason: string,
  actorId?: string
): Promise<void> {
  await recordSitterAuditEvent({
    orgId,
    sitterId,
    eventType: 'tier.changed',
    actorType: 'system',
    actorId: actorId || 'system',
    entityType: 'sitter',
    entityId: sitterId,
    metadata: {
      oldTier,
      newTier,
      reason,
    },
  });
}

/**
 * Record availability toggled event
 */
export async function recordAvailabilityToggled(
  orgId: string,
  sitterId: string,
  isAvailable: boolean,
  actorId?: string
): Promise<void> {
  await recordSitterAuditEvent({
    orgId,
    sitterId,
    eventType: 'sitter.availability_changed',
    actorType: actorId ? 'sitter' : 'owner',
    actorId: actorId || 'system',
    entityType: 'sitter',
    entityId: sitterId,
    metadata: {
      isAvailable,
    },
  });
}
