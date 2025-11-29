/**
 * ReliabilitySummaryCards Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReliabilitySummaryCards } from '@/components/reliability';
import type { LineReliabilitySummary } from '@/types/api';

const mockByLine: LineReliabilitySummary[] = [
  { routeId: 'L', totalIncidents: 5, delayCount: 3, severeCount: 1, avgIncidentsPerDay: 0.5, reliabilityScore: 90 },
  { routeId: '7', totalIncidents: 10, delayCount: 6, severeCount: 2, avgIncidentsPerDay: 1.0, reliabilityScore: 80 },
  { routeId: 'A', totalIncidents: 25, delayCount: 15, severeCount: 5, avgIncidentsPerDay: 2.5, reliabilityScore: 50 },
  { routeId: 'F', totalIncidents: 15, delayCount: 8, severeCount: 3, avgIncidentsPerDay: 1.5, reliabilityScore: 70 },
];

describe('ReliabilitySummaryCards', () => {
  it('renders total incidents count', () => {
    render(
      <ReliabilitySummaryCards
        totalIncidents={55}
        periodDays={30}
        byLine={mockByLine}
        hasHistoricalData={true}
      />
    );
    
    expect(screen.getByText('55')).toBeInTheDocument();
    expect(screen.getByText('Past 30 days')).toBeInTheDocument();
  });

  it('shows "Current incidents" when no historical data', () => {
    render(
      <ReliabilitySummaryCards
        totalIncidents={10}
        periodDays={30}
        byLine={mockByLine}
        hasHistoricalData={false}
      />
    );
    
    expect(screen.getByText('Current incidents')).toBeInTheDocument();
  });

  it('renders system reliability score', () => {
    render(
      <ReliabilitySummaryCards
        totalIncidents={55}
        periodDays={30}
        byLine={mockByLine}
        hasHistoricalData={true}
      />
    );
    
    // Average of 90, 80, 50, 70 = 72.5, rounded to 73
    expect(screen.getByText('73')).toBeInTheDocument();
    expect(screen.getByText('/100')).toBeInTheDocument();
    expect(screen.getByText('System Score')).toBeInTheDocument();
  });

  it('renders most reliable line (highest score)', () => {
    render(
      <ReliabilitySummaryCards
        totalIncidents={55}
        periodDays={30}
        byLine={mockByLine}
        hasHistoricalData={true}
      />
    );
    
    expect(screen.getByText('Most Reliable')).toBeInTheDocument();
    // L has highest score (90), should show "Excellent"
    expect(screen.getByText('Excellent')).toBeInTheDocument();
  });

  it('renders most affected line (lowest score)', () => {
    render(
      <ReliabilitySummaryCards
        totalIncidents={55}
        periodDays={30}
        byLine={mockByLine}
        hasHistoricalData={true}
      />
    );
    
    expect(screen.getByText('Most Affected')).toBeInTheDocument();
    // A has lowest score (50), should show "Very Poor"
    expect(screen.getByText('Very Poor')).toBeInTheDocument();
  });

  it('renders loading skeleton when isLoading is true', () => {
    render(
      <ReliabilitySummaryCards
        totalIncidents={0}
        periodDays={30}
        byLine={[]}
        hasHistoricalData={false}
        isLoading={true}
      />
    );
    
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('handles empty byLine data', () => {
    render(
      <ReliabilitySummaryCards
        totalIncidents={0}
        periodDays={30}
        byLine={[]}
        hasHistoricalData={false}
      />
    );
    
    expect(screen.getAllByText('No data yet')).toHaveLength(2);
  });

  it('displays correct score labels based on score value', () => {
    const lineWithGoodScore: LineReliabilitySummary[] = [
      { routeId: '1', totalIncidents: 3, delayCount: 1, severeCount: 0, avgIncidentsPerDay: 0.3, reliabilityScore: 85 },
    ];
    
    render(
      <ReliabilitySummaryCards
        totalIncidents={3}
        periodDays={30}
        byLine={lineWithGoodScore}
        hasHistoricalData={true}
      />
    );
    
    expect(screen.getByText('Good')).toBeInTheDocument();
  });
});

