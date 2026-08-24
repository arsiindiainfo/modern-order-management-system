import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Box, Button, Divider, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { FormField } from '../../../components/ui/FormField';
import { useToast } from '../../../components/ui/useToast';
import type { AppApiError } from '../../../lib/apiClient';
import type { Customer, CustomerFormValues } from '../types';

// Every sub-field stays optional at the schema level — RHF initializes
// dot-path-registered nested fields ("billingAddress.line1", ...) to empty
// strings rather than leaving the parent `undefined`, so a required nested
// schema would permanently block submission for anyone who never touches
// the (optional) billing address. All-or-nothing is enforced below instead.
const addressSchema = z.object({
  line1: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});

const customerSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(150),
    email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
    phone: z.string().optional(),
    billingAddress: addressSchema.optional(),
  })
  .superRefine((values, ctx) => {
    const address = values.billingAddress;
    if (!address) return;

    const isBlank = (v: string | undefined) => !v || v.trim() === '';
    if (isBlank(address.line1) && isBlank(address.city) && isBlank(address.postalCode) && isBlank(address.country)) {
      return; // fully blank billing address — treated as "not provided"
    }

    if (isBlank(address.line1)) {
      ctx.addIssue({ code: 'custom', message: 'Address line is required', path: ['billingAddress', 'line1'] });
    }
    if (isBlank(address.city)) {
      ctx.addIssue({ code: 'custom', message: 'City is required', path: ['billingAddress', 'city'] });
    }
    if (isBlank(address.postalCode)) {
      ctx.addIssue({ code: 'custom', message: 'Postal code is required', path: ['billingAddress', 'postalCode'] });
    }
    if (address.country?.length !== 2) {
      ctx.addIssue({ code: 'custom', message: 'Use a 2-letter country code', path: ['billingAddress', 'country'] });
    }
  });

type CustomerFormSchema = z.infer<typeof customerSchema>;

export interface CustomerFormProps {
  initialValues?: Customer;
  onSubmit: (values: CustomerFormValues) => Promise<unknown>;
  submitLabel: string;
}

export function CustomerForm({ initialValues, onSubmit, submitLabel }: CustomerFormProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isValid },
  } = useForm<CustomerFormSchema>({
    resolver: zodResolver(customerSchema),
    mode: 'onChange',
    defaultValues: initialValues
      ? {
          name: initialValues.name,
          email: initialValues.email,
          phone: initialValues.phone ?? undefined,
          billingAddress: initialValues.billingAddress ?? undefined,
        }
      : undefined,
  });

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const billingAddress =
        values.billingAddress &&
        Object.values(values.billingAddress).some((v) => v && v.trim() !== '')
          ? {
              line1: values.billingAddress.line1!,
              city: values.billingAddress.city!,
              postalCode: values.billingAddress.postalCode!,
              country: values.billingAddress.country!,
            }
          : undefined;
      await onSubmit({ ...values, billingAddress });
      showToast(initialValues ? 'Customer updated.' : 'Customer created.', 'success');
      void navigate('/customers');
    } catch (err) {
      const apiError = err as AppApiError;
      if (apiError.fields?.length) {
        for (const field of apiError.fields) {
          setError(field.field as keyof CustomerFormSchema, { message: field.message });
        }
      } else {
        setFormError(apiError.message ?? 'Something went wrong. Please try again.');
      }
    }
  });

  return (
    <Box component="form" onSubmit={(e) => void submit(e)} noValidate sx={{ maxWidth: 520 }}>
      <Stack spacing={2.5}>
        {formError && <Alert severity="error">{formError}</Alert>}

        <FormField name="name" register={register} errors={errors} label="Name" fullWidth required />
        <FormField name="email" register={register} errors={errors} label="Email" type="email" fullWidth required />
        <FormField name="phone" register={register} errors={errors} label="Phone" fullWidth />

        <Divider />
        <Typography variant="subtitle2" color="text.secondary">
          Billing address (optional)
        </Typography>
        <FormField
          name="billingAddress.line1"
          register={register}
          errors={errors}
          label="Address line"
          fullWidth
        />
        <Stack direction="row" spacing={2}>
          <FormField
            name="billingAddress.city"
            register={register}
            errors={errors}
            label="City"
            fullWidth
          />
          <FormField
            name="billingAddress.postalCode"
            register={register}
            errors={errors}
            label="Postal code"
            fullWidth
          />
          <FormField
            name="billingAddress.country"
            register={register}
            errors={errors}
            label="Country"
            placeholder="GB"
            fullWidth
          />
        </Stack>

        <Stack direction="row" spacing={2} sx={{ pt: 1 }}>
          <Button type="submit" variant="contained" disabled={isSubmitting || !isValid}>
            {isSubmitting ? 'Saving…' : submitLabel}
          </Button>
          <Button onClick={() => void navigate('/customers')} disabled={isSubmitting}>
            Cancel
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
