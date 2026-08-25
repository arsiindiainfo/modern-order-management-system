import * as fs from 'fs';
import * as path from 'path';
import {
  isLegalOrderTransition,
  ORDER_STATE_MACHINE,
} from './order-state-machine';

/**
 * Parses the VALUES rows straight out of ufn_LegalOrderTransitions.sql so
 * this test fails the moment the TS constant and the SQL function drift
 * apart — the §23 "checked for parity" requirement, without needing a live
 * database (still Phase 5's boundary, same as every other Phase 0-3 test).
 */
function parseSqlTransitions(): { from: string; to: string }[] {
  const sqlPath = path.join(
    __dirname,
    '..',
    '..',
    'database',
    'procedures',
    'ufn_LegalOrderTransitions.sql',
  );
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const rowPattern = /\(\s*'([A-Z_]+)'\s*,\s*'([A-Z_]+)'\s*\)/g;
  const rows: { from: string; to: string }[] = [];
  let match: RegExpExecArray | null;
  while ((match = rowPattern.exec(sql)) !== null) {
    rows.push({ from: match[1], to: match[2] });
  }
  return rows;
}

describe('ORDER_STATE_MACHINE', () => {
  it('matches dbo.ufn_LegalOrderTransitions() exactly', () => {
    const sqlTransitions = parseSqlTransitions();
    expect(sqlTransitions.length).toBeGreaterThan(0);
    expect(ORDER_STATE_MACHINE).toEqual(sqlTransitions);
  });

  it.each([
    ['PENDING', 'CONFIRMED', true],
    ['PENDING', 'ON_HOLD', true],
    ['PENDING', 'CANCELLED', true],
    ['ON_HOLD', 'PENDING', true],
    ['ON_HOLD', 'PROCESSING', true],
    ['SHIPPED', 'DELIVERED', true],
    ['DELIVERED', 'CANCELLED', false],
    ['SHIPPED', 'CANCELLED', false],
    ['SHIPPED', 'ON_HOLD', false],
    ['CANCELLED', 'PENDING', false],
  ])('isLegalOrderTransition(%s, %s) === %s', (from, to, expected) => {
    expect(isLegalOrderTransition(from as never, to as never)).toBe(expected);
  });
});
