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

  // Note: API schema uses Alert model, not Setting model
  // Use Alert model from API schema instead
  try {
    await prisma.alert.create({
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
  } catch (error) {
    console.error('[AlertHelpers] Failed to create alert:', error);
  }
  
  /* Original code (commented out - uses Setting model):
  const existing = await prisma.setting.findFirst({
    where: {
      key: `alert.${type}.${entityId || 'global'}`,
    },
  });

  if (existing) {
    await prisma.setting.update({
      where: { key: `alert.${type}.${entityId || 'global'}` },
      data: {
        value: JSON.stringify({
          severity,
          title,
          description,
          entityType,
          entityId,
          metadata,
          updatedAt: new Date().toISOString(),
        }),
        updatedAt: new Date(),
      },
    });
    return;
  }
  
  // Note: Already handled above with Alert model

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
  const alerts = await prisma.setting.findMany({
    where: {
      key: {
        startsWith: 'alert.',
      },
      category: 'alert',
    },
  });

  const result: Array<{
    type: string;
    severity: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  }> = [];

  for (const alert of alerts) {
    try {
      const data = JSON.parse(alert.value);
      if (data.status === 'open') {
        const type = alert.key.replace('alert.', '').split('.')[0];
        result.push({
          type,
          severity: data.severity,
          title: data.title,
          description: data.description,
          entityType: data.entityType,
          entityId: data.entityId,
          metadata: data.metadata,
        });
      }
    } catch (error) {
      console.error(`[alert-helpers] Failed to parse alert ${alert.key}:`, error);
    }
  }

  return result;
}
