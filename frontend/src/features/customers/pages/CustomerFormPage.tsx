import { Box, Skeleton, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { CustomerForm } from '../components/CustomerForm';
import { useCreateCustomer, useCustomer, useUpdateCustomer } from '../hooks/useCustomers';

export function CustomerFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;

  const { data: customer, isLoading } = useCustomer(id);
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer(id ?? '');

  if (isEdit && isLoading) {
    return <Skeleton variant="rounded" height={400} sx={{ maxWidth: 520 }} />;
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        {isEdit ? 'Edit Customer' : 'New Customer'}
      </Typography>
      <CustomerForm
        initialValues={customer}
        submitLabel={isEdit ? 'Save changes' : 'Create customer'}
        onSubmit={(values) =>
          isEdit ? updateMutation.mutateAsync(values) : createMutation.mutateAsync(values)
        }
      />
    </Box>
  );
}
