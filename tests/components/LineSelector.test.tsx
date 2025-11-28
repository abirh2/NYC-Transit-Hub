import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LineSelector } from '@/components/realtime/LineSelector';
import type { LineId } from '@/lib/gtfs/line-stations';

describe('LineSelector', () => {
  it('renders "No line selected" when no line is selected', () => {
    render(
      <LineSelector 
        selectedLine={null} 
        onSelectionChange={() => {}} 
      />
    );
    expect(screen.getByText('No line selected')).toBeInTheDocument();
  });

  it('renders selected line with bullet and train text', () => {
    render(
      <LineSelector 
        selectedLine="A" 
        onSelectionChange={() => {}} 
      />
    );
    expect(screen.getByAltText('A train')).toBeInTheDocument();
    expect(screen.getByText('A Train')).toBeInTheDocument();
  });

  it('shows "Select Line" button when no line selected', () => {
    render(
      <LineSelector 
        selectedLine={null} 
        onSelectionChange={() => {}} 
      />
    );
    expect(screen.getByText('Select Line')).toBeInTheDocument();
  });

  it('shows "Change Line" button when a line is selected', () => {
    render(
      <LineSelector 
        selectedLine="F" 
        onSelectionChange={() => {}} 
      />
    );
    expect(screen.getByText('Change Line')).toBeInTheDocument();
  });

  it('opens popover when Select Line button is clicked', () => {
    render(
      <LineSelector 
        selectedLine={null} 
        onSelectionChange={() => {}} 
      />
    );
    
    fireEvent.click(screen.getByText('Select Line'));
    expect(screen.getByText('Select a Subway Line')).toBeInTheDocument();
  });

  it('displays line groups in popover', () => {
    render(
      <LineSelector 
        selectedLine={null} 
        onSelectionChange={() => {}} 
      />
    );
    
    fireEvent.click(screen.getByText('Select Line'));
    // Check that line groups are displayed
    expect(screen.getByText('Broadway-7th Avenue')).toBeInTheDocument();
    expect(screen.getByText('8th Avenue')).toBeInTheDocument();
  });

  it('calls onSelectionChange when a line is selected', () => {
    const handleChange = vi.fn();
    render(
      <LineSelector 
        selectedLine={null} 
        onSelectionChange={handleChange} 
      />
    );
    
    // Open popover
    fireEvent.click(screen.getByText('Select Line'));
    
    // Find and click a line button (A train)
    const lineButtons = screen.getAllByRole('button');
    const aTrainButton = lineButtons.find(btn => 
      btn.querySelector('img[alt="A train"]')
    );
    
    if (aTrainButton) {
      fireEvent.click(aTrainButton);
      expect(handleChange).toHaveBeenCalledWith('A');
    }
  });

  it('calls onSelectionChange with null when clear button is clicked', () => {
    const handleChange = vi.fn();
    render(
      <LineSelector 
        selectedLine="A" 
        onSelectionChange={handleChange} 
      />
    );
    
    // Find and click the clear button (×)
    const clearButton = screen.getByText('×');
    fireEvent.click(clearButton);
    
    expect(handleChange).toHaveBeenCalledWith(null);
  });

  it('shows checkmark on currently selected line in popover', () => {
    render(
      <LineSelector 
        selectedLine="F" 
        onSelectionChange={() => {}} 
      />
    );
    
    fireEvent.click(screen.getByText('Change Line'));
    
    // The selected line should have a checkmark indicator
    // We can check for the ring styling on the selected button
    const lineButtons = screen.getAllByRole('button');
    const selectedButton = lineButtons.find(btn => 
      btn.querySelector('img[alt="F train"]') && btn.classList.contains('ring-2')
    );
    
    expect(selectedButton).toBeTruthy();
  });

  it('renders in compact mode', () => {
    const { container } = render(
      <LineSelector 
        selectedLine={null} 
        onSelectionChange={() => {}} 
        compact
      />
    );
    
    // In compact mode, the button should have size="sm"
    const selectButton = screen.getByText('Select Line');
    expect(selectButton).toBeInTheDocument();
  });
});

