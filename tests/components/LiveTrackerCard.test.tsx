import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LiveTrackerCard } from '@/components/dashboard/LiveTrackerCard';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock responses
const mockSubwayResponse = {
  success: true,
  data: {
    arrivals: [
      { tripId: 'trip1', routeId: 'A' },
      { tripId: 'trip2', routeId: 'A' },
      { tripId: 'trip3', routeId: 'C' },
      { tripId: 'trip4', routeId: '1' },
    ],
  },
};

const mockBusResponse = {
  success: true,
  data: {
    routes: ['M15', 'B44', 'Q32', 'BX12'],
    totalCount: 4,
    isLive: true,
  },
};

const mockLirrResponse = {
  success: true,
  data: {
    arrivals: [{ tripId: 'lirr1' }, { tripId: 'lirr2' }],
    branches: [{ id: '1', name: 'Babylon' }, { id: '9', name: 'Port Washington' }],
  },
};

const mockMnrResponse = {
  success: true,
  data: {
    arrivals: [{ tripId: 'mnr1' }],
    branches: [{ id: '1', name: 'Hudson' }],
  },
};

describe('LiveTrackerCard', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.clearAllMocks();
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/trains/realtime')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSubwayResponse),
        });
      }
      if (url.includes('/api/buses/routes')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockBusResponse),
        });
      }
      if (url.includes('/api/lirr/realtime')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockLirrResponse),
        });
      }
      if (url.includes('/api/metro-north/realtime')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMnrResponse),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders the card with title', async () => {
    await act(async () => {
      render(<LiveTrackerCard />);
    });
    expect(screen.getByText('Live Tracker')).toBeInTheDocument();
    expect(screen.getByText('Real-time transit')).toBeInTheDocument();
  });

  it('renders mode tabs', async () => {
    await act(async () => {
      render(<LiveTrackerCard />);
    });
    expect(screen.getByText('Subway')).toBeInTheDocument();
    expect(screen.getByText('Bus')).toBeInTheDocument();
    expect(screen.getByText('Rail')).toBeInTheDocument();
  });

  it('shows subway data after loading', async () => {
    await act(async () => {
      render(<LiveTrackerCard />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('trains')).toBeInTheDocument();
    });
  });

  it('switches to bus tab when clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    
    await act(async () => {
      render(<LiveTrackerCard />);
    });
    
    const busTab = screen.getByText('Bus');
    await act(async () => {
      await user.click(busTab);
    });
    
    await waitFor(() => {
      expect(screen.getByText('routes')).toBeInTheDocument();
    });
  });

  it('switches to rail tab when clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    
    await act(async () => {
      render(<LiveTrackerCard />);
    });
    
    const railTab = screen.getByText('Rail');
    await act(async () => {
      await user.click(railTab);
    });
    
    await waitFor(() => {
      expect(screen.getByText('LIRR')).toBeInTheDocument();
      expect(screen.getByText('Metro-North')).toBeInTheDocument();
    });
  });

  it('displays active subway lines count', async () => {
    await act(async () => {
      render(<LiveTrackerCard />);
    });
    
    await waitFor(() => {
      expect(screen.getByText(/lines active/)).toBeInTheDocument();
    });
  });

  it('handles fetch error gracefully', async () => {
    mockFetch.mockImplementation(() => Promise.reject(new Error('Network error')));
    
    await act(async () => {
      render(<LiveTrackerCard />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Tap to view trains')).toBeInTheDocument();
    });
  });

  it('fetches data from subway endpoint on mount', async () => {
    await act(async () => {
      render(<LiveTrackerCard />);
    });
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/trains/realtime'));
    });
  });

  it('contains link to realtime page', async () => {
    await act(async () => {
      render(<LiveTrackerCard />);
    });
    const links = screen.getAllByRole('link');
    expect(links.some(link => link.getAttribute('href')?.includes('/realtime'))).toBe(true);
  });
});
