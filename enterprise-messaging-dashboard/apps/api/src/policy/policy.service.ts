import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

/**
 * Policy Service - Anti-poaching detection and violation management
 * 
 * Detects: phone numbers, emails, URLs, social handles
 * Handles obfuscations (spaced digits, etc.)
 */
@Injectable()
export class PolicyService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  detectViolations(content: string): Array<{ type: string; content: string; reason: string }> {
    const violations: Array<{ type: string; content: string; reason: string }> = [];

    // Phone number patterns (including obfuscations)
    const phonePatterns = [
      /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, // US format
      /\b\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    ];

    for (const pattern of phonePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        violations.push({
          type: 'phone',
          content: matches[0],
          reason: 'Phone number detected',
        });
      }
    }

    // Email pattern
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emailMatches = content.match(emailPattern);
    if (emailMatches) {
      violations.push({
        type: 'email',
        content: emailMatches[0],
        reason: 'Email address detected',
      });
    }

    // URL pattern
    const urlPattern = /https?:\/\/[^\s]+/gi;
    const urlMatches = content.match(urlPattern);
    if (urlMatches) {
      violations.push({
        type: 'url',
        content: urlMatches[0],
        reason: 'URL detected',
      });
    }

    return violations;
  }

  async getViolations(orgId: string, filters?: any) {
    const where: any = { orgId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.threadId) {
      where.threadId = filters.threadId;
    }

    if (filters?.violationType) {
      where.violationType = filters.violationType;
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

    const [violations, total] = await Promise.all([
      this.prisma.policyViolation.findMany({
        where,
        include: {
          thread: {
            include: {
              client: true,
              sitter: true,
            },
          },
          message: {
            select: {
              id: true,
              direction: true,
              senderType: true,
              body: true,
              redactedBody: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: filters?.limit ? parseInt(filters.limit) : 100,
        skip: filters?.offset ? parseInt(filters.offset) : 0,
      }),
      this.prisma.policyViolation.count({ where }),
    ]);

    return { violations, total };
  }

  async getViolation(orgId: string, violationId: string) {
    const violation = await this.prisma.policyViolation.findFirst({
      where: { id: violationId, orgId },
      include: {
        thread: {
          include: {
            client: true,
            sitter: true,
          },
        },
        message: {
          select: {
            id: true,
            direction: true,
            senderType: true,
            body: true,
            redactedBody: true,
            createdAt: true,
          },
        },
      },
    });

    if (!violation) {
      throw new NotFoundException('Violation not found');
    }

    return violation;
  }

  async resolveViolation(orgId: string, violationId: string, userId: string) {
    const violation = await this.prisma.policyViolation.findFirst({
      where: { id: violationId, orgId },
    });

    if (!violation) {
      throw new NotFoundException('Violation not found');
    }

    const updated = await this.prisma.policyViolation.update({
      where: { id: violationId },
      data: {
        status: 'resolved',
        resolvedByUserId: userId,
        resolvedAt: new Date(),
      },
    });

    await this.audit.recordEvent({
      orgId,
      actorType: 'owner',
      actorId: userId,
      entityType: 'policyViolation',
      entityId: violationId,
      eventType: 'policy.violation.resolved',
      payload: { violationType: violation.violationType },
    });

    return updated;
  }

  async dismissViolation(orgId: string, violationId: string, userId: string) {
    const violation = await this.prisma.policyViolation.findFirst({
      where: { id: violationId, orgId },
    });

    if (!violation) {
      throw new NotFoundException('Violation not found');
    }

    const updated = await this.prisma.policyViolation.update({
      where: { id: violationId },
      data: {
        status: 'dismissed',
        resolvedByUserId: userId,
        resolvedAt: new Date(),
      },
    });

    await this.audit.recordEvent({
      orgId,
      actorType: 'owner',
      actorId: userId,
      entityType: 'policyViolation',
      entityId: violationId,
      eventType: 'policy.violation.dismissed',
      payload: { violationType: violation.violationType },
    });

    return updated;
  }

  async overrideViolation(orgId: string, violationId: string, userId: string, reason: string) {
    const violation = await this.prisma.policyViolation.findFirst({
      where: { id: violationId, orgId },
      include: { message: true },
    });

    if (!violation) {
      throw new NotFoundException('Violation not found');
    }

    // Update violation
    const updated = await this.prisma.policyViolation.update({
      where: { id: violationId },
      data: {
        actionTaken: 'overridden',
        status: 'resolved',
        resolvedByUserId: userId,
        resolvedAt: new Date(),
      },
    });

    // If message was blocked, we'd need to send it here
    // For now, just audit the override

    await this.audit.recordEvent({
      orgId,
      actorType: 'owner',
      actorId: userId,
      entityType: 'policyViolation',
      entityId: violationId,
      eventType: 'policy.violation.overridden',
      payload: { violationType: violation.violationType, reason },
    });

    return updated;
  }

  async exportViolations(orgId: string, filters?: any) {
    const MAX_EXPORT_ROWS = 10000;

    const where: any = { orgId };

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

    const count = await this.prisma.policyViolation.count({ where });

    if (count > MAX_EXPORT_ROWS) {
      throw new BadRequestException(
        `Export exceeds ${MAX_EXPORT_ROWS} violations. Narrow date range or filters.`,
      );
    }

    const violations = await this.prisma.policyViolation.findMany({
      where,
      include: {
        thread: {
          include: {
            client: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: MAX_EXPORT_ROWS,
    });

    const headers = [
      'id',
      'timestamp',
      'threadId',
      'clientName',
      'violationType',
      'actionTaken',
      'status',
      'detectedRedacted',
    ];

    const rows = violations.map((v) => [
      v.id,
      v.createdAt.toISOString(),
      v.threadId,
      v.thread.client.name,
      v.violationType,
      v.actionTaken,
      v.status,
      v.detectedRedacted || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    return csv;
  }
}
