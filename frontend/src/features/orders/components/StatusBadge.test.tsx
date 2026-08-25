import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it.each([
    ['PENDING', 'Pending'],
    ['ON_HOLD', 'On Hold'],
    ['SHIPPED', 'Shipped'],
    ['CANCELLED', 'Cancelled'],
  ] as const)('renders a readable label for %s', (status, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('renders an icon alongside the label, not color alone (§21 accessibility)', () => {
    render(<StatusBadge status="ON_HOLD" />);
    const chip = screen.getByText('On Hold').closest('.MuiChip-root');
    expect(chip?.querySelector('.MuiChip-icon')).not.toBeNull();
  });
});
