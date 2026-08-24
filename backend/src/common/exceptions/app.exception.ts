import { ErrorCode, ERROR_CATALOG } from '../constants/error-codes';

export interface FieldError {
  field: string;
  message: string;
}

/**
 * Thrown by application code (e.g. the ValidationPipe's exceptionFactory)
 * to signal one of the §13 catalog codes directly, without going through
 * an HTTP-status-first exception. AllExceptionsFilter reads `.code` (and
 * `.fields`, for VALIDATION_FAILED) straight off this class.
 */
export class AppException extends Error {
  constructor(
    public readonly code: ErrorCode,
    message?: string,
    public readonly fields?: FieldError[],
  ) {
    super(message ?? ERROR_CATALOG[code].message);
    this.name = 'AppException';
  }
}
