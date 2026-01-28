import { Module } from '@nestjs/common';
import { NumbersService } from './numbers.service';
import { NumbersController } from './numbers.controller';

@Module({
  providers: [NumbersService],
  controllers: [NumbersController],
  exports: [NumbersService],
})
export class NumbersModule {}
