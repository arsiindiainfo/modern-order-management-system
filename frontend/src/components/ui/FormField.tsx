import { TextField, type TextFieldProps } from '@mui/material';
import type { FieldError, FieldErrors, FieldValues, Path, UseFormRegister } from 'react-hook-form';

export interface FormFieldProps<TFieldValues extends FieldValues>
  extends Omit<TextFieldProps, 'error' | 'name'> {
  name: Path<TFieldValues>;
  register: UseFormRegister<TFieldValues>;
  errors: FieldErrors<TFieldValues>;
}

/** Resolves a possibly-dotted path (e.g. "billingAddress.line1") against RHF's nested FieldErrors tree. */
function getNestedError(errors: unknown, path: string): FieldError | undefined {
  let current: unknown = errors;
  for (const part of path.split('.')) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current as FieldError | undefined;
}

/** Consistent error/helperText wiring for every RHF-bound field, including nested paths (same pattern LoginForm already used, extracted here). */
export function FormField<TFieldValues extends FieldValues>({
  name,
  register,
  errors,
  helperText,
  ...rest
}: FormFieldProps<TFieldValues>) {
  const error = getNestedError(errors, name);
  const message = typeof error?.message === 'string' ? error.message : undefined;

  return <TextField error={!!error} helperText={message ?? helperText} {...register(name)} {...rest} />;
}
