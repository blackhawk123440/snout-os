import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Inject, forwardRef } from '@nestjs/common';
import type { IProvider } from '../provider/provider.interface';
import { AlertsService } from '../alerts/alerts.service';

/**
 * Automation Worker - Executes automations
 * 
 * Handles:
 * - Condition evaluation
 * - Action execution
 * - Test mode (no real sends)
 * - Execution logging
 */
@Injectable()
export class AutomationWorker implements OnModuleInit {
  private readonly logger = new Logger(AutomationWorker.name);
  private queue: Queue;
  private worker: Worker;

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    @Inject(forwardRef(() => AlertsService))
    private alertsService: AlertsService,
    @Inject('PROVIDER') private provider: IProvider,
  ) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.queue = new Queue('automation', { connection: redisUrl });
  }

  async onModuleInit() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.worker = new Worker(
      'automation',
      async (job) => {
        return this.processAutomation(job.data);
      },
      {
        connection: redisUrl,
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Automation job completed: ${job.id}`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Automation job failed: ${job?.id}`, err);
    });
  }

  /**
   * Queue automation execution
   */
  async queueAutomation(params: {
    automationId: string;
    triggerContext: Record<string, unknown>;
    isTest?: boolean;
  }) {
    const automation = await this.prisma.automation.findUnique({
      where: { id: params.automationId },
      select: { orgId: true },
    });

    await this.queue.add('execute-automation', {
      ...params,
      orgId: automation?.orgId, // Include orgId for filtering
    });
  }

  /**
   * Process automation execution
   */
  private async processAutomation(data: {
    automationId: string;
    triggerContext: Record<string, unknown>;
    isTest?: boolean;
  }) {
    const { automationId, triggerContext, isTest = false } = data;

    const automation = await this.prisma.automation.findUnique({
      where: { id: automationId },
    });

    if (!automation || automation.status !== 'active') {
      return { status: 'skipped', reason: 'Automation not active' };
    }

    // Evaluate conditions
    const conditionsMet = this.evaluateConditions(
      automation.conditions as any,
      triggerContext,
    );

    if (!conditionsMet) {
      await this.recordExecution(automationId, automation.orgId, {
        status: 'skipped',
        triggerContext,
        reason: 'Conditions not met',
        isTest,
      });
      return { status: 'skipped', reason: 'Conditions not met' };
    }

    // Execute actions
    const actionResults: any[] = [];
    const actions = automation.actions as any[];
    let hasFailures = false;

    for (const action of actions) {
      try {
        const result = await this.executeAction(action, triggerContext, isTest);
        actionResults.push({ action, result });
        if (result.error || (result.success === false)) {
          hasFailures = true;
        }
      } catch (error: any) {
        actionResults.push({ action, error: error.message });
        hasFailures = true;
      }
    }

    const finalStatus = hasFailures ? 'failed' : 'success';

    // Record execution
    await this.recordExecution(automationId, automation.orgId, {
      status: finalStatus,
      triggerContext,
      conditionResults: { met: true },
      actionResults,
      isTest,
    });

    // Create alert if execution failed
    if (hasFailures && !isTest) {
      await this.alertsService.createAlert({
        orgId: automation.orgId,
        severity: 'warning',
        type: 'automation.execution.failed',
        title: `Automation Execution Failed: ${automation.name}`,
        description: `One or more actions failed during execution. Check execution logs for details.`,
        entityType: 'automation',
        entityId: automationId,
      });
    }

    return { status: finalStatus, actionResults };
  }

  /**
   * Evaluate automation conditions
   */
  private evaluateConditions(
    conditions: any[],
    context: Record<string, unknown>,
  ): boolean {
    // Simplified condition evaluation
    // In production, this would be more sophisticated
    if (!conditions || conditions.length === 0) {
      return true; // No conditions = always true
    }

    // For now, return true (conditions always met)
    // Full implementation would evaluate each condition against context
    return true;
  }

  /**
   * Execute automation action
   */
  private async executeAction(
    action: any,
    context: Record<string, unknown>,
    isTest: boolean,
  ) {
    if (isTest) {
      // Test mode: simulate without sending
      return { simulated: true, action: action.type };
    }

    switch (action.type) {
      case 'sendSMS':
        // Get recipient from context
        const to = action.config?.to || context.recipientE164;
        const from = action.config?.from || context.fromE164;
        const body = this.renderTemplate(action.config?.template, context);

        if (!to || !from || !body) {
          throw new Error('Missing required SMS parameters');
        }

        const result = await this.provider.sendMessage({
          to,
          from,
          body,
        });

        return { success: result.success, messageSid: result.messageSid };

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Render template with context variables
   */
  private renderTemplate(template: string, context: Record<string, unknown>): string {
    if (!template) {
      return '';
    }

    let rendered = template;
    for (const [key, value] of Object.entries(context)) {
      rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }

    return rendered;
  }

  /**
   * Record automation execution
   */
  private async recordExecution(
    automationId: string,
    orgId: string,
    data: {
      status: 'success' | 'failed' | 'skipped' | 'test';
      triggerContext: Record<string, unknown>;
      conditionResults?: any;
      actionResults?: any[];
      reason?: string;
      error?: string;
      isTest?: boolean;
    },
  ) {
    await this.prisma.automationExecution.create({
      data: {
        orgId,
        automationId,
        status: data.status,
        triggerContext: data.triggerContext,
        conditionResults: data.conditionResults || null,
        actionResults: data.actionResults || null,
        error: data.error || data.reason || null,
      },
    });

    // Update automation last executed
    if (!data.isTest) {
      await this.prisma.automation.update({
        where: { id: automationId },
        data: { lastExecutedAt: new Date() },
      });
    }

    // Audit
    await this.audit.recordEvent({
      orgId,
      actorType: 'automation',
      entityType: 'automation',
      entityId: automationId,
      eventType: `automation.executed.${data.status}`,
      correlationIds: { automationId },
      payload: {
        status: data.status,
        isTest: data.isTest || false,
        actionCount: data.actionResults?.length || 0,
      },
    });
  }
}
