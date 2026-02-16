/**
 * SRS Message Processor Service
 * 
 * Processes messages for SRS responsiveness tracking
 * Can be called directly from NestJS services (no HTTP bridge)
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SrsMessageProcessorService {
  private readonly logger = new Logger(SrsMessageProcessorService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Determine if a message requires response
   */
  private requiresResponse(message: {
    direction: string;
    actorType: string;
    body: string;
    hasPolicyViolation?: boolean;
  }): boolean {
    // System messages never require response
    if (message.actorType === 'system' || message.actorType === 'automation') {
      return false;
    }

    // Only inbound client messages require response
    if (message.direction !== 'inbound' || message.actorType !== 'client') {
      return false;
    }

    // Policy violations are redacted and don't require response
    if (message.hasPolicyViolation) {
      return false;
    }

    // Webhook status callbacks don't require response
    const statusPatterns = [
      /delivery receipt/i,
      /read receipt/i,
      /status update/i,
      /webhook/i,
    ];
    if (statusPatterns.some(pattern => pattern.test(message.body))) {
      return false;
    }

    return true;
  }

  /**
   * Link a response to the most recent unanswered requiring message (FIFO)
   */
  private async linkResponseToRequiringMessage(
    orgId: string,
    threadId: string,
    responseEventId: string,
    responseActorType: string,
    responseCreatedAt: Date
  ): Promise<string | null> {
    // Only sitter/owner responses count
    if (responseActorType !== 'sitter' && responseActorType !== 'owner') {
      return null;
    }

    // Find the most recent unanswered requiring message (FIFO) - using raw SQL since MessageEvent is in main schema
    const requiringMessages = await this.prisma.$queryRaw<Array<{ id: string; createdAt: Date }>>`
      SELECT id, "createdAt"
      FROM "MessageEvent"
      WHERE "orgId" = ${orgId}
        AND "threadId" = ${threadId}
        AND direction = 'inbound'
        AND "actorType" = 'client'
        AND "requiresResponse" = true
        AND "answeredAt" IS NULL
        AND "createdAt" < ${responseCreatedAt}
      ORDER BY "createdAt" DESC
      LIMIT 1
    `;

    if (requiringMessages.length === 0) {
      return null;
    }

    const requiringMessage = requiringMessages[0];

    // Check if link already exists (idempotent) - using raw SQL
    const existingLinks = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM "MessageResponseLink"
      WHERE "requiresResponseEventId" = ${requiringMessage.id}
      LIMIT 1
    `;

    if (existingLinks.length > 0) {
      return existingLinks[0].id;
    }

    // Check if response is within assignment window
    const assignmentWindow = await this.prisma.assignmentWindow.findFirst({
      where: {
        orgId,
        threadId,
        startsAt: { lte: responseCreatedAt },
        endsAt: { gte: responseCreatedAt },
      },
    });

    const withinAssignmentWindow = !!assignmentWindow;

    // Calculate response time in minutes
    const responseTime = responseCreatedAt.getTime() - new Date(requiringMessage.createdAt).getTime();
    const responseMinutes = Math.floor(responseTime / (1000 * 60));

    // Create response link - using raw SQL
    const linkResult = await this.prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "MessageResponseLink" (
        id, "orgId", "threadId", "requiresResponseEventId", "responseEventId", 
        "responseMinutes", "withinAssignmentWindow", excluded, "createdAt", "updatedAt"
      )
      VALUES (
        gen_random_uuid(), ${orgId}, ${threadId}, ${requiringMessage.id}, ${responseEventId},
        ${responseMinutes}, ${withinAssignmentWindow}, false, NOW(), NOW()
      )
      RETURNING id
    `;

    const linkId = linkResult[0]?.id;
    if (!linkId) {
      throw new Error('Failed to create response link');
    }

    // Mark requiring message as answered - using raw SQL
    await this.prisma.$executeRaw`
      UPDATE "MessageEvent"
      SET "answeredAt" = ${responseCreatedAt}
      WHERE id = ${requiringMessage.id}
    `;

    return linkId;
  }

  /**
   * Process a message for SRS tracking
   * 
   * This function:
   * 1. Creates or updates MessageEvent record (bridging from Message to MessageEvent)
   * 2. Sets requiresResponse flag if needed
   * 3. Links response if this is a reply
   */
  async processMessage(
    orgId: string,
    threadId: string,
    messageId: string,
    message: {
      direction: string;
      actorType: string;
      body: string;
      hasPolicyViolation?: boolean;
      createdAt: Date;
    }
  ): Promise<void> {
    try {
      // Create or update MessageEvent record (bridge from Message to MessageEvent) - using raw SQL
      await this.prisma.$executeRaw`
        INSERT INTO "MessageEvent" (
          id, "orgId", "threadId", direction, "actorType", body, "requiresResponse",
          "createdAt", "deliveryStatus", "updatedAt"
        )
        VALUES (
          ${messageId}, ${orgId}, ${threadId}, ${message.direction}, ${message.actorType},
          ${message.body}, false, ${message.createdAt}, ${message.direction === 'inbound' ? 'received' : 'queued'}, NOW()
        )
        ON CONFLICT (id) DO UPDATE
        SET body = ${message.body}, "updatedAt" = NOW()
      `;

      // Update requiresResponse flag if needed
      const needsResponse = this.requiresResponse(message);
      if (needsResponse) {
        await this.prisma.$executeRaw`
          UPDATE "MessageEvent"
          SET "requiresResponse" = true
          WHERE id = ${messageId}
        `;
      }

      // If this is a response (sitter/owner), link it
      if (message.actorType === 'sitter' || message.actorType === 'owner') {
        await this.linkResponseToRequiringMessage(
          orgId,
          threadId,
          messageId,
          message.actorType,
          message.createdAt
        );
      }
    } catch (error: any) {
      // Log but don't throw - SRS processing shouldn't block message creation
      this.logger.error(`Failed to process message ${messageId} for SRS:`, error);
      // TODO: Create alert/audit event for SRS processing failures
    }
  }
}
