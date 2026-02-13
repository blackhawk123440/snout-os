import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Inject } from '@nestjs/common';
import type { IProvider } from '../provider/provider.interface';

@Injectable()
export class NumbersService {
  private readonly logger = new Logger(NumbersService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    @Inject('PROVIDER') private provider: IProvider,
  ) {}

  async getSitters(orgId: string) {
    return this.prisma.sitter.findMany({
      where: { orgId, active: true },
      select: {
        id: true,
        name: true,
        userId: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getInventory(orgId: string, filters?: any) {
    const where: any = { orgId };

    if (filters?.class) {
      const classes = Array.isArray(filters.class) ? filters.class : [filters.class];
      where.class = { in: classes };
    }

    if (filters?.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      where.status = { in: statuses };
    }

    if (filters?.assignedSitterId) {
      if (filters.assignedSitterId === 'unassigned') {
        where.assignedSitterId = null;
      } else {
        where.assignedSitterId = filters.assignedSitterId;
      }
    }

    if (filters?.search) {
      where.OR = [
        { e164: { contains: filters.search } },
        { assignedSitter: { name: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    // Health filter (computed after fetch)
    // Usage filter (computed after fetch)

    const numbers = await this.prisma.messageNumber.findMany({
      where,
      include: {
        assignedSitter: true,
      },
      orderBy: filters?.sortBy
        ? { [filters.sortBy]: filters.sortOrder || 'desc' }
        : { createdAt: 'desc' },
      take: filters?.limit ? parseInt(filters.limit) : undefined,
      skip: filters?.offset ? parseInt(filters.offset) : undefined,
    });

    // Enrich with health metrics
    const enriched = await Promise.all(
      numbers.map(async (number) => {
        const health = await this.computeHealth(orgId, number.id);
        return {
          ...number,
          health,
        };
      }),
    );

    // Apply health filter if specified
    if (filters?.health) {
      return enriched.filter((n) => n.health.status === filters.health);
    }

    return enriched;
  }

  async getNumberDetail(orgId: string, numberId: string) {
    const number = await this.prisma.messageNumber.findFirst({
      where: { id: numberId, orgId },
      include: {
        assignedSitter: true,
        threads: {
          where: { status: 'active' },
          include: {
            client: true,
            sitter: true,
          },
        },
      },
    });

    if (!number) {
      throw new BadRequestException('Number not found');
    }

    const health = await this.computeHealth(orgId, numberId);
    const deliveryErrors = await this.getDeliveryErrors(orgId, numberId, 30);

    return {
      ...number,
      health,
      deliveryErrors,
      activeThreadCount: number.threads.length,
    };
  }

  async getImpactPreview(orgId: string, numberId: string, action: string) {
    const number = await this.prisma.messageNumber.findFirst({
      where: { id: numberId, orgId },
      include: {
        threads: {
          where: { status: 'active' },
          include: {
            client: true,
            sitter: true,
          },
        },
      },
    });

    if (!number) {
      throw new BadRequestException('Number not found');
    }

    if (action === 'quarantine') {
      return {
        affectedThreads: number.threads.length,
        threads: number.threads.map((t) => ({
          id: t.id,
          clientName: t.client.name,
          sitterName: t.sitter?.name,
        })),
        impact: `This will route ${number.threads.length} active conversation(s) to the owner inbox until reassignment.`,
        cooldownDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        cooldownDays: 90,
      };
    }

    if (action === 'assign' || action === 'release') {
      return {
        affectedThreads: number.threads.length,
        threads: number.threads.map((t) => ({
          id: t.id,
          clientName: t.client.name,
          sitterName: t.sitter?.name,
        })),
        impact: `This will affect ${number.threads.length} active conversation(s).`,
      };
    }

    return { affectedThreads: 0, threads: [], impact: 'No impact' };
  }

  async purchaseNumber(orgId: string, e164: string, numberClass: string) {
    const result = await this.provider.purchaseNumber(e164);

    if (!result.success) {
      throw new BadRequestException(result.error);
    }

    const number = await this.prisma.messageNumber.create({
      data: {
        orgId,
        e164: result.e164!,
        class: numberClass,
        status: 'active',
        providerType: 'twilio',
        providerNumberSid: result.numberSid,
        purchaseDate: new Date(),
      },
    });

    await this.audit.recordEvent({
      orgId,
      actorType: 'owner',
      entityType: 'messageNumber',
      entityId: number.id,
      eventType: 'number.purchased',
      payload: { e164, numberClass, numberSid: result.numberSid },
    });

    return number;
  }

  async quarantineNumber(
    orgId: string,
    numberId: string,
    reason: string,
    reasonDetail?: string,
  ) {
    // Check if this is the last front desk number
    const number = await this.prisma.messageNumber.findUnique({
      where: { id: numberId },
    });

    if (!number) {
      throw new BadRequestException('Number not found');
    }

    if (number.orgId !== orgId) {
      throw new BadRequestException('Number not found');
    }

    if (number.class === 'front_desk') {
      const frontDeskCount = await this.prisma.messageNumber.count({
        where: { orgId, class: 'front_desk', status: 'active' },
      });

      if (frontDeskCount <= 1) {
        throw new BadRequestException(
          'Cannot quarantine: This is the last Front Desk number. Assign replacement first.',
        );
      }
    }

    const releaseAt = new Date();
    releaseAt.setDate(releaseAt.getDate() + 90); // 90-day cooldown

    const updated = await this.prisma.messageNumber.update({
      where: { id: numberId },
      data: {
        status: 'quarantined',
        quarantinedReason: reasonDetail || reason,
        quarantineReleaseAt: releaseAt,
        assignedSitterId: null,
      },
    });

    await this.audit.recordEvent({
      orgId,
      actorType: 'owner',
      entityType: 'messageNumber',
      entityId: numberId,
      eventType: 'number.quarantined',
      payload: { reason, reasonDetail, releaseAt: releaseAt.toISOString() },
    });

    return updated;
  }

  async releaseFromQuarantine(orgId: string, numberId: string) {
    const number = await this.prisma.messageNumber.findFirst({
      where: { id: numberId, orgId },
    });

    if (!number) {
      throw new BadRequestException('Number not found');
    }

    if (number.status !== 'quarantined') {
      throw new BadRequestException('Number is not quarantined');
    }

    if (number.quarantineReleaseAt && new Date() < number.quarantineReleaseAt) {
      const daysRemaining = Math.ceil(
        (number.quarantineReleaseAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      throw new BadRequestException(
        `Cannot release: Cooldown period not complete. ${daysRemaining} days remaining.`,
      );
    }

    const updated = await this.prisma.messageNumber.update({
      where: { id: numberId },
      data: {
        status: 'active',
        quarantinedReason: null,
        quarantineReleaseAt: null,
      },
    });

    await this.audit.recordEvent({
      orgId,
      actorType: 'owner',
      entityType: 'messageNumber',
      entityId: numberId,
      eventType: 'number.released_from_quarantine',
      payload: {},
    });

    return updated;
  }

  async assignToSitter(orgId: string, numberId: string, sitterId: string) {
    const number = await this.prisma.messageNumber.findFirst({
      where: { id: numberId, orgId },
    });

    if (!number) {
      throw new BadRequestException('Number not found');
    }

    if (number.class === 'front_desk') {
      throw new BadRequestException('Cannot assign Front Desk number to sitter');
    }

    const sitter = await this.prisma.sitter.findFirst({
      where: { id: sitterId, orgId },
    });

    if (!sitter) {
      throw new BadRequestException('Sitter not found');
    }

    const updated = await this.prisma.messageNumber.update({
      where: { id: numberId },
      data: { assignedSitterId: sitterId },
    });

    await this.audit.recordEvent({
      orgId,
      actorType: 'owner',
      entityType: 'messageNumber',
      entityId: numberId,
      eventType: 'number.assigned_to_sitter',
      payload: { sitterId },
    });

    return updated;
  }

  async releaseToPool(orgId: string, numberId: string) {
    const number = await this.prisma.messageNumber.findFirst({
      where: { id: numberId, orgId },
    });

    if (!number) {
      throw new BadRequestException('Number not found');
    }

    if (number.class === 'front_desk') {
      throw new BadRequestException('Cannot release Front Desk number to pool');
    }

    if (!number.assignedSitterId) {
      throw new BadRequestException('Number is not assigned to a sitter');
    }

    const updated = await this.prisma.messageNumber.update({
      where: { id: numberId },
      data: {
        assignedSitterId: null,
        class: 'pool',
      },
    });

    await this.audit.recordEvent({
      orgId,
      actorType: 'owner',
      entityType: 'messageNumber',
      entityId: numberId,
      eventType: 'number.released_to_pool',
      payload: {},
    });

    return updated;
  }

  async bulkQuarantine(
    orgId: string,
    numberIds: string[],
    reason: string,
    reasonDetail?: string,
  ) {
    const results = [];
    const errors = [];

    for (const numberId of numberIds) {
      try {
        const result = await this.quarantineNumber(orgId, numberId, reason, reasonDetail);
        results.push({ numberId, success: true, number: result });
      } catch (error: any) {
        errors.push({ numberId, success: false, error: error.message });
      }
    }

    return { results, errors };
  }

  async bulkImport(orgId: string, numbers: Array<{ e164: string; class: string }>) {
    const results = [];
    const errors = [];

    for (const num of numbers) {
      try {
        const importResult = await this.provider.importNumber(num.e164);
        if (!importResult.success) {
          errors.push({ e164: num.e164, error: importResult.error });
          continue;
        }

        const number = await this.prisma.messageNumber.create({
          data: {
            orgId,
            e164: importResult.e164!,
            class: num.class,
            status: 'active',
            providerType: 'twilio',
            providerNumberSid: importResult.numberSid,
            purchaseDate: new Date(),
          },
        });

        results.push({ e164: num.e164, success: true, number });

        await this.audit.recordEvent({
          orgId,
          actorType: 'owner',
          entityType: 'messageNumber',
          entityId: number.id,
          eventType: 'number.imported',
          payload: { e164: num.e164, class: num.class },
        });
      } catch (error: any) {
        errors.push({ e164: num.e164, error: error.message });
      }
    }

    return { results, errors };
  }

  async exportCsv(orgId: string) {
    const numbers = await this.prisma.messageNumber.findMany({
      where: { orgId },
      include: {
        assignedSitter: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'E164',
      'Class',
      'Status',
      'Assigned To',
      'Purchase Date',
      'Last Used',
      'Provider SID',
    ];

    const rows = numbers.map((n) => [
      n.e164,
      n.class,
      n.status,
      n.assignedSitter?.name || 'Unassigned',
      n.purchaseDate?.toISOString() || '',
      n.lastUsedAt?.toISOString() || '',
      n.providerNumberSid || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    return csv;
  }

  /**
   * Compute health metrics for a number
   */
  private async computeHealth(orgId: string, numberId: string) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get threads for this number
    const threads = await this.prisma.thread.findMany({
      where: { orgId, numberId, status: 'active' },
      select: { id: true },
    });

    const threadIds = threads.map((t) => t.id);

    if (threadIds.length === 0) {
      return {
        status: 'healthy',
        deliveryErrors7d: 0,
        messages7d: 0,
        errorRate: 0,
      };
    }

    // Get messages in last 7 days
    const messages = await this.prisma.message.findMany({
      where: {
        orgId,
        threadId: { in: threadIds },
        createdAt: { gte: sevenDaysAgo },
        direction: 'outbound',
      },
      include: {
        deliveries: {
          where: { status: 'failed' },
        },
      },
    });

    const messages7d = messages.length;
    const deliveryErrors7d = messages.filter((m) => m.deliveries.some((d) => d.status === 'failed'))
      .length;

    const errorRate = messages7d > 0 ? deliveryErrors7d / messages7d : 0;

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (errorRate > 0.1 || deliveryErrors7d > 10) {
      status = 'critical';
    } else if (errorRate > 0.05 || deliveryErrors7d > 5) {
      status = 'degraded';
    }

    return {
      status,
      deliveryErrors7d,
      messages7d,
      errorRate,
    };
  }

  /**
   * Get delivery errors for a number
   */
  private async getDeliveryErrors(orgId: string, numberId: string, days: number) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const threads = await this.prisma.thread.findMany({
      where: { orgId, numberId, status: 'active' },
      select: { id: true },
    });

    const threadIds = threads.map((t) => t.id);

    if (threadIds.length === 0) {
      return [];
    }

    const failedDeliveries = await this.prisma.messageDelivery.findMany({
      where: {
        message: {
          orgId,
          threadId: { in: threadIds },
          createdAt: { gte: startDate },
          direction: 'outbound',
        },
        status: 'failed',
      },
      include: {
        message: {
          include: {
            thread: {
              include: {
                client: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return failedDeliveries.map((d) => ({
      id: d.id,
      timestamp: d.createdAt,
      errorCode: d.providerErrorCode,
      errorMessage: d.providerErrorMessage,
      attemptNo: d.attemptNo,
      clientName: d.message.thread.client.name,
    }));
  }

  async changeClass(orgId: string, numberId: string, newClass: string) {
    const number = await this.prisma.messageNumber.findFirst({
      where: { id: numberId, orgId },
      include: {
        threads: {
          where: { status: 'active' },
        },
      },
    });

    if (!number) {
      throw new BadRequestException('Number not found');
    }

    // Safety check: cannot change class if there are active threads
    if (number.threads.length > 0) {
      throw new BadRequestException(
        `Cannot change class: ${number.threads.length} active thread(s) using this number`,
      );
    }

    // Validate class
    if (!['front_desk', 'sitter', 'pool'].includes(newClass)) {
      throw new BadRequestException('Invalid class. Must be front_desk, sitter, or pool');
    }

    // If changing from sitter to something else, unassign sitter
    const updateData: any = { class: newClass };
    if (number.class === 'sitter' && newClass !== 'sitter') {
      updateData.assignedSitterId = null;
    }

    const updated = await this.prisma.messageNumber.update({
      where: { id: numberId },
      data: updateData,
    });

    await this.audit.recordEvent({
      orgId,
      actorType: 'owner',
      entityType: 'messageNumber',
      entityId: numberId,
      eventType: 'number.class_changed',
      payload: { oldClass: number.class, newClass },
    });

    return updated;
  }

  async deactivateSitter(orgId: string, sitterId: string) {
    const now = new Date();

    // Find sitter
    const sitter = await this.prisma.sitter.findFirst({
      where: { id: sitterId, orgId },
      include: {
        user: true,
      },
    });

    if (!sitter) {
      throw new BadRequestException('Sitter not found');
    }

    // Get active assignment windows
    const activeWindows = await this.prisma.assignmentWindow.findMany({
      where: {
        orgId,
        sitterId,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
    });

    // End all active assignment windows
    await this.prisma.assignmentWindow.updateMany({
      where: {
        orgId,
        sitterId,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      data: {
        endsAt: now,
      },
    });

    // Get sitter's numbers
    const sitterNumbers = await this.prisma.messageNumber.findMany({
      where: {
        orgId,
        assignedSitterId: sitterId,
        status: 'active',
      },
    });

    // Release numbers to pool (or quarantine if safer - using pool for now)
    for (const number of sitterNumbers) {
      // Check if number has active threads
      const activeThreads = await this.prisma.thread.count({
        where: {
          orgId,
          numberId: number.id,
          status: 'active',
        },
      });

      if (activeThreads === 0) {
        // Safe to release to pool
        await this.prisma.messageNumber.update({
          where: { id: number.id },
          data: {
            assignedSitterId: null,
            class: 'pool',
          },
        });
      } else {
        // Has active threads - quarantine instead
        const releaseAt = new Date();
        releaseAt.setDate(releaseAt.getDate() + 90);
        await this.prisma.messageNumber.update({
          where: { id: number.id },
          data: {
            assignedSitterId: null,
            status: 'quarantined',
            quarantinedReason: 'Sitter deactivated',
            quarantineReleaseAt: releaseAt,
          },
        });
      }
    }

    // Set user status to inactive (if user exists and has status field)
    // Note: User model may not have status field - this is a no-op if field doesn't exist
    if (sitter.user) {
      try {
        await this.prisma.user.update({
          where: { id: sitter.user.id },
          data: { active: false } as any, // Type assertion since status might not exist
        });
      } catch (error) {
        // If status field doesn't exist, that's okay - we'll just log
        this.logger.warn(`Could not set user status for ${sitter.user.id}: ${error}`);
      }
    }

    await this.audit.recordEvent({
      orgId,
      actorType: 'owner',
      entityType: 'sitter',
      entityId: sitterId,
      eventType: 'sitter.deactivated',
      payload: {
        activeAssignments: activeWindows.length,
        numbersAffected: sitterNumbers.length,
      },
    });

    return {
      success: true,
      message: `Sitter deactivated. ${activeWindows.length} assignment window(s) ended, ${sitterNumbers.length} number(s) released.`,
      activeAssignments: activeWindows.length,
      numbersAffected: sitterNumbers.length,
    };
  }
}
