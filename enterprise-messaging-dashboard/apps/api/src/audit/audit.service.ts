import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { ActorType, AuditEvent } from '@snoutos/shared';

/**
 * Audit Service - Append-only event recorder
 * 
 * CRITICAL: This service enforces append-only semantics.
 * Audit events CANNOT be deleted - only archived if needed.
 * 
 * Every system action, decision, and state change should be logged here.
 */
@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * Record an audit event
   * 
   * This is the single source of truth for all system events.
   * All modules should use this service to log their actions.
   * 
   * @param params Event parameters
   */
  async recordEvent(params: {
    orgId: string;
    actorType: ActorType;
    actorId?: string;
    entityType?: string;
    entityId?: string;
    eventType: string;
    correlationIds?: Record<string, string>;
    payload: Record<string, unknown>;
    schemaVersion?: number;
  }): Promise<string> {
    const event = await this.prisma.auditEvent.create({
      data: {
        orgId: params.orgId,
        actorType: params.actorType,
        actorId: params.actorId || null,
        entityType: params.entityType || null,
        entityId: params.entityId || null,
        eventType: params.eventType,
        correlationIds: params.correlationIds || {},
        payload: params.payload,
        schemaVersion: params.schemaVersion || 1,
        ts: new Date(),
      },
    });

    return event.id;
  }

  /**
   * Query audit events with filters
   * 
   * Used for audit timeline views and compliance exports.
   * 
   * @param params Query parameters
   */
  async queryEvents(params: {
    orgId: string;
    eventType?: string;
    actorType?: ActorType;
    entityType?: string;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {
      orgId: params.orgId,
    };

    if (params.eventType) {
      where.eventType = params.eventType;
    }

    if (params.actorType) {
      where.actorType = params.actorType;
    }

    if (params.entityType) {
      where.entityType = params.entityType;
    }

    if (params.entityId) {
      where.entityId = params.entityId;
    }

    if (params.startDate || params.endDate) {
      where.ts = {};
      if (params.startDate) {
        where.ts.gte = params.startDate;
      }
      if (params.endDate) {
        where.ts.lte = params.endDate;
      }
    }

    // Search in eventType, entityId, or correlationIds
    if (params.search) {
      where.OR = [
        { eventType: { contains: params.search, mode: 'insensitive' } },
        { entityId: { contains: params.search } },
        // Note: correlationIds search would require JSON query
      ];
    }

    // Enforce max limit cap (prevent excessive queries)
    const MAX_LIMIT = 1000;
    const limit = params.limit ? Math.min(params.limit, MAX_LIMIT) : 100;

    const [events, total] = await Promise.all([
      this.prisma.auditEvent.findMany({
        where,
        orderBy: { ts: 'desc' },
        take: limit,
        skip: params.offset || 0,
      }),
      this.prisma.auditEvent.count({ where }),
    ]);

    return { events, total };
  }

  /**
   * Export audit events to CSV format
   * 
   * Enforces max 10,000 rows per export (per spec requirement).
   */
  async exportToCsv(params: {
    orgId: string;
    startDate?: Date;
    endDate?: Date;
    eventTypes?: string[];
  }): Promise<string> {
    const MAX_EXPORT_ROWS = 10000;

    const where: any = {
      orgId: params.orgId,
    };

    if (params.startDate || params.endDate) {
      where.ts = {};
      if (params.startDate) {
        where.ts.gte = params.startDate;
      }
      if (params.endDate) {
        where.ts.lte = params.endDate;
      }
    }

    if (params.eventTypes && params.eventTypes.length > 0) {
      where.eventType = { in: params.eventTypes };
    }

    const count = await this.prisma.auditEvent.count({ where });

    if (count > MAX_EXPORT_ROWS) {
      throw new Error(
        `Export exceeds ${MAX_EXPORT_ROWS} events. Narrow date range or filters.`,
      );
    }

    const events = await this.prisma.auditEvent.findMany({
      where,
      orderBy: { ts: 'asc' },
      take: MAX_EXPORT_ROWS,
    });

    // Generate CSV
    const headers = [
      'id',
      'orgId',
      'actorType',
      'actorId',
      'entityType',
      'entityId',
      'eventType',
      'ts',
      'correlationIds',
      'payload',
      'schemaVersion',
    ];

    const rows = events.map((event) => [
      event.id,
      event.orgId,
      event.actorType,
      event.actorId || '',
      event.entityType || '',
      event.entityId || '',
      event.eventType,
      event.ts.toISOString(),
      JSON.stringify(event.correlationIds),
      JSON.stringify(event.payload),
      event.schemaVersion.toString(),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    return csv;
  }
}
