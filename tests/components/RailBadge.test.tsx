import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RailBadge } from '@/components/ui/RailBadge';

describe('RailBadge', () => {
  it('renders LIRR branch name', () => {
    render(
      <RailBadge 
        branchId="1" 
        branchName="Babylon" 
        mode="lirr" 
      />
    );
    expect(screen.getByText('Babylon')).toBeInTheDocument();
  });

  it('renders Metro-North line name', () => {
    render(
      <RailBadge 
        branchId="1" 
        branchName="Hudson" 
        mode="metro-north" 
      />
    );
    expect(screen.getByText('Hudson')).toBeInTheDocument();
  });

  it('renders abbreviated name when abbreviated prop is true', () => {
    render(
      <RailBadge 
        branchId="1" 
        branchName="Babylon" 
        mode="lirr" 
        abbreviated 
      />
    );
    expect(screen.getByText('BAB')).toBeInTheDocument();
  });

  it('includes title attribute with full branch info', () => {
    render(
      <RailBadge 
        branchId="1" 
        branchName="Babylon" 
        mode="lirr" 
      />
    );
    const badge = screen.getByText('Babylon');
    expect(badge).toHaveAttribute('title', 'Babylon Branch');
  });

  it('includes title attribute for Metro-North lines', () => {
    render(
      <RailBadge 
        branchId="1" 
        branchName="Hudson" 
        mode="metro-north" 
      />
    );
    const badge = screen.getByText('Hudson');
    expect(badge).toHaveAttribute('title', 'Hudson Line');
  });

  it('applies correct size classes', () => {
    const { rerender } = render(
      <RailBadge branchId="1" branchName="Babylon" mode="lirr" size="xs" />
    );
    expect(screen.getByText('Babylon')).toHaveClass('text-[9px]');

    rerender(
      <RailBadge branchId="1" branchName="Babylon" mode="lirr" size="lg" />
    );
    expect(screen.getByText('Babylon')).toHaveClass('text-sm');
  });

  it('handles unknown branch names in abbreviation', () => {
    render(
      <RailBadge 
        branchId="99" 
        branchName="Unknown Branch" 
        mode="lirr" 
        abbreviated 
      />
    );
    // Should show first 3 characters
    expect(screen.getByText('UNK')).toBeInTheDocument();
  });
});

