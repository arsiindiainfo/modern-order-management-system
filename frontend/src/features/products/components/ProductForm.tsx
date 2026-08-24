import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { FormField } from '../../../components/ui/FormField';
import { useToast } from '../../../components/ui/useToast';
import type { AppApiError } from '../../../lib/apiClient';
import type { Product } from '../types';

// One shape shared by create and edit so useForm/zodResolver see a single
// static type regardless of mode — `sku` is required only for create,
// enforced via .refine() (a type-level union would make the resolver's
// generic incompatible between the two modes).
const baseSchema = z.object({
  sku: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  unitPrice: z.coerce.number().positive('Must be a positive amount'),
  currency: z.string().length(3, 'Use a 3-letter currency code').optional(),
  initialStock: z.coerce.number().int().min(0).optional(),
  reorderLevel: z.coerce.number().int().min(0).optional(),
});

function buildSchema(mode: 'create' | 'edit') {
  return mode === 'create'
    ? baseSchema.refine((values) => !!values.sku && values.sku.length > 0, {
        message: 'SKU is required',
        path: ['sku'],
      })
    : baseSchema;
}

type ProductFormInput = z.input<typeof baseSchema>;
type ProductFormOutput = z.output<typeof baseSchema>;

export interface ProductFormProps {
  mode: 'create' | 'edit';
  initialValues?: Product;
  onSubmit: (values: ProductFormOutput) => Promise<unknown>;
  submitLabel: string;
}

export function ProductForm({ mode, initialValues, onSubmit, submitLabel }: ProductFormProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const isCreate = mode === 'create';

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isValid },
  } = useForm<ProductFormInput, unknown, ProductFormOutput>({
    resolver: zodResolver(buildSchema(mode)),
    mode: 'onChange',
    defaultValues: initialValues
      ? { name: initialValues.name, unitPrice: initialValues.unitPrice, currency: initialValues.currency }
      : { currency: 'USD', initialStock: 0, reorderLevel: 0 },
  });

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await onSubmit(values);
      showToast(isCreate ? 'Product created.' : 'Product updated.', 'success');
      void navigate('/products');
    } catch (err) {
      const apiError = err as AppApiError;
      if (apiError.fields?.length) {
        for (const field of apiError.fields) {
          setError(field.field as keyof ProductFormInput, { message: field.message });
        }
      } else {
        setFormError(apiError.message ?? 'Something went wrong. Please try again.');
      }
    }
  });

  return (
    <Box component="form" onSubmit={(e) => void submit(e)} noValidate sx={{ maxWidth: 480 }}>
      <Stack spacing={2.5}>
        {formError && <Alert severity="error">{formError}</Alert>}

        {isCreate && (
          <FormField name="sku" register={register} errors={errors} label="SKU" fullWidth required />
        )}
        <FormField name="name" register={register} errors={errors} label="Name" fullWidth required />
        <Stack direction="row" spacing={2}>
          <FormField
            name="unitPrice"
            register={register}
            errors={errors}
            label="Unit price"
            type="number"
            slotProps={{ htmlInput: { step: '0.01' } }}
            fullWidth
            required
          />
          <FormField
            name="currency"
            register={register}
            errors={errors}
            label="Currency"
            placeholder="USD"
            fullWidth
          />
        </Stack>

        {isCreate && (
          <>
            <Typography variant="subtitle2" color="text.secondary">
              Starting inventory
            </Typography>
            <Stack direction="row" spacing={2}>
              <FormField
                name="initialStock"
                register={register}
                errors={errors}
                label="Initial stock"
                type="number"
                fullWidth
              />
              <FormField
                name="reorderLevel"
                register={register}
                errors={errors}
                label="Reorder level"
                type="number"
                fullWidth
              />
            </Stack>
          </>
        )}

        <Stack direction="row" spacing={2} sx={{ pt: 1 }}>
          <Button type="submit" variant="contained" disabled={isSubmitting || !isValid}>
            {isSubmitting ? 'Saving…' : submitLabel}
          </Button>
          <Button onClick={() => void navigate('/products')} disabled={isSubmitting}>
            Cancel
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
