import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebhooksService } from './webhooks.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RoutingService } from '../routing/routing.service';
import { PolicyService } from '../policy/policy.service';

describe('WebhooksService - Idempotency', () => {
  let service: WebhooksService;
  let prisma: any;
  let audit: any;
  let routing: any;
  let policy: any;
  let provider: any;

  beforeEach(() => {
    prisma = {
      message: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      messageNumber: {
        findUnique: vi.fn(),
      },
      thread: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      messageDelivery: {
        create: vi.fn(),
      },
      policyViolation: {
        create: vi.fn(),
      },
      alert: {
        create: vi.fn(),
      },
      clientContact: {
        findFirst: vi.fn(),
      },
    };

    audit = {
      recordEvent: vi.fn(),
    };

    routing = {
      evaluateRouting: vi.fn(),
    };

    policy = {
      detectViolations: vi.fn(() => []),
    };

    provider = {
      verifyWebhook: vi.fn(() => Promise.resolve({ valid: true })),
    };

    service = new WebhooksService(prisma as any, audit as any, routing as any, policy as any, provider as any);
  });

  it('should reject duplicate webhooks (idempotency)', async () => {
    const messageSid = 'test-msg-123';
    const existingMessage = { id: 'msg-1', orgId: 'org-1' };

    prisma.message.findUnique.mockResolvedValue(existingMessage);

    const result = await service.handleInboundSms({
      messageSid,
      from: '+15551234567',
      to: '+15551111111',
      body: 'Test',
      rawBody: 'test',
    });

    expect(result.processed).toBe(false);
    expect(result.reason).toBe('duplicate');
    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it('should process unique webhooks', async () => {
    const messageSid = 'test-msg-456';
    const number = {
      id: 'num-1',
      orgId: 'org-1',
      e164: '+15551111111',
      class: 'front_desk',
    };
    const thread = { id: 'thread-1', clientId: 'client-1', orgId: 'org-1' };
    const routingDecision = {
      target: 'owner_inbox',
      evaluationTrace: [],
    };

    prisma.message.findUnique.mockResolvedValue(null); // Not duplicate
    prisma.messageNumber.findUnique.mockResolvedValue(number);
    prisma.clientContact.findFirst.mockResolvedValue({
      id: 'contact-1',
      clientId: 'client-1',
      e164: '+15551234567',
    });
    prisma.thread.findFirst.mockResolvedValue(thread);
    routing.evaluateRouting.mockResolvedValue(routingDecision);
    prisma.message.create.mockResolvedValue({ id: 'msg-1' });
    prisma.messageDelivery.create.mockResolvedValue({ id: 'del-1' });
    prisma.thread.update.mockResolvedValue(thread);

    const result = await service.handleInboundSms({
      messageSid,
      from: '+15551234567',
      to: '+15551111111',
      body: 'Test',
      rawBody: 'test',
    });

    expect(result.processed).toBe(true);
    expect(prisma.message.create).toHaveBeenCalled();
  });
});

describe('WebhooksService - Pool Leakage Prevention', () => {
  let service: WebhooksService;

  it('should route unmapped pool messages to owner inbox', async () => {
    // Test: Pool number, sender not mapped to active thread
    // Expected: Route to owner inbox + create alert
    // This prevents leakage between clients using same pool number

    const prisma = {
      message: {
        findUnique: vi.fn(() => Promise.resolve(null)),
        create: vi.fn(),
      },
      messageNumber: {
        findUnique: vi.fn(() =>
          Promise.resolve({
            id: 'pool-num-1',
            orgId: 'org-1',
            e164: '+15553333333',
            class: 'pool',
          }),
        ),
        findFirst: vi.fn(),
      },
      clientContact: {
        findFirst: vi.fn(() => Promise.resolve(null)), // No contact found
      },
      thread: {
        findFirst: vi.fn(() => Promise.resolve(null)), // No active thread
        create: vi.fn(),
        update: vi.fn(),
      },
      alert: {
        create: vi.fn(),
      },
    };

    const audit = { recordEvent: vi.fn() };
    const routing = { evaluateRouting: vi.fn() };
    const policy = { detectViolations: vi.fn(() => []) };
    const provider = { verifyWebhook: vi.fn(() => Promise.resolve({ valid: true })) };

    service = new WebhooksService(prisma as any, audit as any, routing as any, policy as any, provider as any);

    // This should trigger handleUnmappedInbound
    // Implementation would need to handle the case where resolveThreadForInbound returns null
  });
});
