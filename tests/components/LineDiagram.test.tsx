import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LineDiagram } from '@/components/realtime/LineDiagram';
import type { TrainArrival } from '@/types/mta';

const mockTrains: TrainArrival[] = [
  {
    tripId: 'trip-1',
    routeId: 'A',
    stopId: 'A15N',
    stationName: 'Times Sq-42 St',
    direction: 'N',
    arrivalTime: new Date(Date.now() + 5 * 60 * 1000),
    departureTime: null,
    minutesAway: 5,
    delay: 0,
    headsign: '207 St',
  },
  {
    tripId: 'trip-2',
    routeId: 'A',
    stopId: 'A15S',
    stationName: 'Times Sq-42 St',
    direction: 'S',
    arrivalTime: new Date(Date.now() + 3 * 60 * 1000),
    departureTime: null,
    minutesAway: 3,
    delay: 0,
    headsign: 'Far Rockaway',
  },
];

describe('LineDiagram', () => {
  it('shows empty state when no line is selected', () => {
    render(
      <LineDiagram 
        selectedLine={null} 
        trains={[]} 
      />
    );
    expect(screen.getByText(/Select a subway line above/)).toBeInTheDocument();
  });

  it('shows loading state when loading and no trains', () => {
    render(
      <LineDiagram 
        selectedLine="A" 
        trains={[]} 
        isLoading={true}
      />
    );
    expect(screen.getByText('Loading trains...')).toBeInTheDocument();
  });

  it('shows error state when there is an error', () => {
    render(
      <LineDiagram 
        selectedLine="A" 
        trains={[]} 
        error="Failed to fetch train data"
      />
    );
    expect(screen.getByText('Failed to fetch train data')).toBeInTheDocument();
    expect(screen.getByText('Please try again later')).toBeInTheDocument();
  });

  it('displays train count in footer', () => {
    render(
      <LineDiagram 
        selectedLine="A" 
        trains={mockTrains} 
      />
    );
    // Should show "X trains in view" in footer
    expect(screen.getByText(/train.*in view/)).toBeInTheDocument();
  });

  it('shows "Updating..." when loading with existing trains', () => {
    render(
      <LineDiagram 
        selectedLine="A" 
        trains={mockTrains} 
        isLoading={true}
      />
    );
    expect(screen.getByText('Updating...')).toBeInTheDocument();
  });

  it('renders train markers for provided trains', () => {
    render(
      <LineDiagram 
        selectedLine="A" 
        trains={mockTrains} 
      />
    );
    // Should render A train bullets for the train markers
    const trainBullets = screen.getAllByAltText('A train');
    expect(trainBullets.length).toBeGreaterThan(0);
  });

  it('renders with custom height', () => {
    const { container } = render(
      <LineDiagram 
        selectedLine="A" 
        trains={mockTrains} 
        height={800}
      />
    );
    // The scrollable container should have the custom height
    const scrollContainer = container.querySelector('[style*="height: 800px"]');
    expect(scrollContainer).toBeInTheDocument();
  });

  it('displays singular "train" when only one train in view', () => {
    render(
      <LineDiagram 
        selectedLine="A" 
        trains={[mockTrains[0]]} 
      />
    );
    expect(screen.getByText(/1 train in view/)).toBeInTheDocument();
  });

  it('displays plural "trains" when multiple trains in view', () => {
    render(
      <LineDiagram 
        selectedLine="A" 
        trains={mockTrains} 
      />
    );
    expect(screen.getByText(/trains in view/)).toBeInTheDocument();
  });
});

