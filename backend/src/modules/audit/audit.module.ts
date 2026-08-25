import { Module } from '@nestjs/common';
import { StoredProcedureRunnerModule } from '../../common/database/stored-procedure-runner.module';
import { AuditController } from './audit.controller';
import { AuditRepository } from './audit.repository';
import { AuditService } from './audit.service';

@Module({
  imports: [StoredProcedureRunnerModule],
  controllers: [AuditController],
  providers: [AuditService, AuditRepository],
})
export class AuditModule {}
