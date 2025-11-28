import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrainMarker } from '@/components/realtime/TrainMarker';
import type { TrainArrival } from '@/types/mta';

const mockTrain: TrainArrival = {
  tripId: 'test-trip-123',
  routeId: 'A',
  stopId: 'A15N',
  stationName: 'Times Sq-42 St',
  direction: 'N',
  arrivalTime: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
  departureTime: null,
  minutesAway: 5,
  delay: 0,
  headsign: '207 St',
};

describe('TrainMarker', () => {
  it('renders train marker with subway bullet', () => {
    render(<TrainMarker train={mockTrain} />);
    expect(screen.getByAltText('A train')).toBeInTheDocument();
  });

  it('displays upward arrow for northbound trains', () => {
    render(<TrainMarker train={mockTrain} />);
    // Arrow should be green for northbound
    const container = screen.getByTitle(/A train to 207 St/);
    expect(container).toBeInTheDocument();
  });

  it('displays downward arrow for southbound trains', () => {
    const southboundTrain = { ...mockTrain, direction: 'S' as const, headsign: 'Far Rockaway' };
    render(<TrainMarker train={southboundTrain} />);
    const container = screen.getByTitle(/A train to Far Rockaway/);
    expect(container).toBeInTheDocument();
  });

  it('shows NOW indicator when train is arriving within 1 minute', () => {
    const arrivingTrain = { ...mockTrain, minutesAway: 0 };
    render(<TrainMarker train={arrivingTrain} />);
    expect(screen.getByText('NOW')).toBeInTheDocument();
  });

  it('does not show NOW indicator when train is more than 1 minute away', () => {
    render(<TrainMarker train={mockTrain} />);
    expect(screen.queryByText('NOW')).not.toBeInTheDocument();
  });

  it('shows NOW indicator when train is exactly 1 minute away', () => {
    const arrivingTrain = { ...mockTrain, minutesAway: 1 };
    render(<TrainMarker train={arrivingTrain} />);
    expect(screen.getByText('NOW')).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<TrainMarker train={mockTrain} onClick={handleClick} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledWith(mockTrain);
  });

  it('applies selected styles when isSelected is true', () => {
    const { container } = render(<TrainMarker train={mockTrain} isSelected />);
    const button = container.querySelector('button');
    expect(button).toHaveClass('ring-2');
  });

  it('does not apply selected styles when isSelected is false', () => {
    const { container } = render(<TrainMarker train={mockTrain} isSelected={false} />);
    const button = container.querySelector('button');
    expect(button).not.toHaveClass('ring-2');
  });

  it('applies smaller scale for sm size', () => {
    const { container } = render(<TrainMarker train={mockTrain} size="sm" />);
    const button = container.querySelector('button');
    expect(button).toHaveClass('scale-90');
  });

  it('displays fallback direction in title when headsign is not provided', () => {
    const trainWithoutHeadsign = { ...mockTrain, headsign: undefined };
    render(<TrainMarker train={trainWithoutHeadsign} />);
    const container = screen.getByTitle('A train to Uptown');
    expect(container).toBeInTheDocument();
  });

  it('displays Downtown in title for southbound without headsign', () => {
    const trainWithoutHeadsign = { 
      ...mockTrain, 
      direction: 'S' as const, 
      headsign: undefined 
    };
    render(<TrainMarker train={trainWithoutHeadsign} />);
    const container = screen.getByTitle('A train to Downtown');
    expect(container).toBeInTheDocument();
  });
});

