/**
 * TimeOfDayChart Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimeOfDayChart } from '@/components/reliability';
import type { TimeOfDayBreakdown } from '@/types/api';

const mockData: TimeOfDayBreakdown[] = [
  { period: 'amRush', label: 'AM Rush', hours: '6am - 10am', totalIncidents: 25 },
  { period: 'midday', label: 'Midday', hours: '10am - 2pm', totalIncidents: 10 },
  { period: 'pmRush', label: 'PM Rush', hours: '2pm - 6pm', totalIncidents: 30 },
  { period: 'evening', label: 'Evening', hours: '6pm - 10pm', totalIncidents: 8 },
  { period: 'night', label: 'Night', hours: '10pm - 6am', totalIncidents: 5 },
];

describe('TimeOfDayChart', () => {
  it('renders chart header', () => {
    render(<TimeOfDayChart data={mockData} />);
    
    expect(screen.getByText('Time of Day Analysis')).toBeInTheDocument();
  });

  it('renders loading skeleton when isLoading is true', () => {
    render(<TimeOfDayChart data={[]} isLoading={true} />);
    
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders empty state when no data', () => {
    const emptyData: TimeOfDayBreakdown[] = [
      { period: 'amRush', label: 'AM Rush', hours: '6am - 10am', totalIncidents: 0 },
      { period: 'midday', label: 'Midday', hours: '10am - 2pm', totalIncidents: 0 },
      { period: 'pmRush', label: 'PM Rush', hours: '2pm - 6pm', totalIncidents: 0 },
      { period: 'evening', label: 'Evening', hours: '6pm - 10pm', totalIncidents: 0 },
      { period: 'night', label: 'Night', hours: '10pm - 6am', totalIncidents: 0 },
    ];
    
    render(<TimeOfDayChart data={emptyData} />);
    
    expect(screen.getByText('No time-of-day data available yet.')).toBeInTheDocument();
  });

  it('shows rush hour insight when rush hours have majority of incidents', () => {
    // Rush hours: 25 + 30 = 55 (70%)
    // Off-peak: 10 + 8 + 5 = 23 (30%)
    render(<TimeOfDayChart data={mockData} />);
    
    // Should show that 70% of incidents occur during rush hours
    expect(screen.getByText(/of incidents occur during rush hours/)).toBeInTheDocument();
  });

  it('shows off-peak insight when off-peak has more incidents', () => {
    const offPeakHeavy: TimeOfDayBreakdown[] = [
      { period: 'amRush', label: 'AM Rush', hours: '6am - 10am', totalIncidents: 5 },
      { period: 'midday', label: 'Midday', hours: '10am - 2pm', totalIncidents: 20 },
      { period: 'pmRush', label: 'PM Rush', hours: '2pm - 6pm', totalIncidents: 5 },
      { period: 'evening', label: 'Evening', hours: '6pm - 10pm', totalIncidents: 15 },
      { period: 'night', label: 'Night', hours: '10pm - 6am', totalIncidents: 10 },
    ];
    
    render(<TimeOfDayChart data={offPeakHeavy} />);
    
    expect(screen.getByText('Off-peak hours see more incidents than rush hours')).toBeInTheDocument();
  });
});

