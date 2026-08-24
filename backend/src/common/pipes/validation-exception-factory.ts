import { ValidationError } from '@nestjs/common';
import { AppException, FieldError } from '../exceptions/app.exception';

function flatten(errors: ValidationError[], parentPath = ''): FieldError[] {
  return errors.flatMap((error) => {
    const path = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    const ownErrors: FieldError[] = error.constraints
      ? Object.values(error.constraints).map((message) => ({
          field: path,
          message,
        }))
      : [];
    const childErrors = error.children?.length
      ? flatten(error.children, path)
      : [];
    return [...ownErrors, ...childErrors];
  });
}

/**
 * Produces the exact §12.3 VALIDATION_FAILED shape (`fields: [...]`) —
 * Nest's default validation-error body doesn't match the envelope, so
 * AllExceptionsFilter would otherwise need to special-case it.
 */
export function validationExceptionFactory(
  errors: ValidationError[],
): AppException {
  return new AppException('VALIDATION_FAILED', undefined, flatten(errors));
}
