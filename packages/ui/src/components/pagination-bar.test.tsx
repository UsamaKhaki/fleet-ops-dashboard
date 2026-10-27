import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PaginationBar } from './pagination-bar';

const props = {
  pageSizeOptions: [50, 100],
  onPageSizeChange: vi.fn(),
};

describe('PaginationBar', () => {
  it('shows the visible range and disables moving past the last page', async () => {
    const onPageChange = vi.fn();
    render(
      <PaginationBar {...props} page={3} pageSize={50} total={120} onPageChange={onPageChange} />,
    );

    expect(screen.getByText('Showing 101–120 of 120')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('handles an empty result', () => {
    render(<PaginationBar {...props} page={1} pageSize={50} total={0} onPageChange={vi.fn()} />);
    expect(screen.getByText('No results')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
  });
});
