import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BusBadge } from '@/components/ui/BusBadge';

describe('BusBadge', () => {
  it('renders a Manhattan bus route', () => {
    render(<BusBadge route="M15" />);
    expect(screen.getByText('M15')).toBeInTheDocument();
  });

  it('renders a Brooklyn bus route', () => {
    render(<BusBadge route="B44" />);
    expect(screen.getByText('B44')).toBeInTheDocument();
  });

  it('renders a Queens bus route', () => {
    render(<BusBadge route="Q32" />);
    expect(screen.getByText('Q32')).toBeInTheDocument();
  });

  it('renders a Bronx bus route', () => {
    render(<BusBadge route="BX12" />);
    expect(screen.getByText('BX12')).toBeInTheDocument();
  });

  it('renders a Staten Island bus route', () => {
    render(<BusBadge route="S79+" />);
    expect(screen.getByText('S79+')).toBeInTheDocument();
  });

  it('renders an express bus route', () => {
    render(<BusBadge route="BXM1" />);
    expect(screen.getByText('BXM1')).toBeInTheDocument();
  });

  it('renders Select Bus Service routes with + suffix', () => {
    render(<BusBadge route="M15+" />);
    expect(screen.getByText('M15+')).toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<BusBadge route="M15" size="xs" />);
    expect(screen.getByText('M15')).toHaveClass('text-[9px]');

    rerender(<BusBadge route="M15" size="sm" />);
    expect(screen.getByText('M15')).toHaveClass('text-[10px]');

    rerender(<BusBadge route="M15" size="md" />);
    expect(screen.getByText('M15')).toHaveClass('text-xs');

    rerender(<BusBadge route="M15" size="lg" />);
    expect(screen.getByText('M15')).toHaveClass('text-sm');
  });

  it('includes title attribute with route info', () => {
    render(<BusBadge route="M15+" />);
    const badge = screen.getByText('M15+');
    expect(badge).toHaveAttribute('title', 'M15+ (Select Bus Service)');
  });

  it('abbreviates long express routes when abbreviated prop is true', () => {
    render(<BusBadge route="BXM10" abbreviated />);
    // BXM should be abbreviated to Bx
    expect(screen.getByText('Bx10')).toBeInTheDocument();
  });
});

