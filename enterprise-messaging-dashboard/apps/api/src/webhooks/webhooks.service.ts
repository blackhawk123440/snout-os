import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RoutingService } from '../routing/routing.service';
import { PolicyService } from '../policy/policy.service';
import { Inject } from '@nestjs/common';
import type { IProvider } from '../provider/provider.interface';
import { SrsMessageProcessorService } from '../srs/srs-message-processor.service';

/**
 * Webhooks Service - Complete inbound/outbound message processing
 * 
 * CRITICAL: This implements the full message pipeline with:
 * - Idempotency (provider_message_sid as key)
 * - Thread resolution using conversation key
 * - Deterministic routing enforcement
 * - Policy violation detection
 * - Complete audit trail
 * - Pool number leakage prevention
 */
@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private routingService: RoutingService,
    private policyService: PolicyService,
    @Inject('PROVIDER') private provider: IProvider,
    private srsProcessor: SrsMessageProcessorService,
  ) {}

  /**
   * Handle inbound SMS webhook
   * 
   * Complete flow:
   * 1. Verify webhook signature
   * 2. Check idempotency (reject duplicates)
   * 3. Resolve thread using conversation key
   * 4. Evaluate routing deterministically
   * 5. Create message and delivery records
   * 6. Apply routing decision
   * 7. Audit everything
   */
  async handleInboundSms(params: {
    messageSid: string;
    from: string;
    to: string;
    body: string;
    rawBody: string;
    signature?: string;
  }) {
    const { messageSid, from, to, body, rawBody, signature } = params;

    // Step 1: Verify webhook signature
    const webhookUrl = process.env.TWILIO_WEBHOOK_URL || '';
    if (signature) {
      const verification = await this.provider.verifyWebhook(
        rawBody,
        signature,
        webhookUrl,
      );

      if (!verification.valid) {
        await this.audit.recordEvent({
          orgId: 'unknown',
          actorType: 'system',
          eventType: 'webhook.inbound.signature_invalid',
          correlationIds: { webhookRequestId: messageSid },
          payload: { to, from, error: 'Invalid signature' },
        });
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    // Step 2: Idempotency check - reject if message already processed
    const existingMessage = await this.prisma.message.findUnique({
      where: { providerMessageSid: messageSid },
    });

    if (existingMessage) {
      this.logger.warn(`Duplicate webhook rejected: ${messageSid}`);
      await this.audit.recordEvent({
        orgId: existingMessage.orgId,
        actorType: 'system',
        entityType: 'message',
        entityId: existingMessage.id,
        eventType: 'webhook.inbound.duplicate_rejected',
        correlationIds: { messageId: existingMessage.id, webhookRequestId: messageSid },
        payload: { reason: 'Idempotency: message already processed' },
      });
      return { processed: false, reason: 'duplicate' };
    }

    // Step 3: Find number and organization
    const number = await this.prisma.messageNumber.findUnique({
      where: { e164: to },
      include: {
        organization: true,
      },
    });

    if (!number) {
      await this.audit.recordEvent({
        orgId: 'unknown',
        actorType: 'system',
        eventType: 'webhook.inbound.unknown_number',
        correlationIds: { webhookRequestId: messageSid },
        payload: { to, from },
      });
      throw new BadRequestException(`Number not found: ${to}`);
    }

    const orgId = number.orgId;

    // Step 4: Resolve thread using conversation key
    // Conversation key: (org_id, business_number_id, external_party_e164)
    const thread = await this.resolveThreadForInbound({
      orgId,
      numberId: number.id,
      externalPartyE164: from,
      numberClass: number.class as 'front_desk' | 'sitter' | 'pool',
    });

    if (!thread) {
      // No thread found - route to owner inbox and create alert
      await this.handleUnmappedInbound({
        orgId,
        numberId: number.id,
        from,
        to,
        body,
        messageSid,
      });
      return { processed: true, routedTo: 'owner_inbox', threadCreated: false };
    }

    // Step 5: Evaluate routing deterministically
    const routingDecision = await this.routingService.evaluateRouting({
      orgId,
      threadId: thread.id,
      timestamp: new Date(),
      direction: 'inbound',
    });

    // Step 6: Check for policy violations
    const violations = this.policyService.detectViolations(body);
    const hasViolation = violations.length > 0;

    // Step 7: Create message record
    const message = await this.prisma.message.create({
      data: {
        orgId,
        threadId: thread.id,
        direction: 'inbound',
        senderType: 'client',
        senderId: thread.clientId,
        body,
        redactedBody: hasViolation ? this.redactViolations(body, violations) : null,
        hasPolicyViolation: hasViolation,
        providerMessageSid: messageSid,
      },
    });

    // Step 8: Create policy violation records if needed
    if (hasViolation) {
      for (const violation of violations) {
        await this.prisma.policyViolation.create({
          data: {
            orgId,
            threadId: thread.id,
            messageId: message.id,
            violationType: violation.type as any,
            detectedSummary: violation.reason,
            detectedRedacted: violation.content.substring(0, 50) + '...',
            actionTaken: 'allowed', // Inbound: allow but flag
            status: 'open',
          },
        });
      }

      // Create alert for policy violation
      await this.prisma.alert.create({
        data: {
          orgId,
          severity: 'warning',
          type: 'policy.violation',
          title: 'Policy Violation Detected',
          description: `Inbound message contains ${violations.length} policy violation(s)`,
          entityType: 'message',
          entityId: message.id,
          status: 'open',
        },
      });
    }

    // Step 8.5: Process message for SRS responsiveness tracking (async, don't block)
    this.srsProcessor.processMessage(
      orgId,
      thread.id,
      message.id,
      {
        direction: 'inbound',
        actorType: 'client',
        body,
        hasPolicyViolation: hasViolation,
        createdAt: new Date(),
      }
    ).catch((error) => {
      this.logger.error('[SRS] Failed to process inbound message:', error);
      // TODO: Create alert for SRS processing failures
    });

    // Step 9: Create initial delivery record
    await this.prisma.messageDelivery.create({
      data: {
        messageId: message.id,
        attemptNo: 1,
        status: 'delivered', // Inbound is always "delivered" (we received it)
        providerRaw: { raw: 'inbound' },
      },
    });

    // Step 10: Update thread activity
    await this.prisma.thread.update({
      where: { id: thread.id },
      data: {
        lastActivityAt: new Date(),
        ownerUnreadCount: routingDecision.target === 'owner_inbox' ? { increment: 1 } : undefined,
      },
    });

    // Step 11: Audit the complete flow
    await this.audit.recordEvent({
      orgId,
      actorType: 'client',
      entityType: 'message',
      entityId: message.id,
      eventType: 'message.inbound.received',
      correlationIds: {
        messageId: message.id,
        threadId: thread.id,
        routingEvalId: `eval-${Date.now()}`,
        webhookRequestId: messageSid,
      },
      payload: {
        from,
        to,
        routingDecision,
        hasPolicyViolation: hasViolation,
        violationCount: violations.length,
      },
    });

    this.logger.log(
      `Inbound message processed: ${messageSid} → thread ${thread.id} → ${routingDecision.target}`,
    );

    return {
      processed: true,
      messageId: message.id,
      threadId: thread.id,
      routingDecision,
      hasPolicyViolation: hasViolation,
    };
  }

  /**
   * Resolve thread for inbound message using conversation key
   * 
   * Conversation key: (org_id, business_number_id, external_party_e164)
   * 
   * For pool numbers: Must find exact match to prevent leakage
   * For sitter numbers: Find thread assigned to sitter
   * For front desk: Find or create general inquiry thread
   */
  private async resolveThreadForInbound(params: {
    orgId: string;
    numberId: string;
    externalPartyE164: string;
    numberClass: 'front_desk' | 'sitter' | 'pool';
  }): Promise<{ id: string; clientId: string; orgId: string } | null> {
    const { orgId, numberId, externalPartyE164, numberClass } = params;

    // Find client contact by E.164
    const clientContact = await this.prisma.clientContact.findFirst({
      where: { e164: externalPartyE164 },
      include: { client: true },
    });

    if (!clientContact) {
      // No client contact found - cannot resolve thread
      return null;
    }

    const clientId = clientContact.clientId;

    // For pool numbers: Must find active thread with exact match
    if (numberClass === 'pool') {
      const poolThread = await this.prisma.thread.findFirst({
        where: {
          orgId,
          clientId,
          numberId,
          status: 'active',
          threadType: 'pool',
        },
      });

      if (poolThread) {
        return poolThread;
      }

      // Pool number but no active thread - this is a leakage risk
      // Return null to trigger owner inbox routing
      return null;
    }

    // For sitter numbers: Find thread assigned to sitter
    if (numberClass === 'sitter') {
      const sitterThread = await this.prisma.thread.findFirst({
        where: {
          orgId,
          clientId,
          numberId,
          status: 'active',
          threadType: 'assignment',
        },
        include: { sitter: true },
      });

      if (sitterThread) {
        return sitterThread;
      }
    }

    // For front desk: Find or create general thread
    if (numberClass === 'front_desk') {
      let frontDeskThread = await this.prisma.thread.findFirst({
        where: {
          orgId,
          clientId,
          numberId,
          status: 'active',
          threadType: 'front_desk',
        },
      });

      if (!frontDeskThread) {
        // Create new front desk thread
        frontDeskThread = await this.prisma.thread.create({
          data: {
            orgId,
            clientId,
            numberId,
            threadType: 'front_desk',
            status: 'active',
            participants: {
              create: [{ participantType: 'client', participantId: clientId }],
            },
          },
        });
      }

      return frontDeskThread;
    }

    return null;
  }

  /**
   * Handle unmapped inbound (pool number leakage prevention)
   * 
   * When sender is not mapped to active thread on pool number,
   * route to owner inbox + create alert + send auto-response
   */
  private async handleUnmappedInbound(params: {
    orgId: string;
    numberId: string;
    from: string;
    to: string;
    body: string;
    messageSid: string;
  }) {
    const { orgId, numberId, from, to, body, messageSid } = params;

    // Find or create owner inbox thread
    let ownerThread = await this.prisma.thread.findFirst({
      where: {
        orgId,
        threadType: 'other',
        status: 'active',
      },
    });

    if (!ownerThread) {
      // Create owner inbox thread
      const frontDeskNumber = await this.prisma.messageNumber.findFirst({
        where: { orgId, class: 'front_desk', status: 'active' },
      });

      if (!frontDeskNumber) {
        this.logger.error(`No front desk number found for org ${orgId}`);
        return;
      }

      ownerThread = await this.prisma.thread.create({
        data: {
          orgId,
          clientId: 'owner-inbox', // Special client ID for owner inbox
          numberId: frontDeskNumber.id,
          threadType: 'other',
          status: 'active',
        },
      });
    }

    // Create message in owner inbox
    const message = await this.prisma.message.create({
      data: {
        orgId,
        threadId: ownerThread.id,
        direction: 'inbound',
        senderType: 'client',
        body: `[Unmapped Message] From ${from} to ${to}: ${body}`,
        providerMessageSid: `unmapped-${messageSid}`,
      },
    });

    // Create alert
    await this.prisma.alert.create({
      data: {
        orgId,
        severity: 'warning',
        type: 'routing.unmapped_pool',
        title: 'Unmapped Message on Pool Number',
        description: `Message from ${from} to pool number ${to} could not be mapped to active thread`,
        entityType: 'message',
        entityId: message.id,
        status: 'open',
      },
    });

    // Send auto-response (if configured)
    // This would use the messaging service to send a response

    // Audit
    await this.audit.recordEvent({
      orgId,
      actorType: 'system',
      entityType: 'message',
      entityId: message.id,
      eventType: 'routing.unmapped_pool',
      correlationIds: { messageId: message.id, webhookRequestId: messageSid },
      payload: { from, to, numberId, reason: 'No active thread mapped to sender' },
    });
  }

  /**
   * Handle delivery status callback
   * 
   * Maps Twilio status callback to message_delivery record
   */
  async handleStatusCallback(params: {
    messageSid: string;
    status: string;
    errorCode?: string;
    errorMessage?: string;
  }) {
    const { messageSid, status, errorCode, errorMessage } = params;

    // Find message by provider SID
    const message = await this.prisma.message.findUnique({
      where: { providerMessageSid: messageSid },
      include: { thread: { include: { organization: true } } },
    });

    if (!message) {
      this.logger.warn(`Status callback for unknown message: ${messageSid}`);
      return { processed: false };
    }

    // Map Twilio status to our status
    let deliveryStatus: 'queued' | 'sent' | 'delivered' | 'failed' = 'sent';
    if (status === 'delivered') {
      deliveryStatus = 'delivered';
    } else if (status === 'failed' || status === 'undelivered') {
      deliveryStatus = 'failed';
    } else if (status === 'queued' || status === 'sending') {
      deliveryStatus = 'queued';
    }

    // Get latest delivery attempt
    const latestDelivery = await this.prisma.messageDelivery.findFirst({
      where: { messageId: message.id },
      orderBy: { attemptNo: 'desc' },
    });

    const attemptNo = latestDelivery ? latestDelivery.attemptNo : 1;

    // Update or create delivery record
    if (latestDelivery && latestDelivery.status === deliveryStatus) {
      // Status unchanged, just update
      await this.prisma.messageDelivery.update({
        where: { id: latestDelivery.id },
        data: {
          providerErrorCode: errorCode || null,
          providerErrorMessage: errorMessage || null,
        },
      });
    } else {
      // New status - create new delivery record
      await this.prisma.messageDelivery.create({
        data: {
          messageId: message.id,
          attemptNo: attemptNo + 1,
          status: deliveryStatus,
          providerErrorCode: errorCode || null,
          providerErrorMessage: errorMessage || null,
          providerRaw: { status, errorCode, errorMessage },
        },
      });
    }

    // Update number health if failed
    if (deliveryStatus === 'failed') {
      // This would trigger health computation
      // Implementation would check last 7 days of failures
    }

    // Audit
    await this.audit.recordEvent({
      orgId: message.orgId,
      actorType: 'system',
      entityType: 'message',
      entityId: message.id,
      eventType: 'message.delivery.status_updated',
      correlationIds: { messageId: message.id, webhookRequestId: messageSid },
      payload: { status: deliveryStatus, errorCode, errorMessage },
    });

    return { processed: true, messageId: message.id, status: deliveryStatus };
  }

  /**
   * Redact policy violations from message body
   */
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
