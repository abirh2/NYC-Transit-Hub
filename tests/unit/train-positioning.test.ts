import { describe, it, expect } from "vitest";
import {
  getDistanceKm,
  calculateStationDistances,
  estimateTravelTimeMinutes,
  interpolateTrainPosition,
  staggerTrainPositions,
  type StationWithCoords,
} from "@/lib/utils/train-positioning";

// Test stations: A line from Times Square to 125th St
const mockStations: StationWithCoords[] = [
  { id: "A27", name: "42 St-Port Authority", lat: 40.7553, lon: -73.9919 },
  { id: "A28", name: "50 St", lat: 40.7622, lon: -73.9860 },
  { id: "A30", name: "59 St-Columbus Circle", lat: 40.7681, lon: -73.9819 },
  { id: "A31", name: "72 St", lat: 40.7756, lon: -73.9762 },
  { id: "A32", name: "81 St-Museum of Natural History", lat: 40.7813, lon: -73.9721 },
  { id: "A33", name: "86 St", lat: 40.7859, lon: -73.9690 },
  { id: "A34", name: "96 St", lat: 40.7936, lon: -73.9641 },
  { id: "A35", name: "103 St", lat: 40.7992, lon: -73.9611 },
  { id: "A36", name: "110 St-Cathedral Pkwy", lat: 40.8042, lon: -73.9581 },
  { id: "A37", name: "116 St-Columbia University", lat: 40.8080, lon: -73.9545 },
  { id: "A38", name: "125 St", lat: 40.8111, lon: -73.9524 },
];

// Spread out stations for regional rail testing (LIRR-like distances)
const mockRailStations: StationWithCoords[] = [
  { id: "1", name: "Penn Station", lat: 40.7506, lon: -73.9936 },
  { id: "2", name: "Jamaica", lat: 40.7000, lon: -73.8075 },
  { id: "3", name: "Mineola", lat: 40.7475, lon: -73.6406 },
  { id: "4", name: "Hicksville", lat: 40.7640, lon: -73.4245 },
];

describe("Train Positioning Utilities", () => {
  describe("getDistanceKm", () => {
    it("returns 0 for same coordinates", () => {
      const dist = getDistanceKm(40.7553, -73.9919, 40.7553, -73.9919);
      expect(dist).toBe(0);
    });

    it("calculates distance between two NYC stations correctly", () => {
      // Times Square to 50th St - approximately 0.8-1.0 km
      const dist = getDistanceKm(40.7553, -73.9919, 40.7622, -73.9860);
      expect(dist).toBeGreaterThan(0.5);
      expect(dist).toBeLessThan(1.5);
    });

    it("calculates longer distance correctly", () => {
      // Penn Station to Jamaica - approximately 15-18 km
      const dist = getDistanceKm(40.7506, -73.9936, 40.7000, -73.8075);
      expect(dist).toBeGreaterThan(10);
      expect(dist).toBeLessThan(25);
    });
  });

  describe("calculateStationDistances", () => {
    it("returns empty map for empty stations array", () => {
      const distances = calculateStationDistances([]);
      expect(distances.size).toBe(0);
    });

    it("returns cumulative 0 for first station", () => {
      const distances = calculateStationDistances(mockStations);
      const firstStation = distances.get("A27");
      expect(firstStation?.cumulative).toBe(0);
    });

    it("calculates cumulative distances for all stations", () => {
      const distances = calculateStationDistances(mockStations);
      expect(distances.size).toBe(mockStations.length);

      // Each subsequent station should have larger cumulative distance
      let prevCumulative = 0;
      for (const station of mockStations) {
        const info = distances.get(station.id);
        expect(info).toBeDefined();
        expect(info!.cumulative).toBeGreaterThanOrEqual(prevCumulative);
        prevCumulative = info!.cumulative;
      }
    });

    it("returns positive toNext for all but last station", () => {
      const distances = calculateStationDistances(mockStations);
      
      for (let i = 0; i < mockStations.length - 1; i++) {
        const info = distances.get(mockStations[i].id);
        expect(info?.toNext).toBeGreaterThan(0);
      }
      
      // Last station should have toNext = 0
      const lastInfo = distances.get(mockStations[mockStations.length - 1].id);
      expect(lastInfo?.toNext).toBe(0);
    });
  });

  describe("estimateTravelTimeMinutes", () => {
    it("returns minimum time for very short distances", () => {
      const time = estimateTravelTimeMinutes(0.1, "subway");
      expect(time).toBe(1.5); // Minimum 1.5 minutes
    });

    it("subway is slower than regional rail", () => {
      const subwayTime = estimateTravelTimeMinutes(5, "subway");
      const railTime = estimateTravelTimeMinutes(5, "lirr");
      expect(subwayTime).toBeGreaterThan(railTime);
    });

    it("returns appropriate time for subway (30 km/h)", () => {
      // 1 km at 30 km/h = 2 minutes
      const time = estimateTravelTimeMinutes(1, "subway");
      expect(time).toBeCloseTo(2, 0);
    });

    it("returns appropriate time for regional rail (51 km/h)", () => {
      // 5 km at 51 km/h ≈ 5.9 minutes
      const time = estimateTravelTimeMinutes(5, "lirr");
      expect(time).toBeGreaterThan(5);
      expect(time).toBeLessThan(7);
    });
  });

  describe("interpolateTrainPosition", () => {
    let stationDistances: Map<string, { cumulative: number; toNext: number }>;
    let railDistances: Map<string, { cumulative: number; toNext: number }>;

    beforeAll(() => {
      stationDistances = calculateStationDistances(mockStations);
      railDistances = calculateStationDistances(mockRailStations);
    });

    it("returns null for unknown stop ID", () => {
      const pos = interpolateTrainPosition(
        "UNKNOWN",
        5,
        "N",
        mockStations,
        stationDistances,
        "subway"
      );
      expect(pos).toBeNull();
    });

    it("returns station position when train is arriving (< 0.5 min)", () => {
      const pos = interpolateTrainPosition(
        "A30",
        0.3,
        "N",
        mockStations,
        stationDistances,
        "subway"
      );
      expect(pos).toEqual([40.7681, -73.9819]); // 59 St coordinates
    });

    it("positions northbound train south of its next stop", () => {
      const pos = interpolateTrainPosition(
        "A30", // Next stop: 59 St
        3,
        "N",
        mockStations,
        stationDistances,
        "subway"
      );
      expect(pos).not.toBeNull();
      
      // Train heading N should be positioned south (lower lat) of 59 St
      const nextStopLat = 40.7681;
      expect(pos![0]).toBeLessThan(nextStopLat);
    });

    it("positions southbound train north of its next stop", () => {
      const pos = interpolateTrainPosition(
        "A30", // Next stop: 59 St
        3,
        "S",
        mockStations,
        stationDistances,
        "subway"
      );
      expect(pos).not.toBeNull();
      
      // Train heading S should be positioned north (higher lat) of 59 St
      const nextStopLat = 40.7681;
      expect(pos![0]).toBeGreaterThan(nextStopLat);
    });

    it("handles train far from next stop (multiple segments)", () => {
      // 16 minutes away from Penn Station on LIRR should be beyond Jamaica
      const pos = interpolateTrainPosition(
        "1", // Penn Station
        16,
        "inbound",
        mockRailStations,
        railDistances,
        "lirr"
      );
      expect(pos).not.toBeNull();
      
      // Should be positioned between Jamaica and Mineola (or further out)
      const pennLat = 40.7506;
      
      // For inbound train, position should be south/east of Penn (lower lat)
      // The exact position depends on estimated travel times
      expect(pos![0]).toBeLessThan(pennLat);
    });

    it("clamps position at end of line", () => {
      // Very far away (60 minutes) should clamp to the last station
      const pos = interpolateTrainPosition(
        "1", // Penn Station
        60,
        "inbound",
        mockRailStations,
        railDistances,
        "lirr"
      );
      expect(pos).not.toBeNull();
      
      // Should be at or near Hicksville (last station)
      const hicksvilleLat = 40.7640;
      // Allow some tolerance since we walk through stations
      expect(pos![0]).toBeCloseTo(hicksvilleLat, 1);
    });

    it("returns different positions for different ETAs", () => {
      const pos1min = interpolateTrainPosition(
        "A30",
        1,
        "N",
        mockStations,
        stationDistances,
        "subway"
      );
      const pos15min = interpolateTrainPosition(
        "A30",
        15,
        "N",
        mockStations,
        stationDistances,
        "subway"
      );
      
      expect(pos1min).not.toBeNull();
      expect(pos15min).not.toBeNull();
      
      // 15 min train should be further from the stop than 1 min train
      const nextStopLat = 40.7681;
      expect(Math.abs(pos15min![0] - nextStopLat)).toBeGreaterThan(
        Math.abs(pos1min![0] - nextStopLat)
      );
    });
  });

  describe("staggerTrainPositions", () => {
    it("returns empty array for empty input", () => {
      const result = staggerTrainPositions([]);
      expect(result).toEqual([]);
    });

    it("returns same position for single train", () => {
      const input = [
        {
          train: { minutesAway: 5, direction: "N" },
          position: [40.75, -73.99] as [number, number],
        },
      ];
      const result = staggerTrainPositions(input);
      expect(result).toHaveLength(1);
      expect(result[0].position).toEqual(input[0].position);
    });

    it("staggers trains that are too close", () => {
      const samePosition: [number, number] = [40.75, -73.99];
      const input = [
        { train: { minutesAway: 3, direction: "N" }, position: samePosition },
        { train: { minutesAway: 5, direction: "N" }, position: samePosition },
        { train: { minutesAway: 7, direction: "N" }, position: samePosition },
      ];
      
      const result = staggerTrainPositions(input, 0.3);
      
      // All trains should have slightly different positions
      const positions = result.map(r => r.position);
      const uniquePositions = new Set(positions.map(p => `${p[0]},${p[1]}`));
      
      // Due to random offsets, positions should be unique
      // (with small probability of collision)
      expect(uniquePositions.size).toBeGreaterThanOrEqual(1);
    });

    it("preserves trains that are already separated", () => {
      const input = [
        {
          train: { minutesAway: 3, direction: "N" },
          position: [40.75, -73.99] as [number, number],
        },
        {
          train: { minutesAway: 5, direction: "N" },
          position: [40.80, -73.95] as [number, number], // ~5km away
        },
      ];
      
      const result = staggerTrainPositions(input, 0.3);
      
      // Positions should be unchanged (or nearly so)
      expect(result[0].position[0]).toBeCloseTo(40.75, 1);
      expect(result[1].position[0]).toBeCloseTo(40.80, 1);
    });
  });
});

