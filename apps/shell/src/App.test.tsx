import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
  window.history.replaceState(null, '', '/maintenance');
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});

describe('shell', () => {
  it('marks the current section in the menu', () => {
    render(<App />);
    expect(screen.getByRole('link', { name: 'Maintenance' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Assets' })).not.toHaveAttribute('aria-current');
  });

  it('navigates with pushState instead of a full page load', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('link', { name: 'Live map' }));
    expect(window.location.pathname).toBe('/live-map');
  });

  it('switches to dark mode and remembers the choice', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Change theme' }));
    await userEvent.click(await screen.findByRole('menuitemcheckbox', { name: 'Dark' }));

    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('fleet-ops:theme')).toBe('dark');
  });
});
