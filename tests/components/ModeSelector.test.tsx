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

  it('shows selected mode as active', () => {
    const onModeChange = vi.fn();
    render(
      <ModeSelector 
        selectedMode="bus" 
        onModeChange={onModeChange} 
      />
    );
    
    // The Bus tab should be selected
    const busTab = screen.getByRole('tab', { name: /bus/i });
    expect(busTab).toHaveAttribute('aria-selected', 'true');
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
    
    const busTab = screen.getByRole('tab', { name: /bus/i });
    await user.click(busTab);
    
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
});

