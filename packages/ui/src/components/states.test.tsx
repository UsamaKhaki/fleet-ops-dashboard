import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState, ErrorState } from './states';

describe('ErrorState', () => {
  it('is announced as an alert and calls onRetry', async () => {
    const onRetry = vi.fn();
    render(<ErrorState description="The server is down" onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('The server is down');
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('disables retry while a retry is running', () => {
    render(<ErrorState onRetry={() => {}} isRetrying />);
    expect(screen.getByRole('button', { name: /try again/i })).toBeDisabled();
  });
});

describe('EmptyState', () => {
  it('renders the optional action', () => {
    render(<EmptyState title="No assets" action={<button>Clear filters</button>} />);
    expect(screen.getByText('No assets')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
  });
});
