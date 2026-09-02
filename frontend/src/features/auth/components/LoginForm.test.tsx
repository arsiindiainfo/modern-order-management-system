import { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { LoginForm } from './LoginForm';
import { Recaptcha } from './Recaptcha';
import { useAuth } from '../hooks/useAuth';
import type { AppApiError } from '../../../lib/apiClient';

vi.mock('../hooks/useAuth');

// The real widget loads Google's script over the network, which jsdom
// can't do — auto-verify on mount so every test below behaves as if a
// human had already solved the checkbox, unless a test overrides this
// per-case (see "does not enable submit until reCAPTCHA is solved").
vi.mock('./Recaptcha', () => ({
  Recaptcha: ({ onVerify }: { onVerify: (token: string | null) => void }) => {
    useEffect(() => {
      onVerify('mock-recaptcha-token');
    }, [onVerify]);
    return null;
  },
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedRecaptcha = vi.mocked(Recaptcha);

function mockAuth(login: (email: string, password: string) => Promise<void>) {
  mockedUseAuth.mockReturnValue({
    user: null,
    isLoading: false,
    login,
    logout: vi.fn(),
  });
}

function setup(login: (email: string, password: string) => Promise<void>) {
  mockAuth(login);
  return render(
    <MemoryRouter>
      <LoginForm />
    </MemoryRouter>,
  );
}

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
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

  it('navigates to / after a successful login', async () => {
    const user = userEvent.setup();
    mockAuth(vi.fn().mockResolvedValue(undefined));
    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginForm />
        <LocationDisplay />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'correct-password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/'));
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

  it('does not enable submit until reCAPTCHA is solved', async () => {
    const user = userEvent.setup();
    mockedRecaptcha.mockImplementationOnce(() => null); // never calls onVerify
    setup(vi.fn());

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secret');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await waitFor(() => expect(submitButton).toBeDisabled());
  });

  it('autofills the demo credentials and enables submit when "Demo login" is clicked', async () => {
    const user = userEvent.setup();
    setup(vi.fn());

    await user.click(screen.getByRole('button', { name: /demo login/i }));

    expect(screen.getByLabelText(/email/i)).toHaveValue('manager@acme-demo.com');
    expect(screen.getByLabelText(/password/i)).toHaveValue('DemoPass123!');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^sign in$/i })).toBeEnabled(),
    );
  });
});
