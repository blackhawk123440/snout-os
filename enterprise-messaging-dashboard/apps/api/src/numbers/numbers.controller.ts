import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  Header,
} from '@nestjs/common';
import { NumbersService } from './numbers.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Response } from 'express';

@Controller('api/numbers')
@UseGuards(AuthGuard)
export class NumbersController {
  constructor(private numbersService: NumbersService) {}

  @Get()
  async getInventory(@CurrentUser() user: any, @Query() query: any) {
    return this.numbersService.getInventory(user.orgId, query);
  }

  @Get('sitters')
  async getSitters(@CurrentUser() user: any) {
    return this.numbersService.getSitters(user.orgId);
  }

  @Get('export.csv')
  @Header('Content-Type', 'text/csv')
  async exportCsv(@CurrentUser() user: any, @Res() res: Response) {
    const csv = await this.numbersService.exportCsv(user.orgId);
    res.send(csv);
  }

  @Get(':id')
  async getNumberDetail(@CurrentUser() user: any, @Param('id') id: string) {
    return this.numbersService.getNumberDetail(user.orgId, id);
  }

  @Get(':id/impact')
  async getImpactPreview(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('action') action: string,
  ) {
    return this.numbersService.getImpactPreview(user.orgId, id, action);
  }

  @Post('buy')
  async buyNumber(
    @CurrentUser() user: any,
    @Body() body: { e164: string; class: string },
  ) {
    return this.numbersService.purchaseNumber(user.orgId, body.e164, body.class);
  }

  @Post('import')
  async importNumber(
    @CurrentUser() user: any,
    @Body() body: { e164: string; class: string },
  ) {
    return this.numbersService.bulkImport(user.orgId, [{ e164: body.e164, class: body.class }]);
  }

  @Post('bulk-import')
  async bulkImport(
    @CurrentUser() user: any,
    @Body() body: { numbers: Array<{ e164: string; class: string }> },
  ) {
    return this.numbersService.bulkImport(user.orgId, body.numbers);
  }

  @Post(':id/assign-to-sitter')
  async assignToSitter(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { sitterId: string },
  ) {
    return this.numbersService.assignToSitter(user.orgId, id, body.sitterId);
  }

  @Post(':id/release-to-pool')
  async releaseToPool(@CurrentUser() user: any, @Param('id') id: string) {
    return this.numbersService.releaseToPool(user.orgId, id);
  }

  @Post(':id/quarantine')
  async quarantine(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { reason: string; reasonDetail?: string },
  ) {
    return this.numbersService.quarantineNumber(user.orgId, id, body.reason, body.reasonDetail);
  }

  @Post('bulk-quarantine')
  async bulkQuarantine(
    @CurrentUser() user: any,
    @Body() body: { numberIds: string[]; reason: string; reasonDetail?: string },
  ) {
    return this.numbersService.bulkQuarantine(
      user.orgId,
      body.numberIds,
      body.reason,
      body.reasonDetail,
    );
  }

  @Post(':id/release-from-quarantine')
  async releaseFromQuarantine(@CurrentUser() user: any, @Param('id') id: string) {
    return this.numbersService.releaseFromQuarantine(user.orgId, id);
  }
}
