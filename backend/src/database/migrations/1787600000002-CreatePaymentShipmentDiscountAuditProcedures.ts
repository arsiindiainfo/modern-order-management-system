import * as fs from 'fs';
import * as path from 'path';
import { MigrationInterface, QueryRunner } from 'typeorm';

const BOM_PATTERN = new RegExp('^\\uFEFF');

// Functions before anything that references them; re-deployed existing
// procedures (audit retrofit + usp_Orders_Create's discount handling)
// before the brand-new ones that depend on the same functions.
const OBJECT_FILES = [
  'ufn_LegalOrderTransitions.sql', // updated: adds CONFIRMED -> SHIPPED
  'ufn_ComputeDiscountAmount.sql', // new
  'usp_Customers_Create.sql', // updated: @ActorUserId + AuditLogs
  'usp_Customers_Update.sql',
  'usp_Customers_Deactivate.sql',
  'usp_Products_Create.sql',
  'usp_Products_Update.sql',
  'usp_Products_Deactivate.sql',
  'usp_Inventory_Adjust.sql',
  'usp_Orders_Update.sql',
  'usp_Orders_UpdateStatus.sql',
  'usp_Orders_Create.sql', // updated: @DiscountCode handling
  'usp_Discounts_List.sql', // new
  'usp_Discounts_Create.sql',
  'usp_Discounts_Validate.sql',
  'usp_Audit_List.sql',
  'usp_Orders_RecordPayment.sql',
  'usp_Orders_RecordShipment.sql',
];

// Only the brand-new procedures/functions get dropped on down() — the
// updated-in-place ones (Customers/Products/Inventory/Orders_Update/
// UpdateStatus/Create) revert to whatever their own migration already
// deployed by simply not being re-run; DROPping them here would remove
// them entirely instead of rolling back to the prior version.
const NEW_OBJECTS = [
  'ufn_ComputeDiscountAmount',
  'usp_Discounts_List',
  'usp_Discounts_Create',
  'usp_Discounts_Validate',
  'usp_Audit_List',
  'usp_Orders_RecordPayment',
  'usp_Orders_RecordShipment',
];

function readSql(fileName: string): string {
  const filePath = path.join(__dirname, '..', 'procedures', fileName);
  return fs.readFileSync(filePath, 'utf8').replace(BOM_PATTERN, '');
}

export class CreatePaymentShipmentDiscountAuditProcedures1787600000002 implements MigrationInterface {
  name = 'CreatePaymentShipmentDiscountAuditProcedures1787600000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const fileName of OBJECT_FILES) {
      await queryRunner.query(readSql(fileName));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const objectName of [...NEW_OBJECTS].reverse()) {
      if (objectName.startsWith('ufn_')) {
        await queryRunner.query(`DROP FUNCTION IF EXISTS dbo.${objectName}`);
      } else {
        await queryRunner.query(`DROP PROCEDURE IF EXISTS dbo.${objectName}`);
      }
    }
  }
}
