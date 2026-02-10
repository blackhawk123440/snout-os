/**
 * Alert Helpers
 * 
 * Simple alert creation for messaging system.
 * Uses Prisma directly (no separate alerts service in root app).
 */

import { prisma } from '@/lib/db';
import { logMessagingEvent } from './audit-trail';

/**
 * Create or update alert (with deduplication)
 */
export async function createAlert(params: {
  orgId: string;
  severity: 'critical' | 'warning' | 'info';
  type: string;
  title: string;
  description: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { orgId, severity, type, title, description, entityType, entityId, metadata } = params;

  // Use Alert model from API schema (not Setting)
  // Check for existing open alert of same type
  // Cast to any to avoid type issues with Prisma client from API schema
  const existing = await (prisma as any).alert.findFirst({
    where: {
      orgId,
      type,
      entityId: entityId || null,
      status: 'open',
    },
  });

  if (existing) {
    // Update existing alert (refresh description)
    // Note: Alert model doesn't have updatedAt field, only createdAt and resolvedAt
    await (prisma as any).alert.update({
      where: { id: existing.id },
      data: {
        description,
      },
    });

    await logMessagingEvent({
      orgId,
      eventType: 'alert.updated' as any,
      metadata: {
        type,
        severity,
        reason: 'Deduplication refresh',
      },
    });
    return;
  }

  // Create new alert using Alert model
  await (prisma as any).alert.create({
    data: {
      orgId,
      severity,
      type,
      title,
      description,
      entityType: entityType || null,
      entityId: entityId || null,
      status: 'open',
    },
  });

  await logMessagingEvent({
    orgId,
    eventType: 'alert.created' as any, // alert.created not in MessagingAuditEventType, but needed for audit
    metadata: {
      type,
      severity,
      entityType,
      entityId,
    },
  });
}

/**
 * Get open alerts for org
 */
export async function getOpenAlerts(orgId: string): Promise<Array<{
  type: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}>> {
  // Use Alert model from API schema
  const alerts = await (prisma as any).alert.findMany({
    where: {
      orgId,
      status: 'open',
    },
  });

  return alerts.map((alert: any) => ({
    type: alert.type,
    severity: alert.severity as 'critical' | 'warning' | 'info',
    title: alert.title,
    description: alert.description,
    entityType: alert.entityType || undefined,
    entityId: alert.entityId || undefined,
    metadata: {}, // Alert model doesn't have metadata field in API schema
  }));
}
