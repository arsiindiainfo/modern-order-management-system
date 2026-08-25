import { useState } from 'react';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DataTable, type DataTableColumn } from '../../../components/ui/DataTable';
import { useAuth } from '../../../app/useAuth';
import { useDiscounts } from '../hooks/useDiscounts';
import { CreateDiscountDialog } from '../components/CreateDiscountDialog';
import type { Discount } from '../types';

export function DiscountsListPage() {
  const { user } = useAuth();
  const canCreate = user?.role === 'TENANT_ADMIN';
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);

  const pageSize = 10;
  const { data, isLoading, isError, refetch } = useDiscounts({ page, pageSize });

  const isExpired = (discount: Discount) => new Date(discount.endsAt) < new Date();

  const columns: DataTableColumn<Discount>[] = [
    { key: 'code', label: 'Code', render: (d) => d.code },
    {
      key: 'value',
      label: 'Discount',
      render: (d) => (d.type === 'PERCENT' ? `${d.value}%` : `$${d.value.toFixed(2)}`),
    },
    {
      key: 'window',
      label: 'Valid window',
      render: (d) => `${new Date(d.startsAt).toLocaleDateString()} – ${new Date(d.endsAt).toLocaleDateString()}`,
    },
    {
      key: 'usage',
      label: 'Usage',
      render: (d) => `${d.timesUsed}${d.usageLimit ? ` / ${d.usageLimit}` : ''}`,
    },
    {
      key: 'status',
      label: 'Status',
      render: (d) => {
        const label = !d.isActive ? 'Inactive' : isExpired(d) ? 'Expired' : 'Active';
        const color = !d.isActive || isExpired(d) ? 'default' : 'success';
        return <Chip size="small" label={label} color={color} variant={color === 'success' ? 'filled' : 'outlined'} />;
      },
    },
  ];

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Discounts
        </Typography>
        {canCreate && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            New Discount
          </Button>
        )}
      </Stack>

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(d) => d.id}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        emptyState={{
          title: 'No discount codes yet',
          description: canCreate ? 'Create your first discount code to get started.' : undefined,
          action: canCreate ? (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
              Create your first discount
            </Button>
          ) : undefined,
        }}
        page={page}
        pageSize={pageSize}
        totalItems={data?.meta.totalItems ?? 0}
        onPageChange={setPage}
      />

      <CreateDiscountDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </Box>
  );
}
