import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrainDetailPopover } from '@/components/realtime/TrainDetailPopover';
import type { TrainArrival } from '@/types/mta';

const mockTrain: TrainArrival = {
  tripId: 'test-trip-123',
  routeId: 'A',
  stopId: 'A15',
  stationName: 'Times Sq-42 St',
  direction: 'N',
  arrivalTime: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
  departureTime: null,
  minutesAway: 5,
  delay: 0,
  headsign: '207 St',
};

describe('TrainDetailPopover', () => {
  it('renders train destination as heading', () => {
    render(<TrainDetailPopover train={mockTrain} onClose={() => {}} />);
    expect(screen.getByText('207 St')).toBeInTheDocument();
  });

  it('shows fallback direction when headsign is not provided', () => {
    const trainWithoutHeadsign = { ...mockTrain, headsign: undefined };
    render(<TrainDetailPopover train={trainWithoutHeadsign} onClose={() => {}} />);
    expect(screen.getByText('Uptown')).toBeInTheDocument();
  });

  it('shows "Downtown" for southbound without headsign', () => {
    const southboundTrain = { 
      ...mockTrain, 
      direction: 'S' as const, 
      headsign: undefined 
    };
    render(<TrainDetailPopover train={southboundTrain} onClose={() => {}} />);
    expect(screen.getByText('Downtown')).toBeInTheDocument();
  });

  it('displays route ID and direction info', () => {
    render(<TrainDetailPopover train={mockTrain} onClose={() => {}} />);
    expect(screen.getByText(/A Train/)).toBeInTheDocument();
    expect(screen.getByText(/Northbound/)).toBeInTheDocument();
  });

  it('displays "Southbound" for southbound trains', () => {
    const southboundTrain = { ...mockTrain, direction: 'S' as const };
    render(<TrainDetailPopover train={southboundTrain} onClose={() => {}} />);
    expect(screen.getByText(/Southbound/)).toBeInTheDocument();
  });

  it('displays subway bullet', () => {
    render(<TrainDetailPopover train={mockTrain} onClose={() => {}} />);
    expect(screen.getByAltText('A train')).toBeInTheDocument();
  });

  it('shows "Next Stop" label', () => {
    render(<TrainDetailPopover train={mockTrain} onClose={() => {}} />);
    expect(screen.getByText('Next Stop')).toBeInTheDocument();
  });

  it('displays arrival time', () => {
    render(<TrainDetailPopover train={mockTrain} onClose={() => {}} />);
    expect(screen.getByText('5 min')).toBeInTheDocument();
  });

  it('shows "Arriving now" when minutesAway is 0', () => {
    const arrivingTrain = { ...mockTrain, minutesAway: 0 };
    render(<TrainDetailPopover train={arrivingTrain} onClose={() => {}} />);
    expect(screen.getByText('Arriving now')).toBeInTheDocument();
  });

  it('shows "1 min" when minutesAway is 1', () => {
    const arrivingTrain = { ...mockTrain, minutesAway: 1 };
    render(<TrainDetailPopover train={arrivingTrain} onClose={() => {}} />);
    expect(screen.getByText('1 min')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(<TrainDetailPopover train={mockTrain} onClose={handleClose} />);
    
    // Find and click the close button
    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);
    
    expect(handleClose).toHaveBeenCalled();
  });

  it('shows delay warning when train is delayed', () => {
    const delayedTrain = { ...mockTrain, delay: 180 }; // 3 minutes delay
    render(<TrainDetailPopover train={delayedTrain} onClose={() => {}} />);
    expect(screen.getByText('Delayed')).toBeInTheDocument();
    expect(screen.getByText(/Running.*minutes behind schedule/)).toBeInTheDocument();
  });

  it('does not show delay warning when no delay', () => {
    render(<TrainDetailPopover train={mockTrain} onClose={() => {}} />);
    expect(screen.queryByText('Delayed')).not.toBeInTheDocument();
  });

  it('shows delay chip when delayed', () => {
    const delayedTrain = { ...mockTrain, delay: 300 }; // 5 minutes delay
    render(<TrainDetailPopover train={delayedTrain} onClose={() => {}} />);
    expect(screen.getByText('+5 min delay')).toBeInTheDocument();
  });

  it('shows "Live Tracking" when train is assigned', () => {
    const assignedTrain = { ...mockTrain, isAssigned: true };
    render(<TrainDetailPopover train={assignedTrain} onClose={() => {}} />);
    expect(screen.getByText('Live Tracking')).toBeInTheDocument();
  });

  it('shows "Scheduled" when train is not assigned', () => {
    const unassignedTrain = { ...mockTrain, isAssigned: false };
    render(<TrainDetailPopover train={unassignedTrain} onClose={() => {}} />);
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
  });

  it('displays trip ID', () => {
    render(<TrainDetailPopover train={mockTrain} onClose={() => {}} />);
    expect(screen.getByText(/Trip: test-trip-123/)).toBeInTheDocument();
  });

  it('applies success color for arrival time when arriving soon', () => {
    const arrivingSoonTrain = { ...mockTrain, minutesAway: 1 };
    render(<TrainDetailPopover train={arrivingSoonTrain} onClose={() => {}} />);
    
    const timeElement = screen.getByText('1 min');
    expect(timeElement).toHaveClass('text-success');
  });

  it('applies warning color for arrival time when 2-5 min away', () => {
    const train5Min = { ...mockTrain, minutesAway: 3 };
    render(<TrainDetailPopover train={train5Min} onClose={() => {}} />);
    
    const timeElement = screen.getByText('3 min');
    expect(timeElement).toHaveClass('text-warning');
  });

  it('applies default color for arrival time when more than 5 min away', () => {
    const train10Min = { ...mockTrain, minutesAway: 10 };
    render(<TrainDetailPopover train={train10Min} onClose={() => {}} />);
    
    const timeElement = screen.getByText('10 min');
    expect(timeElement).toHaveClass('text-foreground');
  });
});

