import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Autocomplete, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useCustomers } from '../../customers/hooks/useCustomers';
import type { Customer } from '../../customers/types';
import { useToast } from '../../../components/ui/useToast';
import type { AppApiError } from '../../../lib/apiClient';
import { OrderLineItemsEditor, type OrderLineItemsFormValues } from '../components/OrderLineItemsEditor';
import { useCreateOrder } from '../hooks/useOrders';

const lineSchema = z.object({
  productId: z.string().min(1, 'Select a product'),
  productLabel: z.string(),
  unitPrice: z.number(),
  quantity: z.number().int().positive('Enter a quantity of at least 1'),
});

const createOrderSchema = z.object({
  customerId: z.string().min(1, 'Select a customer'),
  lines: z.array(lineSchema).min(1, 'Add at least one line item'),
});

export function OrderCreatePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  // Kept separately from `customerOptions` (entirely search-text-driven)
  // so the selected customer doesn't vanish from the Autocomplete's value
  // the moment the search text no longer matches it.
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const { data: customersData, isLoading: customersLoading } = useCustomers({
    page: 1,
    pageSize: 20,
    search: customerSearch || undefined,
  });
  const customerOptions = customersData?.data ?? [];
  const createMutation = useCreateOrder();

  const {
    control,
    register,
    setValue,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<OrderLineItemsFormValues>({
    resolver: zodResolver(createOrderSchema),
    mode: 'onChange',
    defaultValues: {
      customerId: '',
      lines: [{ productId: '', productLabel: '', unitPrice: 0, quantity: 1 }],
    },
  });

  const lines = watch('lines');

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const order = await createMutation.mutateAsync({
        customerId: values.customerId,
        lines: values.lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
      });
      showToast(`Order ${order.orderNumber} created.`, 'success');
      void navigate(`/orders/${order.id}`);
    } catch (err) {
      const apiError = err as AppApiError;
      setFormError(apiError.message ?? 'Could not create this order.');
    }
  });

  return (
    <Box sx={{ maxWidth: 720 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        New Order
      </Typography>

      <Card variant="outlined">
        <CardContent>
          <Box component="form" onSubmit={(e) => void submit(e)} noValidate>
            <Stack spacing={3}>
              {formError && <Alert severity="error">{formError}</Alert>}

              <Controller
                control={control}
                name="customerId"
                render={({ field }) => (
                  <Autocomplete<Customer>
                    options={customerOptions}
                    loading={customersLoading}
                    getOptionLabel={(option) => `${option.name} (${option.email})`}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    value={selectedCustomer}
                    onInputChange={(_e, value, reason) => {
                      if (reason === 'input') setCustomerSearch(value);
                    }}
                    onChange={(_e, customer) => {
                      setSelectedCustomer(customer);
                      field.onChange(customer?.id ?? '');
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Customer"
                        placeholder="Search by name or email…"
                        error={!!errors.customerId}
                        helperText={errors.customerId?.message}
                      />
                    )}
                  />
                )}
              />

              <OrderLineItemsEditor
                control={control}
                register={register}
                setValue={setValue}
                errors={errors}
                lines={lines}
              />

              <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
                <Button onClick={() => void navigate('/orders')} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" variant="contained" disabled={isSubmitting || !isValid}>
                  {isSubmitting ? 'Creating…' : 'Create order'}
                </Button>
              </Stack>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
