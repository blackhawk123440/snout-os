import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Res,
  Header,
} from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Response } from 'express';

@Controller('api/alerts')
@UseGuards(AuthGuard)
export class AlertsController {
  constructor(private alertsService: AlertsService) {}

  @Get()
  async getAlerts(
    @CurrentUser() user: any,
    @Query() query: {
      severity?: string;
      type?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
      limit?: string;
      offset?: string;
    },
  ) {
    return this.alertsService.getAlerts(user.orgId, {
      severity: query.severity,
      type: query.type,
      status: query.status,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      search: query.search,
      limit: query.limit ? parseInt(query.limit) : undefined,
      offset: query.offset ? parseInt(query.offset) : undefined,
    });
  }

  @Get(':id')
  async getAlert(@CurrentUser() user: any, @Param('id') id: string) {
    return this.alertsService.getAlert(user.orgId, id);
  }

  @Post(':id/resolve')
  async resolveAlert(@CurrentUser() user: any, @Param('id') id: string) {
    return this.alertsService.resolveAlert(user.orgId, id, user.id);
  }

  @Post(':id/dismiss')
  async dismissAlert(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body?: { reason?: string },
  ) {
    return this.alertsService.dismissAlert(user.orgId, id, user.id, body?.reason);
  }

  @Get('export.csv')
  @Header('Content-Type', 'text/csv')
  async exportAlerts(
    @CurrentUser() user: any,
    @Query() query: {
      severity?: string;
      type?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    },
    @Res() res: Response,
  ) {
    try {
      const csv = await this.alertsService.exportAlerts(user.orgId, {
        severity: query.severity,
        type: query.type,
        status: query.status,
        startDate: query.startDate,
        endDate: query.endDate,
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
