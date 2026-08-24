import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('names the record in the title and calls onConfirm/onCancel', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        open
        title="Deactivate Blue Sky Retail?"
        description="This can be reversed later."
        confirmLabel="Deactivate"
        destructive
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText('Deactivate Blue Sky Retail?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Deactivate' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when closed', () => {
    render(
      <ConfirmDialog open={false} title="Deactivate X?" onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.queryByText('Deactivate X?')).not.toBeInTheDocument();
  });

  it('disables the confirm/cancel buttons while submitting', () => {
    render(
      <ConfirmDialog
        open
        title="Deactivate X?"
        isSubmitting
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });
});
