import { useState } from 'react';
import { Box, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { DataTable, type DataTableColumn } from '../../../components/ui/DataTable';
import { useAudit } from '../hooks/useAudit';
import type { AuditEntry } from '../types';

const ENTITY_FILTERS = ['', 'Order', 'Customer', 'Product', 'Payment', 'Shipment', 'Discount'];

const ACTION_COLOR: Record<string, 'success' | 'info' | 'error'> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'error',
};

export function AuditListPage() {
  const [page, setPage] = useState(1);
  const [entityName, setEntityName] = useState('');

  const pageSize = 15;
  const { data, isLoading, isError, refetch } = useAudit({
    page,
    pageSize,
    entityName: entityName || undefined,
  });

  const columns: DataTableColumn<AuditEntry>[] = [
    { key: 'entityName', label: 'Entity', render: (e) => e.entityName },
    {
      key: 'action',
      label: 'Action',
      render: (e) => <Chip size="small" label={e.action} color={ACTION_COLOR[e.action] ?? 'default'} />,
    },
    { key: 'entityId', label: 'Entity ID', render: (e) => e.entityId },
    { key: 'changedBy', label: 'Changed by', render: (e) => e.changedBy ?? 'System' },
    { key: 'changedAt', label: 'When', render: (e) => new Date(e.changedAt).toLocaleString() },
  ];

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Audit Log
        </Typography>
      </Stack>

      <TextField
        select
        size="small"
        value={entityName}
        onChange={(e) => {
          setEntityName(e.target.value);
          setPage(1);
        }}
        sx={{ mb: 2, width: { xs: '100%', sm: 200 } }}
        label="Entity"
      >
        {ENTITY_FILTERS.map((option) => (
          <MenuItem key={option} value={option}>
            {option || 'All entities'}
          </MenuItem>
        ))}
      </TextField>

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(e) => `${e.entityName}-${e.entityId}-${e.changedAt}`}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        emptyState={{ title: 'No audit entries yet' }}
        page={page}
        pageSize={pageSize}
        totalItems={data?.meta.totalItems ?? 0}
        onPageChange={setPage}
      />
    </Box>
  );
}
