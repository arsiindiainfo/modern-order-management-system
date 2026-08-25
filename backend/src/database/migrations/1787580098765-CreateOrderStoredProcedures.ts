import * as fs from 'fs';
import * as path from 'path';
import { MigrationInterface, QueryRunner } from 'typeorm';

const BOM_PATTERN = new RegExp('^\\uFEFF');

// ufn_LegalOrderTransitions must exist before usp_Orders_UpdateStatus (which
// references it), and both must exist before AND after their own down()
// drops — order matters for up(), reverse order for down().
const OBJECT_FILES = [
  'ufn_LegalOrderTransitions.sql',
  'usp_Orders_List.sql',
  'usp_Orders_GetById.sql',
  'usp_Orders_Create.sql',
  'usp_Orders_Update.sql',
  'usp_Orders_UpdateStatus.sql',
  'usp_Orders_GetHistory.sql',
];

function readSql(fileName: string): string {
  const filePath = path.join(__dirname, '..', 'procedures', fileName);
  return fs.readFileSync(filePath, 'utf8').replace(BOM_PATTERN, '');
}

export class CreateOrderStoredProcedures1787580098765 implements MigrationInterface {
  name = 'CreateOrderStoredProcedures1787580098765';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const fileName of OBJECT_FILES) {
      await queryRunner.query(readSql(fileName));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const fileName of [...OBJECT_FILES].reverse()) {
      const objectName = fileName.replace('.sql', '');
      if (objectName.startsWith('ufn_')) {
        await queryRunner.query(`DROP FUNCTION IF EXISTS dbo.${objectName}`);
      } else {
        await queryRunner.query(`DROP PROCEDURE IF EXISTS dbo.${objectName}`);
      }
    }
  }
}
