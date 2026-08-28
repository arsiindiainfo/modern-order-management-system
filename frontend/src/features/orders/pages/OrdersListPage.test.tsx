import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { OrdersListPage } from './OrdersListPage';
import { useOrders } from '../hooks/useOrders';

vi.mock('../hooks/useOrders');

const mockedUseOrders = vi.mocked(useOrders);

function renderPage() {
  return render(
    <MemoryRouter>
      <OrdersListPage />
    </MemoryRouter>,
  );
}

describe('OrdersListPage', () => {
  it('shows skeleton placeholders while loading', () => {
    mockedUseOrders.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as never);

    const { container } = renderPage();
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
  });

  it('shows an error state with a working Retry action', async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    mockedUseOrders.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    } as never);

    renderPage();
    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state with a create-first-order action when there are no orders', () => {
    mockedUseOrders.mockReturnValue({
      data: { data: [], meta: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);

    renderPage();
    expect(screen.getByText('No orders yet')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /create your first order/i }),
    ).toBeInTheDocument();
  });

  it('renders order rows when data is present', () => {
    mockedUseOrders.mockReturnValue({
      data: {
        data: [
          {
            id: 'order-1',
            orderNumber: 'ORD-2026-000001',
            customerName: 'Blue Sky Retail',
            status: 'PENDING',
            grandTotal: 89.5,
            currency: 'USD',
            version: 1,
            placedAt: '2026-08-22T14:03:00Z',
          },
        ],
        meta: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);

    renderPage();
    expect(screen.getByText('ORD-2026-000001')).toBeInTheDocument();
    expect(screen.getByText('Blue Sky Retail')).toBeInTheDocument();
  });
});
