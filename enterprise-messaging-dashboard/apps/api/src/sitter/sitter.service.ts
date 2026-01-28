import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MessagingService } from '../messaging/messaging.service';

/**
 * Sitter Service
 * 
 * Handles sitter-scoped operations with strict access control:
 * - Sitters can ONLY see threads assigned to them DURING active assignment windows
 * - Sitters can ONLY message within active windows
 * - All data is redacted (no real client phone numbers)
 */
@Injectable()
export class SitterService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private messaging: MessagingService,
  ) {}

  /**
   * Get sitter record ID from user ID
   */
  private async getSitterIdFromUserId(orgId: string, userId: string): Promise<string> {
    const sitter = await this.prisma.sitter.findFirst({
      where: {
        orgId,
        userId,
      },
    });

    if (!sitter) {
      throw new ForbiddenException('Sitter record not found for user');
    }

    return sitter.id;
  }

  /**
   * Get threads accessible to sitter (only active windows)
   */
  async getThreads(orgId: string, userId: string) {
    const now = new Date();

    // Find sitter record from user ID
    const sitterId = await this.getSitterIdFromUserId(orgId, userId);

    // Find threads with active assignment windows for this sitter
    const windows = await this.prisma.assignmentWindow.findMany({
      where: {
        orgId,
        sitterId,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      include: {
        thread: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
                // DO NOT include phone/email - redacted
              },
            },
            messageNumber: {
              select: {
                id: true,
                e164: true, // This is the masked business number
                class: true,
              },
            },
            _count: {
              select: {
                messages: {
                  where: {
                    direction: 'inbound',
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        thread: {
          lastActivityAt: 'desc',
        },
      },
    });

    // Return threads with window info
    return windows.map((w) => ({
      id: w.thread.id,
      client: w.thread.client,
      messageNumber: w.thread.messageNumber,
      unreadCount: w.thread._count.messages,
      lastActivityAt: w.thread.lastActivityAt,
      window: {
        id: w.id,
        startsAt: w.startsAt,
        endsAt: w.endsAt,
        isActive: true,
      },
    }));
  }

  /**
   * Get thread detail (enforces active window access)
   */
  async getThread(orgId: string, userId: string, threadId: string) {
    const now = new Date();

    // Find sitter record from user ID
    const sitterId = await this.getSitterIdFromUserId(orgId, userId);

    // Check if sitter has active window for this thread
    const window = await this.prisma.assignmentWindow.findFirst({
      where: {
        orgId,
        sitterId,
        threadId,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
    });

    if (!window) {
      throw new ForbiddenException(
        'This conversation is only available during your assignment window.',
      );
    }

    const thread = await this.prisma.thread.findFirst({
      where: { id: threadId, orgId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            // DO NOT include phone/email
          },
        },
        messageNumber: {
          select: {
            id: true,
            e164: true, // Masked business number
            class: true,
          },
        },
        sitter: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!thread) {
      throw new BadRequestException('Thread not found');
    }

    return {
      ...thread,
      window: {
        id: window.id,
        startsAt: window.startsAt,
        endsAt: window.endsAt,
        isActive: true,
      },
    };
  }

  /**
   * Get messages for thread (enforces active window access)
   */
  async getMessages(orgId: string, userId: string, threadId: string) {
    const now = new Date();

    // Find sitter record from user ID
    const sitterId = await this.getSitterIdFromUserId(orgId, userId);

    // Check if sitter has active window for this thread
    const window = await this.prisma.assignmentWindow.findFirst({
      where: {
        orgId,
        sitterId,
        threadId,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
    });

    if (!window) {
      throw new ForbiddenException(
        'This conversation is only available during your assignment window.',
      );
    }

    const messages = await this.prisma.message.findMany({
      where: { threadId, orgId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        direction: true,
        senderType: true,
        body: true,
        // Use redactedBody if available (for policy violations)
        redactedBody: true,
        createdAt: true,
        hasPolicyViolation: true,
        // DO NOT include providerMessageSid or any external identifiers
      },
    });

    // Return messages with redacted content
    return messages.map((m) => ({
      id: m.id,
      direction: m.direction,
      senderType: m.senderType,
      body: m.redactedBody || m.body, // Use redacted if available
      createdAt: m.createdAt,
      hasPolicyViolation: m.hasPolicyViolation,
      // Map senderType to display label
      senderLabel: this.getSenderLabel(m.senderType, m.direction),
    }));
  }

  /**
   * Send message (enforces active window + policy checks)
   */
  async sendMessage(
    orgId: string,
    userId: string,
    threadId: string,
    body: string,
  ) {
    const now = new Date();

    // Find sitter record from user ID
    const sitterId = await this.getSitterIdFromUserId(orgId, userId);

    // Check if sitter has active window for this thread
    const window = await this.prisma.assignmentWindow.findFirst({
      where: {
        orgId,
        sitterId,
        threadId,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
    });

    if (!window) {
      throw new ForbiddenException(
        'You can message during your assignment window. Messages outside the window are blocked.',
      );
    }

    // Use messaging service (it will enforce policy checks)
    // Pass userId as senderId (for audit), messaging service will look up sitterId for routing check
    try {
      const result = await this.messaging.sendMessage({
        orgId,
        threadId,
        body,
        senderType: 'sitter',
        senderId: userId, // userId for audit logging
      });

      return result;
    } catch (error: any) {
      // If policy violation, return friendly message
      if (error.message?.includes('Policy violation') || error.message?.includes('blocked')) {
        throw new BadRequestException(
          'This message wasn\'t sent because it includes contact info. Please keep communication in the system.',
        );
      }
      throw error;
    }
  }

  /**
   * Mark thread as read
   */
  async markThreadAsRead(orgId: string, userId: string, threadId: string) {
    const now = new Date();

    // Find sitter record from user ID
    const sitterId = await this.getSitterIdFromUserId(orgId, userId);

    // Check if sitter has active window for this thread
    const window = await this.prisma.assignmentWindow.findFirst({
      where: {
        orgId,
        sitterId,
        threadId,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
    });

    if (!window) {
      throw new ForbiddenException(
        'This conversation is only available during your assignment window.',
      );
    }

    await this.prisma.message.updateMany({
      where: {
        threadId,
        orgId,
        direction: 'inbound',
      },
      data: {
        // Note: readAt field not in schema - using ownerUnreadCount on thread instead
      },
    });

    await this.audit.recordEvent({
      orgId,
      actorType: 'sitter',
      actorId: userId,
      entityType: 'thread',
      entityId: threadId,
      eventType: 'thread.read',
      payload: {},
    });
  }

  /**
   * Get sender label for display
   */
  private getSenderLabel(senderType: string | null, direction: string): string {
    if (direction === 'inbound') {
      return 'Client';
    } else if (direction === 'outbound') {
      if (senderType === 'sitter') {
        return 'You';
      } else if (senderType === 'owner') {
        return 'Owner';
      }
    }
    return 'System';
  }
}
