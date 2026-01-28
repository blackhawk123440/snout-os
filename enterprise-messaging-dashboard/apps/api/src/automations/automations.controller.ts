import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Res, Header } from '@nestjs/common';
import { AutomationsService } from './automations.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Response } from 'express';

@Controller('api/automations')
@UseGuards(AuthGuard)
export class AutomationsController {
  constructor(private automationsService: AutomationsService) {}

  @Get()
  async getAutomations(
    @CurrentUser() user: any,
    @Query() query: {
      status?: string;
      lane?: string;
      search?: string;
      limit?: string;
      offset?: string;
    },
  ) {
    return this.automationsService.getAutomations(user.orgId, query);
  }

  @Get(':id')
  async getAutomation(@CurrentUser() user: any, @Param('id') id: string) {
    return this.automationsService.getAutomation(user.orgId, id);
  }

  @Post()
  async createAutomation(
    @CurrentUser() user: any,
    @Body() body: {
      name: string;
      description?: string;
      lane: string;
      trigger: any;
      conditions: any;
      actions: any;
      templates: any;
    },
  ) {
    return this.automationsService.createAutomation(user.orgId, body);
  }

  @Patch(':id')
  async updateAutomation(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      description?: string;
      lane?: string;
      trigger?: any;
      conditions?: any;
      actions?: any;
      templates?: any;
    },
  ) {
    return this.automationsService.updateAutomation(user.orgId, id, body);
  }

  @Post(':id/pause')
  async pauseAutomation(@CurrentUser() user: any, @Param('id') id: string) {
    return this.automationsService.pauseAutomation(user.orgId, id);
  }

  @Post(':id/activate')
  async activateAutomation(@CurrentUser() user: any, @Param('id') id: string) {
    return this.automationsService.activateAutomation(user.orgId, id);
  }

  @Post(':id/archive')
  async archiveAutomation(@CurrentUser() user: any, @Param('id') id: string) {
    return this.automationsService.archiveAutomation(user.orgId, id);
  }

  @Post(':id/test')
  async testAutomation(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { context: Record<string, unknown> },
  ) {
    return this.automationsService.testAutomation(user.orgId, id, body.context);
  }

  @Get(':id/logs')
  async getExecutionLogs(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query() query: {
      status?: string;
      startDate?: string;
      endDate?: string;
      limit?: string;
      offset?: string;
    },
  ) {
    return this.automationsService.getExecutionLogs(user.orgId, id, query);
  }

  @Get('executions/:executionId')
  async getExecutionLog(@CurrentUser() user: any, @Param('executionId') executionId: string) {
    return this.automationsService.getExecutionLog(user.orgId, executionId);
  }

  @Get(':id/logs/export.csv')
  @Header('Content-Type', 'text/csv')
  async exportLogs(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query() query: {
      startDate?: string;
      endDate?: string;
    },
    @Res() res: Response,
  ) {
    const logs = await this.automationsService.getExecutionLogs(user.orgId, id, {
      ...query,
      limit: '10000',
    });

    const headers = ['id', 'timestamp', 'status', 'triggerContext', 'conditionResults', 'actionResults', 'error'];
    const rows = logs.logs.map((log) => [
      log.id,
      log.createdAt.toISOString(),
      log.status,
      JSON.stringify(log.triggerContext),
      JSON.stringify(log.conditionResults),
      JSON.stringify(log.actionResults),
      log.error || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    res.send(csv);
  }
}
