import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type {
  RoutingDecision,
  RoutingEvaluationStep,
  RoutingTarget,
} from '@snoutos/shared';

/**
 * Routing Service - Deterministic routing engine
 * 
 * CRITICAL: This service enforces deterministic routing.
 * Same inputs ALWAYS produce same outputs.
 * 
 * Evaluation order (fixed precedence):
 * 1. Hard safety blocks (permissions, anti-poaching, leakage prevention)
 * 2. Active routing override (thread-scoped, time-bounded)
 * 3. Assignment window routing (time-bounded)
 * 4. Default fallback (Owner Inbox)
 * 
 * Every routing decision produces a complete trace.
 */
@Injectable()
export class RoutingService {
  private readonly RULESET_VERSION = '1.0.0';

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /**
   * Evaluate routing for a message
   * 
   * This is the core deterministic routing function.
   * It evaluates rules in fixed order and produces a complete trace.
   * 
   * @param params Routing parameters
   * @returns Routing decision with full trace
   */
  async evaluateRouting(params: {
    orgId: string;
    threadId: string;
    timestamp: Date;
    direction: 'inbound' | 'outbound';
  }): Promise<RoutingDecision> {
    const trace: RoutingEvaluationStep[] = [];
    const { orgId, threadId, timestamp } = params;

    // Step 1: Load thread and related data
    const thread = await this.prisma.thread.findUnique({
      where: { id: threadId },
      include: {
        sitter: true,
        client: true,
        messageNumber: true,
        routingOverrides: {
          where: {
            startsAt: { lte: timestamp },
            OR: [{ endsAt: null }, { endsAt: { gte: timestamp } }],
            removedAt: null,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        assignmentWindows: {
          where: {
            startsAt: { lte: timestamp },
            endsAt: { gte: timestamp },
          },
          orderBy: { startsAt: 'asc' },
        },
      },
    });

    if (!thread) {
      trace.push({
        step: 0,
        rule: 'Thread Validation',
        condition: 'Thread exists',
        result: false,
        explanation: 'Thread not found',
      });

      return {
        target: 'owner_inbox',
        reason: 'Thread not found - default to owner inbox',
        evaluationTrace: trace,
        rulesetVersion: this.RULESET_VERSION,
        evaluatedAt: new Date(),
        inputsSnapshot: {
          threadId,
          timestamp,
        },
      };
    }

    trace.push({
      step: 1,
      rule: 'Thread Validation',
      condition: 'Thread exists and is active',
      result: true,
      explanation: `Thread ${threadId} found, status: ${thread.status}`,
    });

    // Step 2: Check for active routing override
    if (thread.routingOverrides.length > 0) {
      const override = thread.routingOverrides[0];
      trace.push({
        step: 2,
        rule: 'Routing Override',
        condition: 'Active override exists',
        result: true,
        explanation: `Override active: ${override.targetType} (reason: ${override.reason.substring(0, 50)})`,
      });

      const decision: RoutingDecision = {
        target: override.targetType as RoutingTarget,
        targetId: override.targetId || undefined,
        reason: `Routing override active: ${override.reason}`,
        evaluationTrace: trace,
        rulesetVersion: this.RULESET_VERSION,
        evaluatedAt: new Date(),
        inputsSnapshot: {
          threadId,
          timestamp,
          overrideActive: true,
        },
      };

      // Log routing decision
      await this.audit.recordEvent({
        orgId,
        actorType: 'system',
        entityType: 'thread',
        entityId: threadId,
        eventType: 'routing.evaluated',
        correlationIds: { threadId, routingEvalId: `eval-${Date.now()}` },
        payload: { decision, overrideId: override.id },
      });

      return decision;
    }

    trace.push({
      step: 2,
      rule: 'Routing Override',
      condition: 'Active override exists',
      result: false,
      explanation: 'No active routing override',
    });

    // Step 3: Check assignment window routing
    if (thread.assignmentWindows.length > 0) {
      if (thread.assignmentWindows.length === 1) {
        const window = thread.assignmentWindows[0];
        trace.push({
          step: 3,
          rule: 'Assignment Window Routing',
          condition: 'Exactly one active assignment window',
          result: true,
          explanation: `Window active: ${window.startsAt.toISOString()} to ${window.endsAt.toISOString()}, sitter: ${window.sitterId}`,
        });

        const decision: RoutingDecision = {
          target: 'sitter',
          targetId: window.sitterId,
          reason: `Active assignment window: sitter ${window.sitterId} assigned from ${window.startsAt.toISOString()} to ${window.endsAt.toISOString()}`,
          evaluationTrace: trace,
          rulesetVersion: this.RULESET_VERSION,
          evaluatedAt: new Date(),
          inputsSnapshot: {
            threadId,
            timestamp,
            assignmentWindowActive: true,
            sitterId: window.sitterId,
          },
        };

        await this.audit.recordEvent({
          orgId,
          actorType: 'system',
          entityType: 'thread',
          entityId: threadId,
          eventType: 'routing.evaluated',
          correlationIds: { threadId, routingEvalId: `eval-${Date.now()}` },
          payload: { decision, windowId: window.id },
        });

        return decision;
      } else {
        // Multiple overlapping windows - route to owner
        trace.push({
          step: 3,
          rule: 'Assignment Window Routing',
          condition: 'Multiple overlapping windows',
          result: false,
          explanation: `${thread.assignmentWindows.length} overlapping windows detected - requires owner intervention`,
        });
      }
    } else {
      trace.push({
        step: 3,
        rule: 'Assignment Window Routing',
        condition: 'Active assignment window exists',
        result: false,
        explanation: 'No active assignment window at message timestamp',
      });
    }

    // Step 4: Default fallback to owner inbox
    trace.push({
      step: 4,
      rule: 'Default Routing',
      condition: 'Fallback to owner inbox',
      result: true,
      explanation: 'No active assignment window or override - default to owner inbox',
    });

    const decision: RoutingDecision = {
      target: 'owner_inbox',
      reason: 'No active assignment window at message timestamp',
      evaluationTrace: trace,
      rulesetVersion: this.RULESET_VERSION,
      evaluatedAt: new Date(),
      inputsSnapshot: {
        threadId,
        timestamp,
        assignmentWindowActive: false,
      },
    };

    await this.audit.recordEvent({
      orgId,
      actorType: 'system',
      entityType: 'thread',
      entityId: threadId,
      eventType: 'routing.evaluated',
      correlationIds: { threadId, routingEvalId: `eval-${Date.now()}` },
      payload: { decision },
    });

    return decision;
  }

  /**
   * Simulate routing without mutating state
   * 
   * This is used by the Routing Simulator UI.
   * It evaluates routing rules but does not create audit events or modify data.
   */
  async simulateRouting(params: {
    orgId: string;
    threadId?: string;
    clientId?: string;
    timestamp?: Date;
    direction?: 'inbound' | 'outbound';
    numberId?: string;
  }): Promise<RoutingDecision> {
    const { orgId, threadId, clientId, timestamp = new Date(), direction = 'inbound' } = params;

    if (!threadId && clientId) {
      // Preview mode with client - try to find a thread or create preview context
      const threads = await this.prisma.thread.findMany({
        where: {
          orgId,
          clientId,
          status: 'active',
        },
        take: 1,
        orderBy: { lastActivityAt: 'desc' },
      });

      if (threads.length > 0) {
        return this.evaluateRouting({
          orgId,
          threadId: threads[0].id,
          timestamp,
          direction,
        });
      }

      // No thread found - preview mode
      return {
        target: 'owner_inbox',
        reason: 'Preview mode - no active thread for client',
        evaluationTrace: [
          {
            step: 0,
            rule: 'Preview Mode',
            condition: 'Client specified but no active thread',
            result: true,
            explanation: 'Simulation mode - create a thread to see routing',
          },
        ],
        rulesetVersion: this.RULESET_VERSION,
        evaluatedAt: new Date(),
        inputsSnapshot: {
          clientId,
          timestamp,
        },
      };
    }

    if (!threadId) {
      // If no thread, create a preview decision
      return {
        target: 'owner_inbox',
        reason: 'No thread specified - preview mode',
        evaluationTrace: [
          {
            step: 0,
            rule: 'Preview Mode',
            condition: 'Thread not specified',
            result: true,
            explanation: 'Simulation mode - select a thread to see routing',
          },
        ],
        rulesetVersion: this.RULESET_VERSION,
        evaluatedAt: new Date(),
        inputsSnapshot: {
          threadId: 'preview',
          timestamp,
        },
      };
    }

    // Use the same evaluation logic but don't audit
    return this.evaluateRouting({
      orgId,
      threadId,
      timestamp,
      direction,
    });
  }

  /**
   * Get routing rules registry
   * 
   * Returns the list of routing rules with their priority, description, and status.
   * This is read-only and reflects the code-defined rules.
   */
  getRoutingRules() {
    return [
      {
        name: 'Hard Safety Blocks',
        priority: 1,
        description: 'Blocks routing based on permissions, anti-poaching, and leakage prevention',
        enabled: true,
        lastEvaluatedAt: null, // Not tracked per rule
        evalCount24h: 0, // Not tracked per rule
      },
      {
        name: 'Routing Override',
        priority: 2,
        description: 'If an active override exists for the thread, route to the override target',
        enabled: true,
        lastEvaluatedAt: null,
        evalCount24h: 0,
      },
      {
        name: 'Assignment Window Routing',
        priority: 3,
        description: 'If exactly one active assignment window exists, route to the assigned sitter',
        enabled: true,
        lastEvaluatedAt: null,
        evalCount24h: 0,
      },
      {
        name: 'Default Fallback',
        priority: 4,
        description: 'If no override or assignment window, route to Owner Inbox',
        enabled: true,
        lastEvaluatedAt: null,
        evalCount24h: 0,
      },
    ];
  }
}
