import { Module } from '@nestjs/common';
import { StoredProcedureRunner } from './stored-procedure-runner.service';

@Module({
  providers: [StoredProcedureRunner],
  exports: [StoredProcedureRunner],
})
export class StoredProcedureRunnerModule {}
