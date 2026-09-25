import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModeSelector } from '@/components/realtime/ModeSelector';

describe('ModeSelector', () => {
  it('renders all transit mode tabs', () => {
    const onModeChange = vi.fn();
    render(
      <ModeSelector 
        selectedMode="subway" 
        onModeChange={onModeChange} 
      />
    );
    
    expect(screen.getByText('Subway')).toBeInTheDocument();
    expect(screen.getByText('Bus')).toBeInTheDocument();
    expect(screen.getByText('LIRR')).toBeInTheDocument();
    expect(screen.getByText('Metro-North')).toBeInTheDocument();
  });

  // ModeSelector is built on the shared SegmentedControl, so it exposes the
  // WAI-ARIA radio-group pattern rather than a tab list.
  it('exposes a labelled radiogroup', () => {
    const onModeChange = vi.fn();
    render(
      <ModeSelector 
        selectedMode="subway" 
        onModeChange={onModeChange} 
      />
    );

    expect(
      screen.getByRole('radiogroup', { name: /transit mode/i })
    ).toBeInTheDocument();
  });

  it('shows selected mode as active', () => {
    const onModeChange = vi.fn();
    render(
      <ModeSelector 
        selectedMode="bus" 
        onModeChange={onModeChange} 
      />
    );
    
    const busOption = screen.getByRole('radio', { name: /bus/i });
    expect(busOption).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onModeChange when a different mode is selected', async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();
    
    render(
      <ModeSelector 
        selectedMode="subway" 
        onModeChange={onModeChange} 
      />
    );
    
    await user.click(screen.getByRole('radio', { name: /bus/i }));
    
    expect(onModeChange).toHaveBeenCalledWith('bus');
  });

  it('moves selection with the arrow keys', async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();

    render(
      <ModeSelector 
        selectedMode="subway" 
        onModeChange={onModeChange} 
      />
    );

    await user.tab();
    await user.keyboard('{ArrowRight}');

    expect(onModeChange).toHaveBeenCalledWith('bus');
  });

  it('renders only specified available modes', () => {
    const onModeChange = vi.fn();
    render(
      <ModeSelector 
        selectedMode="subway" 
        onModeChange={onModeChange}
        availableModes={['subway', 'bus']}
      />
    );
    
    expect(screen.getByText('Subway')).toBeInTheDocument();
    expect(screen.getByText('Bus')).toBeInTheDocument();
    expect(screen.queryByText('LIRR')).not.toBeInTheDocument();
    expect(screen.queryByText('Metro-North')).not.toBeInTheDocument();
  });

  it('renders in compact mode with shorter labels', () => {
    const onModeChange = vi.fn();
    render(
      <ModeSelector 
        selectedMode="subway" 
        onModeChange={onModeChange}
        compact
      />
    );
    
    // In compact mode, Metro-North should show as MNR
    expect(screen.getByText('MNR')).toBeInTheDocument();
  });

  it('keeps compact mode controls at the iPhone touch-target floor', () => {
    render(
      <ModeSelector
        selectedMode="subway"
        onModeChange={vi.fn()}
        compact
      />
    );

    expect(screen.getByRole('radiogroup', { name: /transit mode/i }))
      .toHaveClass('max-w-full');
    for (const option of screen.getAllByRole('radio')) {
      expect(option).toHaveClass('min-h-[44px]');
    }
  });
});
