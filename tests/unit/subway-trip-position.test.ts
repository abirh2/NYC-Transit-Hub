import { describe, expect, it } from "vitest";

import {
  getSubwayTripProgressContext,
  projectSubwayTripPosition,
} from "@/lib/transit/subway-trip-position";
import type { SubwayTrip, TransitRoute } from "@/types/transit";

const route: TransitRoute = {
  id: "D",
  displayName: "D",
  longName: "6 Avenue Express",
  mode: "subway",
  color: "#FF6319",
  textColor: "#FFFFFF",
  agencyId: "MTA NYCT",
};

const stations = [
  { id: "D14", name: "7 Av", lat: 40.7629, lon: -73.9817 },
  { id: "D15", name: "47-50 Sts-Rockefeller Ctr", lat: 40.7587, lon: -73.9813 },
  { id: "D16", name: "42 St-Bryant Pk", lat: 40.7542, lon: -73.9846 },
];

function makeTrip(progress: SubwayTrip["progress"]): SubwayTrip {
  return {
    id: "073850_D..S03R/encoded+identity",
    mode: "subway",
    route,
    direction: "southbound",
    destination: "Coney Island-Stillwell Av",
    startDate: "20260916",
    startTime: "12:00:00",
    scheduleRelationship: "scheduled",
    stopTimeUpdates: [
      {
        stopId: "D14S",
        stationId: "D14",
        sequence: 14,
        arrivalTime: new Date("2026-09-16T16:00:00Z"),
        departureTime: new Date("2026-09-16T16:01:00Z"),
        delaySeconds: 0,
        scheduleRelationship: "scheduled",
      },
      {
        stopId: "D15S",
        stationId: "D15",
        sequence: 15,
        arrivalTime: new Date("2026-09-16T16:04:00Z"),
        departureTime: new Date("2026-09-16T16:05:00Z"),
        delaySeconds: 0,
        scheduleRelationship: "scheduled",
      },
      {
        stopId: "D16S",
        stationId: "D16",
        sequence: 16,
        arrivalTime: new Date("2026-09-16T16:08:00Z"),
        departureTime: null,
        delaySeconds: 0,
        scheduleRelationship: "scheduled",
      },
    ],
    progress,
    vehicleId: "D-42",
    updatedAt: new Date("2026-09-16T16:02:00Z"),
    isAssigned: true,
  };
}

describe("subway trip progress context", () => {
  it("keeps previous, next, and subsequent stops tied to the trip sequence", () => {
    const trip = makeTrip({
      state: "between-stops",
      source: "vehicle",
      previousStopId: "D14S",
      nextStopId: "D15S",
      timestamp: new Date("2026-09-16T16:02:00Z"),
      progressRatio: null,
    });

    const context = getSubwayTripProgressContext(trip);

    expect(context.previousStop?.stopId).toBe("D14S");
    expect(context.nextStop?.stopId).toBe("D15S");
    expect(context.upcomingStops.map((stop) => stop.stopId)).toEqual([
      "D15S",
      "D16S",
    ]);
    expect(context.completedStops.map((stop) => stop.stopId)).toEqual(["D14S"]);
  });
});

describe("projectSubwayTripPosition", () => {
  it("projects an at-stop train onto that station without implying GPS", () => {
    const trip = makeTrip({
      state: "at-stop",
      source: "vehicle",
      stopId: "D15S",
      timestamp: new Date("2026-09-16T16:04:00Z"),
    });

    expect(projectSubwayTripPosition(trip, stations)).toEqual({
      coordinates: [40.7587, -73.9813],
      previousStopId: "D15S",
      nextStopId: "D15S",
      progressRatio: 1,
      confidence: "station",
    });
  });

  it("uses semantic progress when the feed has no precise ratio", () => {
    const trip = makeTrip({
      state: "approaching",
      source: "vehicle",
      previousStopId: "D14S",
      nextStopId: "D15S",
      timestamp: new Date("2026-09-16T16:03:00Z"),
    });

    const projection = projectSubwayTripPosition(trip, stations);

    expect(projection?.confidence).toBe("estimated");
    expect(projection?.progressRatio).toBeGreaterThan(0.5);
    expect(projection?.coordinates[0]).toBeGreaterThan(40.7587);
    expect(projection?.coordinates[0]).toBeLessThan(40.7629);
  });

  it("returns no geographic position when trip progress is unknown", () => {
    const trip = makeTrip({
      state: "unknown",
      source: "inferred",
      timestamp: new Date("2026-09-16T16:02:00Z"),
    });

    expect(projectSubwayTripPosition(trip, stations)).toBeNull();
  });
});
