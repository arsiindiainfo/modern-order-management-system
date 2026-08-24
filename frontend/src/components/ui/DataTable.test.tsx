import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DataTable, type DataTableColumn } from './DataTable';

interface Row {
  id: string;
  name: string;
}

const columns: DataTableColumn<Row>[] = [{ key: 'name', label: 'Name', sortable: true, render: (r) => r.name }];

const baseProps = {
  columns,
  rowKey: (r: Row) => r.id,
  isLoading: false,
  isError: false,
  emptyState: { title: 'No rows yet' },
  page: 1,
  pageSize: 10,
  totalItems: 0,
  onPageChange: vi.fn(),
};

describe('DataTable', () => {
  it('renders the empty state when there are no rows and not loading', () => {
    render(<DataTable {...baseProps} rows={[]} />);
    expect(screen.getByText('No rows yet')).toBeInTheDocument();
  });

  it('renders skeleton placeholders while loading', () => {
    const { container } = render(<DataTable {...baseProps} rows={[]} isLoading />);
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
  });

  it('renders an error state with a working Retry action', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<DataTable {...baseProps} rows={[]} isError errorMessage="Boom" onRetry={onRetry} />);

    expect(screen.getByText('Boom')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders row data and calls onSortChange when a sortable header is clicked', async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    render(
      <DataTable
        {...baseProps}
        rows={[{ id: '1', name: 'Blue Sky Retail' }]}
        totalItems={1}
        onSortChange={onSortChange}
      />,
    );

    expect(screen.getByText('Blue Sky Retail')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /name/i }));
    expect(onSortChange).toHaveBeenCalledWith('name');
  });
});
