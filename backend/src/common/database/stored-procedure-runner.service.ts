import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, MssqlParameter } from 'typeorm';
import * as mssql from 'mssql';

/**
 * Every legitimate SQL Server identifier NestJS/TypeORM will ever be asked
 * to EXEC in this app: starts with a letter/underscore, then word chars,
 * capped well under SQL Server's 128-char identifier limit. Rejecting
 * anything else closes the injection surface on `procedureName`/param
 * names at zero cost, since no real procedure or parameter is named
 * anything this regex would refuse.
 */
const VALID_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]{0,127}$/;

function assertValidIdentifier(value: string, kind: string): void {
  if (!VALID_IDENTIFIER.test(value)) {
    throw new Error(`Invalid SQL ${kind} identifier: "${value}"`);
  }
}

export type MssqlParamType =
  | 'bit'
  | 'bigint'
  | 'decimal'
  | 'float'
  | 'int'
  | 'money'
  | 'numeric'
  | 'smallint'
  | 'smallmoney'
  | 'real'
  | 'tinyint'
  | 'char'
  | 'nchar'
  | 'text'
  | 'ntext'
  | 'varchar'
  | 'nvarchar'
  | 'xml'
  | 'time'
  | 'date'
  | 'datetime'
  | 'datetime2'
  | 'datetimeoffset'
  | 'smalldatetime'
  | 'uniqueidentifier'
  | 'variant'
  | 'binary'
  | 'varbinary'
  | 'image'
  | 'udt'
  | 'rowversion';

export interface StoredProcedureParam {
  name: string;
  value: unknown;
  /**
   * SQL Server type name (e.g. 'decimal', 'datetime2', 'uniqueidentifier').
   * Required for DECIMAL/DATETIME2/UNIQUEIDENTIFIER params — without it,
   * node-mssql infers the TDS type from the JS value, which turns a
   * non-integer `number` into Float (rounding risk against DECIMAL columns)
   * and a `Date` into DateTime instead of DateTime2 (losing (3) precision).
   */
  type?: MssqlParamType;
  /** Extra type params TypeORM forwards to node-mssql, e.g. [precision, scale] for 'decimal', [scale] for 'datetime2'. */
  typeParams?: number[];
}

// MssqlParameter's declared constructor is one overload per literal SQL
// type, each with its own fixed optional-param arity — not expressible
// generically. This narrows it back to a single dynamic signature once,
// here, rather than casting at every call site.
const DynamicMssqlParameter = MssqlParameter as unknown as new (
  value: unknown,
  type: MssqlParamType,
  ...typeParams: number[]
) => MssqlParameter;

// The driver internals executeMultiple() reaches into — the same ones
// TypeORM's own SqlServerQueryRunner.query() calls under the hood
// (confirmed against node_modules/typeorm/driver/sqlserver/SqlServerDriver.js),
// just without discarding every recordset past the first.
interface MssqlDriverInternals {
  obtainMasterConnection(): Promise<mssql.ConnectionPool>;
}

/**
 * The only class in this app allowed to EXEC a stored procedure — every
 * business read/write goes through here (see the plan's §6.3 decision).
 * No entities, no repositories, no query builder anywhere else; enforced
 * by an ESLint restricted-imports rule outside src/common/database/**.
 *
 * Contract every stored procedure must follow (see database/procedures):
 *   - exactly one result set (dataSource.query() only ever surfaces the
 *     first recordset — a second SELECT in a proc is silently dropped);
 *   - no OUTPUT params, no RETURN codes — communicate failures via
 *     RAISERROR/THROW only, successes via the one result set;
 *   - SET NOCOUNT ON (and SET XACT_ABORT ON for anything transactional)
 *     as the first statement.
 */
@Injectable()
export class StoredProcedureRunner {
  private readonly logger = new Logger(StoredProcedureRunner.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async execute<T = Record<string, unknown>>(
    procedureName: string,
    params: StoredProcedureParam[] = [],
  ): Promise<T[]> {
    assertValidIdentifier(procedureName, 'procedure name');
    params.forEach((p) => assertValidIdentifier(p.name, 'parameter name'));

    const assignments = params.map((p, i) => `@${p.name} = @${i}`).join(', ');
    const sql = `EXEC [dbo].[${procedureName}]${assignments ? ' ' + assignments : ''}`;
    const values = params.map((p) =>
      p.type
        ? new DynamicMssqlParameter(p.value, p.type, ...(p.typeParams ?? []))
        : p.value,
    );

    const startedAt = Date.now();
    try {
      const rows = await this.dataSource.query<T[] | undefined>(sql, values);
      // A proc with no SELECT (e.g. a pure UPDATE) resolves to `undefined`,
      // not an empty array — normalize so the return type is never a lie.
      return rows ?? [];
    } finally {
      this.logger.debug(
        `EXEC ${procedureName} (${Date.now() - startedAt}ms)`,
        // never log `params`/`values` here — passwords and PII pass through
        // this runner from Phase 1 onward.
      );
    }
  }

  /**
   * The one narrow exception to this class's single-result-set contract —
   * built for usp_Orders_GetById, which documents (§6.4) a second SELECT
   * (the joined OrderLines) that execute()/dataSource.query() would
   * silently drop. Bypasses TypeORM's query() and talks to the underlying
   * node-mssql pool directly, returning every recordset.
   *
   * Only supports 'uniqueidentifier' typed params so far, since that's all
   * this method's one caller needs — extend the type handling below if a
   * future caller needs another type.
   */
  async executeMultiple<T = Record<string, unknown>>(
    procedureName: string,
    params: StoredProcedureParam[] = [],
  ): Promise<T[][]> {
    assertValidIdentifier(procedureName, 'procedure name');
    params.forEach((p) => assertValidIdentifier(p.name, 'parameter name'));

    const driver = this.dataSource.driver as unknown as MssqlDriverInternals;
    const pool = await driver.obtainMasterConnection();
    const request = new mssql.Request(pool);

    params.forEach((p) => {
      if (!p.type) {
        request.input(p.name, p.value);
      } else if (p.type === 'uniqueidentifier') {
        request.input(p.name, mssql.UniqueIdentifier, p.value);
      } else {
        throw new Error(
          `executeMultiple() doesn't support the '${p.type}' param type yet (param @${p.name}) — extend the type handling in stored-procedure-runner.service.ts.`,
        );
      }
    });

    const startedAt = Date.now();
    try {
      const result = await request.execute(procedureName);
      return result.recordsets as unknown as T[][];
    } finally {
      this.logger.debug(
        `EXEC ${procedureName} multi (${Date.now() - startedAt}ms)`,
      );
    }
  }
}
