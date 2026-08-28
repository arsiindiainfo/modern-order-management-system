import * as fs from 'fs';
import * as path from 'path';
import { MigrationInterface, QueryRunner } from 'typeorm';

const BOM_PATTERN = new RegExp('^\\uFEFF');

// Both procedures had the same bug: they read the order's current status
// via a separate SELECT before the version-checked UPDATE, so two
// concurrent requests targeting the same @ExpectedVersion could race —
// the loser sometimes saw the winner's already-committed new status and
// got INVALID_STATE_TRANSITION (422) instead of the intended
// ORDER_VERSION_CONFLICT (409). Fixed by capturing the pre-update status
// via the UPDATE's own OUTPUT clause, so the version check and the
// legality check read the same atomically-updated row.
const OBJECT_FILES = [
  'usp_Orders_UpdateStatus.sql',
  'usp_Orders_RecordShipment.sql',
];

function readSql(fileName: string): string {
  const filePath = path.join(__dirname, '..', 'procedures', fileName);
  return fs.readFileSync(filePath, 'utf8').replace(BOM_PATTERN, '');
}

export class FixOrderStatusUpdateRaceCondition1787700000001 implements MigrationInterface {
  name = 'FixOrderStatusUpdateRaceCondition1787700000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const fileName of OBJECT_FILES) {
      await queryRunner.query(readSql(fileName));
    }
  }

  public async down(): Promise<void> {
    // Intentionally a no-op — reverting would mean reintroducing the race
    // condition, not something a rollback should ever want to do.
  }
}
