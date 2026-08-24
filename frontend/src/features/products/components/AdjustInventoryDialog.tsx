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
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { FormField } from '../../../components/ui/FormField';
import { useToast } from '../../../components/ui/useToast';
import type { AppApiError } from '../../../lib/apiClient';
import { useAdjustInventory, useProductInventory } from '../hooks/useProducts';
import type { Product } from '../types';

const adjustSchema = z.object({
  quantityDelta: z.coerce.number().int().refine((v) => v !== 0, 'Enter a non-zero amount'),
  reason: z.string().min(1, 'A reason is required'),
});

type AdjustFormInput = z.input<typeof adjustSchema>;
type AdjustFormOutput = z.output<typeof adjustSchema>;

export interface AdjustInventoryDialogProps {
  product: Product | null;
  onClose: () => void;
}

export function AdjustInventoryDialog({ product, onClose }: AdjustInventoryDialogProps) {
  const { showToast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const { data: inventory, isLoading } = useProductInventory(product?.id);
  const adjustMutation = useAdjustInventory(product?.id ?? '');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isValid },
  } = useForm<AdjustFormInput, unknown, AdjustFormOutput>({
    resolver: zodResolver(adjustSchema),
    mode: 'onChange',
  });

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await adjustMutation.mutateAsync(values);
      showToast(`Stock updated for ${product?.name}.`, 'success');
      reset();
      onClose();
    } catch (err) {
      const apiError = err as AppApiError;
      setFormError(apiError.message ?? 'Could not adjust inventory.');
    }
  });

  return (
    <Dialog open={product !== null} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Adjust stock — {product?.name}</DialogTitle>
      <Box component="form" onSubmit={(e) => void submit(e)} noValidate>
        <DialogContent>
          <Stack spacing={2}>
            {formError && <Alert severity="error">{formError}</Alert>}

            {isLoading ? (
              <Skeleton variant="text" width={200} />
            ) : (
              inventory && (
                <Typography variant="body2" color="text.secondary">
                  Currently {inventory.quantityAvailable} available ({inventory.quantityOnHand} on hand,{' '}
                  {inventory.quantityReserved} reserved) — reorder level {inventory.reorderLevel}.
                </Typography>
              )
            )}

            <FormField
              name="quantityDelta"
              register={register}
              errors={errors}
              label="Quantity change"
              type="number"
              helperText={errors.quantityDelta?.message ?? 'Positive to receive stock, negative to remove it'}
              fullWidth
              autoFocus
            />
            <FormField name="reason" register={register} errors={errors} label="Reason" fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting || !isValid}>
            {isSubmitting ? 'Saving…' : 'Apply'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
