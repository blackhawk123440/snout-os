import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MessagingService } from '../messaging/messaging.service';

@Injectable()
export class DeliveriesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    @Inject(forwardRef(() => MessagingService))
    private messagingService: MessagingService,
  ) {}

  async getFailures(orgId: string, filters?: any) {
    const where: any = {
      orgId,
      status: 'failed',
    };

    if (filters?.threadId) {
      where.threadId = filters.threadId;
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

    if (filters?.errorCode) {
      where.providerErrorCode = filters.errorCode;
    }

    const failures = await this.prisma.messageDelivery.findMany({
      where: {
        message: {
          orgId,
          threadId: filters?.threadId ? filters.threadId : undefined,
          createdAt: filters?.startDate || filters?.endDate
            ? {
                gte: filters.startDate ? new Date(filters.startDate) : undefined,
                lte: filters.endDate ? new Date(filters.endDate) : undefined,
              }
            : undefined,
        },
        status: 'failed',
        providerErrorCode: filters?.errorCode ? filters.errorCode : undefined,
      },
      include: {
        message: {
          include: {
            thread: {
              include: {
                client: true,
                sitter: true,
                messageNumber: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit ? parseInt(filters.limit) : 100,
      skip: filters?.offset ? parseInt(filters.offset) : 0,
    });

    // Get total count
    const total = await this.prisma.messageDelivery.count({
      where: {
        message: {
          orgId,
          threadId: filters?.threadId ? filters.threadId : undefined,
          createdAt: filters?.startDate || filters?.endDate
            ? {
                gte: filters.startDate ? new Date(filters.startDate) : undefined,
                lte: filters.endDate ? new Date(filters.endDate) : undefined,
              }
            : undefined,
        },
        status: 'failed',
        providerErrorCode: filters?.errorCode ? filters.errorCode : undefined,
      },
    });

    return { failures, total };
  }

  async retryDelivery(orgId: string, deliveryId: string, userId: string) {
    const delivery = await this.prisma.messageDelivery.findFirst({
      where: { id: deliveryId },
      include: {
        message: {
          include: {
            thread: {
              include: {
                messageNumber: true,
                client: { include: { contacts: true } },
              },
            },
          },
        },
      },
    });

    if (!delivery || delivery.message.orgId !== orgId) {
      throw new NotFoundException('Delivery not found');
    }

    // Use messaging service to retry
    // Note: retryMessage returns the new delivery attempt
    await this.messagingService.retryMessage(delivery.messageId, orgId);
    
    // Fetch the updated delivery to return
    const updated = await this.prisma.messageDelivery.findFirst({
      where: { id: deliveryId },
      orderBy: { createdAt: 'desc' },
    });
    
    const result = {
      success: true,
      attemptNo: updated?.attemptNo || delivery.attemptNo + 1,
    };

    await this.audit.recordEvent({
      orgId,
      actorType: 'owner',
      actorId: userId,
      entityType: 'messageDelivery',
      entityId: deliveryId,
      eventType: 'delivery.retry.manual',
      payload: { messageId: delivery.messageId, attemptNo: result.attemptNo },
    });

    return result;
  }

  async resolveFailure(orgId: string, deliveryId: string, userId: string) {
    const delivery = await this.prisma.messageDelivery.findFirst({
      where: { id: deliveryId },
      include: { message: true },
    });

    if (!delivery || delivery.message.orgId !== orgId) {
      throw new NotFoundException('Delivery not found');
    }

    // Mark as resolved (we could add a resolved flag, but for now we'll just audit)
    await this.audit.recordEvent({
      orgId,
      actorType: 'owner',
      actorId: userId,
      entityType: 'messageDelivery',
      entityId: deliveryId,
      eventType: 'delivery.failure.resolved',
      payload: { messageId: delivery.messageId },
    });

    return { success: true };
  }

  async exportFailures(orgId: string, filters?: any) {
    const MAX_EXPORT_ROWS = 10000;

    const where: any = {
      message: { orgId },
      status: 'failed',
    };

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    const count = await this.prisma.messageDelivery.count({ where });

    if (count > MAX_EXPORT_ROWS) {
      throw new BadRequestException(
        `Export exceeds ${MAX_EXPORT_ROWS} failures. Narrow date range or filters.`,
      );
    }

    const failures = await this.prisma.messageDelivery.findMany({
      where,
      include: {
        message: {
          include: {
            thread: {
              include: {
                client: true,
                messageNumber: true,
              },
            },
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
      'number',
      'attemptNo',
      'errorCode',
      'errorMessage',
    ];

    const rows = failures.map((f) => [
      f.id,
      f.createdAt.toISOString(),
      f.message.threadId,
      f.message.thread.client.name,
      f.message.thread.messageNumber.e164,
      f.attemptNo,
      f.providerErrorCode || '',
      f.providerErrorMessage || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    return csv;
  }
}
