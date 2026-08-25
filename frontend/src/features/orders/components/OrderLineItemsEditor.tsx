import { useState } from 'react';
import { Controller, useFieldArray } from 'react-hook-form';
import type { Control, FieldErrors, UseFormRegister, UseFormSetValue } from 'react-hook-form';
import { Autocomplete, Box, Button, IconButton, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { useProducts } from '../../products/hooks/useProducts';
import type { Product } from '../../products/types';

export interface OrderLineFormValues {
  productId: string;
  productLabel: string;
  unitPrice: number;
  quantity: number;
}

export interface OrderLineItemsFormValues {
  customerId: string;
  discountCode?: string;
  lines: OrderLineFormValues[];
}

const EMPTY_LINE: OrderLineFormValues = { productId: '', productLabel: '', unitPrice: 0, quantity: 1 };

interface OrderLineRowProps {
  control: Control<OrderLineItemsFormValues>;
  register: UseFormRegister<OrderLineItemsFormValues>;
  setValue: UseFormSetValue<OrderLineItemsFormValues>;
  index: number;
  error?: string;
  onRemove: () => void;
  removeDisabled: boolean;
}

function OrderLineRow({ control, register, setValue, index, error, onRemove, removeDisabled }: OrderLineRowProps) {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useProducts({ page: 1, pageSize: 20, search: search || undefined });
  const options = data?.data ?? [];
  // Kept separately from `options` (which is entirely search-text-driven)
  // so the selected product doesn't disappear from the Autocomplete's
  // `value` the moment the search text no longer matches it.
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'flex-start' } }}>
      <Controller
        control={control}
        name={`lines.${index}.productId`}
        render={({ field }) => (
          <Autocomplete<Product>
            sx={{ flexGrow: 1 }}
            options={options}
            loading={isLoading}
            getOptionLabel={(option) => `${option.sku} — ${option.name}`}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            value={selectedProduct}
            onInputChange={(_e, value, reason) => {
              // MUI also fires this when the input's displayed text is set
              // programmatically (e.g. right after selecting an option) —
              // only refetch on what the user actually typed.
              if (reason === 'input') setSearch(value);
            }}
            onChange={(_e, product) => {
              setSelectedProduct(product);
              field.onChange(product?.id ?? '');
              setValue(`lines.${index}.productLabel`, product ? `${product.sku} — ${product.name}` : '');
              setValue(`lines.${index}.unitPrice`, product?.unitPrice ?? 0);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Product"
                placeholder="Search by name or SKU…"
                error={!!error}
                helperText={error}
              />
            )}
          />
        )}
      />
      <TextField
        label="Quantity"
        type="number"
        sx={{ width: { xs: '100%', sm: 120 } }}
        slotProps={{ htmlInput: { min: 1 } }}
        {...register(`lines.${index}.quantity`, { valueAsNumber: true })}
      />
      <IconButton
        aria-label="Remove line"
        onClick={onRemove}
        disabled={removeDisabled}
        sx={{ mt: { sm: 1 } }}
      >
        <DeleteOutlineIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}

export interface OrderLineItemsEditorProps {
  control: Control<OrderLineItemsFormValues>;
  register: UseFormRegister<OrderLineItemsFormValues>;
  setValue: UseFormSetValue<OrderLineItemsFormValues>;
  errors: FieldErrors<OrderLineItemsFormValues>;
  lines: OrderLineFormValues[];
}

/** The product/quantity line-item builder for order creation (§21). Each line carries its own snapshotted unitPrice/productLabel so the running subtotal never needs a separate, possibly-stale product lookup. */
export function OrderLineItemsEditor({ control, register, setValue, errors, lines }: OrderLineItemsEditorProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
  const subtotal = lines.reduce((sum, line) => sum + (Number(line.unitPrice) || 0) * (Number(line.quantity) || 0), 0);

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        Line items
      </Typography>

      {typeof errors.lines?.message === 'string' && (
        <Typography variant="body2" color="error">
          {errors.lines.message}
        </Typography>
      )}

      <Stack spacing={2}>
        {fields.map((field, index) => (
          <OrderLineRow
            key={field.id}
            control={control}
            register={register}
            setValue={setValue}
            index={index}
            error={errors.lines?.[index]?.productId?.message}
            onRemove={() => remove(index)}
            removeDisabled={fields.length === 1}
          />
        ))}
      </Stack>

      <Button startIcon={<AddIcon />} onClick={() => append({ ...EMPTY_LINE })} sx={{ alignSelf: 'flex-start' }}>
        Add line
      </Button>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Subtotal: ${subtotal.toFixed(2)}
        </Typography>
      </Box>
    </Stack>
  );
}
