import { useState } from 'react';
import { Box, Button, Chip, IconButton, InputAdornment, Stack, TextField, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PersonOffOutlinedIcon from '@mui/icons-material/PersonOffOutlined';
import { useNavigate } from 'react-router-dom';
import { DataTable, type DataTableColumn } from '../../../components/ui/DataTable';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { useToast } from '../../../components/ui/useToast';
import { useAuth } from '../../../app/useAuth';
import { useCustomers, useDeactivateCustomer } from '../hooks/useCustomers';
import type { Customer } from '../types';

export function CustomersListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const canEdit = user?.role === 'TENANT_ADMIN' || user?.role === 'MANAGER';
  const canDeactivate = user?.role === 'TENANT_ADMIN';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [pendingDeactivate, setPendingDeactivate] = useState<Customer | null>(null);

  const pageSize = 10;
  const { data, isLoading, isError, refetch } = useCustomers({ page, pageSize, search: search || undefined, sortBy, sortDir });
  const deactivateMutation = useDeactivateCustomer();

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
      showToast('Could not deactivate this customer.', 'error');
    } finally {
      setPendingDeactivate(null);
    }
  };

  const columns: DataTableColumn<Customer>[] = [
    { key: 'name', label: 'Name', sortable: true, render: (c) => c.name },
    { key: 'email', label: 'Email', sortable: true, render: (c) => c.email },
    { key: 'phone', label: 'Phone', render: (c) => c.phone ?? '—' },
    {
      key: 'isActive',
      label: 'Status',
      render: (c) => (
        <Chip
          size="small"
          label={c.isActive ? 'Active' : 'Inactive'}
          color={c.isActive ? 'success' : 'default'}
          variant={c.isActive ? 'filled' : 'outlined'}
        />
      ),
    },
  ];

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Customers
        </Typography>
        {canEdit && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => void navigate('/customers/new')}>
            New Customer
          </Button>
        )}
      </Stack>

      <TextField
        placeholder="Search by name or email…"
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
        rowKey={(c) => c.id}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        emptyState={{
          title: search ? 'No customers match your search' : 'No customers yet',
          description: search ? undefined : 'Create your first customer to get started.',
          action: !search && canEdit ? (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => void navigate('/customers/new')}>
              Create your first customer
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
            ? (c) => (
                <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                  {canEdit && (
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => void navigate(`/customers/${c.id}/edit`)}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {canDeactivate && c.isActive && (
                    <Tooltip title="Deactivate">
                      <IconButton size="small" color="error" onClick={() => setPendingDeactivate(c)}>
                        <PersonOffOutlinedIcon fontSize="small" />
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
        title={`Deactivate ${pendingDeactivate?.name ?? 'this customer'}?`}
        description="They will no longer appear in active lists. This can be reversed later by an administrator."
        confirmLabel="Deactivate"
        destructive
        isSubmitting={deactivateMutation.isPending}
        onConfirm={() => void confirmDeactivate()}
        onCancel={() => setPendingDeactivate(null)}
      />
    </Box>
  );
}
