import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { SetupService } from './setup.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  connectProviderSchema,
  buyNumberSchema,
  importNumberSchema,
} from '@snoutos/shared';

@Controller('api/setup')
@UseGuards(AuthGuard)
export class SetupController {
  constructor(private setupService: SetupService) {}

  @Post('provider/connect')
  async connectProvider(@CurrentUser() user: any, @Body() body: unknown) {
    const params = connectProviderSchema.parse(body);
    return this.setupService.connectProvider(user.orgId, params);
  }

  @Post('provider/test')
  async testConnection(@Body() body: { accountSid?: string; authToken?: string }) {
    return this.setupService.testConnection(body);
  }

  @Get('provider/status')
  async getProviderStatus(@CurrentUser() user: any) {
    return this.setupService.getProviderStatus(user.orgId);
  }

  @Post('numbers/buy')
  async buyNumbers(@CurrentUser() user: any, @Body() body: unknown) {
    const params = buyNumberSchema.parse(body);
    return this.setupService.buyNumbers(user.orgId, params);
  }

  @Post('numbers/import')
  async importNumbers(@CurrentUser() user: any, @Body() body: unknown) {
    const params = importNumberSchema.parse(body);
    return this.setupService.importNumbers(user.orgId, params);
  }

  @Get('numbers/status')
  async getNumbersStatus(@CurrentUser() user: any) {
    return this.setupService.getNumbersStatus(user.orgId);
  }

  @Post('webhooks/install')
  async installWebhooks(@CurrentUser() user: any) {
    return this.setupService.installWebhooks(user.orgId);
  }

  @Get('webhooks/status')
  async getWebhookStatus(@CurrentUser() user: any) {
    return this.setupService.getWebhookStatus(user.orgId);
  }

  @Get('readiness')
  async checkReadiness(@CurrentUser() user: any) {
    return this.setupService.checkReadiness(user.orgId);
  }

  @Post('finish')
  async finishSetup(@CurrentUser() user: any) {
    return this.setupService.finishSetup(user.orgId);
  }

  @Get('progress')
  async getSetupProgress(@CurrentUser() user: any) {
    return this.setupService.getSetupProgress(user.orgId);
  }

  @Post('progress')
  async saveSetupProgress(@CurrentUser() user: any, @Body() body: { step: number; data?: Record<string, unknown> }) {
    return this.setupService.saveSetupProgress(user.orgId, body);
  }
}
