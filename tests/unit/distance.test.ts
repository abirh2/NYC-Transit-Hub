import { describe, it, expect } from "vitest";
import {
  haversineDistance,
  findNearbyStations,
  formatDistance,
  estimateWalkingTime,
  formatWalkingTime,
  type StationCoordinates,
} from "@/lib/utils/distance";

describe("haversineDistance", () => {
  it("should calculate distance between two nearby points", () => {
    // Times Square to Penn Station (~0.5 miles)
    const timesSq = { lat: 40.758, lon: -73.9855 };
    const pennStation = { lat: 40.7506, lon: -73.9935 };

    const distance = haversineDistance(
      timesSq.lat,
      timesSq.lon,
      pennStation.lat,
      pennStation.lon
    );

    // Should be approximately 0.5 miles
    expect(distance).toBeGreaterThan(0.4);
    expect(distance).toBeLessThan(0.7);
  });

  it("should return 0 for the same point", () => {
    const distance = haversineDistance(40.758, -73.9855, 40.758, -73.9855);
    expect(distance).toBe(0);
  });

  it("should calculate distance for farther points", () => {
    // Manhattan to Brooklyn (~5-10 miles depending on exact points)
    const manhattan = { lat: 40.758, lon: -73.9855 }; // Times Square
    const brooklyn = { lat: 40.6782, lon: -73.9442 }; // Downtown Brooklyn

    const distance = haversineDistance(
      manhattan.lat,
      manhattan.lon,
      brooklyn.lat,
      brooklyn.lon
    );

    // Should be approximately 6 miles
    expect(distance).toBeGreaterThan(4);
    expect(distance).toBeLessThan(10);
  });

  it("should be symmetric", () => {
    const a = { lat: 40.758, lon: -73.9855 };
    const b = { lat: 40.7506, lon: -73.9935 };

    const distAB = haversineDistance(a.lat, a.lon, b.lat, b.lon);
    const distBA = haversineDistance(b.lat, b.lon, a.lat, a.lon);

    expect(distAB).toBe(distBA);
  });
});

describe("findNearbyStations", () => {
  const mockStations: StationCoordinates[] = [
    { id: "1", name: "Station A", latitude: 40.758, longitude: -73.9855 },
    { id: "2", name: "Station B", latitude: 40.7506, longitude: -73.9935 },
    { id: "3", name: "Station C", latitude: 40.76, longitude: -73.98 },
    { id: "4", name: "Far Station", latitude: 40.6782, longitude: -73.9442 },
  ];

  it("should find stations within radius", () => {
    // User at Times Square area
    const nearby = findNearbyStations(
      mockStations,
      40.758,
      -73.9855,
      1, // 1 mile radius
      10
    );

    // Should find 3 nearby stations (A, B, C) but not Far Station
    expect(nearby.length).toBe(3);
    expect(nearby.some((s) => s.name === "Far Station")).toBe(false);
  });

  it("should sort by distance", () => {
    const nearby = findNearbyStations(mockStations, 40.758, -73.9855, 10, 10);

    // Should be sorted by distance ascending
    for (let i = 1; i < nearby.length; i++) {
      expect(nearby[i].distance).toBeGreaterThanOrEqual(nearby[i - 1].distance);
    }
  });

  it("should respect limit parameter", () => {
    const nearby = findNearbyStations(mockStations, 40.758, -73.9855, 10, 2);

    expect(nearby.length).toBe(2);
    // Should be the 2 closest
    expect(nearby[0].name).toBe("Station A");
  });

  it("should include distance in results", () => {
    const nearby = findNearbyStations(mockStations, 40.758, -73.9855, 10, 10);

    for (const station of nearby) {
      expect(typeof station.distance).toBe("number");
      expect(station.distance).toBeGreaterThanOrEqual(0);
    }
  });

  it("should return empty array when no stations within radius", () => {
    const nearby = findNearbyStations(
      mockStations,
      41.0, // Far away
      -74.0,
      0.1, // Very small radius
      10
    );

    expect(nearby).toEqual([]);
  });

  it("should skip stations with null coordinates", () => {
    const stationsWithNull: StationCoordinates[] = [
      { id: "1", name: "Valid", latitude: 40.758, longitude: -73.9855 },
      { id: "2", name: "Null Lat", latitude: null as unknown as number, longitude: -73.9855 },
      { id: "3", name: "Null Lon", latitude: 40.758, longitude: null as unknown as number },
    ];

    const nearby = findNearbyStations(stationsWithNull, 40.758, -73.9855, 1, 10);

    expect(nearby.length).toBe(1);
    expect(nearby[0].name).toBe("Valid");
  });
});

describe("formatDistance", () => {
  it("should format distances in miles", () => {
    expect(formatDistance(0.5)).toBe("0.5 mi");
    expect(formatDistance(1.0)).toBe("1.0 mi");
    expect(formatDistance(1.25)).toBe("1.3 mi");
  });

  it("should format very short distances in feet", () => {
    expect(formatDistance(0.05)).toMatch(/\d+ ft/);
    expect(formatDistance(0.01)).toMatch(/\d+ ft/);
  });

  it("should show miles for 0.1 and above", () => {
    expect(formatDistance(0.1)).toBe("0.1 mi");
    expect(formatDistance(0.15)).toBe("0.1 mi"); // toFixed rounds 0.15 to 0.1
    expect(formatDistance(0.16)).toBe("0.2 mi");
  });
});

describe("estimateWalkingTime", () => {
  it("should calculate walking time at 20 minutes per mile", () => {
    expect(estimateWalkingTime(0.5)).toBe(10); // 10 minutes
    expect(estimateWalkingTime(1.0)).toBe(20); // 20 minutes
    expect(estimateWalkingTime(0.25)).toBe(5); // 5 minutes
  });

  it("should round up to nearest minute", () => {
    expect(estimateWalkingTime(0.1)).toBe(2); // Rounded up from 2
    expect(estimateWalkingTime(0.05)).toBe(1); // Rounded up
  });
});

describe("formatWalkingTime", () => {
  it("should format walking time", () => {
    expect(formatWalkingTime(5)).toBe("5 min walk");
    expect(formatWalkingTime(15)).toBe("15 min walk");
  });

  it("should handle sub-minute walks", () => {
    expect(formatWalkingTime(0)).toBe("< 1 min walk");
  });
});

