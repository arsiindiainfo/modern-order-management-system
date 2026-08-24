import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { StoredProcedureRunner } from './stored-procedure-runner.service';

describe('StoredProcedureRunner', () => {
  let runner: StoredProcedureRunner;
  let queryMock: jest.Mock;

  beforeEach(async () => {
    queryMock = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoredProcedureRunner,
        { provide: getDataSourceToken(), useValue: { query: queryMock } },
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
});
