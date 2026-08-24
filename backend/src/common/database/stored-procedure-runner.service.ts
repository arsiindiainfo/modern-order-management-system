import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, MssqlParameter } from 'typeorm';

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
}
