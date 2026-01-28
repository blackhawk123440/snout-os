import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SitterService } from './sitter.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('api/sitter')
@UseGuards(AuthGuard)
export class SitterController {
  constructor(private sitterService: SitterService) {}

  @Get('threads')
  async getThreads(@CurrentUser() user: any) {
    // Verify user is a sitter
    if (user.role !== 'sitter') {
      throw new Error('Access denied. Sitter access required.');
    }

    return this.sitterService.getThreads(user.orgId, user.id);
  }

  @Get('threads/:id')
  async getThread(@CurrentUser() user: any, @Param('id') id: string) {
    if (user.role !== 'sitter') {
      throw new Error('Access denied. Sitter access required.');
    }

    return this.sitterService.getThread(user.orgId, user.id, id);
  }

  @Get('threads/:id/messages')
  async getMessages(@CurrentUser() user: any, @Param('id') id: string) {
    if (user.role !== 'sitter') {
      throw new Error('Access denied. Sitter access required.');
    }

    return this.sitterService.getMessages(user.orgId, user.id, id);
  }

  @Post('threads/:id/messages')
  async sendMessage(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { body: string },
  ) {
    if (user.role !== 'sitter') {
      throw new Error('Access denied. Sitter access required.');
    }

    if (!body.body) {
      throw new Error('Message body is required');
    }

    return this.sitterService.sendMessage(user.orgId, user.id, id, body.body);
  }

  @Patch('threads/:id/mark-read')
  async markThreadAsRead(@CurrentUser() user: any, @Param('id') id: string) {
    if (user.role !== 'sitter') {
      throw new Error('Access denied. Sitter access required.');
    }

    return this.sitterService.markThreadAsRead(user.orgId, user.id, id);
  }
}
