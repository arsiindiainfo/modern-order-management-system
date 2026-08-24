import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LoginForm } from './LoginForm';
import { useAuth } from '../hooks/useAuth';
import type { AppApiError } from '../../../lib/apiClient';

vi.mock('../hooks/useAuth');

const mockedUseAuth = vi.mocked(useAuth);

function setup(login: (email: string, password: string) => Promise<void>) {
  mockedUseAuth.mockReturnValue({
    user: null,
    isLoading: false,
    login,
    logout: vi.fn(),
  });
  return render(<LoginForm />);
}

describe('LoginForm', () => {
  it('disables submit until the form is valid', async () => {
    const user = userEvent.setup();
    setup(vi.fn());

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    expect(submitButton).toBeDisabled();

    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    expect(submitButton).toBeDisabled();

    await user.clear(screen.getByLabelText(/email/i));
    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secret');

    await waitFor(() => expect(submitButton).toBeEnabled());
  });

  it('shows an inline error for an invalid email on blur', async () => {
    const user = userEvent.setup();
    setup(vi.fn());

    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.tab();

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
  });

  it('shows a generic alert when login rejects with INVALID_CREDENTIALS', async () => {
    const user = userEvent.setup();
    const error: AppApiError = {
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Email or password is incorrect.',
      traceId: 'trace-1',
    };
    setup(vi.fn().mockRejectedValue(error));

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(
      await screen.findByText('Email or password is incorrect.'),
    ).toBeInTheDocument();
  });

  it('maps a VALIDATION_FAILED fields[] response back onto the matching field', async () => {
    const user = userEvent.setup();
    const error: AppApiError = {
      statusCode: 400,
      code: 'VALIDATION_FAILED',
      message: 'One or more fields are invalid.',
      traceId: 'trace-2',
      fields: [{ field: 'password', message: 'password must be at least 8 characters' }],
    };
    setup(vi.fn().mockRejectedValue(error));

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'short');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(
      await screen.findByText('password must be at least 8 characters'),
    ).toBeInTheDocument();
  });
});
