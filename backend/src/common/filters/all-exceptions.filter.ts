import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';
import {
  ERROR_CATALOG,
  ErrorCode,
  isKnownErrorCode,
} from '../constants/error-codes';
import { AppException, FieldError } from '../exceptions/app.exception';
import { RequestWithTraceId } from '../middleware/trace-id.middleware';

interface ResolvedError {
  httpStatus: number;
  code: ErrorCode;
  message: string;
  fields?: FieldError[];
}

const HTTP_STATUS_TO_CODE: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: 'VALIDATION_FAILED',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHENTICATED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN_ROLE',
  [HttpStatus.NOT_FOUND]: 'RESOURCE_NOT_FOUND',
  [HttpStatus.CONFLICT]: 'DUPLICATE_ENTRY',
  [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
};

/**
 * Every response — success or failure — follows one shape (§12). This
 * filter produces the failure half: { success: false, error: {...} }.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithTraceId | undefined>();
    const traceId = request?.traceId ?? 'unknown';

    const resolved = this.resolve(exception);

    if (resolved.code === 'INTERNAL_ERROR') {
      this.logger.error(
        `[${traceId}] Unhandled error: ${this.rawMessage(exception)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(resolved.httpStatus).json({
      success: false,
      error: {
        statusCode: resolved.httpStatus,
        code: resolved.code,
        message: resolved.message,
        traceId,
        ...(resolved.fields ? { fields: resolved.fields } : {}),
      },
    });
  }

  private resolve(exception: unknown): ResolvedError {
    if (exception instanceof AppException) {
      return {
        httpStatus: ERROR_CATALOG[exception.code].httpStatus,
        code: exception.code,
        message: exception.message,
        fields: exception.fields,
      };
    }

    // TypeORM wraps the real mssql driver error (which carries the
    // RAISERROR/THROW message text) in QueryFailedError — the code string
    // lives on `driverError`, not on the outer error.
    if (exception instanceof QueryFailedError) {
      const driverError = (exception as unknown as { driverError?: Error })
        .driverError;
      const sqlMessage = (driverError ?? exception).message;
      if (isKnownErrorCode(sqlMessage)) {
        return {
          httpStatus: ERROR_CATALOG[sqlMessage].httpStatus,
          code: sqlMessage,
          message: ERROR_CATALOG[sqlMessage].message,
        };
      }
      // Never leak raw SQL error text to the client.
      return this.internalError();
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const code = HTTP_STATUS_TO_CODE[status] ?? 'INTERNAL_ERROR';
      if (code === 'INTERNAL_ERROR') {
        return this.internalError();
      }
      return {
        httpStatus: ERROR_CATALOG[code].httpStatus,
        code,
        message: exception.message || ERROR_CATALOG[code].message,
      };
    }

    return this.internalError();
  }

  private internalError(): ResolvedError {
    return {
      httpStatus: ERROR_CATALOG.INTERNAL_ERROR.httpStatus,
      code: 'INTERNAL_ERROR',
      message: ERROR_CATALOG.INTERNAL_ERROR.message,
    };
  }

  private rawMessage(exception: unknown): string {
    if (exception instanceof Error) return exception.message;
    return String(exception);
  }
}
