import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BusList } from '@/components/realtime/BusList';
import type { BusArrival } from '@/types/mta';

const mockBuses: BusArrival[] = [
  {
    vehicleId: 'MTA NYCT_1234',
    tripId: 'trip-1',
    routeId: 'M15',
    headsign: 'SOUTH FERRY',
    latitude: 40.7128,
    longitude: -74.0060,
    bearing: 180,
    nextStopId: '400001',
    nextStopName: '1 AV/E 14 ST',
    arrivalTime: new Date(Date.now() + 5 * 60 * 1000),
    distanceFromStop: 500,
    progressStatus: 'approaching',
    minutesAway: 5,
  },
  {
    vehicleId: 'MTA NYCT_5678',
    tripId: 'trip-2',
    routeId: 'M15',
    headsign: 'HARLEM 126 ST',
    latitude: 40.7200,
    longitude: -74.0000,
    bearing: 0,
    nextStopId: '400002',
    nextStopName: '1 AV/E 23 ST',
    arrivalTime: new Date(Date.now() + 3 * 60 * 1000),
    distanceFromStop: 200,
    progressStatus: 'approaching',
    minutesAway: 3,
  },
];

describe('BusList', () => {
  it('shows empty state when no route is selected', () => {
    render(<BusList selectedRoute={null} buses={[]} />);
    expect(screen.getByText(/Select a bus route above/)).toBeInTheDocument();
  });

  it('shows loading state when loading and no buses', () => {
    render(
      <BusList 
        selectedRoute="M15" 
        buses={[]} 
        isLoading={true} 
      />
    );
    expect(screen.getByText('Loading buses...')).toBeInTheDocument();
  });

  it('shows error state when there is an error', () => {
    render(
      <BusList 
        selectedRoute="M15" 
        buses={[]} 
        error="Failed to fetch bus data" 
      />
    );
    expect(screen.getByText('Failed to fetch bus data')).toBeInTheDocument();
    expect(screen.getByText('Please try again later')).toBeInTheDocument();
  });

  it('shows no buses message when route has no active buses', () => {
    render(
      <BusList 
        selectedRoute="M15" 
        buses={[]} 
      />
    );
    expect(screen.getByText(/No active buses found for M15/)).toBeInTheDocument();
  });

  it('displays bus arrivals grouped by destination', () => {
    render(
      <BusList 
        selectedRoute="M15" 
        buses={mockBuses} 
      />
    );
    
    // Should show destination headers
    expect(screen.getByText(/To SOUTH FERRY/)).toBeInTheDocument();
    expect(screen.getByText(/To HARLEM 126 ST/)).toBeInTheDocument();
  });

  it('displays next stop name for each bus', () => {
    render(
      <BusList 
        selectedRoute="M15" 
        buses={mockBuses} 
      />
    );
    
    expect(screen.getByText('1 AV/E 14 ST')).toBeInTheDocument();
    expect(screen.getByText('1 AV/E 23 ST')).toBeInTheDocument();
  });

  it('displays minutes away for buses', () => {
    render(
      <BusList 
        selectedRoute="M15" 
        buses={mockBuses} 
      />
    );
    
    expect(screen.getByText('5 min')).toBeInTheDocument();
    expect(screen.getByText('3 min')).toBeInTheDocument();
  });

  it('shows route header with bus count', () => {
    render(
      <BusList 
        selectedRoute="M15" 
        buses={mockBuses} 
      />
    );
    
    expect(screen.getByText('M15 Bus')).toBeInTheDocument();
    expect(screen.getByText(/2 buses active/)).toBeInTheDocument();
  });

  it('shows "Refreshing..." when loading with existing data', () => {
    render(
      <BusList 
        selectedRoute="M15" 
        buses={mockBuses} 
        isLoading={true} 
      />
    );
    
    expect(screen.getByText('Refreshing...')).toBeInTheDocument();
  });

  it('displays "Now" for buses arriving in under 1 minute', () => {
    const nearbyBus: BusArrival = {
      ...mockBuses[0],
      minutesAway: 0,
      arrivalTime: new Date(),
    };
    
    render(
      <BusList 
        selectedRoute="M15" 
        buses={[nearbyBus]} 
      />
    );
    
    expect(screen.getByText('Now')).toBeInTheDocument();
  });
});

