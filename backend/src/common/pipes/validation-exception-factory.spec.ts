import { ValidationError } from '@nestjs/common';
import { validationExceptionFactory } from './validation-exception-factory';
import { AppException } from '../exceptions/app.exception';

function error(
  property: string,
  constraints: Record<string, string>,
  children: ValidationError[] = [],
): ValidationError {
  return { property, constraints, children, target: {}, value: undefined };
}

describe('validationExceptionFactory', () => {
  it('produces a VALIDATION_FAILED AppException with a flattened fields array', () => {
    const errors = [
      error('email', { isEmail: 'email must be a valid email address' }),
      error('quantity', { isPositive: 'quantity must be a positive integer' }),
    ];

    const exception = validationExceptionFactory(errors);

    expect(exception).toBeInstanceOf(AppException);
    expect(exception.code).toBe('VALIDATION_FAILED');
    expect(exception.fields).toEqual([
      { field: 'email', message: 'email must be a valid email address' },
      { field: 'quantity', message: 'quantity must be a positive integer' },
    ]);
  });

  it('flattens nested (dot-path) child errors', () => {
    const errors = [
      error('address', {}, [
        error('postalCode', { isNotEmpty: 'postalCode should not be empty' }),
      ]),
    ];

    const exception = validationExceptionFactory(errors);

    expect(exception.fields).toEqual([
      {
        field: 'address.postalCode',
        message: 'postalCode should not be empty',
      },
    ]);
  });

  it('emits one field entry per failed constraint on the same property', () => {
    const errors = [
      error('password', {
        minLength: 'password must be at least 8 characters',
        matches: 'password must contain a number',
      }),
    ];

    const exception = validationExceptionFactory(errors);

    expect(exception.fields).toHaveLength(2);
    expect(exception.fields?.every((f) => f.field === 'password')).toBe(true);
  });
});
