import * as fs from 'fs';
import * as path from 'path';
import { MigrationInterface, QueryRunner } from 'typeorm';

const BOM_PATTERN = new RegExp('^\\uFEFF');

const PROCEDURE_FILES = [
  'usp_Auth_GetUserByEmail.sql',
  'usp_RefreshTokens_Create.sql',
  'usp_RefreshTokens_Rotate.sql',
  'usp_RefreshTokens_Revoke.sql',
];

function readProcedureSql(fileName: string): string {
  const filePath = path.join(__dirname, '..', 'procedures', fileName);
  return fs.readFileSync(filePath, 'utf8').replace(BOM_PATTERN, '');
}

export class CreateAuthStoredProcedures1787552985696 implements MigrationInterface {
  name = 'CreateAuthStoredProcedures1787552985696';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const fileName of PROCEDURE_FILES) {
      await queryRunner.query(readProcedureSql(fileName));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP PROCEDURE IF EXISTS dbo.usp_RefreshTokens_Revoke',
    );
    await queryRunner.query(
      'DROP PROCEDURE IF EXISTS dbo.usp_RefreshTokens_Rotate',
    );
    await queryRunner.query(
      'DROP PROCEDURE IF EXISTS dbo.usp_RefreshTokens_Create',
    );
    await queryRunner.query(
      'DROP PROCEDURE IF EXISTS dbo.usp_Auth_GetUserByEmail',
    );
  }
}
