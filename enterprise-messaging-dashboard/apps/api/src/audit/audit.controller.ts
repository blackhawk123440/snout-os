import { Controller, Get, Post, Query, UseGuards, Res, Header } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Response } from 'express';

@Controller('api/audit')
@UseGuards(AuthGuard)
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get('events')
  async getEvents(
    @CurrentUser() user: any,
    @Query() query: {
      eventType?: string;
      actorType?: string;
      entityType?: string;
      entityId?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
      limit?: string;
      offset?: string;
    },
  ) {
    return this.auditService.queryEvents({
      orgId: user.orgId,
      eventType: query.eventType,
      actorType: query.actorType as any,
      entityType: query.entityType,
      entityId: query.entityId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      search: query.search,
      limit: query.limit ? parseInt(query.limit) : undefined,
      offset: query.offset ? parseInt(query.offset) : undefined,
    });
  }

  @Get('events/export.csv')
  @Header('Content-Type', 'text/csv')
  async exportCsv(
    @CurrentUser() user: any,
    @Query() query: {
      startDate?: string;
      endDate?: string;
      eventTypes?: string;
      eventType?: string;
      actorType?: string;
      entityType?: string;
      entityId?: string;
    },
    @Res() res: Response,
  ) {
    try {
      const csv = await this.auditService.exportToCsv({
        orgId: user.orgId,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        eventTypes: query.eventTypes
          ? query.eventTypes.split(',')
          : query.eventType
            ? [query.eventType]
            : undefined,
      });

      res.send(csv);
    } catch (error: any) {
      if (error.message?.includes('exceeds')) {
        res.status(400).json({ error: error.message });
      } else {
        throw error;
      }
    }
  }
}
