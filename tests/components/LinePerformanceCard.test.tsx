/**
 * LinePerformanceCard Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LinePerformanceCard } from '@/components/reliability';
import type { LineReliabilitySummary } from '@/types/api';

const mockLines: LineReliabilitySummary[] = [
  { routeId: 'L', totalIncidents: 5, delayCount: 3, severeCount: 1, avgIncidentsPerDay: 0.5, reliabilityScore: 90 },
  { routeId: '7', totalIncidents: 10, delayCount: 6, severeCount: 2, avgIncidentsPerDay: 1.0, reliabilityScore: 80 },
  { routeId: 'A', totalIncidents: 25, delayCount: 15, severeCount: 5, avgIncidentsPerDay: 2.5, reliabilityScore: 50 },
];

describe('LinePerformanceCard', () => {
  it('renders line performance header', () => {
    render(<LinePerformanceCard lines={mockLines} />);
    
    expect(screen.getByText('Line Performance')).toBeInTheDocument();
  });

  it('renders all lines with their scores', () => {
    render(<LinePerformanceCard lines={mockLines} />);
    
    // Scores are sorted by reliability (highest first)
    expect(screen.getByText('90')).toBeInTheDocument();
    expect(screen.getByText('80')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('renders incident counts for each line', () => {
    render(<LinePerformanceCard lines={mockLines} />);
    
    expect(screen.getByText('5 inc.')).toBeInTheDocument();
    expect(screen.getByText('10 inc.')).toBeInTheDocument();
    expect(screen.getByText('25 inc.')).toBeInTheDocument();
  });

  it('renders loading skeleton when isLoading is true', () => {
    render(<LinePerformanceCard lines={[]} isLoading={true} />);
    
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders empty state when no lines', () => {
    render(<LinePerformanceCard lines={[]} />);
    
    expect(screen.getByText('No performance data available yet.')).toBeInTheDocument();
    expect(screen.getByText('Data will accumulate as alerts are tracked.')).toBeInTheDocument();
  });

  it('calls onSelectLine when a line is clicked', () => {
    const onSelectLine = vi.fn();
    render(<LinePerformanceCard lines={mockLines} onSelectLine={onSelectLine} />);
    
    // Click on the L line button (first button after the card header)
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    
    expect(onSelectLine).toHaveBeenCalled();
  });

  it('shows selected line with highlight', () => {
    render(
      <LinePerformanceCard 
        lines={mockLines} 
        selectedLine="L"
        onSelectLine={vi.fn()}
      />
    );
    
    // Should show clear filter button when a line is selected
    expect(screen.getByText('Clear filter')).toBeInTheDocument();
  });

  it('clears selection when clicking clear filter', () => {
    const onSelectLine = vi.fn();
    render(
      <LinePerformanceCard 
        lines={mockLines} 
        selectedLine="L"
        onSelectLine={onSelectLine}
      />
    );
    
    fireEvent.click(screen.getByText('Clear filter'));
    
    expect(onSelectLine).toHaveBeenCalledWith(undefined);
  });

  it('renders legend with score thresholds', () => {
    render(<LinePerformanceCard lines={mockLines} />);
    
    expect(screen.getByText('80+')).toBeInTheDocument();
    expect(screen.getByText('60-79')).toBeInTheDocument();
    expect(screen.getByText('<60')).toBeInTheDocument();
  });

  it('sorts lines by reliability score (highest first)', () => {
    const unsortedLines: LineReliabilitySummary[] = [
      { routeId: 'F', totalIncidents: 20, delayCount: 10, severeCount: 4, avgIncidentsPerDay: 2.0, reliabilityScore: 60 },
      { routeId: 'G', totalIncidents: 5, delayCount: 2, severeCount: 0, avgIncidentsPerDay: 0.5, reliabilityScore: 95 },
      { routeId: 'J', totalIncidents: 30, delayCount: 18, severeCount: 8, avgIncidentsPerDay: 3.0, reliabilityScore: 40 },
    ];
    
    render(<LinePerformanceCard lines={unsortedLines} />);
    
    // The buttons should be in order: G (95), F (60), J (40)
    const buttons = screen.getAllByRole('button');
    // First button should have score 95
    expect(buttons[0].textContent).toContain('95');
  });
});

