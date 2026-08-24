import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { AppException } from '../exceptions/app.exception';

interface ErrorPayload {
  success: false;
  error: {
    statusCode: number;
    code: string;
    message: string;
    traceId: string;
    fields?: { field: string; message: string }[];
  };
}

function createHost(traceId = 'trace-123') {
  const json = jest.fn<void, [ErrorPayload]>();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ traceId }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

function lastPayload(json: jest.Mock<void, [ErrorPayload]>): ErrorPayload {
  return json.mock.calls[0][0];
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
  });

  it('maps an AppException to its catalog status/code/message', () => {
    const { host, status, json } = createHost();

    filter.catch(new AppException('RESOURCE_NOT_FOUND'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: {
        statusCode: 404,
        code: 'RESOURCE_NOT_FOUND',
        message: 'The requested resource was not found.',
        traceId: 'trace-123',
      },
    });
  });

  it('includes the fields array for a VALIDATION_FAILED AppException', () => {
    const { host, json } = createHost();
    const fields = [
      { field: 'email', message: 'email must be a valid email address' },
    ];

    filter.catch(
      new AppException('VALIDATION_FAILED', undefined, fields),
      host,
    );

    expect(lastPayload(json).error.code).toBe('VALIDATION_FAILED');
    expect(lastPayload(json).error.fields).toEqual(fields);
  });

  it('unwraps a known RAISERROR message from QueryFailedError.driverError', () => {
    const { host, status, json } = createHost();
    const driverError = new Error('ORDER_VERSION_CONFLICT');
    const queryFailedError = new QueryFailedError('EXEC ...', [], driverError);

    filter.catch(queryFailedError, host);

    expect(status).toHaveBeenCalledWith(409);
    expect(lastPayload(json).error.code).toBe('ORDER_VERSION_CONFLICT');
  });

  it('falls back to a generic 500 for an unrecognized SQL error, never leaking raw SQL text', () => {
    const { host, status, json } = createHost();
    const driverError = new Error("Invalid column name 'Foo'.");
    const queryFailedError = new QueryFailedError(
      'SELECT ...',
      [],
      driverError,
    );

    filter.catch(queryFailedError, host);

    expect(status).toHaveBeenCalledWith(500);
    expect(lastPayload(json).error.code).toBe('INTERNAL_ERROR');
    expect(lastPayload(json).error.message).not.toContain('Foo');
  });

  it('maps a plain HttpException by its HTTP status', () => {
    const { host, status, json } = createHost();

    filter.catch(new BadRequestException('bad input'), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(lastPayload(json).error.code).toBe('VALIDATION_FAILED');
  });

  it('falls back to a generic 500 for an unrecognized plain Error', () => {
    const { host, status, json } = createHost();

    filter.catch(new Error('boom'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(lastPayload(json)).toEqual({
      success: false,
      error: {
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
        traceId: 'trace-123',
      },
    });
  });
});
