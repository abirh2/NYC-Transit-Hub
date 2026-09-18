import { describe, expect, it } from "vitest";

import {
  groupNearbyBusStops,
  NEARBY_BUS_STOP_GROUP_DISTANCE_MILES,
} from "@/lib/gtfs/bus-stops";
import type { NearbyBusStop } from "@/types/transit";

function stop(
  id: string,
  name: string,
  latitude: number,
  longitude: number,
  distanceMiles: number,
  routeIds: string[],
): NearbyBusStop {
  return {
    id,
    stationId: null,
    name,
    mode: "bus",
    direction: "unknown",
    location: { latitude, longitude },
    platformCode: null,
    routeIds,
    distanceMiles,
  };
}

describe("groupNearbyBusStops", () => {
  it("groups adjacent normalized names without losing directional stops", () => {
    const groups = groupNearbyBusStops([
      stop("2", "5 AV / W 42 STREET", 40.7541, -73.9807, 0.12, ["M2"]),
      stop("1", "5 AV / W 42 ST", 40.754, -73.9808, 0.1, ["M1"]),
    ]);

    expect(NEARBY_BUS_STOP_GROUP_DISTANCE_MILES).toBeGreaterThan(0);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      id: "bus-stop-group:1+2",
      distanceMiles: 0.1,
      routeIds: ["M1", "M2"],
    });
    expect(groups[0].stops.map((candidate) => candidate.id)).toEqual(["1", "2"]);
    expect(groups[0].stops.every((candidate) => candidate.direction === "unknown")).toBe(true);
  });

  it("keeps same-name stops separate when they are materially distant", () => {
    const groups = groupNearbyBusStops([
      stop("a", "MAIN ST", 40.75, -73.98, 0.1, ["M1"]),
      stop("b", "MAIN STREET", 40.76, -73.98, 0.7, ["M1"]),
    ]);
    expect(groups).toHaveLength(2);
  });

  it("limits after grouping and uses deterministic tie breakers", () => {
    const input = [
      stop("c", "C ST", 40.75, -73.98, 0.3, ["M3"]),
      stop("b", "B ST", 40.75, -73.98, 0.2, ["M2"]),
      stop("a2", "A STREET", 40.7501, -73.9801, 0.11, ["M1"]),
      stop("a1", "A ST", 40.75, -73.98, 0.1, ["M1"]),
    ];
    expect(groupNearbyBusStops(input, 2).map((group) => group.name)).toEqual([
      "A ST",
      "B ST",
    ]);
  });
});
