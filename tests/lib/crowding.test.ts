import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateRouteCrowding } from '@/lib/crowding';
import * as gtfsRt from '@/lib/mta/gtfs-rt';
import type { MtaFeedMessage } from '@/types/gtfs';
import type { TrainArrival } from '@/types/mta';

// Mock the GTFS-RT module
vi.mock('@/lib/mta/gtfs-rt', () => ({
    fetchSubwayFeed: vi.fn(),
    extractArrivals: vi.fn(),
}));

// Helper to create a minimal mock feed
function createMockFeed(): MtaFeedMessage {
    return {
        header: {
            gtfsRealtimeVersion: '2.0',
            timestamp: Math.floor(Date.now() / 1000),
        },
        entity: [],
    };
}

// Helper to create mock arrivals
function createMockArrival(overrides: Partial<TrainArrival>): TrainArrival {
    return {
        tripId: 'test-trip',
        routeId: 'A',
        direction: 'N',
        headsign: null,
        stopId: 'A27N',
        stationName: 'Test Station',
        arrivalTime: new Date(),
        departureTime: null,
        delay: 0,
        isAssigned: true,
        minutesAway: 5,
        ...overrides,
    };
}

describe('calculateRouteCrowding', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return LOW crowding when headways are short (< 6 min)', async () => {
        // Mock feed response (doesn't matter what it is, as we mock extractArrivals)
        vi.mocked(gtfsRt.fetchSubwayFeed).mockResolvedValue(createMockFeed());

        // Mock arrivals with 4 minute gaps
        const now = Date.now();
        const arrivals: TrainArrival[] = [
            createMockArrival({ arrivalTime: new Date(now + 1000 * 60 * 2), direction: 'N' }),
            createMockArrival({ arrivalTime: new Date(now + 1000 * 60 * 6), direction: 'N' }), // +4 min
            createMockArrival({ arrivalTime: new Date(now + 1000 * 60 * 10), direction: 'N' }), // +4 min
        ];
        vi.mocked(gtfsRt.extractArrivals).mockReturnValue(arrivals);

        const result = await calculateRouteCrowding('A');

        expect(result.crowdingLevel).toBe('LOW');
        expect(result.avgHeadwayMin).toBe(4);
    });

    it('should return MEDIUM crowding when headways are moderate (6-12 min)', async () => {
        vi.mocked(gtfsRt.fetchSubwayFeed).mockResolvedValue(createMockFeed());

        // Mock arrivals with 8 minute gaps
        const now = Date.now();
        const arrivals: TrainArrival[] = [
            createMockArrival({ arrivalTime: new Date(now + 1000 * 60 * 2), direction: 'N' }),
            createMockArrival({ arrivalTime: new Date(now + 1000 * 60 * 10), direction: 'N' }), // +8 min
            createMockArrival({ arrivalTime: new Date(now + 1000 * 60 * 18), direction: 'N' }), // +8 min
        ];
        vi.mocked(gtfsRt.extractArrivals).mockReturnValue(arrivals);

        const result = await calculateRouteCrowding('A');

        expect(result.crowdingLevel).toBe('MEDIUM');
        expect(result.avgHeadwayMin).toBe(8);
    });

    it('should return HIGH crowding when headways are long (> 12 min)', async () => {
        vi.mocked(gtfsRt.fetchSubwayFeed).mockResolvedValue(createMockFeed());

        // Mock arrivals with 15 minute gaps
        const now = Date.now();
        const arrivals: TrainArrival[] = [
            createMockArrival({ arrivalTime: new Date(now + 1000 * 60 * 2), direction: 'N' }),
            createMockArrival({ arrivalTime: new Date(now + 1000 * 60 * 17), direction: 'N' }), // +15 min
            createMockArrival({ arrivalTime: new Date(now + 1000 * 60 * 32), direction: 'N' }), // +15 min
        ];
        vi.mocked(gtfsRt.extractArrivals).mockReturnValue(arrivals);

        const result = await calculateRouteCrowding('A');

        expect(result.crowdingLevel).toBe('HIGH');
        expect(result.avgHeadwayMin).toBe(15);
    });

    it('should handle empty feed or no arrivals gracefully', async () => {
        vi.mocked(gtfsRt.fetchSubwayFeed).mockResolvedValue(null);

        const result = await calculateRouteCrowding('A');

        expect(result.crowdingLevel).toBe('LOW'); // Default
        expect(result.avgHeadwayMin).toBe(0);
    });

    it('should average headways across directions if available', async () => {
        vi.mocked(gtfsRt.fetchSubwayFeed).mockResolvedValue(createMockFeed());

        const now = Date.now();
        const arrivals: TrainArrival[] = [
            // Northbound: 10 min gap
            createMockArrival({ arrivalTime: new Date(now + 1000 * 60 * 5), direction: 'N' }),
            createMockArrival({ arrivalTime: new Date(now + 1000 * 60 * 15), direction: 'N' }),
            // Southbound: 20 min gap
            createMockArrival({ arrivalTime: new Date(now + 1000 * 60 * 2), direction: 'S' }),
            createMockArrival({ arrivalTime: new Date(now + 1000 * 60 * 22), direction: 'S' }),
        ];
        vi.mocked(gtfsRt.extractArrivals).mockReturnValue(arrivals);

        const result = await calculateRouteCrowding('A');

        // Avg of 10 and 20 is 15 -> HIGH
        expect(result.avgHeadwayMin).toBe(15);
        expect(result.crowdingLevel).toBe('HIGH');
    });
});
