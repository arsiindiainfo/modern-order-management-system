import { HttpStatus } from '@nestjs/common';

/**
 * The plan's §13 error-code catalog. A SQL Server RAISERROR/THROW message
 * (e.g. `RAISERROR('ORDER_VERSION_CONFLICT', 16, 1)`) uses these strings
 * as its stable, machine-readable code by convention — not a free-form
 * human sentence — so matching on message text is the documented design,
 * not a shortcut.
 */
export const ERROR_CATALOG = {
  VALIDATION_FAILED: {
    httpStatus: HttpStatus.BAD_REQUEST,
    message: 'One or more fields are invalid.',
  },
  UNAUTHENTICATED: {
    httpStatus: HttpStatus.UNAUTHORIZED,
    message: 'Authentication is required to access this resource.',
  },
  INVALID_CREDENTIALS: {
    httpStatus: HttpStatus.UNAUTHORIZED,
    message: 'Email or password is incorrect.',
  },
  FORBIDDEN_ROLE: {
    httpStatus: HttpStatus.FORBIDDEN,
    message: 'Your role does not have permission to perform this action.',
  },
  PAYMENT_FAILED: {
    httpStatus: HttpStatus.PAYMENT_REQUIRED,
    message: 'The payment could not be processed.',
  },
  RESOURCE_NOT_FOUND: {
    httpStatus: HttpStatus.NOT_FOUND,
    message: 'The requested resource was not found.',
  },
  DUPLICATE_ENTRY: {
    httpStatus: HttpStatus.CONFLICT,
    message: 'A record with these details already exists.',
  },
  ORDER_VERSION_CONFLICT: {
    httpStatus: HttpStatus.CONFLICT,
    message: 'This order was modified by someone else. Reload and try again.',
  },
  INSUFFICIENT_STOCK: {
    httpStatus: HttpStatus.CONFLICT,
    message: 'Requested quantity exceeds available inventory.',
  },
  INVALID_STATE_TRANSITION: {
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
    message: 'This status change is not allowed from the current state.',
  },
  DISCOUNT_NOT_APPLICABLE: {
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
    message: 'This discount code cannot be applied.',
  },
  RATE_LIMITED: {
    httpStatus: HttpStatus.TOO_MANY_REQUESTS,
    message: 'Too many requests. Please try again shortly.',
  },
  RECAPTCHA_FAILED: {
    httpStatus: HttpStatus.BAD_REQUEST,
    message: 'reCAPTCHA verification failed. Please try again.',
  },
  INTERNAL_ERROR: {
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'An unexpected error occurred.',
  },
} as const;

export type ErrorCode = keyof typeof ERROR_CATALOG;

export function isKnownErrorCode(code: string): code is ErrorCode {
  return Boolean(Object.prototype.hasOwnProperty.call(ERROR_CATALOG, code));
}
