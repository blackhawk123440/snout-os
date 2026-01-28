import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

/**
 * Alerts Service
 * 
 * Handles alert creation, resolution, dismissal, and deduplication.
 * Critical alerts cannot be dismissed.
 */
@Injectable()
export class AlertsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /**
   * Create or update alert (with deduplication)
   * 
   * Deduplication: Same org + type + entityType + entityId + status='open' = update existing
   */
  async createAlert(params: {
    orgId: string;
    severity: 'critical' | 'warning' | 'info';
    type: string;
    title: string;
    description: string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  }) {
    const { orgId, severity, type, title, description, entityType, entityId, metadata } = params;

    // Check for existing open alert of same type and entity
    const existing = await this.prisma.alert.findFirst({
      where: {
        orgId,
        type,
        entityType: entityType || null,
        entityId: entityId || null,
        status: 'open',
      },
    });

    if (existing) {
      // Update existing alert (refresh timestamp)
      const updated = await this.prisma.alert.update({
        where: { id: existing.id },
        data: {
          title,
          description,
          severity,
          createdAt: new Date(), // Refresh timestamp
        },
      });

      await this.audit.recordEvent({
        orgId,
        actorType: 'system',
        entityType: 'alert',
        entityId: updated.id,
        eventType: 'alert.updated',
        payload: { type, severity, reason: 'Deduplication refresh' },
      });

      return updated;
    }

    // Create new alert
    const alert = await this.prisma.alert.create({
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

    await this.audit.recordEvent({
      orgId,
      actorType: 'system',
      entityType: 'alert',
      entityId: alert.id,
      eventType: 'alert.created',
      payload: { type, severity, entityType, entityId },
    });

    // If critical, create escalation event
    if (severity === 'critical') {
      await this.createEscalationEvent(orgId, alert.id, 'critical_alert_created');
    }

    return alert;
  }

  async getAlerts(orgId: string, filters?: {
    severity?: string;
    type?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = { orgId };

    if (filters?.severity) {
      where.severity = filters.severity;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.status) {
      where.status = filters.status;
    } else {
      // Default to open if no status filter
      where.status = 'open';
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { type: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [alerts, total] = await Promise.all([
      this.prisma.alert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters?.limit ? parseInt(String(filters.limit)) : 100,
        skip: filters?.offset ? parseInt(String(filters.offset)) : 0,
      }),
      this.prisma.alert.count({ where }),
    ]);

    return { alerts, total };
  }

  async getAlert(orgId: string, alertId: string) {
    const alert = await this.prisma.alert.findFirst({
      where: { id: alertId, orgId },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    return alert;
  }

  async resolveAlert(orgId: string, alertId: string, userId: string) {
    const alert = await this.prisma.alert.findFirst({
      where: { id: alertId, orgId },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    if (alert.status !== 'open') {
      throw new BadRequestException('Alert is not open');
    }

    const updated = await this.prisma.alert.update({
      where: { id: alertId },
      data: {
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedByUserId: userId,
      },
    });

    await this.audit.recordEvent({
      orgId,
      actorType: 'owner',
      actorId: userId,
      entityType: 'alert',
      entityId: alertId,
      eventType: 'alert.resolved',
      payload: { type: alert.type, severity: alert.severity },
    });

    return updated;
  }

  async dismissAlert(orgId: string, alertId: string, userId: string, reason?: string) {
    const alert = await this.prisma.alert.findFirst({
      where: { id: alertId, orgId },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    // Guardrail: Critical alerts cannot be dismissed
    if (alert.severity === 'critical') {
      throw new BadRequestException('Critical alerts cannot be dismissed. They must be resolved.');
    }

    if (alert.status !== 'open') {
      throw new BadRequestException('Alert is not open');
    }

    const updated = await this.prisma.alert.update({
      where: { id: alertId },
      data: {
        status: 'dismissed',
        resolvedAt: new Date(),
        resolvedByUserId: userId,
      },
    });

    await this.audit.recordEvent({
      orgId,
      actorType: 'owner',
      actorId: userId,
      entityType: 'alert',
      entityId: alertId,
      eventType: 'alert.dismissed',
      payload: { type: alert.type, severity: alert.severity, reason },
    });

    return updated;
  }

  async exportAlerts(orgId: string, filters?: any) {
    const MAX_EXPORT_ROWS = 10000;

    const where: any = { orgId };

    if (filters?.severity) {
      where.severity = filters.severity;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    const count = await this.prisma.alert.count({ where });

    if (count > MAX_EXPORT_ROWS) {
      throw new BadRequestException(
        `Export exceeds ${MAX_EXPORT_ROWS} alerts. Narrow date range or filters.`,
      );
    }

    const alerts = await this.prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: MAX_EXPORT_ROWS,
    });

    const headers = [
      'id',
      'severity',
      'type',
      'title',
      'description',
      'entityType',
      'entityId',
      'status',
      'createdAt',
      'resolvedAt',
    ];

    const rows = alerts.map((a) => [
      a.id,
      a.severity,
      a.type,
      a.title,
      a.description,
      a.entityType || '',
      a.entityId || '',
      a.status,
      a.createdAt.toISOString(),
      a.resolvedAt?.toISOString() || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    return csv;
  }

  /**
   * Create escalation event (MVP - just logs)
   */
  private async createEscalationEvent(orgId: string, alertId: string, eventType: string) {
    // For MVP, just log to audit
    await this.audit.recordEvent({
      orgId,
      actorType: 'system',
      entityType: 'alert',
      entityId: alertId,
      eventType: 'escalation.triggered',
      payload: { eventType, action: 'owner_notified_in_dashboard' },
    });
  }
}
