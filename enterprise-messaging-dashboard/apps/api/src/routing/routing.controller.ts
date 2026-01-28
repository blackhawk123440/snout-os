import { Controller, Post, Get, Body, Param, Query, UseGuards, Delete } from '@nestjs/common';
import { RoutingService } from './routing.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { simulateRoutingSchema, createRoutingOverrideSchema } from '@snoutos/shared';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import type { RoutingDecision } from '@snoutos/shared';

@Controller('api/routing')
@UseGuards(AuthGuard)
export class RoutingController {
  constructor(
    private routingService: RoutingService,
    private audit: AuditService,
    private prisma: PrismaService,
  ) {}

  @Get('rules')
  async getRules(@CurrentUser() user: any) {
    return this.routingService.getRoutingRules();
  }

  @Post('simulate')
  async simulate(@CurrentUser() user: any, @Body() body: unknown) {
    const params = simulateRoutingSchema.parse(body);
    const timestamp = params.timestamp ? new Date(params.timestamp) : new Date();
    return this.routingService.simulateRouting({
      orgId: user.orgId,
      threadId: params.threadId,
      clientId: params.clientId,
      timestamp,
      direction: params.direction || 'inbound',
      numberId: params.numberId,
    });
  }

  @Get('threads/:threadId/history')
  async getRoutingHistory(
    @CurrentUser() user: any,
    @Param('threadId') threadId: string,
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('target') target?: string,
    @Query('overrideOnly') overrideOnly?: string,
  ) {
    // Get routing history from audit events
    const result = await this.audit.queryEvents({
      orgId: user.orgId,
      entityType: 'thread',
      entityId: threadId,
      eventType: 'routing.evaluated',
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : 50,
    });

    let events = result.events
      .filter((e) => e.payload !== null)
      .map((e) => ({
        decision: (e.payload as any).decision as RoutingDecision,
        timestamp: e.ts,
        eventId: e.id,
        overrideId: (e.payload as any).overrideId as string | undefined,
      }));

    // Filter by target if specified
    if (target) {
      events = events.filter((e) => e.decision.target === target);
    }

    // Filter override-only if specified
    if (overrideOnly === 'true') {
      events = events.filter((e) => e.overrideId);
    }

    return {
      events,
      total: events.length,
    };
  }

  @Post('overrides')
  async createOverride(@CurrentUser() user: any, @Body() body: unknown) {
    const params = createRoutingOverrideSchema.parse(body);
    const startsAt = new Date();
    const endsAt = params.durationHours
      ? new Date(startsAt.getTime() + params.durationHours * 60 * 60 * 1000)
      : null;

    const override = await this.prisma.routingOverride.create({
      data: {
        orgId: user.orgId,
        threadId: params.threadId,
        targetType: params.target,
        targetId: params.targetId || null,
        startsAt,
        endsAt,
        reason: params.reason,
        createdByUserId: user.id,
      },
    });

    await this.audit.recordEvent({
      orgId: user.orgId,
      actorType: 'owner',
      actorId: user.id,
      entityType: 'routingOverride',
      entityId: override.id,
      eventType: 'routing.override.created',
      payload: { override, reason: params.reason },
    });

    return override;
  }

  @Get('overrides')
  async getOverrides(
    @CurrentUser() user: any,
    @Query() query: { threadId?: string; activeOnly?: string },
  ) {
    const where: any = { orgId: user.orgId, removedAt: null };

    if (query.threadId) {
      where.threadId = query.threadId;
    }

    if (query.activeOnly === 'true') {
      const now = new Date();
      where.startsAt = { lte: now };
      where.OR = [{ endsAt: null }, { endsAt: { gte: now } }];
    }

    return this.prisma.routingOverride.findMany({
      where,
      include: {
        thread: {
          include: {
            client: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Delete('overrides/:id')
  async removeOverride(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body?: { reason?: string },
  ) {
    const override = await this.prisma.routingOverride.findFirst({
      where: { id, orgId: user.orgId },
    });

    if (!override) {
      throw new Error('Override not found');
    }

    await this.prisma.routingOverride.update({
      where: { id },
      data: { removedAt: new Date() },
    });

    await this.audit.recordEvent({
      orgId: user.orgId,
      actorType: 'owner',
      actorId: user.id,
      entityType: 'routingOverride',
      entityId: id,
      eventType: 'routing.override.removed',
      payload: { reason: body?.reason || 'Manual removal' },
    });

    return { success: true };
  }
}
