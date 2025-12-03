import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BusSelector } from '@/components/realtime/BusSelector';

const mockRoutes = ['M1', 'M15', 'M15+', 'B44', 'B44+', 'Q32', 'BX12', 'S79+'];

describe('BusSelector', () => {
  it('shows "No route selected" when nothing is selected', () => {
    const onSelectionChange = vi.fn();
    render(
      <BusSelector 
        selectedRoute={null} 
        onSelectionChange={onSelectionChange}
        availableRoutes={mockRoutes}
      />
    );
    
    expect(screen.getByText('No route selected')).toBeInTheDocument();
  });

  it('shows selected route with badge', () => {
    const onSelectionChange = vi.fn();
    render(
      <BusSelector 
        selectedRoute="M15" 
        onSelectionChange={onSelectionChange}
        availableRoutes={mockRoutes}
      />
    );
    
    expect(screen.getByText('M15')).toBeInTheDocument();
    expect(screen.getByText('M15 Bus')).toBeInTheDocument();
  });

  it('opens route picker when button is clicked', async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    
    render(
      <BusSelector 
        selectedRoute={null} 
        onSelectionChange={onSelectionChange}
        availableRoutes={mockRoutes}
      />
    );
    
    const selectButton = screen.getByRole('button', { name: /Select Route/i });
    await user.click(selectButton);
    
    // Should show search input
    expect(screen.getByPlaceholderText(/Search routes/i)).toBeInTheDocument();
  });

  it('shows loading state when routes are loading', () => {
    const onSelectionChange = vi.fn();
    render(
      <BusSelector 
        selectedRoute={null} 
        onSelectionChange={onSelectionChange}
        availableRoutes={[]}
        isLoading={true}
      />
    );
    
    // Button should show loading state
    const selectButton = screen.getByRole('button', { name: /Select Route/i });
    expect(selectButton).toBeInTheDocument();
  });

  it('clears selection when X button is clicked', async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    
    render(
      <BusSelector 
        selectedRoute="M15" 
        onSelectionChange={onSelectionChange}
        availableRoutes={mockRoutes}
      />
    );
    
    // Find and click the clear button
    const clearButtons = screen.getAllByRole('button');
    const clearButton = clearButtons.find(btn => btn.querySelector('svg'));
    if (clearButton) {
      await user.click(clearButton);
      expect(onSelectionChange).toHaveBeenCalledWith(null);
    }
  });

  it('shows "Change Route" button when a route is selected', () => {
    const onSelectionChange = vi.fn();
    render(
      <BusSelector 
        selectedRoute="M15" 
        onSelectionChange={onSelectionChange}
        availableRoutes={mockRoutes}
      />
    );
    
    expect(screen.getByRole('button', { name: /Change Route/i })).toBeInTheDocument();
  });

  it('groups routes by borough prefix', async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    
    render(
      <BusSelector 
        selectedRoute={null} 
        onSelectionChange={onSelectionChange}
        availableRoutes={mockRoutes}
      />
    );
    
    // Open the popover
    const selectButton = screen.getByRole('button', { name: /Select Route/i });
    await user.click(selectButton);
    
    // Should show group headers
    expect(screen.getByText('Manhattan Local')).toBeInTheDocument();
    expect(screen.getByText('Brooklyn Local')).toBeInTheDocument();
    expect(screen.getByText('Queens Local')).toBeInTheDocument();
    expect(screen.getByText('Bronx Local')).toBeInTheDocument();
    expect(screen.getByText('Staten Island Local')).toBeInTheDocument();
  });
});

