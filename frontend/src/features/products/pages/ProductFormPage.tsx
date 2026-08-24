import { Box, Skeleton, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { ProductForm } from '../components/ProductForm';
import { useCreateProduct, useProduct, useUpdateProduct } from '../hooks/useProducts';
import type { CreateProductFormValues, UpdateProductFormValues } from '../types';

export function ProductFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;

  const { data: product, isLoading } = useProduct(id);
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct(id ?? '');

  if (isEdit && isLoading) {
    return <Skeleton variant="rounded" height={360} sx={{ maxWidth: 480 }} />;
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        {isEdit ? 'Edit Product' : 'New Product'}
      </Typography>
      <ProductForm
        mode={isEdit ? 'edit' : 'create'}
        initialValues={product}
        submitLabel={isEdit ? 'Save changes' : 'Create product'}
        onSubmit={(values) =>
          isEdit
            ? updateMutation.mutateAsync(values as UpdateProductFormValues)
            : createMutation.mutateAsync(values as CreateProductFormValues)
        }
      />
    </Box>
  );
}
