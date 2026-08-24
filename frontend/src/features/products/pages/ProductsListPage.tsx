import { useState } from 'react';
import { Box, Button, Chip, IconButton, InputAdornment, Stack, TextField, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import { useNavigate } from 'react-router-dom';
import { DataTable, type DataTableColumn } from '../../../components/ui/DataTable';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { useToast } from '../../../components/ui/useToast';
import { useAuth } from '../../../app/useAuth';
import { useDeactivateProduct, useProducts } from '../hooks/useProducts';
import { AdjustInventoryDialog } from '../components/AdjustInventoryDialog';
import type { Product } from '../types';

export function ProductsListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const canEdit = user?.role === 'TENANT_ADMIN' || user?.role === 'MANAGER';
  const canDeactivate = user?.role === 'TENANT_ADMIN';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [pendingDeactivate, setPendingDeactivate] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);

  const pageSize = 10;
  const { data, isLoading, isError, refetch } = useProducts({ page, pageSize, search: search || undefined, sortBy, sortDir });
  const deactivateMutation = useDeactivateProduct();

  const handleSortChange = (column: string) => {
    if (sortBy === column) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
    setPage(1);
  };

  const confirmDeactivate = async () => {
    if (!pendingDeactivate) return;
    try {
      await deactivateMutation.mutateAsync(pendingDeactivate.id);
      showToast(`${pendingDeactivate.name} deactivated.`, 'success');
    } catch {
      showToast('Could not deactivate this product.', 'error');
    } finally {
      setPendingDeactivate(null);
    }
  };

  const columns: DataTableColumn<Product>[] = [
    { key: 'sku', label: 'SKU', sortable: true, render: (p) => p.sku },
    { key: 'name', label: 'Name', sortable: true, render: (p) => p.name },
    {
      key: 'unitPrice',
      label: 'Price',
      sortable: true,
      align: 'right',
      render: (p) => `${p.unitPrice.toFixed(2)} ${p.currency}`,
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (p) => (
        <Chip
          size="small"
          label={p.isActive ? 'Active' : 'Inactive'}
          color={p.isActive ? 'success' : 'default'}
          variant={p.isActive ? 'filled' : 'outlined'}
        />
      ),
    },
  ];

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Products
        </Typography>
        {canEdit && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => void navigate('/products/new')}>
            New Product
          </Button>
        )}
      </Stack>

      <TextField
        placeholder="Search by name or SKU…"
        size="small"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        sx={{ mb: 2, width: { xs: '100%', sm: 320 } }}
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
      />

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(p) => p.id}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        emptyState={{
          title: search ? 'No products match your search' : 'No products yet',
          description: search ? undefined : 'Create your first product to get started.',
          action: !search && canEdit ? (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => void navigate('/products/new')}>
              Create your first product
            </Button>
          ) : undefined,
        }}
        sortBy={sortBy}
        sortDir={sortDir}
        onSortChange={handleSortChange}
        page={page}
        pageSize={pageSize}
        totalItems={data?.meta.totalItems ?? 0}
        onPageChange={setPage}
        rowActions={
          canEdit || canDeactivate
            ? (p) => (
                <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                  {canEdit && (
                    <Tooltip title="Adjust stock">
                      <IconButton size="small" onClick={() => setAdjustingProduct(p)}>
                        <Inventory2OutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {canEdit && (
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => void navigate(`/products/${p.id}/edit`)}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {canDeactivate && p.isActive && (
                    <Tooltip title="Deactivate">
                      <IconButton size="small" color="error" onClick={() => setPendingDeactivate(p)}>
                        <BlockOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              )
            : undefined
        }
      />

      <ConfirmDialog
        open={pendingDeactivate !== null}
        title={`Deactivate ${pendingDeactivate?.name ?? 'this product'}?`}
        description="It will no longer appear in active lists. This can be reversed later by an administrator."
        confirmLabel="Deactivate"
        destructive
        isSubmitting={deactivateMutation.isPending}
        onConfirm={() => void confirmDeactivate()}
        onCancel={() => setPendingDeactivate(null)}
      />

      <AdjustInventoryDialog product={adjustingProduct} onClose={() => setAdjustingProduct(null)} />
    </Box>
  );
}
