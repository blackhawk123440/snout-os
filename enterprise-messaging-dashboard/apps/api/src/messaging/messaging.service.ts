import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RoutingService } from '../routing/routing.service';
import { PolicyService } from '../policy/policy.service';
import { MessageRetryWorker } from '../workers/message-retry.worker';
import { Inject, forwardRef } from '@nestjs/common';
import type { IProvider } from '../provider/provider.interface';

/**
 * Messaging Service - Complete outbound send pipeline
 * 
 * CRITICAL: This enforces:
 * - Messages must be tied to a thread
 * - from_number must equal thread's assigned business number
 * - Policy enforcement before send
 * - Delivery tracking with retries
 * - Complete audit trail
 */
@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private routingService: RoutingService,
    private policyService: PolicyService,
    @Inject(forwardRef(() => MessageRetryWorker))
    private retryWorker: MessageRetryWorker,
    @Inject('PROVIDER') private provider: IProvider,
  ) {}

  async getMessages(threadId: string) {
    return this.prisma.message.findMany({
      where: { threadId },
      include: {
        deliveries: true,
        policyViolations: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Send outbound message
   * 
   * Complete flow:
   * 1. Validate thread exists and user has permission
   * 2. Check policy violations
   * 3. Get thread's assigned number (enforce masking)
   * 4. Evaluate routing (for sitter gating)
   * 5. Send via provider
   * 6. Create message and delivery records
   * 7. Queue retry if needed
   * 8. Audit everything
   */
  async sendMessage(params: {
    orgId: string;
    threadId: string;
    body: string;
    senderType: 'owner' | 'sitter';
    senderId: string;
    forceSend?: boolean;
  }) {
    const { orgId, threadId, body, senderType, senderId, forceSend = false } = params;

    // Input validation & sanitization
    const trimmedBody = body.trim();
    const MAX_SMS_LENGTH = 1600; // SMS limit (160 chars per segment, ~10 segments max)

    if (!trimmedBody) {
      throw new BadRequestException('Message body cannot be empty');
    }

    if (trimmedBody.length > MAX_SMS_LENGTH) {
      throw new BadRequestException(
        `Message is too long. Maximum length is ${MAX_SMS_LENGTH} characters. Your message is ${trimmedBody.length} characters.`,
      );
    }

    // Step 1: Load thread with number
    const thread = await this.prisma.thread.findUnique({
      where: { id: threadId },
      include: {
        messageNumber: true,
        client: {
          include: { contacts: true },
        },
        sitter: true,
      },
    });

    if (!thread) {
      throw new BadRequestException('Thread not found');
    }

    if (thread.orgId !== orgId) {
      throw new ForbiddenException('Thread does not belong to organization');
    }

    // Step 2: Get recipient E.164 (client's contact)
    const clientContact = thread.client.contacts[0];
    if (!clientContact) {
      throw new BadRequestException('Client has no contact number');
    }

    const recipientE164 = clientContact.e164;
    const fromE164 = thread.messageNumber.e164;

    // Step 3: Policy violation check (use trimmed body)
    const violations = this.policyService.detectViolations(trimmedBody);
    const hasViolation = violations.length > 0;

    if (hasViolation && !forceSend) {
      // Failure mode by role
      if (senderType === 'sitter') {
        // Sitter outbound: fail closed (block + owner review)
        await this.handleBlockedMessage({
          orgId,
          threadId,
          messageId: null,
          body: trimmedBody,
          violations,
          senderType,
          senderId,
          reason: 'Policy violation detected',
        });

        throw new BadRequestException(
          'Your message could not be sent. Please avoid sharing phone numbers, emails, external links, or social handles.',
        );
      } else if (senderType === 'owner') {
        // Owner outbound: allow + warn
        await this.createPolicyViolation({
          orgId,
          threadId,
          messageId: null,
          violations,
          actionTaken: 'warned',
        });
      }
    }

    // Step 4: For sitters, check assignment window (gating)
    if (senderType === 'sitter') {
      const routingDecision = await this.routingService.evaluateRouting({
        orgId,
        threadId,
        timestamp: new Date(),
        direction: 'outbound',
      });

      // routingDecision.targetId is sitterId, but senderId is userId
      // Need to look up sitterId from userId for comparison
      if (routingDecision.target === 'sitter' && routingDecision.targetId) {
        const sitter = await this.prisma.sitter.findFirst({
          where: {
            orgId,
            userId: senderId,
          },
        });

        if (!sitter || sitter.id !== routingDecision.targetId) {
          throw new ForbiddenException(
            'You cannot send messages outside your active assignment window',
          );
        }
      } else {
        throw new ForbiddenException(
          'You cannot send messages outside your active assignment window',
        );
      }
    }

    // Step 5: Send via provider (use trimmed body)
    const sendResult = await this.provider.sendMessage({
      to: recipientE164,
      from: fromE164,
      body: trimmedBody,
    });

    if (!sendResult.success) {
      // Create failed message record
      const message = await this.prisma.message.create({
        data: {
          orgId,
          threadId,
          direction: 'outbound',
          senderType,
          senderId,
          body: trimmedBody,
          redactedBody: hasViolation ? this.redactViolations(trimmedBody, violations) : null,
          hasPolicyViolation: hasViolation,
          providerMessageSid: null, // Failed to send
        },
      });

      await this.prisma.messageDelivery.create({
        data: {
          messageId: message.id,
          attemptNo: 1,
          status: 'failed',
          providerErrorCode: sendResult.errorCode || 'SEND_FAILED',
          providerErrorMessage: sendResult.error || 'Unknown error',
        },
      });

      await this.audit.recordEvent({
        orgId,
        actorType: senderType,
        actorId: senderId,
        entityType: 'message',
        entityId: message.id,
        eventType: 'message.outbound.send_failed',
        correlationIds: { messageId: message.id, threadId },
        payload: { error: sendResult.error, errorCode: sendResult.errorCode },
      });

      throw new BadRequestException(
        sendResult.error || 'Failed to send message. Check provider connection.',
      );
    }

    // Step 6: Create message record
    const message = await this.prisma.message.create({
      data: {
        orgId,
        threadId,
        direction: 'outbound',
        senderType,
        senderId,
        body: trimmedBody,
        redactedBody: hasViolation ? this.redactViolations(trimmedBody, violations) : null,
        hasPolicyViolation: hasViolation,
        providerMessageSid: sendResult.messageSid || null,
      },
    });

    // Step 7: Create initial delivery record
      const delivery = await this.prisma.messageDelivery.create({
        data: {
          messageId: message.id,
          attemptNo: 1,
          status: 'queued', // Will be updated by status callback
          providerRaw: { messageSid: sendResult.messageSid },
        },
      });

      // If send failed, queue retry
      if (!sendResult.success) {
        await this.retryWorker.queueRetry({
          messageId: message.id,
          attemptNo: 1,
        });
      }

    // Step 8: Create policy violation records if needed
    if (hasViolation) {
      await this.createPolicyViolation({
        orgId,
        threadId,
        messageId: message.id,
        violations,
        actionTaken: senderType === 'owner' ? 'warned' : 'blocked',
      });
    }

    // Step 9: Update thread activity
    await this.prisma.thread.update({
      where: { id: threadId },
      data: {
        lastActivityAt: new Date(),
      },
    });

    // Step 10: Update number last used
    await this.prisma.messageNumber.update({
      where: { id: thread.messageNumberId },
      data: { lastUsedAt: new Date() },
    });

    // Step 11: Audit
    await this.audit.recordEvent({
      orgId,
      actorType: senderType,
      actorId: senderId,
      entityType: 'message',
      entityId: message.id,
      eventType: 'message.outbound.sent',
      correlationIds: { messageId: message.id, threadId },
      payload: {
        to: recipientE164,
        from: fromE164,
        hasPolicyViolation: hasViolation,
        providerMessageSid: sendResult.messageSid,
      },
    });

    this.logger.log(`Outbound message sent: ${message.id} → ${recipientE164}`);

    return {
      messageId: message.id,
      providerMessageSid: sendResult.messageSid,
      hasPolicyViolation: hasViolation,
    };
  }

  /**
   * Retry failed message delivery
   * 
   * Enforces max 3 automatic retries, then requires manual retry
   */
  async retryMessage(messageId: string, orgId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        thread: {
          include: {
            messageNumber: true,
            client: { include: { contacts: true } },
          },
        },
        deliveries: {
          orderBy: { attemptNo: 'desc' },
        },
      },
    });

    if (!message || message.orgId !== orgId) {
      throw new BadRequestException('Message not found');
    }

    const latestDelivery = message.deliveries[0];
    const attemptNo = latestDelivery ? latestDelivery.attemptNo + 1 : 1;

    if (attemptNo > 3) {
      throw new BadRequestException(
        'Maximum retry attempts exceeded. Message requires manual review.',
      );
    }

    // Get recipient
    const clientContact = message.thread.client.contacts[0];
    if (!clientContact) {
      throw new BadRequestException('Client has no contact number');
    }

    // Retry send
    const sendResult = await this.provider.sendMessage({
      to: clientContact.e164,
      from: message.thread.messageNumber.e164,
      body: message.body,
    });

    // Create new delivery record
    await this.prisma.messageDelivery.create({
      data: {
        messageId: message.id,
        attemptNo,
        status: sendResult.success ? 'queued' : 'failed',
        providerErrorCode: sendResult.errorCode || null,
        providerErrorMessage: sendResult.error || null,
        providerRaw: { messageSid: sendResult.messageSid, attemptNo },
      },
    });

    await this.audit.recordEvent({
      orgId,
      actorType: 'owner',
      entityType: 'message',
      entityId: message.id,
      eventType: 'message.outbound.retry',
      correlationIds: { messageId: message.id },
      payload: { attemptNo, success: sendResult.success },
    });

    return { success: sendResult.success, attemptNo };
  }

  private async handleBlockedMessage(params: {
    orgId: string;
    threadId: string;
    messageId: string | null;
    body: string;
    violations: Array<{ type: string; content: string; reason: string }>;
    senderType: string;
    senderId: string;
    reason: string;
  }) {
    const { orgId, threadId, messageId, body, violations, senderType, senderId, reason } = params;

    // Create policy violation
    await this.createPolicyViolation({
      orgId,
      threadId,
      messageId,
      violations,
      actionTaken: 'blocked',
    });

    // Create alert using AlertsService (handles deduplication)
    // Note: Import AlertsService if not already available
    // For now, create directly but should use service
    await this.prisma.alert.create({
      data: {
        orgId,
        severity: 'warning',
        type: 'policy.violation.blocked',
        title: 'Message Blocked - Policy Violation',
        description: `${senderType} message blocked: ${reason}`,
        entityType: messageId ? 'message' : 'thread',
        entityId: messageId || threadId,
        status: 'open',
      },
    });

    // Audit
    await this.audit.recordEvent({
      orgId,
      actorType: senderType as any,
      actorId: senderId,
      entityType: 'message',
      entityId: messageId || 'blocked',
      eventType: 'message.outbound.blocked',
      correlationIds: { threadId },
      payload: { reason, violations: violations.map((v) => v.type) },
    });
  }

  private async createPolicyViolation(params: {
    orgId: string;
    threadId: string;
    messageId: string | null;
    violations: Array<{ type: string; content: string; reason: string }>;
    actionTaken: 'blocked' | 'warned' | 'overridden' | 'allowed';
  }) {
    const { orgId, threadId, messageId, violations } = params;

    for (const violation of violations) {
      await this.prisma.policyViolation.create({
        data: {
          orgId,
          threadId,
          messageId,
          violationType: violation.type as any,
          detectedSummary: violation.reason,
          detectedRedacted: violation.content.substring(0, 50) + '...',
          actionTaken: params.actionTaken,
          status: 'open',
        },
      });
    }
  }

  private redactViolations(
    body: string,
    violations: Array<{ type: string; content: string }>,
  ): string {
    let redacted = body;
    for (const violation of violations) {
      redacted = redacted.replace(violation.content, '[REDACTED]');
    }
    return redacted;
  }
}
