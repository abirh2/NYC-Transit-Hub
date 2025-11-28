import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SubwayBullet } from '@/components/ui/SubwayBullet';

describe('SubwayBullet', () => {
  it('renders with correct alt text', () => {
    render(<SubwayBullet line="F" />);
    expect(screen.getByAltText('F train')).toBeInTheDocument();
  });

  it('renders different line letters', () => {
    const { rerender } = render(<SubwayBullet line="A" />);
    expect(screen.getByAltText('A train')).toBeInTheDocument();

    rerender(<SubwayBullet line="7" />);
    expect(screen.getByAltText('7 train')).toBeInTheDocument();
  });

  it('applies correct size for sm', () => {
    const { container } = render(<SubwayBullet line="F" size="sm" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveStyle({ width: '20px', height: '20px' });
  });

  it('applies correct size for md (default)', () => {
    const { container } = render(<SubwayBullet line="F" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveStyle({ width: '24px', height: '24px' });
  });

  it('applies correct size for lg', () => {
    const { container } = render(<SubwayBullet line="F" size="lg" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveStyle({ width: '32px', height: '32px' });
  });

  it('applies custom className', () => {
    const { container } = render(<SubwayBullet line="F" className="custom-class" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('custom-class');
  });

  it('handles uppercase and lowercase line identifiers', () => {
    const { rerender } = render(<SubwayBullet line="f" />);
    expect(screen.getByAltText('f train')).toBeInTheDocument();

    rerender(<SubwayBullet line="F" />);
    expect(screen.getByAltText('F train')).toBeInTheDocument();
  });
});

