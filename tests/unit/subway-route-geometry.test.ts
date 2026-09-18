import { describe, expect, it, vi } from "vitest";

import {
  createSubwayGeometryLoader,
  getRenderableSubwayGeometries,
  parseSubwayGeometryArtifact,
  projectTripOnSubwayGeometry,
  resolveGeometryForTrip,
  type SubwayGeometryArtifact,
} from "@/lib/gtfs/subway-route-geometry";
import type { SubwayTrip, TransitRoute } from "@/types/transit";

const route: TransitRoute = {
  id: "A",
  displayName: "A",
  longName: "8 Avenue Express",
  mode: "subway",
  color: "#0039A6",
  textColor: "#FFFFFF",
  agencyId: "MTA NYCT",
};

function makeTrip({
  id = "063000_A..N54R",
  direction = "northbound",
  stopIds = ["H11N", "H10N", "A65N"],
  progress = {
    state: "between-stops" as const,
    source: "vehicle" as const,
    previousStopId: "H10N",
    nextStopId: "A65N",
    timestamp: new Date("2026-09-17T12:00:00Z"),
    progressRatio: 0.5,
  },
}: Partial<{
  id: string;
  direction: SubwayTrip["direction"];
  stopIds: string[];
  progress: SubwayTrip["progress"];
}> = {}): SubwayTrip {
  return {
    id,
    mode: "subway",
    route,
    direction,
    destination: stopIds.at(-1) ?? null,
    startDate: "20260917",
    startTime: "06:30:00",
    scheduleRelationship: "scheduled",
    stopTimeUpdates: stopIds.map((stopId, index) => ({
      stopId,
      stationId: stopId.replace(/[NSEW]$/, ""),
      sequence: index + 1,
      arrivalTime: new Date(1_800_000_000_000 + index * 60_000),
      departureTime: new Date(1_800_000_030_000 + index * 60_000),
      delaySeconds: 0,
      scheduleRelationship: "scheduled",
    })),
    progress,
    vehicleId: "A-101",
    updatedAt: new Date("2026-09-17T12:00:00Z"),
    isAssigned: true,
  };
}

const artifact: SubwayGeometryArtifact = {
  schemaVersion: 1,
  routeId: "A",
  generatedAt: "2026-09-17T00:00:00.000Z",
  source: {
    url: "https://rrgtfsfeeds.s3.amazonaws.com/gtfs_subway.zip",
    feedVersion: "20260731",
    feedStartDate: "20260801",
    feedEndDate: "20261130",
  },
  shapes: {
    "A..N54R": {
      coordinates: [
        [40.0, -74.0],
        [40.0, -73.99],
        [40.01, -73.99],
      ],
    },
    "A..S54R": {
      coordinates: [
        [40.01, -73.99],
        [40.0, -73.99],
        [40.0, -74.0],
      ],
    },
    "A..N43R": {
      coordinates: [
        [40.0, -74.0],
        [40.005, -73.98],
        [40.02, -73.97],
      ],
    },
  },
  patterns: {
    "A..N54R:0": {
      shapeId: "A..N54R",
      directionId: 0,
      headsign: "Inwood-207 St",
      stopIds: ["H11N", "H10N", "A65N"],
      stopDistances: [0, 851, 1963],
    },
    "A..S54R:0": {
      shapeId: "A..S54R",
      directionId: 1,
      headsign: "Far Rockaway-Mott Av",
      stopIds: ["A65S", "H10S", "H11S"],
      stopDistances: [0, 1112, 1963],
    },
    "A..N43R:0": {
      shapeId: "A..N43R",
      directionId: 0,
      headsign: "Inwood-207 St",
      stopIds: ["A55N", "A57N", "A59N"],
      stopDistances: [0, 1800, 3600],
    },
  },
  tripAliases: {
    "063000_A..N54R": "A..N54R:0",
    "063000_A..S54R": "A..S54R:0",
  },
};

describe("resolveGeometryForTrip", () => {
  it("uses the authoritative static-trip alias before route-level fallback", () => {
    const resolved = resolveGeometryForTrip(makeTrip(), artifact);

    expect(resolved?.match).toBe("exact-trip");
    expect(resolved?.shapeId).toBe("A..N54R");
    expect(resolved?.pattern.stopIds).toEqual(["H11N", "H10N", "A65N"]);
  });

  it("resolves both directions independently", () => {
    const resolved = resolveGeometryForTrip(
      makeTrip({
        id: "063000_A..S54R",
        direction: "southbound",
        stopIds: ["A65S", "H10S", "H11S"],
      }),
      artifact,
    );

    expect(resolved?.shapeId).toBe("A..S54R");
    expect(resolved?.pattern.directionId).toBe(1);
  });

  it("uses ordered realtime stops to choose a branch when the trip alias is unknown", () => {
    const resolved = resolveGeometryForTrip(
      makeTrip({
        id: "supplemented-trip-without-static-alias",
        stopIds: ["A55N", "A57N", "A59N"],
        progress: {
          state: "between-stops",
          source: "vehicle",
          previousStopId: "A55N",
          nextStopId: "A57N",
          timestamp: null,
          progressRatio: 0.25,
        },
      }),
      artifact,
    );

    expect(resolved?.match).toBe("stop-pattern");
    expect(resolved?.shapeId).toBe("A..N43R");
  });

  it("does not resolve a route-only shape when direction and stops are unusable", () => {
    const resolved = resolveGeometryForTrip(
      makeTrip({
        id: "unknown",
        direction: "unknown",
        stopIds: ["ZZ99N"],
        progress: { state: "unknown", source: "inferred", timestamp: null },
      }),
      artifact,
    );

    expect(resolved).toBeNull();
  });
});

describe("projectTripOnSubwayGeometry", () => {
  it("follows the curved shape between adjacent stop anchors", () => {
    const trip = makeTrip();
    const resolved = resolveGeometryForTrip(trip, artifact);

    const projection = projectTripOnSubwayGeometry(trip, resolved!);

    expect(projection?.confidence).toBe("estimated");
    expect(projection?.coordinates[0]).toBeCloseTo(40.005, 3);
    expect(projection?.coordinates[1]).toBeCloseTo(-73.99, 3);
  });

  it("places a terminal train at its monotonic stop anchor", () => {
    const trip = makeTrip({
      progress: {
        state: "at-stop",
        source: "vehicle",
        stopId: "A65N",
        timestamp: null,
      },
    });
    const resolved = resolveGeometryForTrip(trip, artifact);

    const projection = projectTripOnSubwayGeometry(trip, resolved!);

    expect(projection?.coordinates[0]).toBeCloseTo(40.01, 3);
    expect(projection?.coordinates[1]).toBeCloseTo(-73.99, 3);
    expect(projection?.confidence).toBe("station");
  });

  it("returns null when the trip stop pair is not part of the resolved pattern", () => {
    const trip = makeTrip({
      progress: {
        state: "between-stops",
        source: "vehicle",
        previousStopId: "ZZ01N",
        nextStopId: "ZZ02N",
        timestamp: null,
        progressRatio: 0.5,
      },
    });
    const resolved = resolveGeometryForTrip(makeTrip(), artifact);

    expect(projectTripOnSubwayGeometry(trip, resolved!)).toBeNull();
  });
});

describe("getRenderableSubwayGeometries", () => {
  it("renders only the selected trip pattern when an individual trip is selected", () => {
    const northbound = makeTrip();
    const southbound = makeTrip({
      id: "063000_A..S54R",
      direction: "southbound",
      stopIds: ["A65S", "H10S", "H11S"],
    });

    const geometries = getRenderableSubwayGeometries(
      [northbound, southbound],
      artifact,
      northbound.id,
    );

    expect(geometries.map((geometry) => geometry.shapeId)).toEqual(["A..N54R"]);
  });

  it("deduplicates shared active shapes when no trip is selected", () => {
    const geometries = getRenderableSubwayGeometries(
      [makeTrip(), makeTrip({ id: "063500_A..N54R" })],
      artifact,
    );

    expect(geometries).toHaveLength(1);
  });
});

describe("subway geometry artifact loading", () => {
  it("rejects malformed generated geometry at the browser boundary", () => {
    expect(
      parseSubwayGeometryArtifact({
        ...artifact,
        shapes: { bad: { coordinates: [[Number.NaN, -74]] } },
      }),
    ).toBeNull();
  });

  it("caches one route independently from realtime refreshes", async () => {
    const fetchArtifact = vi.fn(async () => artifact);
    const loader = createSubwayGeometryLoader(fetchArtifact);

    const first = await loader.load("A");
    const second = await loader.load("A");

    expect(first).toBe(second);
    expect(fetchArtifact).toHaveBeenCalledTimes(1);
  });

  it("returns null for missing geometry without poisoning later retries", async () => {
    const fetchArtifact = vi
      .fn<() => Promise<unknown>>()
      .mockRejectedValueOnce(new Error("404"))
      .mockResolvedValueOnce(artifact);
    const loader = createSubwayGeometryLoader(fetchArtifact);

    await expect(loader.load("A")).resolves.toBeNull();
    await expect(loader.load("A")).resolves.toEqual(artifact);
    expect(fetchArtifact).toHaveBeenCalledTimes(2);
  });
});
