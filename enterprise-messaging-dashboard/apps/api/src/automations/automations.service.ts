import { Injectable, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AutomationWorker } from '../workers/automation.worker';

@Injectable()
export class AutomationsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    @Inject(forwardRef(() => AutomationWorker))
    private automationWorker: AutomationWorker,
  ) {}

  async getAutomations(orgId: string, filters?: any) {
    const where: any = { orgId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.lane) {
      where.lane = filters.lane;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const automations = await this.prisma.automation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters?.limit ? parseInt(filters.limit) : undefined,
      skip: filters?.offset ? parseInt(filters.offset) : undefined,
    });

    // Enrich with execution counts
    const enriched = await Promise.all(
      automations.map(async (automation) => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const executionCount = await this.prisma.automationExecution.count({
          where: {
            automationId: automation.id,
            createdAt: { gte: yesterday },
            status: { not: 'test' },
          },
        });

        return {
          ...automation,
          executionCount24h: executionCount,
        };
      }),
    );

    return enriched;
  }

  async getAutomation(orgId: string, automationId: string) {
    const automation = await this.prisma.automation.findFirst({
      where: { id: automationId, orgId },
    });

    if (!automation) {
      throw new BadRequestException('Automation not found');
    }

    return automation;
  }

  async createAutomation(orgId: string, data: {
    name: string;
    description?: string;
    lane: string;
    trigger: any;
    conditions: any;
    actions: any;
    templates: any;
  }) {
    const automation = await this.prisma.automation.create({
      data: {
        orgId,
        name: data.name,
        description: data.description,
        lane: data.lane,
        status: 'draft',
        trigger: data.trigger,
        conditions: data.conditions,
        actions: data.actions,
        templates: data.templates,
      },
    });

    await this.audit.recordEvent({
      orgId,
      actorType: 'owner',
      entityType: 'automation',
      entityId: automation.id,
      eventType: 'automation.created',
      payload: { name: automation.name, lane: automation.lane },
    });

    return automation;
  }

  async updateAutomation(orgId: string, automationId: string, data: {
    name?: string;
    description?: string;
    lane?: string;
    trigger?: any;
    conditions?: any;
    actions?: any;
    templates?: any;
  }) {
    const automation = await this.prisma.automation.findFirst({
      where: { id: automationId, orgId },
    });

    if (!automation) {
      throw new BadRequestException('Automation not found');
    }

    // If updating, reset lastTestedAt if trigger/conditions/actions changed
    const needsRetest =
      data.trigger || data.conditions || data.actions || data.templates;

    const updated = await this.prisma.automation.update({
      where: { id: automationId },
      data: {
        ...data,
        lastTestedAt: needsRetest ? null : automation.lastTestedAt,
      },
    });

    await this.audit.recordEvent({
      orgId,
      actorType: 'owner',
      entityType: 'automation',
      entityId: automationId,
      eventType: 'automation.updated',
      payload: { name: updated.name },
    });

    return updated;
  }

  async pauseAutomation(orgId: string, automationId: string) {
    const automation = await this.prisma.automation.findFirst({
      where: { id: automationId, orgId },
    });

    if (!automation) {
      throw new BadRequestException('Automation not found');
    }

    const updated = await this.prisma.automation.update({
      where: { id: automationId },
      data: { status: 'paused' },
    });

    await this.audit.recordEvent({
      orgId,
      actorType: 'owner',
      entityType: 'automation',
      entityId: automationId,
      eventType: 'automation.paused',
      payload: { name: automation.name },
    });

    return updated;
  }

  async archiveAutomation(orgId: string, automationId: string) {
    const automation = await this.prisma.automation.findFirst({
      where: { id: automationId, orgId },
    });

    if (!automation) {
      throw new BadRequestException('Automation not found');
    }

    const updated = await this.prisma.automation.update({
      where: { id: automationId },
      data: { status: 'archived' },
    });

    await this.audit.recordEvent({
      orgId,
      actorType: 'owner',
      entityType: 'automation',
      entityId: automationId,
      eventType: 'automation.archived',
      payload: { name: automation.name },
    });

    return updated;
  }

  async getExecutionLogs(orgId: string, automationId: string, filters?: any) {
    const where: any = {
      orgId,
      automationId,
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.automationExecution.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters?.limit ? parseInt(filters.limit) : 100,
        skip: filters?.offset ? parseInt(filters.offset) : 0,
      }),
      this.prisma.automationExecution.count({ where }),
    ]);

    return { logs, total };
  }

  async getExecutionLog(orgId: string, executionId: string) {
    const log = await this.prisma.automationExecution.findFirst({
      where: { id: executionId, orgId },
      include: {
        automation: true,
      },
    });

    if (!log) {
      throw new BadRequestException('Execution log not found');
    }

    return log;
  }

  /**
   * Test automation (simulation mode)
   * 
   * Enforces: must test after edits before activation
   * Returns immediate simulation results (no queue for test mode)
   */
  async testAutomation(
    orgId: string,
    automationId: string,
    testContext: Record<string, unknown>,
  ) {
    const automation = await this.prisma.automation.findUnique({
      where: { id: automationId },
    });

    if (!automation || automation.orgId !== orgId) {
      throw new BadRequestException('Automation not found');
    }

    // Evaluate conditions synchronously for test mode
    const conditionsMet = this.evaluateConditions(
      automation.conditions as any,
      testContext,
    );

    const conditionResults = this.getConditionResults(
      automation.conditions as any,
      testContext,
    );

    // Simulate actions (don't execute)
    const actionPlan = (automation.actions as any[]).map((action) => ({
      type: action.type,
      description: this.describeAction(action),
      wouldExecute: conditionsMet,
    }));

    // Render templates with test context
    const renderedTemplates = this.renderTemplates(
      automation.templates as any,
      testContext,
    );

    // Record test execution
    const execution = await this.prisma.automationExecution.create({
      data: {
        orgId,
        automationId,
        status: 'test',
        triggerContext: testContext,
        conditionResults: conditionResults,
        actionResults: { simulated: true, actions: actionPlan },
      },
    });

    // Update last tested timestamp
    await this.prisma.automation.update({
      where: { id: automationId },
      data: { lastTestedAt: new Date() },
    });

    await this.audit.recordEvent({
      orgId,
      actorType: 'owner',
      entityType: 'automation',
      entityId: automationId,
      eventType: 'automation.tested',
      payload: { executionId: execution.id },
    });

    return {
      status: 'test_complete',
      conditionResults,
      actionPlan,
      renderedTemplates,
      executionId: execution.id,
    };
  }

  private evaluateConditions(conditions: any, context: Record<string, unknown>): boolean {
    if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
      return true; // No conditions = always true
    }

    // Simple AND evaluation (can be extended for OR groups)
    for (const condition of conditions) {
      if (!this.evaluateCondition(condition, context)) {
        return false;
      }
    }

    return true;
  }

  private evaluateCondition(condition: any, context: Record<string, unknown>): boolean {
    const field = condition.field;
    const operator = condition.operator;
    const value = condition.value;

    const contextValue = this.getContextValue(field, context);

    switch (operator) {
      case 'equals':
        return contextValue === value;
      case 'not_equals':
        return contextValue !== value;
      case 'contains':
        return String(contextValue).includes(String(value));
      case 'greater_than':
        return Number(contextValue) > Number(value);
      case 'less_than':
        return Number(contextValue) < Number(value);
      default:
        return false;
    }
  }

  private getConditionResults(conditions: any, context: Record<string, unknown>): any {
    if (!conditions || !Array.isArray(conditions)) {
      return { met: true, conditions: [] };
    }

    const results = conditions.map((condition) => ({
      condition,
      met: this.evaluateCondition(condition, context),
      contextValue: this.getContextValue(condition.field, context),
    }));

    const allMet = results.every((r) => r.met);

    return {
      met: allMet,
      conditions: results,
    };
  }

  private getContextValue(field: string, context: Record<string, unknown>): unknown {
    const parts = field.split('.');
    let value: any = context;
    for (const part of parts) {
      value = value?.[part];
    }
    return value;
  }

  private describeAction(action: any): string {
    switch (action.type) {
      case 'send_sms':
        return `Send SMS to ${action.recipient || 'recipient'}`;
      case 'send_email':
        return `Send email to ${action.recipient || 'recipient'}`;
      case 'assign_sitter':
        return `Assign sitter: ${action.sitterId || 'selected'}`;
      default:
        return `Execute ${action.type}`;
    }
  }

  private renderTemplates(templates: any, context: Record<string, unknown>): any {
    if (!templates || typeof templates !== 'object') {
      return {};
    }

    const rendered: any = {};

    for (const [key, template] of Object.entries(templates)) {
      if (typeof template === 'string') {
        // Simple variable replacement: {{variable}}
        rendered[key] = template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
          const value = this.getContextValue(varName, context);
          return value !== undefined ? String(value) : match;
        });
      } else {
        rendered[key] = template;
      }
    }

    return rendered;
  }

  /**
   * Activate automation
   * 
   * Guardrail: Must have been tested after last edit
   */
  async activateAutomation(orgId: string, automationId: string) {
    const automation = await this.prisma.automation.findUnique({
      where: { id: automationId },
    });

    if (!automation || automation.orgId !== orgId) {
      throw new BadRequestException('Automation not found');
    }

    // Check: must test after edits
    if (automation.lastTestedAt && automation.updatedAt) {
      if (automation.lastTestedAt < automation.updatedAt) {
        throw new BadRequestException(
          'Automation must be tested after last edit. Run test mode first.',
        );
      }
    } else if (automation.updatedAt) {
      // Updated but never tested
      throw new BadRequestException(
        'Automation must be tested before activation. Run test mode first.',
      );
    }

    await this.prisma.automation.update({
      where: { id: automationId },
      data: { status: 'active' },
    });

    await this.audit.recordEvent({
      orgId,
      actorType: 'owner',
      entityType: 'automation',
      entityId: automationId,
      eventType: 'automation.activated',
      payload: { name: automation.name },
    });

    return { status: 'active' };
  }
}
