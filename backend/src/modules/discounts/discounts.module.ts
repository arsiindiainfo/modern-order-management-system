import { Module } from '@nestjs/common';
import { StoredProcedureRunnerModule } from '../../common/database/stored-procedure-runner.module';
import { DiscountsController } from './discounts.controller';
import { DiscountsRepository } from './discounts.repository';
import { DiscountsService } from './discounts.service';

@Module({
  imports: [StoredProcedureRunnerModule],
  controllers: [DiscountsController],
  providers: [DiscountsService, DiscountsRepository],
})
export class DiscountsModule {}
