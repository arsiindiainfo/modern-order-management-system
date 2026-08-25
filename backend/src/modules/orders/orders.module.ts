import { Module } from '@nestjs/common';
import { StoredProcedureRunnerModule } from '../../common/database/stored-procedure-runner.module';
import { OrdersController } from './orders.controller';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';

@Module({
  imports: [StoredProcedureRunnerModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository],
})
export class OrdersModule {}
