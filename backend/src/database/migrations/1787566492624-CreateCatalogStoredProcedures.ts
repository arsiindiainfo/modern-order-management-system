import * as fs from 'fs';
import * as path from 'path';
import { MigrationInterface, QueryRunner } from 'typeorm';

const BOM_PATTERN = new RegExp('^\\uFEFF');

const PROCEDURE_FILES = [
  'usp_Customers_List.sql',
  'usp_Customers_GetById.sql',
  'usp_Customers_Create.sql',
  'usp_Customers_Update.sql',
  'usp_Customers_Deactivate.sql',
  'usp_Products_List.sql',
  'usp_Products_GetById.sql',
  'usp_Products_Create.sql',
  'usp_Products_Update.sql',
  'usp_Products_Deactivate.sql',
  'usp_Products_GetInventory.sql',
  'usp_Inventory_Adjust.sql',
];

function readProcedureSql(fileName: string): string {
  const filePath = path.join(__dirname, '..', 'procedures', fileName);
  return fs.readFileSync(filePath, 'utf8').replace(BOM_PATTERN, '');
}

export class CreateCatalogStoredProcedures1787566492624 implements MigrationInterface {
  name = 'CreateCatalogStoredProcedures1787566492624';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const fileName of PROCEDURE_FILES) {
      await queryRunner.query(readProcedureSql(fileName));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const fileName of [...PROCEDURE_FILES].reverse()) {
      const procName = fileName.replace('.sql', '');
      await queryRunner.query(`DROP PROCEDURE IF EXISTS dbo.${procName}`);
    }
  }
}
