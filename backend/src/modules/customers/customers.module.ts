import { Module } from '@nestjs/common';
import { StoredProcedureRunnerModule } from '../../common/database/stored-procedure-runner.module';
import { CustomersController } from './customers.controller';
import { CustomersRepository } from './customers.repository';
import { CustomersService } from './customers.service';

@Module({
  imports: [StoredProcedureRunnerModule],
  controllers: [CustomersController],
  providers: [CustomersService, CustomersRepository],
})
export class CustomersModule {}
