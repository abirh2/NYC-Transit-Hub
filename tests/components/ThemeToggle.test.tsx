import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

// Override the mock for this specific test file
vi.mock('next-themes', () => {
  let currentTheme = 'dark';
  return {
    useTheme: () => ({
      theme: currentTheme,
      setTheme: (theme: string) => {
        currentTheme = theme;
      },
      resolvedTheme: currentTheme,
    }),
  };
});

describe('ThemeToggle', () => {
  it('renders a button', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('has accessible label', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label');
  });

  it('shows sun icon in dark mode', () => {
    render(<ThemeToggle />);
    // The toggle should show sun icon when in dark mode (to switch to light)
    expect(screen.getByLabelText(/switch to light mode/i)).toBeInTheDocument();
  });
});

