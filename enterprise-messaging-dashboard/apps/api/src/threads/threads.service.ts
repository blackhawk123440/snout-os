import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ThreadsService {
  constructor(private prisma: PrismaService) {}

  async getThreads(orgId: string, filters?: any) {
    const where: any = { orgId };

    if (filters?.clientId) {
      where.clientId = filters.clientId;
    }

    if (filters?.sitterId) {
      where.sitterId = filters.sitterId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.unreadOnly) {
      where.ownerUnreadCount = { gt: 0 };
    }

    // Note: hasPolicyViolation and hasDeliveryFailure would require joins
    // For now, return all threads and filter in frontend if needed

    return this.prisma.thread.findMany({
      where,
      include: {
        client: {
          include: {
            contacts: true,
          },
        },
        sitter: true,
        messageNumber: true,
      },
      orderBy: { lastActivityAt: 'desc' },
    });
  }

  async getThread(orgId: string, threadId: string) {
    const thread = await this.prisma.thread.findFirst({
      where: { id: threadId, orgId },
      include: {
        client: {
          include: {
            contacts: true,
          },
        },
        sitter: true,
        messageNumber: true,
        assignmentWindows: {
          where: {
            endsAt: { gte: new Date() },
          },
          orderBy: { startsAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    return thread;
  }

  async markRead(orgId: string, threadId: string) {
    await this.prisma.thread.updateMany({
      where: { id: threadId, orgId },
      data: { ownerUnreadCount: 0 },
    });

    return { success: true };
  }
}
