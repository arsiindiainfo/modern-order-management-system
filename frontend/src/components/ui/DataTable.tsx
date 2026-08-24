import type { ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Pagination,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

export interface DataTableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  render: (row: T) => ReactNode;
}

export interface DataTableEmptyState {
  title: string;
  description?: string;
  action?: ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  emptyState: DataTableEmptyState;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  onSortChange?: (column: string) => void;
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  rowActions?: (row: T) => ReactNode;
}

const SKELETON_ROWS = 5;

/**
 * The shared design-system DataTable named in §4/§21: skeleton loading
 * (not a bare spinner), empty/error states, sortable headers, pagination,
 * and a table->card collapse below 768px — implemented once here.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  emptyState,
  sortBy,
  sortDir,
  onSortChange,
  page,
  pageSize,
  totalItems,
  onPageChange,
  rowActions,
}: DataTableProps<T>) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down(768));
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (isError) {
    return (
      <Alert
        severity="error"
        action={
          onRetry && (
            <Button color="inherit" size="small" startIcon={<RefreshIcon />} onClick={onRetry}>
              Retry
            </Button>
          )
        }
      >
        {errorMessage ?? 'Something went wrong loading this list.'}
      </Alert>
    );
  }

  if (!isLoading && rows.length === 0) {
    return (
      <Card variant="outlined" sx={{ textAlign: 'center', py: 6, px: 3 }}>
        <Typography variant="h6" gutterBottom>
          {emptyState.title}
        </Typography>
        {emptyState.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {emptyState.description}
          </Typography>
        )}
        {emptyState.action}
      </Card>
    );
  }

  if (isMobile) {
    return (
      <Stack spacing={1.5}>
        {isLoading
          ? Array.from({ length: SKELETON_ROWS }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={100} />
            ))
          : rows.map((row) => (
              <Card key={rowKey(row)} variant="outlined">
                <CardContent>
                  <Stack spacing={0.75}>
                    {columns.map((col) => (
                      <Box key={col.key} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          {col.label}
                        </Typography>
                        <Typography variant="body2" sx={{ textAlign: 'right' }}>
                          {col.render(row)}
                        </Typography>
                      </Box>
                    ))}
                    {rowActions && (
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>{rowActions(row)}</Box>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            ))}
        {totalPages > 1 && (
          <Pagination
            page={page}
            count={totalPages}
            onChange={(_, value) => onPageChange(value)}
            sx={{ display: 'flex', justifyContent: 'center', pt: 1 }}
          />
        )}
      </Stack>
    );
  }

  return (
    <Box>
      <TableContainer component={Card} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col.key} align={col.align ?? 'left'}>
                  {col.sortable && onSortChange ? (
                    <TableSortLabel
                      active={sortBy === col.key}
                      direction={sortBy === col.key ? sortDir : 'asc'}
                      onClick={() => onSortChange(col.key)}
                    >
                      {col.label}
                    </TableSortLabel>
                  ) : (
                    col.label
                  )}
                </TableCell>
              ))}
              {rowActions && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading
              ? Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((col) => (
                      <TableCell key={col.key}>
                        <Skeleton variant="text" />
                      </TableCell>
                    ))}
                    {rowActions && (
                      <TableCell>
                        <Skeleton variant="text" />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              : rows.map((row) => (
                  <TableRow key={rowKey(row)} hover>
                    {columns.map((col) => (
                      <TableCell key={col.key} align={col.align ?? 'left'}>
                        {col.render(row)}
                      </TableCell>
                    ))}
                    {rowActions && <TableCell align="right">{rowActions(row)}</TableCell>}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </TableContainer>
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2 }}>
          <Pagination page={page} count={totalPages} onChange={(_, value) => onPageChange(value)} />
        </Box>
      )}
    </Box>
  );
}

