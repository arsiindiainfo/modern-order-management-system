import { useForm } from 'react-hook-form';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OrderLineItemsEditor, type OrderLineItemsFormValues } from './OrderLineItemsEditor';
import { useProducts } from '../../products/hooks/useProducts';

vi.mock('../../products/hooks/useProducts');

const mockedUseProducts = vi.mocked(useProducts);

function Harness() {
  const { control, register, setValue, watch, formState } = useForm<OrderLineItemsFormValues>({
    defaultValues: {
      customerId: '',
      lines: [{ productId: '', productLabel: '', unitPrice: 0, quantity: 1 }],
    },
  });
  const lines = watch('lines');

  return (
    <OrderLineItemsEditor
      control={control}
      register={register}
      setValue={setValue}
      errors={formState.errors}
      lines={lines}
    />
  );
}

describe('OrderLineItemsEditor', () => {
  it('starts with one line whose remove button is disabled', () => {
    mockedUseProducts.mockReturnValue({ data: { data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 1 } }, isLoading: false } as never);
    render(<Harness />);

    expect(screen.getAllByLabelText('Remove line')).toHaveLength(1);
    expect(screen.getByLabelText('Remove line')).toBeDisabled();
  });

  it('adding a line enables removal, and removing brings it back to one', async () => {
    mockedUseProducts.mockReturnValue({ data: { data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 1 } }, isLoading: false } as never);
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: /add line/i }));
    const removeButtons = screen.getAllByLabelText('Remove line');
    expect(removeButtons).toHaveLength(2);
    expect(removeButtons[0]).toBeEnabled();

    await user.click(removeButtons[0]);
    expect(screen.getAllByLabelText('Remove line')).toHaveLength(1);
    expect(screen.getByLabelText('Remove line')).toBeDisabled();
  });

  it('shows the running subtotal computed from each line’s unitPrice × quantity', () => {
    mockedUseProducts.mockReturnValue({ data: { data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 1 } }, isLoading: false } as never);

    function HarnessWithPrefilledLines() {
      const { control, register, setValue, watch, formState } = useForm<OrderLineItemsFormValues>({
        defaultValues: {
          customerId: '',
          lines: [
            { productId: 'p1', productLabel: 'MUG-BLK-11OZ — Black Mug', unitPrice: 12.99, quantity: 2 },
            { productId: 'p2', productLabel: 'TOTE-CANVAS — Tote', unitPrice: 9.75, quantity: 1 },
          ],
        },
      });
      const lines = watch('lines');
      return (
        <OrderLineItemsEditor control={control} register={register} setValue={setValue} errors={formState.errors} lines={lines} />
      );
    }

    render(<HarnessWithPrefilledLines />);
    expect(screen.getByText('Subtotal: $35.73')).toBeInTheDocument();
  });
});
