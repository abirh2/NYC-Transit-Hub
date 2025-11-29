/**
 * IncidentTimeline Component Tests
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IncidentTimeline } from '@/components/incidents';
import type { ServiceAlert } from '@/types/mta';

// Mock date for consistent testing
const NOW = new Date('2024-01-15T12:00:00Z');

const mockIncidents: ServiceAlert[] = [
  {
    id: 'incident-1',
    affectedRoutes: ['A', 'C', 'E'],
    affectedStops: ['A15', 'A16'],
    headerText: 'Delays on A/C/E due to signal problems',
    descriptionText: 'Expect delays of up to 15 minutes. We are working to resolve this issue.',
    severity: 'WARNING',
    alertType: 'DELAY',
    activePeriodStart: new Date('2024-01-15T10:00:00Z'),
    activePeriodEnd: null,
  },
  {
    id: 'incident-2',
    affectedRoutes: ['L'],
    affectedStops: ['L01', 'L02'],
    headerText: 'No L train service between stations',
    descriptionText: 'Use shuttle bus instead.',
    severity: 'SEVERE',
    alertType: 'STATION_CLOSURE',
    activePeriodStart: new Date('2024-01-15T08:00:00Z'),
    activePeriodEnd: new Date('2024-01-15T18:00:00Z'),
  },
  {
    id: 'incident-3',
    affectedRoutes: ['F'],
    affectedStops: [],
    headerText: 'F train running on local track',
    descriptionText: null,
    severity: 'INFO',
    alertType: 'SERVICE_CHANGE',
    activePeriodStart: new Date('2024-01-14T00:00:00Z'),
    activePeriodEnd: new Date('2024-01-14T06:00:00Z'), // Expired
  },
];

describe('IncidentTimeline', () => {
  beforeAll(() => {
    // Mock Date.now() for consistent testing
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('renders list of incidents', () => {
    render(<IncidentTimeline incidents={mockIncidents} />);
    
    expect(screen.getByText('Delays on A/C/E due to signal problems')).toBeInTheDocument();
    expect(screen.getByText('No L train service between stations')).toBeInTheDocument();
    expect(screen.getByText('F train running on local track')).toBeInTheDocument();
  });

  it('renders severity badges correctly', () => {
    render(<IncidentTimeline incidents={mockIncidents} />);
    
    expect(screen.getByText('Major')).toBeInTheDocument(); // SEVERE
    expect(screen.getByText('Delays')).toBeInTheDocument(); // WARNING
    expect(screen.getByText('Info')).toBeInTheDocument(); // INFO
  });

  it('renders alert type badges', () => {
    render(<IncidentTimeline incidents={mockIncidents} />);
    
    expect(screen.getByText('Delay')).toBeInTheDocument();
    expect(screen.getByText('Station Closure')).toBeInTheDocument();
    expect(screen.getByText('Service Change')).toBeInTheDocument();
  });

  it('shows active/resolved status', () => {
    render(<IncidentTimeline incidents={mockIncidents} />);
    
    // First two are active, third is resolved
    const activeChips = screen.getAllByText('Active');
    expect(activeChips).toHaveLength(2);
    
    expect(screen.getByText('Resolved')).toBeInTheDocument();
  });

  it('renders loading spinner when isLoading is true', () => {
    render(<IncidentTimeline incidents={[]} isLoading={true} />);
    
    // Check for spinner
    expect(document.querySelector('[aria-label="Loading"]')).toBeInTheDocument();
  });

  it('renders error state', () => {
    render(<IncidentTimeline incidents={[]} error="Network error" />);
    
    expect(screen.getByText('Failed to load incidents')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('renders empty state when no incidents', () => {
    render(<IncidentTimeline incidents={[]} />);
    
    expect(screen.getByText('No Incidents Found')).toBeInTheDocument();
    expect(screen.getByText('There are no service incidents matching your filters.')).toBeInTheDocument();
  });

  it('expands description when expand button is clicked', () => {
    render(<IncidentTimeline incidents={[mockIncidents[0]]} />);
    
    // Description should not be visible initially
    expect(screen.queryByText('Expect delays of up to 15 minutes. We are working to resolve this issue.')).not.toBeInTheDocument();
    
    // Find and click the expand button
    const expandButton = screen.getByRole('button', { name: /expand details/i });
    fireEvent.click(expandButton);
    
    // Description should now be visible
    expect(screen.getByText('Expect delays of up to 15 minutes. We are working to resolve this issue.')).toBeInTheDocument();
  });

  it('collapses description when collapse button is clicked', () => {
    render(<IncidentTimeline incidents={[mockIncidents[0]]} />);
    
    // Expand first
    const expandButton = screen.getByRole('button', { name: /expand details/i });
    fireEvent.click(expandButton);
    
    // Now collapse
    const collapseButton = screen.getByRole('button', { name: /collapse details/i });
    fireEvent.click(collapseButton);
    
    // Description should be hidden again
    expect(screen.queryByText('Expect delays of up to 15 minutes. We are working to resolve this issue.')).not.toBeInTheDocument();
  });

  it('does not show expand button when there is no description', () => {
    // incident-3 has null description
    render(<IncidentTimeline incidents={[mockIncidents[2]]} />);
    
    expect(screen.queryByRole('button', { name: /expand details/i })).not.toBeInTheDocument();
  });

  it('renders multiple affected lines', () => {
    render(<IncidentTimeline incidents={[mockIncidents[0]]} />);
    
    // Should render A, C, E line bullets (check for alt text)
    expect(screen.getByAltText('A train')).toBeInTheDocument();
    expect(screen.getByAltText('C train')).toBeInTheDocument();
    expect(screen.getByAltText('E train')).toBeInTheDocument();
  });

  it('truncates lines list when more than 6 lines affected', () => {
    const incidentWithManyLines: ServiceAlert = {
      ...mockIncidents[0],
      affectedRoutes: ['1', '2', '3', '4', '5', '6', '7', 'A', 'B'],
    };
    
    render(<IncidentTimeline incidents={[incidentWithManyLines]} />);
    
    // Should show "+3" for extra lines
    expect(screen.getByText('+3')).toBeInTheDocument();
  });

  it('applies correct border color based on severity', () => {
    const { container } = render(<IncidentTimeline incidents={mockIncidents} />);
    
    // Check for border classes
    const cards = container.querySelectorAll('[class*="border-l-"]');
    expect(cards.length).toBe(3);
  });

  it('parses train references in description and displays subway bullets', () => {
    const incidentWithTrainRefs: ServiceAlert = {
      ...mockIncidents[0],
      descriptionText: 'Take the [E] train to connect to [4] or [5] service.',
    };
    
    render(<IncidentTimeline incidents={[incidentWithTrainRefs]} />);
    
    // Expand the description
    const expandButton = screen.getByRole('button', { name: /expand details/i });
    fireEvent.click(expandButton);
    
    // Should render subway bullets for E, 4, and 5 trains in the description
    // These will be inline, so check for alt text
    const trainImages = screen.getAllByAltText(/train$/i);
    // Header has A, C, E and description adds E, 4, 5 = 6 total
    expect(trainImages.length).toBeGreaterThanOrEqual(6);
  });

  it('preserves non-train bracket text in description', () => {
    const incidentWithMixedBrackets: ServiceAlert = {
      ...mockIncidents[0],
      descriptionText: 'Service [XYZ] is not a train. Take the [A] instead.',
    };
    
    render(<IncidentTimeline incidents={[incidentWithMixedBrackets]} />);
    
    // Expand the description
    const expandButton = screen.getByRole('button', { name: /expand details/i });
    fireEvent.click(expandButton);
    
    // [XYZ] should remain as text since it's not a valid train
    expect(screen.getByText(/\[XYZ\]/)).toBeInTheDocument();
    
    // [A] should be replaced with a subway bullet
    const aTrains = screen.getAllByAltText('A train');
    expect(aTrains.length).toBeGreaterThanOrEqual(2); // One in header, one in description
  });
});

