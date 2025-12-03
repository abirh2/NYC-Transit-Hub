import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RailSelector } from '@/components/realtime/RailSelector';

const mockLirrBranches = [
  { id: '1', name: 'Babylon' },
  { id: '9', name: 'Port Washington' },
  { id: '10', name: 'Ronkonkoma' },
];

const mockMnrLines = [
  { id: '1', name: 'Hudson' },
  { id: '2', name: 'Harlem' },
  { id: '3', name: 'New Haven' },
];

describe('RailSelector', () => {
  describe('LIRR mode', () => {
    it('shows "No LIRR branch selected" when nothing is selected', () => {
      const onSelectionChange = vi.fn();
      render(
        <RailSelector 
          mode="lirr"
          selectedBranch={null} 
          onSelectionChange={onSelectionChange}
          availableBranches={mockLirrBranches}
        />
      );
      
      expect(screen.getByText(/No lirr branch selected/i)).toBeInTheDocument();
    });

    it('shows selected branch with badge', () => {
      const onSelectionChange = vi.fn();
      render(
        <RailSelector 
          mode="lirr"
          selectedBranch="1" 
          onSelectionChange={onSelectionChange}
          availableBranches={mockLirrBranches}
        />
      );
      
      // Branch name appears in both badge and text, just verify it's there
      expect(screen.getAllByText('Babylon').length).toBeGreaterThan(0);
    });

    it('shows "Select Branch" button for LIRR', () => {
      const onSelectionChange = vi.fn();
      render(
        <RailSelector 
          mode="lirr"
          selectedBranch={null} 
          onSelectionChange={onSelectionChange}
          availableBranches={mockLirrBranches}
        />
      );
      
      expect(screen.getByRole('button', { name: /Select Branch/i })).toBeInTheDocument();
    });

    it('opens branch picker when button is clicked', async () => {
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();
      
      render(
        <RailSelector 
          mode="lirr"
          selectedBranch={null} 
          onSelectionChange={onSelectionChange}
          availableBranches={mockLirrBranches}
        />
      );
      
      const selectButton = screen.getByRole('button', { name: /Select Branch/i });
      await user.click(selectButton);
      
      // Should show branches in the popover
      expect(screen.getByText('Select a LIRR Branch')).toBeInTheDocument();
    });
  });

  describe('Metro-North mode', () => {
    it('shows "No Metro-North line selected" when nothing is selected', () => {
      const onSelectionChange = vi.fn();
      render(
        <RailSelector 
          mode="metro-north"
          selectedBranch={null} 
          onSelectionChange={onSelectionChange}
          availableBranches={mockMnrLines}
        />
      );
      
      expect(screen.getByText(/No metro-north line selected/i)).toBeInTheDocument();
    });

    it('shows "Select Line" button for Metro-North', () => {
      const onSelectionChange = vi.fn();
      render(
        <RailSelector 
          mode="metro-north"
          selectedBranch={null} 
          onSelectionChange={onSelectionChange}
          availableBranches={mockMnrLines}
        />
      );
      
      expect(screen.getByRole('button', { name: /Select Line/i })).toBeInTheDocument();
    });

    it('shows selected line with badge', () => {
      const onSelectionChange = vi.fn();
      render(
        <RailSelector 
          mode="metro-north"
          selectedBranch="1" 
          onSelectionChange={onSelectionChange}
          availableBranches={mockMnrLines}
        />
      );
      
      // Line name appears in both badge and text, just verify it's there
      expect(screen.getAllByText('Hudson').length).toBeGreaterThan(0);
    });
  });

  it('shows loading state when branches are loading', () => {
    const onSelectionChange = vi.fn();
    render(
      <RailSelector 
        mode="lirr"
        selectedBranch={null} 
        onSelectionChange={onSelectionChange}
        availableBranches={[]}
        isLoading={true}
      />
    );
    
    const selectButton = screen.getByRole('button', { name: /Select Branch/i });
    expect(selectButton).toBeInTheDocument();
  });

  it('calls onSelectionChange when a branch is selected', async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    
    render(
      <RailSelector 
        mode="lirr"
        selectedBranch={null} 
        onSelectionChange={onSelectionChange}
        availableBranches={mockLirrBranches}
      />
    );
    
    // Open the popover
    const selectButton = screen.getByRole('button', { name: /Select Branch/i });
    await user.click(selectButton);
    
    // Click a branch
    const babylonButton = screen.getByRole('button', { name: /Babylon/i });
    await user.click(babylonButton);
    
    expect(onSelectionChange).toHaveBeenCalledWith('1');
  });
});

