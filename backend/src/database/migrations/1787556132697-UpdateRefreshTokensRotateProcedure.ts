import * as fs from 'fs';
import * as path from 'path';
import { MigrationInterface, QueryRunner } from 'typeorm';

const BOM_PATTERN = new RegExp('^\\uFEFF');

function readProcedureSql(fileName: string): string {
  const filePath = path.join(__dirname, '..', 'procedures', fileName);
  return fs.readFileSync(filePath, 'utf8').replace(BOM_PATTERN, '');
}

/**
 * Phase 1 discovered that usp_RefreshTokens_Rotate needs to hand the app
 * layer fresh tenantId/role/email claims to reissue an access token —
 * CREATE OR ALTER is idempotent, so this just redeploys the updated
 * proc body from src/database/procedures (now joined to Users).
 */
export class UpdateRefreshTokensRotateProcedure1787556132697 implements MigrationInterface {
  name = 'UpdateRefreshTokensRotateProcedure1787556132697';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(readProcedureSql('usp_RefreshTokens_Rotate.sql'));
  }

  public async down(): Promise<void> {
    // Intentionally not reverted to the pre-Phase-1 body — CREATE OR ALTER
    // migrations are forward-only for procedures (see Phase 0 plan notes);
    // reverting to a broken (non-user-joined) version would just break
    // Phase 1's auth flow again.
  }
}
