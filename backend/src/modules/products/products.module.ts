import { Module } from '@nestjs/common';
import { StoredProcedureRunnerModule } from '../../common/database/stored-procedure-runner.module';
import { ProductsController } from './products.controller';
import { ProductsRepository } from './products.repository';
import { ProductsService } from './products.service';

@Module({
  imports: [StoredProcedureRunnerModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductsRepository],
})
export class ProductsModule {}
