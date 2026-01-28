import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { z } from 'zod';

const createWindowSchema = z.object({
  threadId: z.string(),
  sitterId: z.string(),
  startsAt: z.string().transform((s) => new Date(s)),
  endsAt: z.string().transform((s) => new Date(s)),
  bookingRef: z.string().optional(),
});

const updateWindowSchema = z.object({
  startsAt: z.string().transform((s) => new Date(s)).optional(),
  endsAt: z.string().transform((s) => new Date(s)).optional(),
  sitterId: z.string().optional(),
  bookingRef: z.string().optional(),
});

const resolveConflictSchema = z.object({
  strategy: z.enum(['keepA', 'keepB', 'split']),
});

const sendReassignmentMessageSchema = z.object({
  templateId: z.string().optional(),
});

@Controller('api/assignments')
@UseGuards(AuthGuard)
export class AssignmentsController {
  constructor(private assignmentsService: AssignmentsService) {}

  @Get('windows')
  async getWindows(
    @CurrentUser() user: any,
    @Query() query: {
      threadId?: string;
      sitterId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    return this.assignmentsService.getWindows(user.orgId, {
      threadId: query.threadId,
      sitterId: query.sitterId,
      status: query.status as any,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });
  }

  @Get('windows/:id')
  async getWindow(@CurrentUser() user: any, @Param('id') id: string) {
    return this.assignmentsService.getWindow(user.orgId, id);
  }

  @Post('windows')
  async createWindow(@CurrentUser() user: any, @Body() body: unknown) {
    const params = createWindowSchema.parse(body);
    return this.assignmentsService.createWindow(user.orgId, params, user.id);
  }

  @Patch('windows/:id')
  async updateWindow(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const params = updateWindowSchema.parse(body);
    return this.assignmentsService.updateWindow(user.orgId, id, params, user.id);
  }

  @Delete('windows/:id')
  async deleteWindow(@CurrentUser() user: any, @Param('id') id: string) {
    return this.assignmentsService.deleteWindow(user.orgId, id, user.id);
  }

  @Get('conflicts')
  async getConflicts(@CurrentUser() user: any) {
    return this.assignmentsService.getConflicts(user.orgId);
  }

  @Post('conflicts/:conflictId/resolve')
  async resolveConflict(
    @CurrentUser() user: any,
    @Param('conflictId') conflictId: string,
    @Body() body: unknown,
  ) {
    const params = resolveConflictSchema.parse(body);
    return this.assignmentsService.resolveConflict(user.orgId, conflictId, params.strategy, user.id);
  }

  @Post('reassignment-message')
  async sendReassignmentMessage(
    @CurrentUser() user: any,
    @Body() body: unknown,
  ) {
    const { threadId, windowId, templateId } = body as {
      threadId: string;
      windowId: string;
      templateId?: string;
    };

    if (!threadId || !windowId) {
      throw new Error('threadId and windowId are required');
    }

    return this.assignmentsService.sendReassignmentMessage(
      user.orgId,
      threadId,
      windowId,
      user.id,
      templateId,
    );
  }
}
