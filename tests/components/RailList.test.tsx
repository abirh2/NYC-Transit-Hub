import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RailList } from '@/components/realtime/RailList';
import type { RailArrival } from '@/types/mta';

const mockLirrTrains: RailArrival[] = [
  {
    tripId: 'trip-1',
    routeId: '1',
    branchName: 'Babylon',
    direction: 'inbound',
    stopId: '51',
    stopName: 'Babylon',
    arrivalTime: new Date(Date.now() + 15 * 60 * 1000),
    departureTime: null,
    delay: 0,
    minutesAway: 15,
    trainId: '1234',
    mode: 'lirr',
  },
  {
    tripId: 'trip-2',
    routeId: '1',
    branchName: 'Babylon',
    direction: 'outbound',
    stopId: '8',
    stopName: 'Penn Station',
    arrivalTime: new Date(Date.now() + 5 * 60 * 1000),
    departureTime: null,
    delay: 120,
    minutesAway: 5,
    trainId: '5678',
    mode: 'lirr',
  },
];

const mockMnrTrains: RailArrival[] = [
  {
    tripId: 'trip-3',
    routeId: '1',
    branchName: 'Hudson',
    direction: 'inbound',
    stopId: '1',
    stopName: 'Grand Central',
    arrivalTime: new Date(Date.now() + 10 * 60 * 1000),
    departureTime: null,
    delay: 0,
    minutesAway: 10,
    trainId: 'H101',
    mode: 'metro-north',
  },
];

describe('RailList', () => {
  describe('LIRR mode', () => {
    it('shows empty state when no branch is selected', () => {
      render(
        <RailList 
          mode="lirr"
          selectedBranch={null} 
          trains={[]} 
        />
      );
      expect(screen.getByText(/Select a LIRR branch above/)).toBeInTheDocument();
    });

    it('shows loading state when loading and no trains', () => {
      render(
        <RailList 
          mode="lirr"
          selectedBranch="1" 
          selectedBranchName="Babylon"
          trains={[]} 
          isLoading={true}
        />
      );
      expect(screen.getByText('Loading trains...')).toBeInTheDocument();
    });

    it('shows error state when there is an error', () => {
      render(
        <RailList 
          mode="lirr"
          selectedBranch="1" 
          selectedBranchName="Babylon"
          trains={[]} 
          error="Failed to fetch train data"
        />
      );
      expect(screen.getByText('Failed to fetch train data')).toBeInTheDocument();
    });

    it('displays trains grouped by direction', () => {
      render(
        <RailList 
          mode="lirr"
          selectedBranch="1" 
          selectedBranchName="Babylon"
          trains={mockLirrTrains}
        />
      );
      
      // Should show direction headers
      expect(screen.getByText(/To Penn Station/)).toBeInTheDocument();
      expect(screen.getByText(/From Penn Station/)).toBeInTheDocument();
    });

    it('displays branch name in header', () => {
      render(
        <RailList 
          mode="lirr"
          selectedBranch="1" 
          selectedBranchName="Babylon"
          trains={mockLirrTrains}
        />
      );
      
      // Branch name appears in both badge and h3, check for heading specifically
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Babylon');
    });

    it('displays train count', () => {
      render(
        <RailList 
          mode="lirr"
          selectedBranch="1" 
          selectedBranchName="Babylon"
          trains={mockLirrTrains}
        />
      );
      
      expect(screen.getByText(/2 trains scheduled/)).toBeInTheDocument();
    });

    it('shows minutes away for trains', () => {
      render(
        <RailList 
          mode="lirr"
          selectedBranch="1" 
          selectedBranchName="Babylon"
          trains={mockLirrTrains}
        />
      );
      
      expect(screen.getByText('15 min')).toBeInTheDocument();
      expect(screen.getByText('5 min')).toBeInTheDocument();
    });
  });

  describe('Metro-North mode', () => {
    it('shows empty state when no line is selected', () => {
      render(
        <RailList 
          mode="metro-north"
          selectedBranch={null} 
          trains={[]} 
        />
      );
      expect(screen.getByText(/Select a Metro-North line above/)).toBeInTheDocument();
    });

    it('displays correct direction labels for Metro-North', () => {
      render(
        <RailList 
          mode="metro-north"
          selectedBranch="1" 
          selectedBranchName="Hudson"
          trains={mockMnrTrains}
        />
      );
      
      // Should show Grand Central as destination for inbound
      expect(screen.getByText(/To Grand Central/)).toBeInTheDocument();
    });

    it('shows no trains message when branch has no scheduled trains', () => {
      render(
        <RailList 
          mode="metro-north"
          selectedBranch="1" 
          selectedBranchName="Hudson"
          trains={[]}
        />
      );
      
      expect(screen.getByText(/No scheduled trains on Hudson/)).toBeInTheDocument();
    });
  });

  it('shows "Now" for trains arriving immediately', () => {
    const nowTrain: RailArrival = {
      ...mockLirrTrains[0],
      minutesAway: 0,
      arrivalTime: new Date(),
    };
    
    render(
      <RailList 
        mode="lirr"
        selectedBranch="1" 
        selectedBranchName="Babylon"
        trains={[nowTrain]}
      />
    );
    
    expect(screen.getByText('Now')).toBeInTheDocument();
  });

  it('shows "Refreshing..." when loading with existing data', () => {
    render(
      <RailList 
        mode="lirr"
        selectedBranch="1" 
        selectedBranchName="Babylon"
        trains={mockLirrTrains}
        isLoading={true}
      />
    );
    
    expect(screen.getByText('Refreshing...')).toBeInTheDocument();
  });
});

