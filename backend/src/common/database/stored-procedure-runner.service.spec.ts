import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { StoredProcedureRunner } from './stored-procedure-runner.service';

const requestInputMock = jest.fn();
const requestExecuteMock = jest.fn();

jest.mock('mssql', () => ({
  Request: jest.fn().mockImplementation(() => ({
    input: requestInputMock,
    execute: requestExecuteMock,
  })),
  UniqueIdentifier: 'UNIQUEIDENTIFIER_TYPE_MARKER',
}));

describe('StoredProcedureRunner', () => {
  let runner: StoredProcedureRunner;
  let queryMock: jest.Mock;
  let obtainMasterConnectionMock: jest.Mock;

  beforeEach(async () => {
    queryMock = jest.fn();
    obtainMasterConnectionMock = jest.fn().mockResolvedValue({ pool: true });
    requestInputMock.mockClear();
    requestExecuteMock.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoredProcedureRunner,
        {
          provide: getDataSourceToken(),
          useValue: {
            query: queryMock,
            driver: { obtainMasterConnection: obtainMasterConnectionMock },
          },
        },
      ],
    }).compile();

    runner = module.get(StoredProcedureRunner);
  });

  it('builds a parameterized EXEC statement with positional placeholders', async () => {
    queryMock.mockResolvedValue([{ Id: '1' }]);

    const result = await runner.execute('usp_Auth_GetUserByEmail', [
      { name: 'Email', value: 'a@b.com' },
    ]);

    expect(queryMock).toHaveBeenCalledWith(
      'EXEC [dbo].[usp_Auth_GetUserByEmail] @Email = @0',
      ['a@b.com'],
    );
    expect(result).toEqual([{ Id: '1' }]);
  });

  it('builds a bare EXEC statement with no parameters', async () => {
    queryMock.mockResolvedValue(undefined);

    await runner.execute('usp_RefreshTokens_Revoke');

    expect(queryMock).toHaveBeenCalledWith(
      'EXEC [dbo].[usp_RefreshTokens_Revoke]',
      [],
    );
  });

  it('wraps typed params in an MssqlParameter instance', async () => {
    queryMock.mockResolvedValue([]);

    await runner.execute('usp_Orders_UpdateStatus', [
      {
        name: 'GrandTotal',
        value: 19.99,
        type: 'decimal',
        typeParams: [12, 2],
      },
    ]);

    const [, values] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(values[0]).toMatchObject({ value: 19.99, type: 'decimal' });
  });

  it('normalizes a proc with no result set to an empty array, not undefined', async () => {
    queryMock.mockResolvedValue(undefined);

    const result = await runner.execute('usp_RefreshTokens_Revoke', [
      { name: 'TokenHash', value: 'hash' },
    ]);

    expect(result).toEqual([]);
  });

  it('rejects a malicious/invalid procedure name', async () => {
    await expect(runner.execute('usp_X; DROP TABLE Users;--')).rejects.toThrow(
      /Invalid SQL procedure name identifier/,
    );
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('rejects a malicious/invalid parameter name', async () => {
    await expect(
      runner.execute('usp_Auth_GetUserByEmail', [
        { name: "Email] = 'x'; --", value: 'a@b.com' },
      ]),
    ).rejects.toThrow(/Invalid SQL parameter name identifier/);
    expect(queryMock).not.toHaveBeenCalled();
  });

  describe('executeMultiple', () => {
    it('returns every recordset, not just the first, via the raw mssql pool', async () => {
      requestExecuteMock.mockResolvedValue({
        recordsets: [[{ Id: 'order-1' }], [{ Id: 'line-1' }, { Id: 'line-2' }]],
      });

      const [header, lines] = await runner.executeMultiple(
        'usp_Orders_GetById',
        [
          { name: 'TenantId', value: 'tenant-1', type: 'uniqueidentifier' },
          { name: 'Id', value: 'order-1', type: 'uniqueidentifier' },
        ],
      );

      expect(obtainMasterConnectionMock).toHaveBeenCalled();
      expect(requestInputMock).toHaveBeenCalledWith(
        'TenantId',
        'UNIQUEIDENTIFIER_TYPE_MARKER',
        'tenant-1',
      );
      expect(requestExecuteMock).toHaveBeenCalledWith('usp_Orders_GetById');
      expect(header).toEqual([{ Id: 'order-1' }]);
      expect(lines).toEqual([{ Id: 'line-1' }, { Id: 'line-2' }]);
    });

    it('rejects an unsupported typed param rather than silently mishandling it', async () => {
      await expect(
        runner.executeMultiple('usp_Orders_GetById', [
          { name: 'Amount', value: 1, type: 'decimal', typeParams: [12, 2] },
        ]),
      ).rejects.toThrow(/doesn't support the 'decimal' param type/);
    });

    it('rejects a malicious/invalid procedure name before touching the pool', async () => {
      await expect(
        runner.executeMultiple('usp_X; DROP TABLE Users;--'),
      ).rejects.toThrow(/Invalid SQL procedure name identifier/);
      expect(obtainMasterConnectionMock).not.toHaveBeenCalled();
    });
  });
});
