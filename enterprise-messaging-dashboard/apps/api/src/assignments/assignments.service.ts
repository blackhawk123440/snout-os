import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MessagingService } from '../messaging/messaging.service';

/**
 * Assignments Service
 * 
 * Manages assignment windows with strict overlap prevention.
 * Assignment windows are the source of truth for sitter access gating + routing.
 */
@Injectable()
export class AssignmentsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private messaging: MessagingService,
  ) {}

  async getWindows(
    orgId: string,
    filters?: {
      threadId?: string;
      sitterId?: string;
      status?: 'active' | 'future' | 'past';
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    const where: any = { orgId };

    if (filters?.threadId) {
      where.threadId = filters.threadId;
    }

    if (filters?.sitterId) {
      where.sitterId = filters.sitterId;
    }

    const now = new Date();

    if (filters?.status) {
      if (filters.status === 'active') {
        where.startsAt = { lte: now };
        where.endsAt = { gte: now };
      } else if (filters.status === 'future') {
        where.startsAt = { gt: now };
      } else if (filters.status === 'past') {
        where.endsAt = { lt: now };
      }
    }

    if (filters?.startDate || filters?.endDate) {
      where.OR = [];
      if (filters.startDate) {
        where.OR.push({
          startsAt: { gte: filters.startDate },
          endsAt: { lte: filters.endDate || new Date('2100-01-01') },
        });
        where.OR.push({
          endsAt: { gte: filters.startDate },
          startsAt: { lte: filters.endDate || new Date('2100-01-01') },
        });
      }
    }

    const windows = await this.prisma.assignmentWindow.findMany({
      where,
      include: {
        thread: {
          include: {
            client: true,
            sitter: true,
          },
        },
        sitter: true,
      },
      orderBy: { startsAt: 'asc' },
    });

    // Enrich with status
    return windows.map((w) => ({
      ...w,
      status: this.getWindowStatus(w.startsAt, w.endsAt),
    }));
  }

  async getWindow(orgId: string, windowId: string) {
    const window = await this.prisma.assignmentWindow.findFirst({
      where: { id: windowId, orgId },
      include: {
        thread: {
          include: {
            client: true,
            sitter: true,
          },
        },
        sitter: true,
      },
    });

    if (!window) {
      throw new NotFoundException('Assignment window not found');
    }

    return {
      ...window,
      status: this.getWindowStatus(window.startsAt, window.endsAt),
    };
  }

  async createWindow(
    orgId: string,
    params: {
      threadId: string;
      sitterId: string;
      startsAt: Date;
      endsAt: Date;
      bookingRef?: string;
    },
    userId: string,
  ) {
    const { threadId, sitterId, startsAt, endsAt, bookingRef } = params;

    // Validate start < end
    if (startsAt >= endsAt) {
      throw new BadRequestException('Start time must be before end time');
    }

    // Check for overlaps for the same thread (hard rule)
    const overlaps = await this.findOverlaps(orgId, threadId, startsAt, endsAt, null);

    if (overlaps.length > 0) {
      const overlap = overlaps[0];
      throw new BadRequestException(
        `This overlaps with an existing window from ${overlap.startsAt.toISOString()} to ${overlap.endsAt.toISOString()}. Resolve conflict first.`,
      );
    }

    // Create window in transaction
    const window = await this.prisma.assignmentWindow.create({
      data: {
        orgId,
        threadId,
        sitterId,
        startsAt,
        endsAt,
        bookingRef: bookingRef || null,
      },
      include: {
        thread: {
          include: {
            client: true,
          },
        },
        sitter: true,
      },
    });

    await this.audit.recordEvent({
      orgId,
      actorType: 'owner',
      actorId: userId,
      entityType: 'assignmentWindow',
      entityId: window.id,
      eventType: 'assignment.window.created',
      payload: { threadId, sitterId, startsAt, endsAt, bookingRef },
    });

    return {
      ...window,
      status: this.getWindowStatus(window.startsAt, window.endsAt),
    };
  }

  async updateWindow(
    orgId: string,
    windowId: string,
    params: {
      startsAt?: Date;
      endsAt?: Date;
      sitterId?: string;
      bookingRef?: string;
    },
    userId: string,
  ) {
    const window = await this.prisma.assignmentWindow.findFirst({
      where: { id: windowId, orgId },
    });

    if (!window) {
      throw new NotFoundException('Assignment window not found');
    }

    const updates: any = {};

    if (params.startsAt !== undefined) {
      updates.startsAt = params.startsAt;
    }

    if (params.endsAt !== undefined) {
      updates.endsAt = params.endsAt;
    }

    if (params.sitterId !== undefined) {
      updates.sitterId = params.sitterId;
    }

    if (params.bookingRef !== undefined) {
      updates.bookingRef = params.bookingRef;
    }

    // Validate start < end
    const finalStartsAt = updates.startsAt || window.startsAt;
    const finalEndsAt = updates.endsAt || window.endsAt;

    if (finalStartsAt >= finalEndsAt) {
      throw new BadRequestException('Start time must be before end time');
    }

    // Check for overlaps (excluding current window)
    const overlaps = await this.findOverlaps(orgId, window.threadId, finalStartsAt, finalEndsAt, windowId);

    if (overlaps.length > 0) {
      const overlap = overlaps[0];
      throw new BadRequestException(
        `This overlaps with an existing window from ${overlap.startsAt.toISOString()} to ${overlap.endsAt.toISOString()}. Resolve conflict first.`,
      );
    }

    const updated = await this.prisma.assignmentWindow.update({
      where: { id: windowId },
      data: updates,
      include: {
        thread: {
          include: {
            client: true,
          },
        },
        sitter: true,
      },
    });

    await this.audit.recordEvent({
      orgId,
      actorType: 'owner',
      actorId: userId,
      entityType: 'assignmentWindow',
      entityId: windowId,
      eventType: 'assignment.window.updated',
      payload: { updates },
    });

    return {
      ...updated,
      status: this.getWindowStatus(updated.startsAt, updated.endsAt),
    };
  }

  async deleteWindow(orgId: string, windowId: string, userId: string) {
    const window = await this.prisma.assignmentWindow.findFirst({
      where: { id: windowId, orgId },
    });

    if (!window) {
      throw new NotFoundException('Assignment window not found');
    }

    await this.prisma.assignmentWindow.delete({
      where: { id: windowId },
    });

    await this.audit.recordEvent({
      orgId,
      actorType: 'owner',
      actorId: userId,
      entityType: 'assignmentWindow',
      entityId: windowId,
      eventType: 'assignment.window.deleted',
      payload: { threadId: window.threadId, sitterId: window.sitterId },
    });

    return { success: true };
  }

  async getConflicts(orgId: string) {
    const windows = await this.prisma.assignmentWindow.findMany({
      where: { orgId },
      include: {
        thread: {
          include: {
            client: true,
          },
        },
        sitter: true,
      },
      orderBy: { startsAt: 'asc' },
    });

    const conflicts: Array<{
      windowA: any;
      windowB: any;
      overlapStart: Date;
      overlapEnd: Date;
      conflictId: string;
    }> = [];

    // Find overlapping windows (same thread, different sitters, or same thread same sitter)
    for (let i = 0; i < windows.length; i++) {
      for (let j = i + 1; j < windows.length; j++) {
        const windowA = windows[i];
        const windowB = windows[j];

        // Only check overlaps for same thread
        if (windowA.threadId !== windowB.threadId) {
          continue;
        }

        const overlap = this.calculateOverlap(windowA, windowB);

        if (overlap) {
          conflicts.push({
            windowA,
            windowB,
            overlapStart: overlap.start,
            overlapEnd: overlap.end,
            conflictId: `${windowA.id}-${windowB.id}`,
          });
        }
      }
    }

    return conflicts;
  }

  async resolveConflict(
    orgId: string,
    conflictId: string,
    strategy: 'keepA' | 'keepB' | 'split',
    userId: string,
  ) {
    const [windowAId, windowBId] = conflictId.split('-');

    const windowA = await this.prisma.assignmentWindow.findFirst({
      where: { id: windowAId, orgId },
    });

    const windowB = await this.prisma.assignmentWindow.findFirst({
      where: { id: windowBId, orgId },
    });

    if (!windowA || !windowB) {
      throw new NotFoundException('Conflict windows not found');
    }

    const overlap = this.calculateOverlap(windowA, windowB);

    if (!overlap) {
      throw new BadRequestException('Windows do not overlap');
    }

    if (strategy === 'keepA') {
      // Delete window B
      await this.prisma.assignmentWindow.delete({ where: { id: windowBId } });
      await this.audit.recordEvent({
        orgId,
        actorType: 'owner',
        actorId: userId,
        entityType: 'assignmentWindow',
        entityId: windowBId,
        eventType: 'assignment.conflict.resolved',
        payload: { strategy: 'keepA', conflictId, deletedWindow: windowBId },
      });
    } else if (strategy === 'keepB') {
      // Delete window A
      await this.prisma.assignmentWindow.delete({ where: { id: windowAId } });
      await this.audit.recordEvent({
        orgId,
        actorType: 'owner',
        actorId: userId,
        entityType: 'assignmentWindow',
        entityId: windowAId,
        eventType: 'assignment.conflict.resolved',
        payload: { strategy: 'keepB', conflictId, deletedWindow: windowAId },
      });
    } else if (strategy === 'split') {
      // Adjust window A to end before overlap, window B to start after overlap
      await this.prisma.assignmentWindow.update({
        where: { id: windowAId },
        data: { endsAt: overlap.start },
      });

      await this.prisma.assignmentWindow.update({
        where: { id: windowBId },
        data: { startsAt: overlap.end },
      });

      await this.audit.recordEvent({
        orgId,
        actorType: 'owner',
        actorId: userId,
        entityType: 'assignmentWindow',
        entityId: conflictId,
        eventType: 'assignment.conflict.resolved',
        payload: { strategy: 'split', conflictId, adjustedWindows: [windowAId, windowBId] },
      });
    }

    return { success: true };
  }

  async sendReassignmentMessage(
    orgId: string,
    threadId: string,
    windowId: string,
    userId: string,
    templateId?: string,
  ) {
    const window = await this.prisma.assignmentWindow.findFirst({
      where: { id: windowId, orgId },
      include: {
        thread: {
          include: {
            client: true,
            sitter: true,
          },
        },
        sitter: true,
      },
    });

    if (!window) {
      throw new NotFoundException('Assignment window not found');
    }

    // Default template
    const messageBody = templateId
      ? 'Reassignment message template' // Would fetch from template
      : `Hi ${window.thread.client.name}, your sitter assignment has been updated. ${window.sitter.name} will be your sitter from ${window.startsAt.toLocaleString()} to ${window.endsAt.toLocaleString()}.`;

    // Send message via messaging service
    await this.messaging.sendMessage({
      orgId,
      threadId,
      body: messageBody,
      senderType: 'owner',
      senderId: userId,
    });

    await this.audit.recordEvent({
      orgId,
      actorType: 'owner',
      actorId: userId,
      entityType: 'assignmentWindow',
      entityId: windowId,
      eventType: 'assignment.reassignment_message_sent',
      payload: { threadId, templateId },
    });

    return { success: true, message: 'Reassignment message sent' };
  }

  /**
   * Find overlapping windows for a thread
   */
  private async findOverlaps(
    orgId: string,
    threadId: string,
    startsAt: Date,
    endsAt: Date,
    excludeWindowId: string | null,
  ) {
    const where: any = {
      orgId,
      threadId,
      OR: [
        // Window starts within range
        {
          startsAt: { gte: startsAt, lte: endsAt },
        },
        // Window ends within range
        {
          endsAt: { gte: startsAt, lte: endsAt },
        },
        // Window encompasses range
        {
          startsAt: { lte: startsAt },
          endsAt: { gte: endsAt },
        },
        // Range encompasses window
        {
          startsAt: { gte: startsAt },
          endsAt: { lte: endsAt },
        },
      ],
    };

    if (excludeWindowId) {
      where.id = { not: excludeWindowId };
    }

    return this.prisma.assignmentWindow.findMany({ where });
  }

  /**
   * Calculate overlap between two windows
   */
  private calculateOverlap(windowA: any, windowB: any): { start: Date; end: Date } | null {
    const start = windowA.startsAt > windowB.startsAt ? windowA.startsAt : windowB.startsAt;
    const end = windowA.endsAt < windowB.endsAt ? windowA.endsAt : windowB.endsAt;

    if (start < end) {
      return { start, end };
    }

    return null;
  }

  /**
   * Get window status
   */
  private getWindowStatus(startsAt: Date, endsAt: Date): 'active' | 'future' | 'past' {
    const now = new Date();

    if (startsAt <= now && endsAt >= now) {
      return 'active';
    } else if (startsAt > now) {
      return 'future';
    } else {
      return 'past';
    }
  }
}
