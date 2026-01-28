import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RoutingService } from './routing.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

describe('RoutingService - Determinism', () => {
  let service: RoutingService;
  let prisma: any;
  let audit: any;

  beforeEach(() => {
    prisma = {
      thread: {
        findUnique: vi.fn(),
      },
    };

    audit = {
      recordEvent: vi.fn(),
    };

    service = new RoutingService(prisma, audit);
  });

  it('should produce same output for same inputs', async () => {
    const threadId = 'thread-1';
    const orgId = 'org-1';
    const timestamp = new Date('2026-01-19T14:30:00Z');

    const mockThread = {
      id: threadId,
      orgId,
      status: 'active',
      sitter: null,
      client: { id: 'client-1' },
      messageNumber: { id: 'num-1', e164: '+15551111111' },
      routingOverrides: [],
      assignmentWindows: [],
    };

    prisma.thread.findUnique.mockResolvedValue(mockThread);

    const params = {
      orgId,
      threadId,
      timestamp,
      direction: 'inbound' as const,
    };

    const result1 = await service.evaluateRouting(params);
    const result2 = await service.evaluateRouting(params);

    // Same inputs should produce same outputs
    expect(result1.target).toBe(result2.target);
    expect(result1.reason).toBe(result2.reason);
    expect(result1.rulesetVersion).toBe(result2.rulesetVersion);
    expect(result1.evaluationTrace.length).toBe(result2.evaluationTrace.length);
  });

  it('should route to owner inbox when no assignment window', async () => {
    const mockThread = {
      id: 'thread-1',
      orgId: 'org-1',
      status: 'active',
      routingOverrides: [],
      assignmentWindows: [], // No active window
    };

    prisma.thread.findUnique.mockResolvedValue(mockThread);

    const result = await service.evaluateRouting({
      orgId: 'org-1',
      threadId: 'thread-1',
      timestamp: new Date(),
      direction: 'inbound',
    });

    expect(result.target).toBe('owner_inbox');
    expect(result.reason).toContain('No active assignment window');
  });

  it('should route to sitter when assignment window active', async () => {
    const mockThread = {
      id: 'thread-1',
      orgId: 'org-1',
      status: 'active',
      routingOverrides: [],
      assignmentWindows: [
        {
          id: 'window-1',
          sitterId: 'sitter-1',
          startsAt: new Date('2026-01-19T14:00:00Z'),
          endsAt: new Date('2026-01-19T18:00:00Z'),
        },
      ],
    };

    prisma.thread.findUnique.mockResolvedValue(mockThread);

    const result = await service.evaluateRouting({
      orgId: 'org-1',
      threadId: 'thread-1',
      timestamp: new Date('2026-01-19T14:30:00Z'), // Within window
      direction: 'inbound',
    });

    expect(result.target).toBe('sitter');
    expect(result.targetId).toBe('sitter-1');
  });
});
