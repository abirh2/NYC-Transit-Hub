/**
 * IncidentStats Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { IncidentStats } from '@/components/incidents';
import type { IncidentStats as IncidentStatsType } from '@/types/api';

const mockStats: IncidentStatsType = {
  total: 15,
  byLine: [
    { line: 'A', count: 7 },
    { line: 'F', count: 6 },
    { line: '1', count: 5 },
    { line: 'L', count: 4 },
    { line: 'G', count: 2 },
  ],
  byType: [
    { type: 'DELAY', count: 9 },
    { type: 'PLANNED_WORK', count: 8 },
    { type: 'SERVICE_CHANGE', count: 3 },
  ],
  bySeverity: {
    severe: 11,
    warning: 12,
    info: 13,
  },
};

describe('IncidentStats', () => {
  it('renders total incidents count with active tab label', () => {
    render(<IncidentStats stats={mockStats} />);
    
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('Active Incidents')).toBeInTheDocument();
  });

  it('renders scheduled changes label when on upcoming tab', () => {
    render(<IncidentStats stats={mockStats} activeTab="upcoming" />);
    
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('Scheduled Changes')).toBeInTheDocument();
  });

  it('renders severity breakdown', () => {
    render(<IncidentStats stats={mockStats} />);
    
    expect(screen.getByText('By Severity')).toBeInTheDocument();
    // Use unique numbers to avoid collisions
    expect(screen.getByText('11')).toBeInTheDocument(); // severe
    expect(screen.getByText('12')).toBeInTheDocument(); // warning
    expect(screen.getByText('13')).toBeInTheDocument(); // info
  });

  it('renders most affected lines', () => {
    render(<IncidentStats stats={mockStats} />);
    
    expect(screen.getByText('Most Affected')).toBeInTheDocument();
    // Check that line counts are displayed
    expect(screen.getByText('7')).toBeInTheDocument(); // A line count
    expect(screen.getByText('6')).toBeInTheDocument(); // F line count
  });

  it('renders top incident types', () => {
    render(<IncidentStats stats={mockStats} />);
    
    expect(screen.getByText('Top Types')).toBeInTheDocument();
    expect(screen.getByText('Delay (9)')).toBeInTheDocument();
    expect(screen.getByText('Planned Work (8)')).toBeInTheDocument();
    expect(screen.getByText('Service Change (3)')).toBeInTheDocument();
  });

  it('renders loading skeleton when isLoading is true', () => {
    render(<IncidentStats stats={null} isLoading={true} />);
    
    // Should render skeleton cards
    const cards = document.querySelectorAll('.animate-pulse');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('renders no data message when stats are empty', () => {
    const emptyStats: IncidentStatsType = {
      total: 0,
      byLine: [],
      byType: [],
      bySeverity: {
        severe: 0,
        warning: 0,
        info: 0,
      },
    };
    
    render(<IncidentStats stats={emptyStats} />);
    
    // Check total is displayed (find in the "Active Incidents" card)
    const totalCard = screen.getByText('Active Incidents').closest('div')?.parentElement;
    expect(totalCard).toBeInTheDocument();
    expect(within(totalCard!).getByText('0')).toBeInTheDocument();
    
    // Check no data messages appear
    expect(screen.getAllByText('No data')).toHaveLength(2); // byLine and byType
  });

  it('limits byLine display to 5 items', () => {
    const statsWithManyLines: IncidentStatsType = {
      ...mockStats,
      byLine: [
        { line: 'A', count: 17 },
        { line: 'B', count: 16 },
        { line: 'C', count: 14 },
        { line: 'D', count: 10 },
        { line: 'E', count: 9 },
        { line: 'F', count: 8 },
        { line: 'G', count: 1 },
      ],
    };
    
    render(<IncidentStats stats={statsWithManyLines} />);
    
    // Should show first 5 line counts
    expect(screen.getByText('17')).toBeInTheDocument(); // A
    expect(screen.getByText('16')).toBeInTheDocument(); // B
    expect(screen.getByText('14')).toBeInTheDocument(); // C
    expect(screen.getByText('10')).toBeInTheDocument(); // D
    expect(screen.getByText('9')).toBeInTheDocument();  // E
    
    // 6th and 7th lines should not be visible
    expect(screen.queryByText('G train')).not.toBeInTheDocument();
  });

  it('limits byType display to 3 items', () => {
    const statsWithManyTypes: IncidentStatsType = {
      ...mockStats,
      byType: [
        { type: 'DELAY', count: 19 },
        { type: 'PLANNED_WORK', count: 18 },
        { type: 'SERVICE_CHANGE', count: 17 },
        { type: 'STATION_CLOSURE', count: 16 },
        { type: 'DETOUR', count: 14 },
      ],
    };
    
    render(<IncidentStats stats={statsWithManyTypes} />);
    
    // Should show first 3 types
    expect(screen.getByText('Delay (19)')).toBeInTheDocument();
    expect(screen.getByText('Planned Work (18)')).toBeInTheDocument();
    expect(screen.getByText('Service Change (17)')).toBeInTheDocument();
    
    // Should not show 4th and 5th types
    expect(screen.queryByText('Station Closure (16)')).not.toBeInTheDocument();
    expect(screen.queryByText('Detour (14)')).not.toBeInTheDocument();
  });
});
