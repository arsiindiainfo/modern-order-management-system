import { useState } from 'react';
import { Box, Button, InputAdornment, MenuItem, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';
import { DataTable, type DataTableColumn } from '../../../components/ui/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { useOrders } from '../hooks/useOrders';
import type { OrderListItem, OrderStatus } from '../types';

const STATUS_FILTERS: { value: OrderStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export function OrdersListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [sortBy, setSortBy] = useState('placedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const pageSize = 10;
  const { data, isLoading, isError, refetch } = useOrders({
    page,
    pageSize,
    search: search || undefined,
    status: status || undefined,
    sortBy,
    sortDir,
  });

  const handleSortChange = (column: string) => {
    if (sortBy === column) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
    setPage(1);
  };

  const columns: DataTableColumn<OrderListItem>[] = [
    { key: 'orderNumber', label: 'Order #', sortable: true, render: (o) => o.orderNumber },
    { key: 'customerName', label: 'Customer', sortable: true, render: (o) => o.customerName },
    { key: 'status', label: 'Status', sortable: true, render: (o) => <StatusBadge status={o.status} /> },
    {
      key: 'grandTotal',
      label: 'Total',
      sortable: true,
      align: 'right',
      render: (o) => `${o.grandTotal.toFixed(2)} ${o.currency}`,
    },
    {
      key: 'placedAt',
      label: 'Placed',
      sortable: true,
      render: (o) => new Date(o.placedAt).toLocaleDateString(),
    },
  ];

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Orders
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => void navigate('/orders/new')}>
          New Order
        </Button>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          placeholder="Search by order # or customer…"
          size="small"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          sx={{ width: { xs: '100%', sm: 320 } }}
          slotProps={{
            input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> },
          }}
        />
        <TextField
          select
          size="small"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as OrderStatus | '');
            setPage(1);
          }}
          sx={{ width: { xs: '100%', sm: 200 } }}
        >
          {STATUS_FILTERS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(o) => o.id}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        emptyState={{
          title: search || status ? 'No orders match your filters' : 'No orders yet',
          description: search || status ? undefined : 'Create your first order to get started.',
          action:
            !search && !status ? (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => void navigate('/orders/new')}>
                Create your first order
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
        rowActions={(o) => (
          <Button size="small" onClick={() => void navigate(`/orders/${o.id}`)}>
            View
          </Button>
        )}
      />
    </Box>
  );
}
