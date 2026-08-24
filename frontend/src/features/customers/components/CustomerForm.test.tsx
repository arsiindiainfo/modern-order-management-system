import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { CustomerForm } from './CustomerForm';
import { ToastProvider } from '../../../components/ui/ToastProvider';

function renderForm(onSubmit: (values: unknown) => Promise<unknown>) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <CustomerForm onSubmit={onSubmit} submitLabel="Create customer" />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('CustomerForm', () => {
  it('disables submit until name and email are valid', async () => {
    const user = userEvent.setup();
    renderForm(vi.fn());

    const submitButton = screen.getByRole('button', { name: /create customer/i });
    expect(submitButton).toBeDisabled();

    await user.type(screen.getByLabelText(/^name/i), 'Blue Sky Retail');
    await user.type(screen.getByLabelText(/^email/i), 'orders@blueskyretail.com');

    await waitFor(() => expect(submitButton).toBeEnabled());
  });

  it('submits the entered values', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm(onSubmit);

    await user.type(screen.getByLabelText(/^name/i), 'Blue Sky Retail');
    await user.type(screen.getByLabelText(/^email/i), 'orders@blueskyretail.com');
    await user.click(screen.getByRole('button', { name: /create customer/i }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Blue Sky Retail', email: 'orders@blueskyretail.com' }),
      ),
    );
  });

  it('maps a VALIDATION_FAILED fields[] response back onto the matching field', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue({
      statusCode: 400,
      code: 'VALIDATION_FAILED',
      message: 'One or more fields are invalid.',
      traceId: 'trace-1',
      fields: [{ field: 'email', message: 'email must be a valid email address' }],
    });
    renderForm(onSubmit);

    await user.type(screen.getByLabelText(/^name/i), 'Blue Sky Retail');
    await user.type(screen.getByLabelText(/^email/i), 'orders@blueskyretail.com');
    await user.click(screen.getByRole('button', { name: /create customer/i }));

    expect(await screen.findByText('email must be a valid email address')).toBeInTheDocument();
  });
});
