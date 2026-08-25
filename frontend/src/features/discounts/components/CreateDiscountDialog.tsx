import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
} from '@mui/material';
import { FormField } from '../../../components/ui/FormField';
import { useToast } from '../../../components/ui/useToast';
import type { AppApiError } from '../../../lib/apiClient';
import { useCreateDiscount } from '../hooks/useDiscounts';

const schema = z.object({
  code: z.string().min(1, 'A code is required'),
  type: z.enum(['PERCENT', 'FIXED']),
  value: z.number().positive('Enter a positive value'),
  startsAt: z.string().min(1, 'A start date is required'),
  endsAt: z.string().min(1, 'An end date is required'),
  // valueAsNumber turns a left-blank input into NaN, not undefined — which
  // z.number().optional() still rejects (NaN passes typeof number, but
  // Zod's own base check excludes it) — so an empty, genuinely-optional
  // field would otherwise leave the form permanently invalid.
  usageLimit: z.preprocess(
    (val) => (typeof val === 'number' && Number.isNaN(val) ? undefined : val),
    z.number().int().positive().optional(),
  ),
});
type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

export interface CreateDiscountDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateDiscountDialog({ open, onClose }: CreateDiscountDialogProps) {
  const { showToast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const createMutation = useCreateDiscount();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isValid },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { code: '', type: 'PERCENT', value: 10 },
  });

  const close = () => {
    reset();
    setFormError(null);
    onClose();
  };

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const discount = await createMutation.mutateAsync({
        ...values,
        startsAt: `${values.startsAt}T00:00:00Z`,
        endsAt: `${values.endsAt}T23:59:59Z`,
      });
      showToast(`Discount ${discount.code} created.`, 'success');
      close();
    } catch (err) {
      setFormError((err as AppApiError).message ?? 'Could not create this discount.');
    }
  });

  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth>
      <DialogTitle>New discount code</DialogTitle>
      <Box component="form" onSubmit={(e) => void submit(e)} noValidate>
        <DialogContent>
          <Stack spacing={2}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <FormField name="code" register={register} errors={errors} label="Code" fullWidth autoFocus />
            <FormField
              name="type"
              register={register}
              errors={errors}
              label="Type"
              select
              defaultValue="PERCENT"
              fullWidth
            >
              <MenuItem value="PERCENT">Percent off</MenuItem>
              <MenuItem value="FIXED">Fixed amount off</MenuItem>
            </FormField>
            <FormField
              name="value"
              register={register}
              registerOptions={{ valueAsNumber: true }}
              errors={errors}
              label="Value"
              type="number"
              slotProps={{ htmlInput: { step: '0.01' } }}
              fullWidth
            />
            <FormField
              name="startsAt"
              register={register}
              errors={errors}
              label="Starts on"
              type="date"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <FormField
              name="endsAt"
              register={register}
              errors={errors}
              label="Ends on"
              type="date"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <FormField
              name="usageLimit"
              register={register}
              registerOptions={{ valueAsNumber: true }}
              errors={errors}
              label="Usage limit"
              type="number"
              helperText="Optional — leave blank for unlimited uses"
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={close} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting || !isValid}>
            {isSubmitting ? 'Creating…' : 'Create discount'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
